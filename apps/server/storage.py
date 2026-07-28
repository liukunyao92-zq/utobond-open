"""SQLite / MySQL 业务快照存储适配器。"""
import json
import sqlite3
import time
from pathlib import Path

from storage_config import load_storage_config


MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024


class StorageError(RuntimeError):
    pass


def _sqlite_path(config):
    path = Path(config["sqlitePath"]).expanduser()
    return path if path.is_absolute() else Path.cwd() / path


def _connect_mysql(config):
    import pymysql
    mysql = config["mysql"]
    ssl = {"check_hostname": True} if mysql.get("ssl") else None
    return pymysql.connect(
        host=mysql["host"], port=mysql["port"], user=mysql["user"],
        password=mysql["password"], database=mysql["database"],
        charset="utf8mb4", connect_timeout=5, read_timeout=8, write_timeout=8,
        autocommit=False, ssl=ssl,
    )


def _ensure_sqlite(config):
    path = _sqlite_path(config)
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(path), timeout=5)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("""
        CREATE TABLE IF NOT EXISTS app_snapshot (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    connection.commit()
    return connection


def _ensure_mysql(config):
    connection = _connect_mysql(config)
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS app_snapshot (
                id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
                payload LONGTEXT NOT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4
        """)
    connection.commit()
    return connection


def _connection(config):
    return _ensure_mysql(config) if config["driver"] == "mysql" else _ensure_sqlite(config)


def load_snapshot(config=None):
    config = config or load_storage_config()
    try:
        connection = _connection(config)
        try:
            if config["driver"] == "mysql":
                with connection.cursor() as cursor:
                    cursor.execute("SELECT payload FROM app_snapshot WHERE id = 1")
                    row = cursor.fetchone()
            else:
                row = connection.execute(
                    "SELECT payload FROM app_snapshot WHERE id = 1").fetchone()
        finally:
            connection.close()
        if not row:
            return None
        data = json.loads(row[0])
        return data if isinstance(data, dict) else None
    except (OSError, sqlite3.Error, ValueError) as exc:
        raise StorageError(f"读取 {config['driver']} 数据失败：{exc}") from exc
    except Exception as exc:
        raise StorageError(f"读取 {config['driver']} 数据失败：{exc}") from exc


def save_snapshot(snapshot, config=None):
    if not isinstance(snapshot, dict):
        raise StorageError("业务快照必须是 JSON 对象。")
    config = config or load_storage_config()
    payload = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"))
    if len(payload.encode("utf-8")) > MAX_SNAPSHOT_BYTES:
        raise StorageError("业务快照超过 5 MB，拒绝保存。")
    try:
        connection = _connection(config)
        try:
            if config["driver"] == "mysql":
                with connection.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO app_snapshot (id, payload) VALUES (1, %s)
                        ON DUPLICATE KEY UPDATE payload = VALUES(payload)
                    """, (payload,))
            else:
                connection.execute("""
                    INSERT INTO app_snapshot (id, payload, updated_at)
                    VALUES (1, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(id) DO UPDATE SET
                        payload = excluded.payload, updated_at = CURRENT_TIMESTAMP
                """, (payload,))
            connection.commit()
        finally:
            connection.close()
    except (OSError, sqlite3.Error) as exc:
        raise StorageError(f"写入 {config['driver']} 数据失败：{exc}") from exc
    except Exception as exc:
        raise StorageError(f"写入 {config['driver']} 数据失败：{exc}") from exc


def test_connection(config=None):
    config = config or load_storage_config()
    started = time.monotonic()
    try:
        connection = _connection(config)
        try:
            if config["driver"] == "mysql":
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
            else:
                connection.execute("SELECT 1").fetchone()
        finally:
            connection.close()
        return {
            "ok": True,
            "driver": config["driver"],
            "ms": round((time.monotonic() - started) * 1000),
        }
    except Exception as exc:
        raise StorageError(f"连接 {config['driver']} 失败：{exc}") from exc
