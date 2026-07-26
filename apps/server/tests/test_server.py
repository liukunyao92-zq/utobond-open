"""离线单测:用 httpx.MockTransport 假扮上游,验证协议适配与错误归一。"""
import json
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

import llm_client  # noqa: E402
from llm_client import AIError, chat_complete, chat_stream  # noqa: E402
from presets import is_configured, redact, resolve_preset  # noqa: E402

OPENAI = {"provider": "deepseek", "apiKey": "sk-test", "model": "deepseek-chat"}
CLAUDE = {"provider": "anthropic", "apiKey": "sk-ant-test", "model": "claude-sonnet-5"}


@pytest.fixture
def calls(monkeypatch):
    """把请求录下来,响应由每个测试注入的 handler 决定"""
    recorded = []

    def install(handler):
        def wrapper(request: httpx.Request) -> httpx.Response:
            recorded.append({
                "url": str(request.url),
                "headers": request.headers,
                "body": json.loads(request.content) if request.content else None,
            })
            return handler(request)
        monkeypatch.setattr(llm_client, "TRANSPORT", httpx.MockTransport(wrapper))
        return recorded

    return install


def sse(chunks):
    payload = "".join(f"data: {c}\n\n" for c in chunks).encode()
    return httpx.Response(200, content=payload,
                          headers={"content-type": "text/event-stream"})


def test_preset_resolution():
    r = resolve_preset({"provider": "deepseek", "apiKey": "k"})
    assert r["baseURL"] == "https://api.deepseek.com/v1"
    assert r["model"] == "deepseek-chat"
    assert r["kind"] == "openai"


def test_custom_relay_and_configured():
    r = resolve_preset({"provider": "custom", "baseURL": "https://relay.example.com/v1/",
                        "model": "gpt-4o", "apiKey": "k"})
    assert r["baseURL"] == "https://relay.example.com/v1"
    assert is_configured({"provider": "custom", "baseURL": "https://x/v1", "model": "m", "apiKey": "k"})
    assert not is_configured({"provider": "custom", "baseURL": "https://x/v1", "model": "m"}), "缺 key 应判未配置"


def test_ollama_key_optional():
    assert is_configured({"provider": "ollama", "model": "qwen2.5:14b"})


def test_redact_never_leaks_key():
    r = redact({"provider": "deepseek", "apiKey": "sk-abcdefghijklmn", "model": "deepseek-chat"})
    assert r["keyMasked"] == "sk-a••••klmn"
    assert "apiKey" not in r
    assert r["hasKey"] is True


def test_openai_protocol(calls):
    rec = calls(lambda req: httpx.Response(200, json={
        "choices": [{"message": {"content": "好的"}}],
        "usage": {"prompt_tokens": 11, "completion_tokens": 3},
    }))
    out = chat_complete(OPENAI, [{"role": "user", "content": "在吗"}], system="你是参谋", max_tokens=100)
    c = rec[0]
    assert c["url"] == "https://api.deepseek.com/v1/chat/completions"
    assert c["headers"]["authorization"] == "Bearer sk-test"
    assert c["body"]["messages"][0] == {"role": "system", "content": "你是参谋"}
    assert out["text"] == "好的"
    assert out["usage"] == {"input": 11, "output": 3}


def test_anthropic_protocol(calls):
    rec = calls(lambda req: httpx.Response(200, json={
        "content": [{"type": "text", "text": "行"}, {"type": "thinking", "text": "忽略"}],
        "usage": {"input_tokens": 5, "output_tokens": 2},
    }))
    out = chat_complete(CLAUDE, [{"role": "user", "content": "在吗"}], system="你是参谋")
    c = rec[0]
    assert c["url"] == "https://api.anthropic.com/v1/messages"
    assert c["headers"]["x-api-key"] == "sk-ant-test"
    assert c["headers"]["anthropic-version"] == "2023-06-01"
    assert c["body"]["system"] == "你是参谋"
    assert out["text"] == "行"


def test_max_completion_tokens_retry(calls):
    state = {"n": 0}

    def handler(req):
        state["n"] += 1
        if state["n"] == 1:
            return httpx.Response(400, json={"error": {
                "message": "Unsupported parameter: 'max_tokens'. Use 'max_completion_tokens'."}})
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}], "usage": {}})

    rec = calls(handler)
    cfg = {**OPENAI, "provider": "openai", "model": "gpt-4o"}
    out = chat_complete(cfg, [{"role": "user", "content": "hi"}], max_tokens=50)
    assert state["n"] == 2
    assert rec[1]["body"]["max_completion_tokens"] == 50
    assert "max_tokens" not in rec[1]["body"]
    assert out["text"] == "ok"


def test_401_maps_to_bad_key(calls):
    calls(lambda req: httpx.Response(401, json={"error": {"message": "invalid api key"}}))
    with pytest.raises(AIError) as e:
        chat_complete(OPENAI, [{"role": "user", "content": "hi"}])
    assert e.value.code == "BAD_KEY"
    assert e.value.status == 401
    assert "invalid api key" in str(e.value)


def test_not_configured_short_circuits(calls):
    rec = calls(lambda req: httpx.Response(200, json={}))
    with pytest.raises(AIError) as e:
        chat_complete({"provider": "deepseek"}, [{"role": "user", "content": "hi"}])
    assert e.value.code == "NOT_CONFIGURED"
    assert e.value.status == 503
    assert rec == []


def test_openai_stream(calls):
    rec = calls(lambda req: sse([
        json.dumps({"choices": [{"delta": {"content": "先"}}]}),
        json.dumps({"choices": [{"delta": {"content": "帮后托"}}]}),
        json.dumps({"choices": [], "usage": {"prompt_tokens": 7, "completion_tokens": 4}}),
        "[DONE]",
    ]))
    got, meta = [], None
    for kind, payload in chat_stream(OPENAI, [{"role": "user", "content": "hi"}]):
        if kind == "delta":
            got.append(payload)
        else:
            meta = payload
    assert "".join(got) == "先帮后托"
    assert meta["usage"] == {"input": 7, "output": 4}
    assert rec[0]["body"]["stream"] is True


def test_anthropic_stream(calls):
    calls(lambda req: sse([
        json.dumps({"type": "message_start", "message": {"usage": {"input_tokens": 9, "output_tokens": 0}}}),
        json.dumps({"type": "content_block_delta", "delta": {"text": "算"}}),
        json.dumps({"type": "content_block_delta", "delta": {"text": "明白"}}),
        json.dumps({"type": "message_delta", "usage": {"output_tokens": 6}}),
    ]))
    got, meta = [], None
    for kind, payload in chat_stream(CLAUDE, [{"role": "user", "content": "hi"}]):
        if kind == "delta":
            got.append(payload)
        else:
            meta = payload
    assert "".join(got) == "算明白"
    assert meta["usage"] == {"input": 9, "output": 6}


def test_config_file_over_env(tmp_path, monkeypatch):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    monkeypatch.setenv("LLM_PROVIDER", "deepseek")
    monkeypatch.setenv("LLM_API_KEY", "env-key")
    monkeypatch.delenv("LLM_CONFIG_LOCKED", raising=False)
    import config as cfg
    assert cfg.load_config()["apiKey"] == "env-key"
    cfg.save_config({"provider": "custom", "baseURL": "https://r/v1", "model": "m", "apiKey": "file-key"})
    assert cfg.load_config()["apiKey"] == "file-key", "文件应盖过环境变量"
    assert (tmp_path / "llm.json").stat().st_mode & 0o777 == 0o600
    # 锁定后只认环境变量,save 直接拒绝
    monkeypatch.setenv("LLM_CONFIG_LOCKED", "1")
    assert cfg.load_config()["apiKey"] == "env-key"
    with pytest.raises(cfg.ConfigLockedError):
        cfg.save_config({"apiKey": "x"})
