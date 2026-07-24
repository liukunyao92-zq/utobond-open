import "dotenv/config";
import express from "express";
import cors from "cors";
import { aiRouter } from "./routes/ai.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "utobond-server",
    aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    model: process.env.AI_MODEL || "claude-sonnet-4-6",
  });
});

app.use("/api/ai", aiRouter);

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`[utobond-server] http://localhost:${port}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[utobond-server] 警告:未配置 ANTHROPIC_API_KEY,AI 接口将返回 503(前端会落到内置模板)。");
  }
});
