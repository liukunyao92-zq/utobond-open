/**
 * AI Provider 抽象层
 * 所有 AI 调用从这里出去。后续要换模型、加供应商(OpenAI/本地模型)、
 * 做多模型路由或降级,只改这一个文件,业务路由不动。
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.AI_MODEL || "claude-sonnet-4-6";

let _client = null;
function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error("ANTHROPIC_API_KEY 未配置"), { code: "NO_KEY" });
  }
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/** 普通补全:返回纯文本 */
export async function completeText({ messages, system, maxTokens = 1000 }) {
  const msg = await client().messages.create({
    model: MODEL, max_tokens: maxTokens, system, messages,
  });
  return {
    text: msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n"),
    model: MODEL,
    usage: msg.usage,
  };
}

/** 流式补全:逐块回调,用于 SSE */
export async function streamText({ messages, system, maxTokens = 1000 }, onDelta) {
  const stream = client().messages.stream({
    model: MODEL, max_tokens: maxTokens, system, messages,
  });
  stream.on("text", (delta) => onDelta(delta));
  const final = await stream.finalMessage();
  return { model: MODEL, usage: final.usage };
}

/**
 * 结构化输出:要求模型只回 JSON 并在服务端解析校验。
 * schema 用 zod,解析失败自动重试一次(把错误喂回去)。
 */
export async function completeJSON({ prompt, system, schema, maxTokens = 1400 }) {
  const sys = `${system}\n只输出 JSON,不要任何解释、前后缀或代码块标记。`;
  const strip = (t) => {
    let s = (t || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const a = s.indexOf("{"), b = s.lastIndexOf("}");
    return a >= 0 && b > a ? s.slice(a, b + 1) : s;
  };
  let messages = [{ role: "user", content: prompt }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, usage } = await completeText({ messages, system: sys, maxTokens });
    try {
      const data = JSON.parse(strip(text));
      return { data: schema ? schema.parse(data) : data, usage };
    } catch (e) {
      messages = [
        ...messages,
        { role: "assistant", content: text },
        { role: "user", content: `上面的输出无法解析为合法 JSON(${e.message})。重新只输出修正后的 JSON。` },
      ];
    }
  }
  throw Object.assign(new Error("AI 返回无法解析为 JSON"), { code: "BAD_JSON" });
}
