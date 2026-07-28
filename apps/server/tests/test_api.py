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


def test_config_crud_and_manual_activation(tmp_path, monkeypatch):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    monkeypatch.delenv("LLM_CONFIG_LOCKED", raising=False)
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)

    first = client.post(
        "/api/settings/llm/configs", headers=LOCAL_ORIGIN,
        json={"name": "主力", "provider": "custom", "baseURL": "https://one.example/v1",
              "model": "one", "apiKey": "secret-one"},
    )
    assert first.status_code == 200
    first_id = first.json()["savedId"]
    assert first.json()["activeId"] == first_id

    second = client.post(
        "/api/settings/llm/configs", headers=LOCAL_ORIGIN,
        json={"name": "备用", "provider": "custom", "baseURL": "https://two.example/v1",
              "model": "two", "apiKey": "secret-two"},
    )
    assert second.status_code == 200
    second_id = second.json()["savedId"]
    assert second.json()["activeId"] == first_id
    assert len(second.json()["configs"]) == 2
    assert all("apiKey" not in item for item in second.json()["configs"])

    activated = client.post(
        f"/api/settings/llm/configs/{second_id}/activate", headers=LOCAL_ORIGIN, json={},
    )
    assert activated.status_code == 200
    assert activated.json()["activeId"] == second_id
    assert config.load_config()["apiKey"] == "secret-two"

    removed = client.delete(f"/api/settings/llm/configs/{second_id}", headers=LOCAL_ORIGIN)
    assert removed.status_code == 200
    assert removed.json()["activeId"] == first_id
    assert config.load_config()["apiKey"] == "secret-one"


def test_new_config_test_does_not_reuse_active_key(tmp_path, monkeypatch):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    monkeypatch.delenv("LLM_CONFIG_LOCKED", raising=False)
    config.create_config({
        "provider": "custom", "baseURL": "https://same.example/v1",
        "model": "active", "apiKey": "active-secret",
    })
    captured = {}

    def fake_test(cfg):
        captured.update(cfg)
        return {"ok": False, "error": "missing key"}

    monkeypatch.setattr(main.llm_client, "test_connection", fake_test)
    response = client.post(
        "/api/settings/llm/test", headers=LOCAL_ORIGIN,
        json={"configId": None, "provider": "custom", "baseURL": "https://same.example/v1",
              "model": "new", "apiKey": ""},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "KEY_REQUIRED"
    assert captured == {}, "新增配置测试不能复用当前启用项的 Key"


def test_snapshot_api_uses_default_sqlite(tmp_path, monkeypatch):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    monkeypatch.delenv("STORAGE_DRIVER", raising=False)
    monkeypatch.delenv("STORAGE_CONFIG_LOCKED", raising=False)
    payload = {"stores": {"offline": {"info": {"name": "持久化测试店"}}}}

    saved = client.put("/api/data/snapshot", headers=LOCAL_ORIGIN, json={"snapshot": payload})
    assert saved.status_code == 200
    loaded = client.get("/api/data/snapshot")
    assert loaded.status_code == 200
    assert loaded.json()["snapshot"] == payload
    assert (tmp_path / "utobond.db").is_file()


def test_mysql_settings_are_tested_saved_and_redacted(tmp_path, monkeypatch):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    monkeypatch.delenv("STORAGE_CONFIG_LOCKED", raising=False)
    monkeypatch.delenv("STORAGE_DRIVER", raising=False)
    tested = []
    copied = []

    monkeypatch.setattr(main.storage_backend, "test_connection",
                        lambda candidate: tested.append(candidate) or {"ok": True, "driver": "mysql", "ms": 1})
    monkeypatch.setattr(main.storage_backend, "load_snapshot", lambda: {"stores": {}})
    monkeypatch.setattr(main.storage_backend, "save_snapshot",
                        lambda snapshot, candidate=None: copied.append((snapshot, candidate)))
    response = client.put(
        "/api/settings/storage", headers=LOCAL_ORIGIN,
        json={
            "driver": "mysql",
            "mysql": {
                "host": "db.internal", "port": 3306, "database": "utobond",
                "user": "app", "password": "db-secret", "ssl": True,
            },
        },
    )
    assert response.status_code == 200
    assert response.json()["migrated"] is True
    assert tested[0]["mysql"]["password"] == "db-secret"
    assert copied[0][1]["driver"] == "mysql"
    public = client.get("/api/settings/storage").json()["config"]
    assert public["driver"] == "mysql"
    assert public["mysql"]["hasPassword"] is True
    assert "password" not in public["mysql"]


def test_storage_rejects_bad_mysql_config(tmp_path, monkeypatch):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    monkeypatch.delenv("STORAGE_CONFIG_LOCKED", raising=False)
    response = client.post(
        "/api/settings/storage/test", headers=LOCAL_ORIGIN,
        json={
            "driver": "mysql",
            "mysql": {"host": "db", "port": 3306, "database": "utobond", "user": "app", "password": ""},
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == "STORAGE_ERROR"


def test_locked_storage_disables_browser_test_and_save(tmp_path, monkeypatch):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    monkeypatch.setenv("STORAGE_CONFIG_LOCKED", "1")
    tested = False

    def fake_test(_candidate):
        nonlocal tested
        tested = True

    monkeypatch.setattr(main.storage_backend, "test_connection", fake_test)
    body = {"driver": "sqlite", "sqlitePath": str(tmp_path / "other.db")}
    tested_response = client.post("/api/settings/storage/test", headers=LOCAL_ORIGIN, json=body)
    saved_response = client.put("/api/settings/storage", headers=LOCAL_ORIGIN, json=body)
    assert tested_response.status_code == 403
    assert saved_response.status_code == 403
    assert tested is False


def test_server_options_honor_host_and_port():
    assert server_run.server_options({}) == {"host": "127.0.0.1", "port": 8787}
    assert server_run.server_options({"HOST": "0.0.0.0", "PORT": "8080"}) == {
        "host": "0.0.0.0", "port": 8080,
    }
