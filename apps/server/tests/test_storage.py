"""SQLite 默认持久化与 MySQL 配置的离线测试。"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

import storage  # noqa: E402
import storage_config as cfg  # noqa: E402


def _clean_storage_env(monkeypatch, tmp_path):
    monkeypatch.setenv("UTOBOND_CONFIG_DIR", str(tmp_path))
    for name in (
        "STORAGE_DRIVER", "SQLITE_PATH", "MYSQL_HOST", "MYSQL_PORT",
        "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_SSL",
        "STORAGE_CONFIG_LOCKED",
    ):
        monkeypatch.delenv(name, raising=False)


def test_sqlite_is_default_and_persists_snapshot(tmp_path, monkeypatch):
    _clean_storage_env(monkeypatch, tmp_path)
    config = cfg.load_storage_config()
    assert config == {"driver": "sqlite", "sqlitePath": str(tmp_path / "utobond.db")}
    assert storage.load_snapshot() is None

    snapshot = {"stores": {"offline": {"name": "测试店"}}, "off": {"rent": 5000}}
    storage.save_snapshot(snapshot)
    assert storage.load_snapshot() == snapshot
    assert (tmp_path / "utobond.db").is_file()
    assert storage.test_connection()["driver"] == "sqlite"


def test_mysql_config_is_redacted_and_blank_password_can_be_reused(tmp_path, monkeypatch):
    _clean_storage_env(monkeypatch, tmp_path)
    saved = cfg.save_storage_config({
        "driver": "mysql",
        "mysql": {
            "host": "db.internal", "port": 3307, "database": "uto",
            "user": "app", "password": "super-secret", "ssl": True,
        },
    })
    assert saved["mysql"]["password"] == "super-secret"
    described = cfg.describe_storage_config()
    assert described["mysql"]["passwordMasked"] == "••••••••"
    assert "password" not in described["mysql"]

    merged = cfg.build_storage_config({
        "driver": "mysql",
        "mysql": {
            "host": "db.internal", "port": 3307, "database": "uto",
            "user": "app", "password": "", "ssl": True,
        },
    })
    assert merged["mysql"]["password"] == "super-secret"

    with pytest.raises(cfg.StorageConfigError):
        cfg.build_storage_config({
            "driver": "mysql",
            "mysql": {
                "host": "other.internal", "port": 3306, "database": "uto",
                "user": "app", "password": "",
            },
        })
    assert json.loads((tmp_path / "storage.json").read_text("utf-8"))["mysql"]["password"] == "super-secret"


def test_storage_config_lock_uses_environment(tmp_path, monkeypatch):
    _clean_storage_env(monkeypatch, tmp_path)
    monkeypatch.setenv("STORAGE_DRIVER", "mysql")
    monkeypatch.setenv("MYSQL_HOST", "env-db")
    monkeypatch.setenv("MYSQL_DATABASE", "utobond")
    monkeypatch.setenv("MYSQL_USER", "env-user")
    monkeypatch.setenv("MYSQL_PASSWORD", "env-secret")
    monkeypatch.setenv("STORAGE_CONFIG_LOCKED", "1")
    assert cfg.load_storage_config()["mysql"]["host"] == "env-db"
    with pytest.raises(cfg.StorageConfigLockedError):
        cfg.save_storage_config({"driver": "sqlite", "sqlitePath": str(tmp_path / "x.db")})


def test_snapshot_validation_and_size_limit(tmp_path, monkeypatch):
    _clean_storage_env(monkeypatch, tmp_path)
    with pytest.raises(storage.StorageError):
        storage.save_snapshot([])
    monkeypatch.setattr(storage, "MAX_SNAPSHOT_BYTES", 10)
    with pytest.raises(storage.StorageError):
        storage.save_snapshot({"too": "large payload"})
