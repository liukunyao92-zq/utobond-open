"""统一 LLM 客户端。

对外只有三个函数:chat_complete / chat_stream / test_connection。
只依赖 httpx,不引任何供应商 SDK —— 用户换供应商不需要装第二个包,
中转站的各种小差异也好绕。
"""
import json
import time

import httpx

from presets import resolve_preset, is_configured

DEFAULT_TIMEOUT = 90.0

# 测试用注入点:置为 httpx.MockTransport 即可离线测全链路
TRANSPORT = None


class AIError(Exception):
    def __init__(self, message, status=502, code="UPSTREAM"):
        super().__init__(message)
        self.status = status
        self.code = code


def not_configured() -> AIError:
    return AIError("尚未配置模型。打开「模型设置」填入供应商、API Key 和模型名。",
                   status=503, code="NOT_CONFIGURED")


# ------------------------------ 请求构造 ------------------------------

def _build_request(r, messages, system=None, max_tokens=1000, temperature=None, stream=False):
    if r["kind"] == "anthropic":
        body = {"model": r["model"], "max_tokens": max_tokens, "messages": messages}
        if system:
            body["system"] = system
        if temperature is not None:
            body["temperature"] = temperature
        if stream:
            body["stream"] = True
        return {
            "url": f'{r["baseURL"]}/v1/messages',
            "headers": {
                "content-type": "application/json",
                "x-api-key": r["apiKey"],
                "anthropic-version": "2023-06-01",
            },
            "body": body,
        }
    # openai 协议:system 作为第一条消息
    msgs = ([{"role": "system", "content": system}] + messages) if system else messages
    body = {"model": r["model"], "max_tokens": max_tokens, "messages": msgs}
    if temperature is not None:
        body["temperature"] = temperature
    if stream:
        body["stream"] = True
        body["stream_options"] = {"include_usage": True}
    headers = {"content-type": "application/json"}
    if r["apiKey"]:
        headers["authorization"] = f'Bearer {r["apiKey"]}'
    return {"url": f'{r["baseURL"]}/chat/completions', "headers": headers, "body": body}


def _shorten_upstream(text, status):
    """上游错误体可能很长甚至是 HTML,截断并尽量取出 message 字段"""
    msg = (text or "").strip()
    try:
        j = json.loads(msg)
        err = j.get("error")
        if isinstance(err, dict):
            msg = err.get("message") or msg
        else:
            msg = j.get("message") or err or msg
    except (ValueError, AttributeError):
        pass
    if not isinstance(msg, str):
        msg = json.dumps(msg, ensure_ascii=False)
    return f"上游返回 {status}:{msg[:300]}"


def _send(client, r, payload, stream=False):
    req = client.build_request("POST", payload["url"], headers=payload["headers"],
                               json=payload["body"])
    try:
        res = client.send(req, stream=stream)
    except httpx.TimeoutException:
        raise AIError("模型请求超时", status=504, code="TIMEOUT")
    except httpx.HTTPError as e:
        raise AIError(f"连不上模型服务:{e}", status=502, code="NETWORK")

    # 部分新版 OpenAI 模型只认 max_completion_tokens,按上游报错自动改字段重试一次
    if res.status_code == 400 and r["kind"] == "openai" and "max_tokens" in payload["body"]:
        detail = res.read().decode("utf-8", "replace")
        res.close()
        if "max_completion_tokens" in detail:
            body = dict(payload["body"])
            body["max_completion_tokens"] = body.pop("max_tokens")
            req2 = client.build_request("POST", payload["url"], headers=payload["headers"], json=body)
            try:
                res = client.send(req2, stream=stream)
            except httpx.TimeoutException:
                raise AIError("模型请求超时", status=504, code="TIMEOUT")
            except httpx.HTTPError as e:
                raise AIError(f"连不上模型服务:{e}", status=502, code="NETWORK")
        else:
            raise AIError(_shorten_upstream(detail, 400), status=502)

    if res.status_code >= 400:
        detail = res.read().decode("utf-8", "replace")
        res.close()
        bad_key = res.status_code in (401, 403)
        raise AIError(_shorten_upstream(detail, res.status_code),
                      status=401 if bad_key else 502,
                      code="BAD_KEY" if bad_key else "UPSTREAM")
    return res


def _read_usage(kind, u):
    u = u or {}
    if kind == "anthropic":
        return {"input": u.get("input_tokens", 0) or 0, "output": u.get("output_tokens", 0) or 0}
    return {"input": u.get("prompt_tokens", 0) or 0, "output": u.get("completion_tokens", 0) or 0}


def _client():
    return httpx.Client(transport=TRANSPORT, timeout=DEFAULT_TIMEOUT)


# ------------------------------ 对外接口 ------------------------------

def chat_complete(config, messages, system=None, max_tokens=1000, temperature=None):
    """一次性补全,返回 {text, model, provider, usage, ms}"""
    if not is_configured(config):
        raise not_configured()
    r = resolve_preset(config)
    t0 = time.time()
    with _client() as client:
        res = _send(client, r, _build_request(r, messages, system, max_tokens, temperature))
        data = res.json()

    if r["kind"] == "anthropic":
        text = "\n".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    else:
        choices = data.get("choices") or [{}]
        text = (choices[0].get("message") or {}).get("content") or ""

    return {
        "text": text,
        "model": r["model"],
        "provider": r["provider"],
        "usage": _read_usage(r["kind"], data.get("usage")),
        "ms": int((time.time() - t0) * 1000),
    }


def chat_stream(config, messages, system=None, max_tokens=1000, temperature=None):
    """流式补全。生成器:先逐个 yield ("delta", 文本),最后 yield ("done", meta)。"""
    if not is_configured(config):
        raise not_configured()
    r = resolve_preset(config)
    t0 = time.time()
    usage = {"input": 0, "output": 0}

    with _client() as client:
        res = _send(client, r,
                    _build_request(r, messages, system, max_tokens, temperature, stream=True),
                    stream=True)
        try:
            for line in res.iter_lines():
                line = line.strip()
                if not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if raw == "[DONE]":
                    break
                try:
                    evt = json.loads(raw)
                except ValueError:
                    continue
                if r["kind"] == "anthropic":
                    t = evt.get("type")
                    if t == "content_block_delta" and evt.get("delta", {}).get("text"):
                        yield "delta", evt["delta"]["text"]
                    elif t == "message_start":
                        usage = _read_usage("anthropic", evt.get("message", {}).get("usage"))
                    elif t == "message_delta" and evt.get("usage"):
                        usage["output"] = evt["usage"].get("output_tokens", usage["output"])
                    elif t == "error":
                        raise AIError(evt.get("error", {}).get("message") or "流式返回错误")
                else:
                    choices = evt.get("choices") or []
                    delta = (choices[0].get("delta") or {}).get("content") if choices else None
                    if delta:
                        yield "delta", delta
                    if evt.get("usage"):
                        usage = _read_usage("openai", evt["usage"])
        finally:
            res.close()

    yield "done", {"model": r["model"], "provider": r["provider"], "usage": usage,
                   "ms": int((time.time() - t0) * 1000)}


def test_connection(config):
    """连通性自检:发一句最短的话,验证 baseURL / key / 模型名三者都对"""
    if not is_configured(config):
        return {"ok": False, "error": "配置不完整:baseURL、模型名必填,除 Ollama 外还需 API Key。"}
    try:
        out = chat_complete(config,
                            [{"role": "user", "content": "只回复两个字:通了"}],
                            max_tokens=16, temperature=0)
        return {
            "ok": True, "ms": out["ms"], "model": out["model"], "provider": out["provider"],
            "sample": (out["text"] or "").strip()[:40], "usage": out["usage"],
        }
    except AIError as e:
        return {"ok": False, "code": e.code, "status": e.status, "error": str(e)}
