"""乌托帮后端(Python / FastAPI)。

职责只有两件:
  1. 转发 AI 请求 —— Key 留在服务端,前端永远拿不到
  2. 读写模型配置 —— 让用户在网页上换供应商,不用重启

没有用户、没有数据库、没有计费。数据都在浏览器里,关掉标签页就没了 ——
这是当前项目的取舍:零数据库、低运维、业务数据默认留在浏览器内存。

启动:
  uvicorn main:app --port 8787
构建过前端(apps/web/dist 存在)时,同一进程直接托管页面,单端口即可用。
"""
import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse, StreamingResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from starlette.concurrency import run_in_threadpool  # noqa: E402

import llm_client  # noqa: E402
from config import (ConfigLockedError, describe_config, is_locked,  # noqa: E402
                    load_config, save_config)
from presets import PRESET_LIST, is_configured  # noqa: E402

MAX_TOKENS_CAP = 4000

app = FastAPI(title="utobond-server", docs_url=None, redoc_url=None)


def _allowed_origins():
    defaults = ["http://localhost:5173", "http://127.0.0.1:5173"]
    extra = [x.strip().rstrip("/") for x in
             os.environ.get("UTOBOND_ALLOWED_ORIGINS", "").split(",") if x.strip()]
    return list(dict.fromkeys(defaults + extra))


ALLOWED_ORIGINS = _allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def reject_untrusted_browser_origins(request: Request, call_next):
    """阻止任意网页借 localhost 后端改配置或消耗模型 Key。"""
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin and request.method not in {"GET", "HEAD", "OPTIONS"}:
        host = request.headers.get("host") or ""
        same_origin = {f"http://{host}", f"https://{host}"}
        if origin not in same_origin and origin not in ALLOWED_ORIGINS:
            return JSONResponse({"error": "不允许的请求来源", "code": "BAD_ORIGIN"}, status_code=403)
    return await call_next(request)


def _err(e: llm_client.AIError):
    return JSONResponse({"error": str(e), "code": e.code}, status_code=e.status)


async def _read_ai_body(request: Request):
    try:
        body = await request.json()
    except (TypeError, ValueError):
        raise llm_client.AIError("请求体必须是 JSON", status=400, code="BAD_REQUEST")
    if not isinstance(body, dict):
        raise llm_client.AIError("请求体必须是 JSON 对象", status=400, code="BAD_REQUEST")
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        raise llm_client.AIError("messages 必填", status=400, code="BAD_REQUEST")
    if len(messages) > 50:
        raise llm_client.AIError("messages 最多 50 条", status=400, code="BAD_REQUEST")
    total_chars = 0
    for message in messages:
        if not isinstance(message, dict) or message.get("role") not in {"user", "assistant"}:
            raise llm_client.AIError("message role 只支持 user/assistant", status=400, code="BAD_REQUEST")
        if not isinstance(message.get("content"), str):
            raise llm_client.AIError("message content 必须是字符串", status=400, code="BAD_REQUEST")
        total_chars += len(message["content"])
    if total_chars > 100_000:
        raise llm_client.AIError("messages 内容过长", status=413, code="PAYLOAD_TOO_LARGE")

    system = body.get("system")
    if system is not None and not isinstance(system, str):
        raise llm_client.AIError("system 必须是字符串", status=400, code="BAD_REQUEST")
    try:
        max_tokens = int(body.get("maxTokens") or 1000)
    except (TypeError, ValueError):
        raise llm_client.AIError("maxTokens 必须是整数", status=400, code="BAD_REQUEST")
    if max_tokens < 1:
        raise llm_client.AIError("maxTokens 必须大于 0", status=400, code="BAD_REQUEST")

    temperature = body.get("temperature")
    if temperature is not None:
        try:
            temperature = float(temperature)
        except (TypeError, ValueError):
            raise llm_client.AIError("temperature 必须是数字", status=400, code="BAD_REQUEST")
        if not 0 <= temperature <= 2:
            raise llm_client.AIError("temperature 必须在 0–2 之间", status=400, code="BAD_REQUEST")
    return {
        "messages": messages,
        "system": system,
        "max_tokens": min(max_tokens, MAX_TOKENS_CAP),
        "temperature": temperature,
        # capability 目前只做日志;云端版据此计费,这里保持同一契约
        "capability": body.get("capability") or "unknown",
    }


@app.get("/api/health")
def health():
    cfg = describe_config()
    return {
        "ok": True,
        "service": "utobond-server",
        "edition": "local",
        "aiConfigured": cfg["configured"],
        "provider": cfg["provider"] or None,
        "model": cfg["model"] or None,
        "configSource": cfg["source"],
    }


@app.post("/api/ai/complete")
async def ai_complete(request: Request):
    try:
        p = await _read_ai_body(request)
        out = await run_in_threadpool(
            llm_client.chat_complete, load_config(), p["messages"], p["system"],
            p["max_tokens"], p["temperature"])
        return out
    except llm_client.AIError as e:
        return _err(e)


@app.post("/api/ai/stream")
async def ai_stream(request: Request):
    try:
        p = await _read_ai_body(request)
    except llm_client.AIError as e:
        return _err(e)

    def gen():
        try:
            for kind, payload in llm_client.chat_stream(load_config(), p["messages"], p["system"],
                                                        p["max_tokens"], p["temperature"]):
                if kind == "delta":
                    yield f'data: {json.dumps({"delta": payload}, ensure_ascii=False)}\n\n'
                else:
                    yield f'data: {json.dumps({"done": True, **payload}, ensure_ascii=False)}\n\n'
        except llm_client.AIError as e:
            yield f'data: {json.dumps({"error": str(e), "code": e.code}, ensure_ascii=False)}\n\n'

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})


# ---- 模型设置 API:完整 Key 仅在服务端流转 ----

@app.get("/api/settings/llm")
def settings_get():
    return {"config": describe_config(), "presets": PRESET_LIST}


@app.put("/api/settings/llm")
async def settings_put(request: Request):
    try:
        patch = await request.json()
        if not isinstance(patch, dict):
            raise llm_client.AIError("请求体必须是 JSON 对象", status=400, code="BAD_REQUEST")
        save_config(patch)
        return {"config": describe_config()}
    except ConfigLockedError as e:
        return JSONResponse({"error": str(e)}, status_code=403)
    except (TypeError, ValueError):
        return _err(llm_client.AIError("请求体必须是 JSON", status=400, code="BAD_REQUEST"))
    except llm_client.AIError as e:
        return _err(e)


@app.post("/api/settings/llm/test")
async def settings_test(request: Request):
    """支持「先测再存」:body 里给的字段覆盖已存配置,key 留空则沿用已存的"""
    if is_locked():
        return JSONResponse({"error": "模型配置已锁定，测试连接也只允许部署方执行。"}, status_code=403)
    stored = load_config()
    try:
        patch = await request.json() or {}
    except (TypeError, ValueError):
        return _err(llm_client.AIError("请求体必须是 JSON", status=400, code="BAD_REQUEST"))
    if not isinstance(patch, dict):
        return _err(llm_client.AIError("请求体必须是 JSON 对象", status=400, code="BAD_REQUEST"))
    provider = patch.get("provider") or stored.get("provider")
    base_url = patch.get("baseURL") or stored.get("baseURL")
    identity_changed = (
        provider != stored.get("provider")
        or (base_url or "").rstrip("/") != (stored.get("baseURL") or "").rstrip("/")
    )
    if identity_changed and not patch.get("apiKey"):
        return JSONResponse(
            {"ok": False, "error": "切换供应商或接口地址时必须重新输入 API Key。",
             "code": "KEY_REQUIRED"},
            status_code=400,
        )
    merged = {
        "provider": provider,
        "baseURL": base_url,
        "model": patch.get("model") or stored.get("model"),
        "apiKey": patch.get("apiKey") or stored.get("apiKey"),
    }
    return await run_in_threadpool(llm_client.test_connection, merged)


# 构建过的前端直接托管,单进程部署
_dist = Path(__file__).parent.parent / "web" / "dist"
if _dist.is_dir():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="web")


def print_startup():
    cfg = describe_config()
    port = os.environ.get("PORT", "8787")
    print(f"[utobond] 后端已启动 → http://localhost:{port}")
    if is_configured(load_config()):
        src = "配置文件" if cfg["source"] == "file" else "环境变量"
        print(f'[utobond] 模型:{cfg["provider"]} / {cfg["model"]}(来自{src})')
    else:
        print("[utobond] 尚未配置模型 —— AI 接口返回 503,前端自动落内置模板。")
        print("[utobond] 去网页左侧「模型设置」填一下,或改 apps/server/.env。")


print_startup()
