"""乌托帮 · 自部署版后端(Python / FastAPI)。

职责只有两件:
  1. 转发 AI 请求 —— Key 留在服务端,前端永远拿不到
  2. 读写模型配置 —— 让用户在网页上换供应商,不用重启

没有用户、没有数据库、没有计费。数据都在浏览器里,关掉标签页就没了 ——
这是自部署版的取舍:零依赖、零运维、隐私最好。

启动:
  uvicorn main:app --port 8787
构建过前端(apps/web/dist 存在)时,同一进程直接托管页面,单端口即可用。
"""
import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse, StreamingResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

import llm_client  # noqa: E402
from config import (ConfigLockedError, describe_config, load_config,  # noqa: E402
                    save_config)
from presets import PRESET_LIST, is_configured  # noqa: E402

MAX_TOKENS_CAP = 4000

app = FastAPI(title="utobond-server", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _err(e: llm_client.AIError):
    return JSONResponse({"error": str(e), "code": e.code}, status_code=e.status)


async def _read_ai_body(request: Request):
    body = await request.json()
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        raise llm_client.AIError("messages 必填", status=400, code="BAD_REQUEST")
    return {
        "messages": messages,
        "system": body.get("system"),
        "max_tokens": min(int(body.get("maxTokens") or 1000), MAX_TOKENS_CAP),
        "temperature": body.get("temperature"),
        # capability 目前只做日志;云端版据此计费,这里保持同一契约
        "capability": body.get("capability") or "unknown",
    }


@app.get("/api/health")
def health():
    cfg = describe_config()
    return {
        "ok": True,
        "service": "utobond-server",
        "edition": "local",
        "aiConfigured": cfg["configured"],
        "provider": cfg["provider"] or None,
        "model": cfg["model"] or None,
        "configSource": cfg["source"],
    }


@app.post("/api/ai/complete")
async def ai_complete(request: Request):
    try:
        p = await _read_ai_body(request)
        out = llm_client.chat_complete(load_config(), p["messages"], p["system"],
                                       p["max_tokens"], p["temperature"])
        return out
    except llm_client.AIError as e:
        return _err(e)


@app.post("/api/ai/stream")
async def ai_stream(request: Request):
    try:
        p = await _read_ai_body(request)
    except llm_client.AIError as e:
        return _err(e)

    def gen():
        try:
            for kind, payload in llm_client.chat_stream(load_config(), p["messages"], p["system"],
                                                        p["max_tokens"], p["temperature"]):
                if kind == "delta":
                    yield f'data: {json.dumps({"delta": payload}, ensure_ascii=False)}\n\n'
                else:
                    yield f'data: {json.dumps({"done": True, **payload}, ensure_ascii=False)}\n\n'
        except llm_client.AIError as e:
            yield f'data: {json.dumps({"error": str(e), "code": e.code}, ensure_ascii=False)}\n\n'

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})


# ---- 模型设置:仅自部署版提供。云端版没有这些接口,平台 Key 不能让用户读写 ----

@app.get("/api/settings/llm")
def settings_get():
    return {"config": describe_config(), "presets": PRESET_LIST}


@app.put("/api/settings/llm")
async def settings_put(request: Request):
    try:
        save_config(await request.json() or {})
        return {"config": describe_config()}
    except ConfigLockedError as e:
        return JSONResponse({"error": str(e)}, status_code=403)


@app.post("/api/settings/llm/test")
async def settings_test(request: Request):
    """支持「先测再存」:body 里给的字段覆盖已存配置,key 留空则沿用已存的"""
    stored = load_config()
    patch = await request.json() or {}
    merged = {
        "provider": patch.get("provider") or stored.get("provider"),
        "baseURL": patch.get("baseURL") or stored.get("baseURL"),
        "model": patch.get("model") or stored.get("model"),
        "apiKey": patch.get("apiKey") or stored.get("apiKey"),
    }
    return llm_client.test_connection(merged)


# 构建过的前端直接托管,单进程部署
_dist = Path(__file__).parent.parent / "web" / "dist"
if _dist.is_dir():
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="web")


def print_startup():
    cfg = describe_config()
    port = os.environ.get("PORT", "8787")
    print(f"[utobond] 自部署版后端已启动 → http://localhost:{port}")
    if is_configured(load_config()):
        src = "配置文件" if cfg["source"] == "file" else "环境变量"
        print(f'[utobond] 模型:{cfg["provider"]} / {cfg["model"]}(来自{src})')
    else:
        print("[utobond] 尚未配置模型 —— AI 接口返回 503,前端自动落内置模板。")
        print("[utobond] 去网页左侧「模型设置」填一下,或改 apps/server/.env。")


print_startup()
