#!/usr/bin/env python3
"""乌托帮一键启动器。

首次运行自动创建 Python 虚拟环境、安装依赖并构建前端；后续仅在依赖或源码
变化时刷新。最终由 FastAPI 在单一端口同时提供 API 与前端页面。
"""
import argparse
import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MIN_PYTHON = (3, 9)
MIN_NODE = (20, 19, 0)


class LaunchError(RuntimeError):
    """启动前置条件不满足。"""


def _run(command, cwd):
    print(f"[utobond] 执行: {' '.join(map(str, command))}")
    subprocess.run([str(part) for part in command], cwd=str(cwd), check=True)


def _venv_python(root):
    if os.name == "nt":
        return root / "apps" / "server" / ".venv" / "Scripts" / "python.exe"
    return root / "apps" / "server" / ".venv" / "bin" / "python"


def _digest(paths, root):
    digest = hashlib.sha256()
    for path in sorted({Path(p) for p in paths}):
        if not path.is_file():
            continue
        digest.update(str(path.relative_to(root)).encode("utf-8"))
        digest.update(path.read_bytes())
    return digest.hexdigest()


def _frontend_files(root):
    fixed = [
        root / "package.json",
        root / "package-lock.json",
        root / "apps" / "web" / "package.json",
        root / "apps" / "web" / "vite.config.js",
        root / "apps" / "web" / "index.html",
        root / "packages" / "core" / "package.json",
        root / "packages" / "ui" / "package.json",
    ]
    source_dirs = [
        root / "apps" / "web" / "src",
        root / "packages" / "core" / "src",
        root / "packages" / "ui" / "src",
    ]
    return fixed + [path for folder in source_dirs if folder.is_dir()
                    for path in folder.rglob("*") if path.is_file()]


def _parse_node_version(raw):
    try:
        parts = raw.strip().lstrip("v").split(".")
        return tuple(int(part) for part in parts[:3])
    except (TypeError, ValueError):
        raise LaunchError(f"无法识别 Node.js 版本: {raw!r}")


def _ensure_node():
    node = shutil.which("node")
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not node or not npm:
        raise LaunchError("首次构建需要 Node.js ≥ 20.19，请安装后重试。")
    version = _parse_node_version(subprocess.check_output([node, "--version"], text=True))
    if version < MIN_NODE:
        raise LaunchError(
            f"Node.js 版本过低（当前 {'.'.join(map(str, version))}），需要 ≥ 20.19。")
    return node, npm


def sync_python(root=ROOT, force=False):
    requirements = root / "apps" / "server" / "requirements.txt"
    marker = root / "apps" / "server" / ".venv" / ".utobond-runtime-hash"
    python = _venv_python(root)
    expected = _digest([requirements], root)

    if not python.exists():
        print("[utobond] 创建 Python 虚拟环境…")
        _run([sys.executable, "-m", "venv", root / "apps" / "server" / ".venv"], root)
    current = marker.read_text("utf-8").strip() if marker.is_file() else ""
    if force or current != expected:
        print("[utobond] 安装 Python 运行依赖…")
        _run([python, "-m", "pip", "install", "-r", requirements], root)
        marker.write_text(expected, "utf-8")
    return python


def sync_frontend(root=ROOT, force=False):
    dist = root / "apps" / "web" / "dist"
    build_marker = dist / ".utobond-build-hash"
    expected = _digest(_frontend_files(root), root)
    current = build_marker.read_text("utf-8").strip() if build_marker.is_file() else ""
    if not force and (dist / "index.html").is_file() and current == expected:
        return

    _node, npm = _ensure_node()
    lock_hash = _digest([root / "package-lock.json"], root)
    npm_marker = root / "node_modules" / ".utobond-lock-hash"
    installed_hash = npm_marker.read_text("utf-8").strip() if npm_marker.is_file() else ""
    if force or installed_hash != lock_hash:
        print("[utobond] 安装前端依赖…")
        _run([npm, "ci"], root)
        npm_marker.parent.mkdir(parents=True, exist_ok=True)
        npm_marker.write_text(lock_hash, "utf-8")

    print("[utobond] 构建前端…")
    _run([npm, "run", "build"], root)
    dist.mkdir(parents=True, exist_ok=True)
    build_marker.write_text(expected, "utf-8")


def _port(value):
    port = int(value)
    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError("端口必须在 1–65535 之间")
    return port


def main(argv=None, root=ROOT):
    if sys.version_info < MIN_PYTHON:
        raise LaunchError("需要 Python ≥ 3.9。")
    parser = argparse.ArgumentParser(description="准备依赖、构建并启动乌托帮")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=_port, default=os.environ.get("PORT", "8787"))
    parser.add_argument("--refresh", action="store_true", help="强制刷新依赖并重新构建")
    args = parser.parse_args(argv)

    python = sync_python(root, force=args.refresh)
    sync_frontend(root, force=args.refresh)
    env = os.environ.copy()
    env.update(HOST=args.host, PORT=str(args.port))
    url_host = "localhost" if args.host in {"0.0.0.0", "127.0.0.1"} else args.host
    print(f"[utobond] 准备完成，打开 http://{url_host}:{args.port}")
    return subprocess.call([str(python), str(root / "apps" / "server" / "run.py")],
                           cwd=str(root), env=env)


if __name__ == "__main__":  # pragma: no cover
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\n[utobond] 已停止。")
        raise SystemExit(130)
    except (LaunchError, subprocess.CalledProcessError) as exc:
        print(f"[utobond] 启动失败: {exc}", file=sys.stderr)
        raise SystemExit(1)
