import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { chatComplete, chatStream } from "../src/client.js";
import { resolvePreset, isConfigured, redact } from "../src/presets.js";

const realFetch = globalThis.fetch;
let calls = [];

/** 用一个假的 fetch 把请求录下来,顺便按协议回一个像样的响应 */
function stubFetch(responder) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return responder(url, init);
  };
}
const jsonRes = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json" },
});
const sseRes = (chunks) => new Response(
  new ReadableStream({
    start(c) {
      for (const l of chunks) c.enqueue(new TextEncoder().encode(`data: ${l}\n\n`));
      c.close();
    },
  }),
  { status: 200, headers: { "content-type": "text/event-stream" } },
);

beforeEach(() => { calls = []; });
afterEach(() => { globalThis.fetch = realFetch; });

const OPENAI = { provider: "deepseek", apiKey: "sk-test", model: "deepseek-chat" };
const CLAUDE = { provider: "anthropic", apiKey: "sk-ant-test", model: "claude-sonnet-5" };

test("预设补全:只给 provider 就能算出 baseURL 和默认模型", () => {
  const r = resolvePreset({ provider: "deepseek", apiKey: "k" });
  assert.equal(r.baseURL, "https://api.deepseek.com/v1");
  assert.equal(r.model, "deepseek-chat");
  assert.equal(r.kind, "openai");
});

test("中转站:自定义 baseURL 覆盖预设,末尾斜杠被清掉", () => {
  const r = resolvePreset({ provider: "custom", baseURL: "https://relay.example.com/v1/", model: "gpt-4o", apiKey: "k" });
  assert.equal(r.baseURL, "https://relay.example.com/v1");
  assert.ok(isConfigured({ provider: "custom", baseURL: "https://x/v1", model: "m", apiKey: "k" }));
  assert.ok(!isConfigured({ provider: "custom", baseURL: "https://x/v1", model: "m" }), "缺 key 应判未配置");
});

test("Ollama 免 Key 也算配置完整", () => {
  assert.ok(isConfigured({ provider: "ollama", model: "qwen2.5:14b" }));
});

test("脱敏:永远不回传完整 Key", () => {
  const r = redact({ provider: "deepseek", apiKey: "sk-abcdefghijklmn", model: "deepseek-chat" });
  assert.equal(r.keyMasked, "sk-a••••klmn");
  assert.ok(!("apiKey" in r));
  assert.equal(r.hasKey, true);
});

test("OpenAI 协议:system 进 messages,Bearer 鉴权,取 choices 文本", async () => {
  stubFetch(() => jsonRes({
    choices: [{ message: { content: "好的" } }],
    usage: { prompt_tokens: 11, completion_tokens: 3 },
  }));
  const out = await chatComplete({
    config: OPENAI, system: "你是参谋", messages: [{ role: "user", content: "在吗" }], maxTokens: 100,
  });
  const c = calls[0];
  assert.equal(c.url, "https://api.deepseek.com/v1/chat/completions");
  assert.equal(c.init.headers.authorization, "Bearer sk-test");
  assert.deepEqual(c.body.messages[0], { role: "system", content: "你是参谋" });
  assert.equal(out.text, "好的");
  assert.deepEqual(out.usage, { input: 11, output: 3 });
});

test("Anthropic 协议:system 独立字段,x-api-key 鉴权,拼接 text block", async () => {
  stubFetch(() => jsonRes({
    content: [{ type: "text", text: "行" }, { type: "thinking", text: "忽略" }],
    usage: { input_tokens: 5, output_tokens: 2 },
  }));
  const out = await chatComplete({ config: CLAUDE, system: "你是参谋", messages: [{ role: "user", content: "在吗" }] });
  const c = calls[0];
  assert.equal(c.url, "https://api.anthropic.com/v1/messages");
  assert.equal(c.init.headers["x-api-key"], "sk-ant-test");
  assert.equal(c.init.headers["anthropic-version"], "2023-06-01");
  assert.equal(c.body.system, "你是参谋");
  assert.equal(out.text, "行");
});

test("上游 400 且提示 max_completion_tokens 时自动换字段重试", async () => {
  let n = 0;
  stubFetch(() => {
    n += 1;
    if (n === 1) return jsonRes({ error: { message: "Unsupported parameter: 'max_tokens'. Use 'max_completion_tokens'." } }, 400);
    return jsonRes({ choices: [{ message: { content: "ok" } }], usage: {} });
  });
  const out = await chatComplete({ config: { ...OPENAI, provider: "openai", model: "gpt-4o" }, messages: [{ role: "user", content: "hi" }], maxTokens: 50 });
  assert.equal(n, 2);
  assert.equal(calls[1].body.max_completion_tokens, 50);
  assert.ok(!("max_tokens" in calls[1].body));
  assert.equal(out.text, "ok");
});

test("401 归一成 BAD_KEY,错误文案带上游原因", async () => {
  stubFetch(() => jsonRes({ error: { message: "invalid api key" } }, 401));
  await assert.rejects(
    () => chatComplete({ config: OPENAI, messages: [{ role: "user", content: "hi" }] }),
    (e) => e.code === "BAD_KEY" && e.status === 401 && /invalid api key/.test(e.message),
  );
});

test("未配置直接 503,不发请求", async () => {
  stubFetch(() => jsonRes({}));
  await assert.rejects(
    () => chatComplete({ config: { provider: "deepseek" }, messages: [{ role: "user", content: "hi" }] }),
    (e) => e.code === "NOT_CONFIGURED" && e.status === 503,
  );
  assert.equal(calls.length, 0);
});

test("OpenAI 流式:按 delta 回调并读到 usage", async () => {
  stubFetch(() => sseRes([
    JSON.stringify({ choices: [{ delta: { content: "先" } }] }),
    JSON.stringify({ choices: [{ delta: { content: "帮后托" } }] }),
    JSON.stringify({ choices: [], usage: { prompt_tokens: 7, completion_tokens: 4 } }),
    "[DONE]",
  ]));
  const got = [];
  const meta = await chatStream({ config: OPENAI, messages: [{ role: "user", content: "hi" }] }, (d) => got.push(d));
  assert.equal(got.join(""), "先帮后托");
  assert.deepEqual(meta.usage, { input: 7, output: 4 });
  assert.equal(calls[0].body.stream, true);
});

test("Anthropic 流式:只取 content_block_delta 的文本", async () => {
  stubFetch(() => sseRes([
    JSON.stringify({ type: "message_start", message: { usage: { input_tokens: 9, output_tokens: 0 } } }),
    JSON.stringify({ type: "content_block_delta", delta: { text: "算" } }),
    JSON.stringify({ type: "content_block_delta", delta: { text: "明白" } }),
    JSON.stringify({ type: "message_delta", usage: { output_tokens: 6 } }),
  ]));
  const got = [];
  const meta = await chatStream({ config: CLAUDE, messages: [{ role: "user", content: "hi" }] }, (d) => got.push(d));
  assert.equal(got.join(""), "算明白");
  assert.deepEqual(meta.usage, { input: 9, output: 6 });
});
