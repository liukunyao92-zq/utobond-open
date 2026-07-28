"""业务数据存储配置：默认 SQLite，也可切换到 MySQL。"""
import json
import os
from pathlib import Path


FILE_NAME = "storage.json"


class StorageConfigError(ValueError):
    pass


class StorageConfigLockedError(Exception):
    pass


def config_dir() -> Path:
    custom = os.environ.get("UTOBOND_CONFIG_DIR")
    return Path(custom) if custom else Path(__file__).parent / "data"


def config_path() -> Path:
    return config_dir() / FILE_NAME


def default_sqlite_path() -> str:
    return str(config_dir() / "utobond.db")


def is_locked() -> bool:
    return os.environ.get("STORAGE_CONFIG_LOCKED") == "1"


def from_env():
    driver = (os.environ.get("STORAGE_DRIVER") or "sqlite").lower()
    if driver == "mysql":
        return {
            "driver": "mysql",
            "mysql": {
                "host": os.environ.get("MYSQL_HOST") or "127.0.0.1",
                "port": _port(os.environ.get("MYSQL_PORT") or 3306),
                "database": os.environ.get("MYSQL_DATABASE") or "utobond",
                "user": os.environ.get("MYSQL_USER") or "utobond",
                "password": os.environ.get("MYSQL_PASSWORD") or "",
                "ssl": os.environ.get("MYSQL_SSL") == "1",
            },
        }
    return {
        "driver": "sqlite",
        "sqlitePath": os.environ.get("SQLITE_PATH") or default_sqlite_path(),
    }


def from_file():
    try:
        data = json.loads(config_path().read_text("utf-8"))
        return _normalize(data) if isinstance(data, dict) else None
    except (OSError, ValueError, StorageConfigError):
        return None


def load_storage_config():
    if is_locked():
        return from_env()
    return from_file() or from_env()


def _port(value):
    try:
        port = int(value)
    except (TypeError, ValueError) as exc:
        raise StorageConfigError("MySQL 端口必须是 1–65535 的整数。") from exc
    if not 1 <= port <= 65535:
        raise StorageConfigError("MySQL 端口必须是 1–65535 的整数。")
    return port


def _normalize(config):
    driver = str(config.get("driver") or "sqlite").lower()
    if driver not in {"sqlite", "mysql"}:
        raise StorageConfigError("存储类型只支持 sqlite 或 mysql。")
    if driver == "sqlite":
        path = str(config.get("sqlitePath") or default_sqlite_path()).strip()
        if not path:
            raise StorageConfigError("SQLite 文件路径不能为空。")
        return {"driver": "sqlite", "sqlitePath": path}

    raw = config.get("mysql") if isinstance(config.get("mysql"), dict) else {}
    result = {
        "driver": "mysql",
        "mysql": {
            "host": str(raw.get("host") or "127.0.0.1").strip(),
            "port": _port(raw.get("port") or 3306),
            "database": str(raw.get("database") or "").strip(),
            "user": str(raw.get("user") or "").strip(),
            "password": str(raw.get("password") or ""),
            "ssl": bool(raw.get("ssl")),
        },
    }
    mysql = result["mysql"]
    if not mysql["host"] or not mysql["database"] or not mysql["user"]:
        raise StorageConfigError("MySQL 主机、数据库名和用户名不能为空。")
    if not mysql["password"]:
        raise StorageConfigError("MySQL 密码不能为空。")
    return result


def build_storage_config(patch=None):
    """把前端补丁与当前配置合并；密码留空时只允许复用同一连接的密码。"""
    patch = patch or {}
    current = load_storage_config()
    driver = str(patch.get("driver") or current.get("driver") or "sqlite").lower()
    if driver == "sqlite":
        return _normalize({
            "driver": "sqlite",
            "sqlitePath": patch.get("sqlitePath") or current.get("sqlitePath") or default_sqlite_path(),
        })

    raw = patch.get("mysql") if isinstance(patch.get("mysql"), dict) else {}
    old = current.get("mysql") if current.get("driver") == "mysql" else {}
    host = str(raw.get("host") or old.get("host") or "127.0.0.1").strip()
    port = _port(raw.get("port") or old.get("port") or 3306)
    database = str(raw.get("database") or old.get("database") or "").strip()
    user = str(raw.get("user") or old.get("user") or "").strip()
    same_identity = (
        current.get("driver") == "mysql"
        and (host, port, database, user) ==
        (old.get("host"), old.get("port"), old.get("database"), old.get("user"))
    )
    submitted_password = raw.get("password", "")
    password = submitted_password or (old.get("password") if same_identity else "")
    return _normalize({
        "driver": "mysql",
        "mysql": {
            "host": host, "port": port, "database": database, "user": user,
            "password": password, "ssl": raw.get("ssl", old.get("ssl", False)),
        },
    })


def save_storage_config(config):
    if is_locked():
        raise StorageConfigLockedError(
            "数据存储配置已被部署方锁定(STORAGE_CONFIG_LOCKED=1)，只能改环境变量。")
    normalized = _normalize(config)
    config_dir().mkdir(parents=True, exist_ok=True)
    path = config_path()
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), "utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(path)
    os.chmod(path, 0o600)
    return normalized


def describe_storage_config():
    config = load_storage_config()
    out = {
        "driver": config["driver"],
        "locked": is_locked(),
        "source": "env" if is_locked() or from_file() is None else "file",
        "configPath": None if is_locked() else str(config_path()),
    }
    if config["driver"] == "sqlite":
        out["sqlitePath"] = config["sqlitePath"]
    else:
        mysql = config["mysql"]
        password = mysql.get("password") or ""
        out["mysql"] = {
            "host": mysql["host"], "port": mysql["port"],
            "database": mysql["database"], "user": mysql["user"],
            "ssl": mysql["ssl"], "hasPassword": bool(password),
            "passwordMasked": "••••••••" if password else "",
        }
    return out
