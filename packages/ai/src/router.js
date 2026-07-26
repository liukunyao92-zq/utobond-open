/**
 * Express 路由工厂。
 *
 * 本地版和云端版共用同一套路由,差别全在注入的三个钩子里:
 *   resolveConfig(req) → 用哪套模型配置(本地=用户自己的;云端=平台统一的)
 *   guard(req, meta)   → 放不放行(本地=永远放行;云端=鉴权 + 档位 + 额度)
 *   onUsage(req, rec)  → 用完记一笔(本地=不记;云端=落库计费)
 *
 * 这样闭源仓库不需要 fork 这段代码,只提供钩子实现。
 */
import { Router } from "express";
import { chatComplete, chatStream, AIError } from "./client.js";
import { PRESET_LIST } from "./presets.js";

const pass = async () => ({ ok: true });
const noop = async () => {};

export function createAIRouter({
  resolveConfig,
  guard = pass,
  onUsage = noop,
  maxTokensCap = 4000,
} = {}) {
  const router = Router();

  const readBody = (req) => {
    const { messages, system, maxTokens, capability, temperature } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      const e = new AIError("messages 必填", { status: 400, code: "BAD_REQUEST" });
      throw e;
    }
    return {
      messages,
      system,
      capability: capability || "unknown",
      temperature,
      maxTokens: Math.min(Number(maxTokens) || 1000, maxTokensCap),
    };
  };

  const fail = (res, e) => {
    const status = e.status || 502;
    res.status(status).json({ error: e.message, code: e.code || "ERROR" });
  };

  /** POST /complete —— 前端所有一次性 AI 能力都走这里 */
  router.post("/complete", async (req, res) => {
    let input;
    try { input = readBody(req); } catch (e) { return fail(res, e); }

    const verdict = await guard(req, { capability: input.capability, stream: false });
    if (!verdict.ok) {
      return res.status(verdict.status || 402).json({ error: verdict.error, code: verdict.code || "FORBIDDEN", ...verdict.extra });
    }
    try {
      const config = await resolveConfig(req);
      const out = await chatComplete({ config, ...input });
      await onUsage(req, { ...out, capability: input.capability, ok: true });
      res.json(out);
    } catch (e) {
      await onUsage(req, { capability: input.capability, ok: false, error: e.message, ms: 0 });
      fail(res, e);
    }
  });

  /** POST /stream —— SSE 流式,参谋对话用 */
  router.post("/stream", async (req, res) => {
    let input;
    try { input = readBody(req); } catch (e) { return fail(res, e); }

    const verdict = await guard(req, { capability: input.capability, stream: true });
    if (!verdict.ok) {
      return res.status(verdict.status || 402).json({ error: verdict.error, code: verdict.code || "FORBIDDEN" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const abort = new AbortController();
    req.on("close", () => abort.abort());

    try {
      const config = await resolveConfig(req);
      const meta = await chatStream(
        { config, ...input, signal: abort.signal },
        (delta) => res.write(`data: ${JSON.stringify({ delta })}\n\n`),
      );
      await onUsage(req, { ...meta, capability: input.capability, ok: true });
      res.write(`data: ${JSON.stringify({ done: true, ...meta })}\n\n`);
    } catch (e) {
      await onUsage(req, { capability: input.capability, ok: false, error: e.message, ms: 0 });
      res.write(`data: ${JSON.stringify({ error: e.message, code: e.code })}\n\n`);
    } finally {
      res.end();
    }
  });

  return router;
}

/**
 * 模型设置路由(仅本地部署版挂载)。
 * 云端版绝不能挂 —— 那边的 Key 是平台的,不能让用户读写。
 */
export function createSettingsRouter({ describe, save, test, load }) {
  const router = Router();

  router.get("/llm", (_req, res) => {
    res.json({ config: describe(), presets: PRESET_LIST });
  });

  router.put("/llm", (req, res) => {
    try {
      save(req.body || {});
      res.json({ config: describe() });
    } catch (e) {
      res.status(e.status || 400).json({ error: e.message });
    }
  });

  /** 支持「先测再存」:body 里给的字段覆盖已存配置,key 留空则沿用已存的 */
  router.post("/llm/test", async (req, res) => {
    const stored = load();
    const patch = req.body || {};
    const merged = {
      provider: patch.provider ?? stored.provider,
      baseURL: patch.baseURL ?? stored.baseURL,
      model: patch.model ?? stored.model,
      apiKey: patch.apiKey || stored.apiKey,
    };
    res.json(await test(merged));
  });

  return router;
}
