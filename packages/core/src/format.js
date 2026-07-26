/** 展示层格式化与小工具。纯函数,前后端通用。 */

export const yuan = (n) => (isFinite(n) ? Math.round(n).toLocaleString("zh-CN") : "—");
export const wan = (n) => (isFinite(n) ? (n / 10000).toFixed(1) : "—");
export const pct = (n) => (isFinite(n) ? (n * 100).toFixed(1) : "—");
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** 线性同余伪随机,给演示曲线用,保证同一 seed 每次渲染一致 */
export const seeded = (s) => () => ((s = (s * 9301 + 49297) % 233280), s / 233280);

/**
 * 从模型返回的文本里剥出 JSON。
 * 模型经常裹 ```json 代码块或在前后加解释,这里统一处理。
 */
export function parseJSON(text) {
  let t = (text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}
