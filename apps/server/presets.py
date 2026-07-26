"""供应商预设。

只有两种协议(kind):
  - "openai"    : POST {baseURL}/chat/completions —— DeepSeek、Kimi、智谱、通义、
                  Ollama、以及绝大多数「中转站」都是这个协议
  - "anthropic" : POST {baseURL}/v1/messages

想接一个没列在这里的服务:选「OpenAI 兼容(自定义 / 中转站)」,填它给的
baseURL 和 key 就行,不需要改代码。

字段用 camelCase —— 直接作为 JSON 回给前端,与 @utobond/ui 的模型设置页对齐。
"""

PRESETS = {
    "deepseek": {
        "id": "deepseek",
        "label": "DeepSeek",
        "kind": "openai",
        "baseURL": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-reasoner"],
        "defaultModel": "deepseek-chat",
        "keyHint": "sk-…",
        "site": "https://platform.deepseek.com",
        "note": "性价比高,中文场景表现稳,自部署首选。",
    },
    "openai": {
        "id": "openai",
        "label": "OpenAI",
        "kind": "openai",
        "baseURL": "https://api.openai.com/v1",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"],
        "defaultModel": "gpt-4o-mini",
        "keyHint": "sk-…",
        "site": "https://platform.openai.com",
        "note": "国内直连通常需要代理。",
    },
    "anthropic": {
        "id": "anthropic",
        "label": "Claude(Anthropic)",
        "kind": "anthropic",
        "baseURL": "https://api.anthropic.com",
        "models": ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5-20251001"],
        "defaultModel": "claude-sonnet-5",
        "keyHint": "sk-ant-…",
        "site": "https://console.anthropic.com",
        "note": "长文本与结构化输出稳定,本项目原生契约按它设计。",
    },
    "moonshot": {
        "id": "moonshot",
        "label": "月之暗面 Kimi",
        "kind": "openai",
        "baseURL": "https://api.moonshot.cn/v1",
        "models": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
        "defaultModel": "moonshot-v1-32k",
        "keyHint": "sk-…",
        "site": "https://platform.moonshot.cn",
        "note": "",
    },
    "zhipu": {
        "id": "zhipu",
        "label": "智谱 GLM",
        "kind": "openai",
        "baseURL": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4-plus", "glm-4-air", "glm-4-flash"],
        "defaultModel": "glm-4-air",
        "keyHint": "…….……",
        "site": "https://open.bigmodel.cn",
        "note": "glm-4-flash 有免费额度,适合先跑通流程。",
    },
    "dashscope": {
        "id": "dashscope",
        "label": "阿里通义千问",
        "kind": "openai",
        "baseURL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": ["qwen-plus", "qwen-max", "qwen-turbo"],
        "defaultModel": "qwen-plus",
        "keyHint": "sk-…",
        "site": "https://bailian.console.aliyun.com",
        "note": "用百炼的 OpenAI 兼容模式。",
    },
    "ollama": {
        "id": "ollama",
        "label": "Ollama(本机模型)",
        "kind": "openai",
        "baseURL": "http://localhost:11434/v1",
        "models": ["qwen2.5:14b", "llama3.1:8b", "deepseek-r1:14b"],
        "defaultModel": "qwen2.5:14b",
        "keyHint": "留空即可",
        "site": "https://ollama.com",
        "note": "完全离线。小参数量模型可能不稳定输出 JSON,失败会自动落内置模板。",
        "keyOptional": True,
    },
    "custom": {
        "id": "custom",
        "label": "OpenAI 兼容(自定义 / 中转站)",
        "kind": "openai",
        "baseURL": "",
        "models": [],
        "defaultModel": "",
        "keyHint": "中转站给你的 key",
        "site": "",
        "note": "填中转站给的 baseURL(通常以 /v1 结尾)和模型名即可。",
    },
}

PRESET_LIST = list(PRESETS.values())


def resolve_preset(config=None):
    """把用户配置补全成可直接发请求的形态"""
    config = config or {}
    preset = PRESETS.get(config.get("provider"), PRESETS["custom"])
    return {
        "provider": preset["id"],
        "kind": config.get("kind") or preset["kind"],
        "baseURL": (config.get("baseURL") or preset["baseURL"]).rstrip("/"),
        "apiKey": config.get("apiKey") or "",
        "model": config.get("model") or preset.get("defaultModel") or "",
        "keyOptional": bool(preset.get("keyOptional")),
    }


def is_configured(config):
    """配置是否足以发起真实调用"""
    r = resolve_preset(config)
    if not r["baseURL"] or not r["model"]:
        return False
    return True if r["keyOptional"] else bool(r["apiKey"])


def redact(config=None):
    """给前端看的脱敏配置:永远不回传完整 key"""
    config = config or {}
    key = config.get("apiKey") or ""
    return {
        "provider": config.get("provider") or "",
        "baseURL": config.get("baseURL") or "",
        "model": config.get("model") or "",
        "hasKey": bool(key),
        "keyMasked": f"{key[:4]}••••{key[-4:]}" if key else "",
        "configured": is_configured(config),
    }
