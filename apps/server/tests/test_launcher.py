"""根目录 Python 一键启动器的离线测试。"""
import argparse

import pytest

import start as launcher


def test_node_version_parser_and_port_validation(tmp_path, monkeypatch):
    assert launcher._parse_node_version("v20.19.1") == (20, 19, 1)
    with pytest.raises(launcher.LaunchError):
        launcher._parse_node_version("unknown")
    assert launcher._port("8787") == 8787
    with pytest.raises(argparse.ArgumentTypeError):
        launcher._port("70000")
    monkeypatch.setenv("PORT", "invalid")
    with pytest.raises(SystemExit) as exc:
        launcher.main([], tmp_path)
    assert exc.value.code == 2


def test_frontend_digest_changes_with_source_but_not_dist(tmp_path):
    source = tmp_path / "apps" / "web" / "src"
    source.mkdir(parents=True)
    entry = source / "main.jsx"
    entry.write_text("v1", "utf-8")
    first = launcher._digest(launcher._frontend_files(tmp_path), tmp_path)
    entry.write_text("v2", "utf-8")
    second = launcher._digest(launcher._frontend_files(tmp_path), tmp_path)
    (tmp_path / "apps" / "web" / "dist").mkdir()
    (tmp_path / "apps" / "web" / "dist" / "bundle.js").write_text("ignored", "utf-8")
    third = launcher._digest(launcher._frontend_files(tmp_path), tmp_path)
    assert first != second
    assert second == third


def test_sync_python_uses_requirement_hash_cache(tmp_path, monkeypatch):
    requirements = tmp_path / "apps" / "server" / "requirements.txt"
    requirements.parent.mkdir(parents=True)
    requirements.write_text("httpx>=0.27\n", "utf-8")
    python = launcher._venv_python(tmp_path)
    python.parent.mkdir(parents=True)
    python.write_text("", "utf-8")
    calls = []
    monkeypatch.setattr(launcher, "_run", lambda command, cwd: calls.append(command))

    assert launcher.sync_python(tmp_path) == python
    assert len(calls) == 1
    launcher.sync_python(tmp_path)
    assert len(calls) == 1, "依赖未变化时不应重复安装"


def test_sync_frontend_rebuilds_only_after_source_change(tmp_path, monkeypatch):
    source = tmp_path / "apps" / "web" / "src"
    dist = tmp_path / "apps" / "web" / "dist"
    source.mkdir(parents=True)
    dist.mkdir(parents=True)
    (source / "main.jsx").write_text("v1", "utf-8")
    (dist / "index.html").write_text("ok", "utf-8")
    expected = launcher._digest(launcher._frontend_files(tmp_path), tmp_path)
    (dist / ".utobond-build-hash").write_text(expected, "utf-8")
    calls = []
    monkeypatch.setattr(launcher, "_run", lambda command, cwd: calls.append(command))
    monkeypatch.setattr(launcher, "_ensure_node", lambda: ("node", "npm"))

    launcher.sync_frontend(tmp_path)
    assert calls == []
    (source / "main.jsx").write_text("v2", "utf-8")
    launcher.sync_frontend(tmp_path)
    assert calls == [["npm", "ci"], ["npm", "run", "build"]]


def test_main_prepares_and_launches_server(tmp_path, monkeypatch):
    python = tmp_path / "python"
    events = []
    monkeypatch.setattr(launcher, "sync_python", lambda root, force: python)
    monkeypatch.setattr(launcher, "sync_frontend", lambda root, force: events.append((root, force)))

    def fake_call(command, cwd, env):
        assert command == [str(python), str(tmp_path / "apps" / "server" / "run.py")]
        assert env["HOST"] == "0.0.0.0"
        assert env["PORT"] == "9000"
        return 0

    monkeypatch.setattr(launcher.subprocess, "call", fake_call)
    assert launcher.main(["--host", "0.0.0.0", "--port", "9000", "--refresh"], tmp_path) == 0
    assert events == [(tmp_path, True)]
