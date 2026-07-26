"""本地部署版的模型配置来源。

优先级:磁盘配置文件 > 环境变量。
环境变量是「开箱默认值」,网页「模型设置」页存下来的配置会盖住它 ——
这样部署时给个默认 Key 也行,用户想换随时在界面改,不用重启。

设 LLM_CONFIG_LOCKED=1 可锁死配置(只认环境变量,界面变只读),
适合把本项目部署给团队用、不希望别人改 Key 的场景。
"""
import json
import os
from pathlib import Path

from presets import PRESETS, redact

FILE_NAME = "llm.json"


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
        "provider": provider,
        "baseURL": os.environ.get("LLM_BASE_URL") or preset["baseURL"],
        "apiKey": os.environ.get("LLM_API_KEY") or legacy_key or "",
        "model": os.environ.get("LLM_MODEL") or os.environ.get("AI_MODEL")
                 or preset.get("defaultModel") or "",
    }


def from_file():
    try:
        data = json.loads(config_path().read_text("utf-8"))
        return data if isinstance(data, dict) and data.get("provider") else None
    except (OSError, ValueError):
        return None  # 文件不存在或坏了都当没配,不阻断启动


def load_config():
    """当前生效配置(含明文 key,只在服务端流转)"""
    if is_locked():
        return from_env() or {}
    return from_file() or from_env() or {}


class ConfigLockedError(Exception):
    pass


def save_config(patch=None):
    """写入磁盘,权限 0600。"""
    if is_locked():
        raise ConfigLockedError("模型配置已被部署方锁定(LLM_CONFIG_LOCKED=1),只能改环境变量。")
    patch = patch or {}
    current = load_config()

    def pick(key):
        v = patch.get(key)
        return v if v is not None and v != "" else current.get(key, "")

    nxt = {
        "provider": patch.get("provider") or current.get("provider") or "",
        "baseURL": patch.get("baseURL") or current.get("baseURL") or "",
        "model": patch.get("model") or current.get("model") or "",
        # 前端提交空字符串表示「不改 key」,提交 null 表示「清空」
        "apiKey": "" if patch.get("apiKey", "") is None else (patch.get("apiKey") or current.get("apiKey") or ""),
    }
    preset = PRESETS.get(nxt["provider"], {})
    if not nxt["baseURL"]:
        nxt["baseURL"] = preset.get("baseURL", "")
    if not nxt["model"]:
        nxt["model"] = preset.get("defaultModel", "")

    config_dir().mkdir(parents=True, exist_ok=True)
    p = config_path()
    p.write_text(json.dumps(nxt, ensure_ascii=False, indent=2), "utf-8")
    os.chmod(p, 0o600)
    return nxt


def describe_config():
    """供 /api/settings/llm 回显:脱敏 + 告诉前端配置从哪来、能不能改"""
    cfg = load_config()
    locked = is_locked()
    source = "env" if locked else ("file" if from_file() else ("env" if from_env() else "none"))
    out = redact(cfg)
    out.update({
        "locked": locked,
        "source": source,
        "configPath": None if locked else str(config_path()),
    })
    return out
