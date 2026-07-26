/**
 * 统一 LLM 客户端。用原生 fetch 实现,不引任何 SDK ——
 * 自部署用户不需要为了换供应商去装第二个包,中转站的各种小差异也好绕。
 *
 * 对外只有三个函数:chatComplete / chatStream / testConnection。
 */
import { resolvePreset, isConfigured } from "./presets.js";

const DEFAULT_TIMEOUT = 90_000;

class AIError extends Error {
  constructor(message, { status = 502, code = "UPSTREAM" } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notConfigured = () =>
  new AIError("尚未配置模型。打开「模型设置」填入供应商、API Key 和模型名。", {
    status: 503, code: "NOT_CONFIGURED",
  });

/* ------------------------------ 请求构造 ------------------------------ */

function buildRequest(r, { messages, system, maxTokens, temperature, stream }) {
  if (r.kind === "anthropic") {
    return {
      url: `${r.baseURL}/v1/messages`,
      headers: {
        "content-type": "application/json",
        "x-api-key": r.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: r.model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        ...(temperature != null ? { temperature } : {}),
        messages,
        ...(stream ? { stream: true } : {}),
      },
    };
  }
  // openai 协议:system 作为第一条消息
  return {
    url: `${r.baseURL}/chat/completions`,
    headers: {
      "content-type": "application/json",
      ...(r.apiKey ? { authorization: `Bearer ${r.apiKey}` } : {}),
    },
    body: {
      model: r.model,
      max_tokens: maxTokens,
      ...(temperature != null ? { temperature } : {}),
      messages: system ? [{ role: "system", content: system }, ...messages] : messages,
      ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
    },
  };
}

async function send(r, payload, signal, timeout = DEFAULT_TIMEOUT) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  if (signal) signal.addEventListener("abort", () => ctl.abort(), { once: true });
  try {
    let res = await fetch(payload.url, {
      method: "POST",
      headers: payload.headers,
      body: JSON.stringify(payload.body),
      signal: ctl.signal,
    });
    // 部分新版 OpenAI 模型只认 max_completion_tokens,按上游报错自动改字段重试一次
    if (!res.ok && res.status === 400 && r.kind === "openai" && "max_tokens" in payload.body) {
      const detail = await res.text();
      if (/max_completion_tokens/i.test(detail)) {
        const { max_tokens, ...rest } = payload.body;
        res = await fetch(payload.url, {
          method: "POST",
          headers: payload.headers,
          body: JSON.stringify({ ...rest, max_completion_tokens: max_tokens }),
          signal: ctl.signal,
        });
      } else {
        throw new AIError(shortenUpstream(detail, res.status), { status: 502 });
      }
    }
    if (!res.ok) {
      throw new AIError(shortenUpstream(await res.text(), res.status), {
        status: res.status === 401 || res.status === 403 ? 401 : 502,
        code: res.status === 401 || res.status === 403 ? "BAD_KEY" : "UPSTREAM",
      });
    }
    return res;
  } catch (e) {
    if (e instanceof AIError) throw e;
    if (e.name === "AbortError") throw new AIError("模型请求超时", { status: 504, code: "TIMEOUT" });
    throw new AIError(`连不上模型服务:${e.message}`, { status: 502, code: "NETWORK" });
  } finally {
    clearTimeout(timer);
  }
}

/** 上游错误体可能很长甚至是 HTML,截断并尽量取出 message 字段 */
function shortenUpstream(text, status) {
  let msg = (text || "").trim();
  try {
    const j = JSON.parse(msg);
    msg = j.error?.message || j.message || j.error || msg;
  } catch { /* 非 JSON,原样截断 */ }
  if (typeof msg !== "string") msg = JSON.stringify(msg);
  return `上游返回 ${status}:${msg.slice(0, 300)}`;
}

/* ------------------------------ 响应解析 ------------------------------ */

const readUsage = (kind, u) => (kind === "anthropic"
  ? { input: u?.input_tokens ?? 0, output: u?.output_tokens ?? 0 }
  : { input: u?.prompt_tokens ?? 0, output: u?.completion_tokens ?? 0 });

/** 逐行吐出 SSE 的 data 负载 */
async function* sseLines(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
}

/* ------------------------------ 对外接口 ------------------------------ */

/** 一次性补全,返回纯文本 */
export async function chatComplete({ config, messages, system, maxTokens = 1000, temperature, signal }) {
  if (!isConfigured(config)) throw notConfigured();
  const r = resolvePreset(config);
  const t0 = Date.now();
  const res = await send(r, buildRequest(r, { messages, system, maxTokens, temperature }), signal);
  const data = await res.json();

  const text = r.kind === "anthropic"
    ? (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n")
    : data.choices?.[0]?.message?.content || "";

  return {
    text,
    model: r.model,
    provider: r.provider,
    usage: readUsage(r.kind, data.usage),
    ms: Date.now() - t0,
  };
}

/** 流式补全,逐块回调,用于 SSE 透传 */
export async function chatStream({ config, messages, system, maxTokens = 1000, temperature, signal }, onDelta) {
  if (!isConfigured(config)) throw notConfigured();
  const r = resolvePreset(config);
  const t0 = Date.now();
  const res = await send(r, buildRequest(r, { messages, system, maxTokens, temperature, stream: true }), signal);

  let usage = { input: 0, output: 0 };
  for await (const raw of sseLines(res)) {
    if (raw === "[DONE]") break;
    let evt;
    try { evt = JSON.parse(raw); } catch { continue; }
    if (r.kind === "anthropic") {
      if (evt.type === "content_block_delta" && evt.delta?.text) onDelta(evt.delta.text);
      if (evt.type === "message_start" && evt.message?.usage) usage = readUsage("anthropic", evt.message.usage);
      if (evt.type === "message_delta" && evt.usage) usage.output = evt.usage.output_tokens ?? usage.output;
      if (evt.type === "error") throw new AIError(evt.error?.message || "流式返回错误");
    } else {
      const d = evt.choices?.[0]?.delta?.content;
      if (d) onDelta(d);
      if (evt.usage) usage = readUsage("openai", evt.usage);
    }
  }
  return { model: r.model, provider: r.provider, usage, ms: Date.now() - t0 };
}

/** 连通性自检:发一句最短的话,验证 baseURL / key / 模型名三者都对 */
export async function testConnection(config) {
  if (!isConfigured(config)) {
    return { ok: false, error: "配置不完整:baseURL、模型名必填,除 Ollama 外还需 API Key。" };
  }
  try {
    const out = await chatComplete({
      config,
      messages: [{ role: "user", content: "只回复两个字:通了" }],
      maxTokens: 16,
      temperature: 0,
    });
    return {
      ok: true, ms: out.ms, model: out.model, provider: out.provider,
      sample: (out.text || "").trim().slice(0, 40), usage: out.usage,
    };
  } catch (e) {
    return { ok: false, code: e.code, status: e.status, error: e.message };
  }
}

export { AIError };
