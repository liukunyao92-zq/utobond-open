"""生产启动入口：统一读取 HOST / PORT，避免脚本与日志配置漂移。"""
import os
from pathlib import Path

import uvicorn


def server_options(env=None):
    env = os.environ if env is None else env
    host = env.get("HOST", "127.0.0.1")
    try:
        port = int(env.get("PORT", "8787"))
    except (TypeError, ValueError) as exc:
        raise ValueError("PORT 必须是 1–65535 的整数") from exc
    if not 1 <= port <= 65535:
        raise ValueError("PORT 必须是 1–65535 的整数")
    return {"host": host, "port": port}


if __name__ == "__main__":
    options = server_options()
    uvicorn.run("main:app", app_dir=str(Path(__file__).parent), **options)
