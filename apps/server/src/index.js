import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  createAIRouter, createSettingsRouter,
  loadConfig, saveConfig, describeConfig, testConnection, isConfigured,
} from "@utobond/ai";

/**
 * 自部署版后端。
 *
 * 职责只有两件:
 *   1. 转发 AI 请求 —— Key 留在服务端,前端永远拿不到
 *   2. 读写模型配置 —— 让用户在网页上换供应商,不用重启
 *
 * 没有用户、没有数据库、没有计费。数据都在浏览器里,关掉标签页就没了 ——
 * 这是自部署版的取舍:零依赖、零运维、隐私最好。要多设备同步和团队协作,
 * 那是云端版的事。
 */
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  const cfg = describeConfig();
  res.json({
    ok: true,
    service: "utobond-server",
    edition: "local",
    aiConfigured: cfg.configured,
    provider: cfg.provider || null,
    model: cfg.model || null,
    configSource: cfg.source,
  });
});

// AI 网关:本地版不鉴权、不计费,配置就是用户自己那份
app.use("/api/ai", createAIRouter({
  resolveConfig: () => loadConfig(),
}));

// 模型设置:仅自部署版提供。云端版绝不能挂,那边的 Key 是平台的。
app.use("/api/settings", createSettingsRouter({
  describe: describeConfig,
  save: saveConfig,
  test: testConnection,
  load: loadConfig,
}));

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  const cfg = describeConfig();
  console.log(`[utobond] 自部署版后端已启动 → http://localhost:${port}`);
  if (isConfigured(loadConfig())) {
    console.log(`[utobond] 模型:${cfg.provider} / ${cfg.model}(来自${cfg.source === "file" ? "配置文件" : "环境变量"})`);
  } else {
    console.warn("[utobond] 尚未配置模型 —— AI 接口返回 503,前端自动落内置模板。");
    console.warn("[utobond] 去网页左侧「模型设置」填一下,或改 apps/server/.env。");
  }
});
