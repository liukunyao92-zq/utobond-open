import { Router } from "express";
import { completeText, streamText } from "../ai/provider.js";

export const aiRouter = Router();

/**
 * POST /api/ai/complete
 * 前端所有 AI 能力(选址/清单/体检/诊断/扫描/参谋/营销)统一走这里。
 * body: { messages:[{role,content}], system?, maxTokens? }
 * resp: { text, model, usage }
 */
aiRouter.post("/complete", async (req, res) => {
  const { messages, system, maxTokens } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages 必填" });
  }
  try {
    const out = await completeText({ messages, system, maxTokens });
    res.json(out);
  } catch (e) {
    const status = e.code === "NO_KEY" ? 503 : e.status || 502;
    res.status(status).json({ error: e.message });
  }
});

/**
 * POST /api/ai/stream — SSE 流式输出(参谋对话体验升级用,前端可渐进接入)
 */
aiRouter.post("/stream", async (req, res) => {
  const { messages, system, maxTokens } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages 必填" });
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  try {
    const meta = await streamText({ messages, system, maxTokens },
      (delta) => res.write(`data: ${JSON.stringify({ delta })}\n\n`));
    res.write(`data: ${JSON.stringify({ done: true, ...meta })}\n\n`);
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  } finally {
    res.end();
  }
});
