# 乌托帮 UTOBANG

> 先帮后托的开店服务台。「帮」是 AI 把账算明白,「托」是真人把活儿接过去。

Monorepo 结构:

```
utobond/
├── apps/
│   ├── web/        # 前端:React 18 + Vite(业务前台 + 管理后台)
│   └── server/     # 后端:Node + Express + Anthropic SDK(AI 网关)
├── docs/
│   └── PRD.md      # 产品稿(信息架构、页面规格、AI 能力矩阵、订阅体系)
└── package.json    # npm workspaces
```

## 快速开始

```bash
# 1. 安装(根目录一次装完两个 workspace)
npm install

# 2. 配置 AI Key
cp apps/server/.env.example apps/server/.env
#    编辑 .env,填入 ANTHROPIC_API_KEY

# 3. 一键起前后端
npm run dev
#    server → http://localhost:8787
#    web    → http://localhost:5173(/api 自动代理到 server)
```

没配 Key 也能跑:AI 接口返回 503,前端自动落到内置模板(开店清单、营销方案等仍可走通全流程)。

## AI 架构(为什么这样选型)

**前端永远不碰模型。** 所有 AI 请求走 `POST /api/ai/complete`,好处:

1. **Key 安全** — API Key 只存在于服务端 `.env`
2. **换模型零成本** — 改 `AI_MODEL` 环境变量即可;要接 OpenAI/本地模型,只改 `apps/server/src/ai/provider.js` 一个文件
3. **能力可叠加** — 网关层后续可加:用量计费(对接订阅档位)、缓存、限流、提示词版本管理、多模型路由与降级
4. **流式就绪** — `/api/ai/stream` 已提供 SSE,参谋对话可渐进升级为打字机效果
5. **结构化可靠** — `provider.js` 的 `completeJSON()` 用 zod 校验 + 失败自动重试,解决"模型偶尔不回 JSON"的经典问题

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 + AI 配置状态 |
| POST | `/api/ai/complete` | 文本补全:`{messages, system?, maxTokens?}` → `{text, model, usage}` |
| POST | `/api/ai/stream` | SSE 流式补全,同参 |

## 路线图(见 docs/PRD.md 第 8 节)

- [ ] 用户体系与 JWT 鉴权
- [ ] 订阅/支付接入(微信/支付宝),AI 用量与档位联动计费
- [ ] 数据落库(PostgreSQL + Prisma):店铺、清单进度、对话历史
- [ ] 参谋对话切流式;提示词抽离为版本化模板
- [ ] 管理后台接真实数据
