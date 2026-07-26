"""HTTP 边界、安全策略和生产启动配置的回归测试。"""
import os
import sys
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

SERVER_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(SERVER_DIR))

# main 会加载本地 .env；测试先放入完整的假配置，绝不读取或调用真实凭据。
os.environ["UTOBOND_CONFIG_DIR"] = tempfile.mkdtemp(prefix="utobond-api-test-")
os.environ["LLM_PROVIDER"] = "deepseek"
os.environ["LLM_API_KEY"] = "test-suite-key-not-secret"
os.environ["LLM_BASE_URL"] = "https://api.deepseek.com/v1"
os.environ["LLM_MODEL"] = "deepseek-chat"
os.environ.pop("LLM_CONFIG_LOCKED", None)

import config  # noqa: E402
import main  # noqa: E402
import run as server_run  # noqa: E402

client = TestClient(main.app)
LOCAL_ORIGIN = {"Origin": "http://localhost:5173"}


def test_rejects_untrusted_browser_origin():
    response = client.post(
        "/api/ai/complete",
        headers={"Origin": "https://evil.example"},
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "BAD_ORIGIN"


def test_accepts_same_origin_behind_reverse_proxy():
    response = client.post(
        "/api/ai/complete",
        headers={
            "Origin": "https://utobond.example",
            "Host": "utobond.example",
        },
        json={},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "BAD_REQUEST"


def test_ai_request_validation_and_token_cap(monkeypatch):
    bad = client.post(
        "/api/ai/complete", headers=LOCAL_ORIGIN,
        json={"messages": [{"role": "user", "content": "hi"}], "maxTokens": -1},
    )
    assert bad.status_code == 400
    assert bad.json()["code"] == "BAD_REQUEST"

    captured = {}

    def fake_complete(_cfg, _messages, _system, max_tokens, temperature):
        captured.update(max_tokens=max_tokens, temperature=temperature)
        return {"text": "ok"}

    monkeypatch.setattr(main.llm_client, "chat_complete", fake_complete)
    monkeypatch.setattr(main, "load_config", lambda: {})
    good = client.post(
        "/api/ai/complete", headers=LOCAL_ORIGIN,
        json={"messages": [{"role": "user", "content": "hi"}],
              "maxTokens": 99999, "temperature": "0.5"},
    )
    assert good.status_code == 200
    assert captured == {"max_tokens": 4000, "temperature": 0.5}


def test_endpoint_change_cannot_reuse_stored_key(tmp_path, monkeypatch):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    monkeypatch.delenv("LLM_CONFIG_LOCKED", raising=False)
    config.save_config({
        "provider": "custom", "baseURL": "https://trusted.example/v1",
        "model": "m", "apiKey": "stored-secret",
    })

    called = False

    def fake_test(_cfg):
        nonlocal called
        called = True
        return {"ok": True}

    monkeypatch.setattr(main.llm_client, "test_connection", fake_test)
    response = client.post(
        "/api/settings/llm/test", headers=LOCAL_ORIGIN,
        json={"provider": "custom", "baseURL": "https://attacker.example/v1",
              "model": "m", "apiKey": ""},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "KEY_REQUIRED"
    assert called is False


def test_same_endpoint_may_reuse_stored_key(tmp_path, monkeypatch):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    monkeypatch.delenv("LLM_CONFIG_LOCKED", raising=False)
    config.save_config({
        "provider": "custom", "baseURL": "https://trusted.example/v1",
        "model": "m", "apiKey": "stored-secret",
    })
    captured = {}

    def fake_test(cfg):
        captured.update(cfg)
        return {"ok": True}

    monkeypatch.setattr(main.llm_client, "test_connection", fake_test)
    response = client.post(
        "/api/settings/llm/test", headers=LOCAL_ORIGIN,
        json={"provider": "custom", "baseURL": "https://trusted.example/v1",
              "model": "m2", "apiKey": ""},
    )
    assert response.status_code == 200
    assert captured["apiKey"] == "stored-secret"
    assert captured["model"] == "m2"


def test_locked_config_disables_browser_test(monkeypatch):
    monkeypatch.setenv("LLM_CONFIG_LOCKED", "1")
    response = client.post("/api/settings/llm/test", headers=LOCAL_ORIGIN, json={})
    assert response.status_code == 403


def test_server_options_honor_host_and_port():
    assert server_run.server_options({}) == {"host": "127.0.0.1", "port": 8787}
    assert server_run.server_options({"HOST": "0.0.0.0", "PORT": "8080"}) == {
        "host": "0.0.0.0", "port": 8080,
    }
