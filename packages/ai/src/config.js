/**
 * 本地部署版的模型配置来源。
 *
 * 优先级:磁盘配置文件 > 环境变量。
 * 环境变量是「开箱默认值」,网页「模型设置」页存下来的配置会盖住它 ——
 * 这样 docker run 时给个默认 Key 也行,用户想换随时在界面改,不用重启。
 *
 * 设 LLM_CONFIG_LOCKED=1 可锁死配置(只认环境变量,界面变只读),
 * 适合把本项目部署给团队用、不希望别人改 Key 的场景。
 */
import fs from "node:fs";
import path from "node:path";
import { PRESETS, redact } from "./presets.js";

const FILE_NAME = "llm.json";

export function configDir() {
  return process.env.UTOBOND_CONFIG_DIR || path.resolve(process.cwd(), "data");
}
const configPath = () => path.join(configDir(), FILE_NAME);

export const isLocked = () => process.env.LLM_CONFIG_LOCKED === "1";

/** 从环境变量读。兼容早期只支持 Anthropic 时的 ANTHROPIC_API_KEY。 */
export function fromEnv() {
  const legacyKey = process.env.ANTHROPIC_API_KEY;
  const provider = process.env.LLM_PROVIDER || (legacyKey ? "anthropic" : "");
  if (!provider) return null;
  const preset = PRESETS[provider] || PRESETS.custom;
  return {
    provider,
    baseURL: process.env.LLM_BASE_URL || preset.baseURL,
    apiKey: process.env.LLM_API_KEY || legacyKey || "",
    model: process.env.LLM_MODEL || process.env.AI_MODEL || preset.defaultModel || "",
  };
}

function fromFile() {
  try {
    const raw = fs.readFileSync(configPath(), "utf8");
    const j = JSON.parse(raw);
    return j && j.provider ? j : null;
  } catch {
    return null; // 文件不存在或坏了都当没配,不阻断启动
  }
}

/** 当前生效配置(含明文 key,只在服务端流转) */
export function loadConfig() {
  if (isLocked()) return fromEnv() || {};
  return fromFile() || fromEnv() || {};
}

/** 写入磁盘。返回脱敏后的结果给接口回显。 */
export function saveConfig(patch = {}) {
  if (isLocked()) {
    const e = new Error("模型配置已被部署方锁定(LLM_CONFIG_LOCKED=1),只能改环境变量。");
    e.status = 403;
    throw e;
  }
  const current = loadConfig();
  const next = {
    provider: patch.provider ?? current.provider ?? "",
    baseURL: patch.baseURL ?? current.baseURL ?? "",
    model: patch.model ?? current.model ?? "",
    // 前端提交空字符串表示「不改 key」,提交 null 表示「清空」
    apiKey: patch.apiKey === null ? "" : (patch.apiKey || current.apiKey || ""),
  };
  if (!next.baseURL) next.baseURL = PRESETS[next.provider]?.baseURL || "";
  if (!next.model) next.model = PRESETS[next.provider]?.defaultModel || "";

  fs.mkdirSync(configDir(), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
}

/** 供 /api/settings/llm 回显:脱敏 + 告诉前端配置从哪来、能不能改 */
export function describeConfig() {
  const cfg = loadConfig();
  return {
    ...redact(cfg),
    locked: isLocked(),
    source: isLocked() ? "env" : (fromFile() ? "file" : (fromEnv() ? "env" : "none")),
    configPath: isLocked() ? null : configPath(),
  };
}
