"""本地部署版的模型配置来源。

磁盘文件使用 ``{version, activeId, configs}`` 保存多套模型连接。AI 请求只读取
activeId 指向的配置；旧版单配置 JSON 会在第一次写入时自动升级，已有 Key 不丢失。

设 LLM_CONFIG_LOCKED=1 可锁死配置（只认环境变量，界面变只读），适合把本项目
部署给团队使用、不希望其他人切换或修改 Key 的场景。
"""
import json
import os
import uuid
from pathlib import Path

from presets import PRESETS, redact

FILE_NAME = "llm.json"
STORE_VERSION = 2


def config_dir() -> Path:
    custom = os.environ.get("UTOBOND_CONFIG_DIR")
    return Path(custom) if custom else Path(__file__).parent / "data"


def config_path() -> Path:
    return config_dir() / FILE_NAME


def is_locked() -> bool:
    return os.environ.get("LLM_CONFIG_LOCKED") == "1"


def from_env():
    """从环境变量读。兼容早期只支持 Anthropic 时的 ANTHROPIC_API_KEY。"""
    legacy_key = os.environ.get("ANTHROPIC_API_KEY")
    provider = os.environ.get("LLM_PROVIDER") or ("anthropic" if legacy_key else "")
    if not provider:
        return None
    preset = PRESETS.get(provider, PRESETS["custom"])
    return {
        "id": "env",
        "name": "环境变量配置",
        "provider": provider,
        "baseURL": os.environ.get("LLM_BASE_URL") or preset["baseURL"],
        "apiKey": os.environ.get("LLM_API_KEY") or legacy_key or "",
        "model": os.environ.get("LLM_MODEL") or os.environ.get("AI_MODEL")
                 or preset.get("defaultModel") or "",
    }


def _default_name(config):
    provider = config.get("provider") or "custom"
    preset = PRESETS.get(provider, PRESETS["custom"])
    model = config.get("model") or preset.get("defaultModel") or ""
    return f'{preset["label"]} · {model}' if model else preset["label"]


def _normalize_config(config, fallback_id=None):
    if not isinstance(config, dict) or not config.get("provider"):
        return None
    item = {
        "id": str(config.get("id") or fallback_id or uuid.uuid4().hex[:12]),
        "name": str(config.get("name") or _default_name(config)).strip()[:80],
        "provider": str(config.get("provider") or ""),
        "baseURL": str(config.get("baseURL") or ""),
        "model": str(config.get("model") or ""),
        "apiKey": str(config.get("apiKey") or ""),
    }
    return item


def _store_from_data(data):
    """把 v2 或旧版单配置转换为内存中的统一结构。"""
    if not isinstance(data, dict):
        return None
    if isinstance(data.get("configs"), list):
        configs = []
        seen = set()
        for raw in data["configs"]:
            item = _normalize_config(raw)
            if item and item["id"] not in seen:
                configs.append(item)
                seen.add(item["id"])
        active_id = str(data.get("activeId") or "")
        if active_id not in seen:
            active_id = configs[0]["id"] if configs else ""
        return {"version": STORE_VERSION, "activeId": active_id, "configs": configs}
    legacy = _normalize_config(data, "legacy")
    if legacy:
        return {"version": STORE_VERSION, "activeId": legacy["id"], "configs": [legacy]}
    return None


def _file_store():
    try:
        data = json.loads(config_path().read_text("utf-8"))
        # 一个合法的空 v2 文件也要盖过环境变量，便于用户删除最后一条配置。
        if isinstance(data, dict) and isinstance(data.get("configs"), list):
            return _store_from_data(data) or {"version": STORE_VERSION, "activeId": "", "configs": []}
        return _store_from_data(data)
    except (OSError, ValueError):
        return None


def _env_store():
    cfg = from_env()
    return ({"version": STORE_VERSION, "activeId": cfg["id"], "configs": [cfg]}
            if cfg else {"version": STORE_VERSION, "activeId": "", "configs": []})


def load_config_store():
    """读取配置集合，返回的 Key 仍为明文，只允许在服务端内部使用。"""
    if is_locked():
        return _env_store()
    stored = _file_store()
    return stored if stored is not None else _env_store()


def from_file():
    """兼容旧调用：返回磁盘中当前启用的单条配置。"""
    store = _file_store()
    return _find_config(store, store.get("activeId")) if store else None


def _find_config(store, config_id):
    if not store or not config_id:
        return None
    return next((item for item in store["configs"] if item["id"] == config_id), None)


def get_config(config_id):
    """按 id 读取一条配置（含明文 Key），测试未启用配置时使用。"""
    return _find_config(load_config_store(), config_id)


def load_config():
    """当前启用配置（含明文 Key，只在服务端流转）。"""
    store = load_config_store()
    return _find_config(store, store["activeId"]) or {}


class ConfigLockedError(Exception):
    pass


class ConfigNotFoundError(Exception):
    pass


def _write_store(store):
    config_dir().mkdir(parents=True, exist_ok=True)
    p = config_path()
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(store, ensure_ascii=False, indent=2), "utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(p)
    os.chmod(p, 0o600)


def _merged_config(current, patch):
    patch = patch or {}
    current = current or {}
    provider = patch.get("provider") or current.get("provider") or ""
    base_url = patch.get("baseURL") or current.get("baseURL") or ""
    identity_changed = (
        provider != current.get("provider", "")
        or base_url.rstrip("/") != (current.get("baseURL") or "").rstrip("/")
    )
    submitted_key = patch.get("apiKey", "")
    if identity_changed and not submitted_key:
        api_key = ""
    else:
        # 空字符串表示保留当前 Key，null 表示显式清空。
        api_key = "" if submitted_key is None else (submitted_key or current.get("apiKey") or "")

    nxt = {
        "id": current.get("id") or "",
        "name": str(patch.get("name") or current.get("name") or "").strip()[:80],
        "provider": provider,
        "baseURL": base_url,
        "model": patch.get("model") or current.get("model") or "",
        "apiKey": api_key,
    }
    preset = PRESETS.get(nxt["provider"], {})
    if not nxt["baseURL"]:
        nxt["baseURL"] = preset.get("baseURL", "")
    if not nxt["model"]:
        nxt["model"] = preset.get("defaultModel", "")
    if not nxt["name"]:
        nxt["name"] = _default_name(nxt)
    return nxt


def create_config(patch=None):
    """新增一套连接；只有第一条配置会自动启用。"""
    if is_locked():
        raise ConfigLockedError("模型配置已被部署方锁定(LLM_CONFIG_LOCKED=1),只能改环境变量。")
    store = load_config_store()
    item = _merged_config({}, patch or {})
    item["id"] = uuid.uuid4().hex[:12]
    store["configs"].append(item)
    if not store["activeId"]:
        store["activeId"] = item["id"]
    _write_store(store)
    return item


def update_config(config_id, patch=None):
    """更新指定连接，不改变当前启用项。"""
    if is_locked():
        raise ConfigLockedError("模型配置已被部署方锁定(LLM_CONFIG_LOCKED=1),只能改环境变量。")
    store = load_config_store()
    index = next((i for i, item in enumerate(store["configs"])
                  if item["id"] == config_id), None)
    if index is None:
        raise ConfigNotFoundError("模型配置不存在或已被删除。")
    updated = _merged_config(store["configs"][index], patch or {})
    updated["id"] = config_id
    store["configs"][index] = updated
    _write_store(store)
    return updated


def save_config(patch=None):
    """兼容旧版：更新当前启用项；尚无配置时新增并启用。"""
    store = load_config_store()
    if store["activeId"]:
        return update_config(store["activeId"], patch)
    return create_config(patch)


def activate_config(config_id):
    if is_locked():
        raise ConfigLockedError("模型配置已被部署方锁定(LLM_CONFIG_LOCKED=1),只能改环境变量。")
    store = load_config_store()
    item = _find_config(store, config_id)
    if not item:
        raise ConfigNotFoundError("模型配置不存在或已被删除。")
    store["activeId"] = config_id
    _write_store(store)
    return item


def delete_config(config_id):
    if is_locked():
        raise ConfigLockedError("模型配置已被部署方锁定(LLM_CONFIG_LOCKED=1),只能改环境变量。")
    store = load_config_store()
    if not _find_config(store, config_id):
        raise ConfigNotFoundError("模型配置不存在或已被删除。")
    store["configs"] = [item for item in store["configs"] if item["id"] != config_id]
    if store["activeId"] == config_id:
        store["activeId"] = store["configs"][0]["id"] if store["configs"] else ""
    _write_store(store)


def _source():
    if is_locked():
        return "env"
    return "file" if _file_store() is not None else ("env" if from_env() else "none")


def describe_config():
    """当前启用项的脱敏回显。"""
    cfg = load_config()
    out = redact(cfg)
    out.update({
        "id": cfg.get("id") or "",
        "name": cfg.get("name") or "",
        "locked": is_locked(),
        "source": _source(),
        "configPath": None if is_locked() else str(config_path()),
    })
    return out


def describe_configs():
    """返回可供设置页展示的脱敏列表，绝不回传完整 Key。"""
    store = load_config_store()
    items = []
    for cfg in store["configs"]:
        item = redact(cfg)
        item.update({
            "id": cfg["id"],
            "name": cfg.get("name") or _default_name(cfg),
            "active": cfg["id"] == store["activeId"],
        })
        items.append(item)
    return {
        "config": describe_config(),
        "configs": items,
        "activeId": store["activeId"],
    }
