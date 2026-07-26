# 乌托帮 UTOBANG · 自部署版

[![CI](https://github.com/liukunyao92-zq/utobond-open/actions/workflows/ci.yml/badge.svg)](https://github.com/liukunyao92-zq/utobond-open/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> 开店前把账算明白的帮助台。这是**开源自部署版**:Python 后端 + React 前端,
> 接你自己的大模型 API,Key 由本机保管,不限次数。

面向小微创业者,两条主线各一套模型:

- **线下实体店** —— 选址、装修、证照、排班。最怕「签了约才发现算不过账」。
- **线上店铺** —— 流量、转化、投流、退货率。最怕「钱投出去了单没回来」。

自部署版包含两个板块:**帮(开店帮助)** 和 **自定义(模型设置)**。
「托(运营托管)」是云端版的商业服务,开源版不含。

## 它能干什么

| 板块 | 页面 | 干什么 | 用不用 AI |
|---|---|---|---|
| 帮 | 开店设置 | 三步向导:选主线 → 说清楚你卖什么 → 生成开店清单与预算 | ✅ |
| 帮 | 开店清单 | 五阶段任务逐项打勾,带金额的合计就是开店账 | ✅ 可重新定制 |
| 帮 | 预算测算 | 双引擎测算 + 保本刻度尺 + 12 个月现金流 + 回本周期 | ✅ 预算体检 |
| 帮 | 选址分析 / 平台选择 | 六维评分 + 谈判要点;线上给平台匹配度与冷启动路径 | ✅ |
| 帮 | 风险识别 | 规则引擎实时联动预算参数,健康分 + 五维雷达 | ✅ 深度扫描 |
| 帮 | AI 参谋 | 双人设对话,系统提示词注入你的真实经营数字 | ✅ |
| 自定义 | 模型设置 | 换供应商、换模型、测连通性 | — |

线上/线下主线的切换只出现在「帮」板块 —— 只有这些页面的内容跟主线绑定。

**没配 Key 也能完整跑通**:AI 调用失败会自动落到内置模板,金额仍按你填的参数实时计算,流程不中断。

## 快速开始

需要 Node.js ≥ 20(跑前端)和 Python ≥ 3.9(跑后端)。

```bash
npm install       # 前端依赖
npm run setup     # 后端 venv + pip 依赖
npm run dev       # 一键起前后端
```

打开 http://localhost:5173,左侧「模型设置」填入你的 API Key 即可。后端在 8787。

也可以先写进环境变量:

```bash
cp apps/server/.env.example apps/server/.env
```

## 支持哪些模型

内置预设,选了就自动填好接口地址:

| 供应商 | 协议 | 备注 |
|---|---|---|
| DeepSeek | OpenAI | 性价比高,中文场景稳,推荐自部署首选 |
| OpenAI | OpenAI | 国内直连通常需要代理 |
| Claude(Anthropic) | Anthropic | 结构化输出稳定 |
| 月之暗面 Kimi / 智谱 GLM / 阿里通义千问 | OpenAI | 智谱 glm-4-flash 有免费额度,适合先跑通 |
| Ollama | OpenAI | 本机模型,完全离线,免 Key |
| **OpenAI 兼容(自定义 / 中转站)** | OpenAI | 填中转站给的 baseURL 和模型名即可,不用改代码 |

接一个没列出来的服务:选「OpenAI 兼容」,填地址和模型名就行 —— 只要对方是 `/chat/completions` 协议。

## 你的 Key 去哪了

```
浏览器  ──/api/ai/complete──▶  本机 Python 后端  ──▶  你选的供应商
(不知道 Key 长什么样)          (Key 只在这里)
```

- Key 存在 `apps/server/data/llm.json`(权限 0600)或 `.env`,**都在你自己的机器上**
- 接口回显永远脱敏(`sk-a••••klmn`),前端拿不到完整 Key
- 请求不经过乌托帮平台且没有遥测；提示词和经营数据会发送给你选择的模型供应商
- 只有使用 Ollama 等本机模型时,模型请求才完全不离开机器

部署给团队用、不想让别人改 Key?设 `LLM_CONFIG_LOCKED=1`,配置只认环境变量,网页设置页变只读。

## 仓库结构

```
utobond-open/
├── packages/
│   ├── core/     @utobond/core  纯逻辑:预算引擎、风险规则、内置模板、AI 能力契约(带单测)
│   └── ui/       @utobond/ui    业务界面(React),按 edition 装配
├── apps/
│   ├── web/      自部署版前端外壳(Vite)
│   └── server/   自部署版后端(Python / FastAPI:AI 网关 + 模型设置,带 pytest 单测)
└── docs/
    ├── PRD.md          产品稿
    └── SELF-HOSTING.md 自部署与运维
```

`packages/ui` 用一个 `edition` 配置对象控制装配 —— 自部署版只开「帮 + 自定义」,
关掉订阅、付费墙、平台后台和「托」板块。业务页面本身与云端版共用同一份代码。

```bash
npm test        # core + 后端测试；core 行覆盖率门槛 90%，后端总覆盖率门槛 75%
npm run build   # 产出 apps/web/dist;Python 后端检测到 dist 会直接托管,单端口部署
npm run check   # 发布前完整检查:测试 + 生产构建
```

## 自部署版不做什么

刻意不做,不是没做完:

- **没有账号体系** —— 打开就能用
- **不落库** —— 业务数据只在浏览器内存里,关掉标签页就没了。换来的是零数据库、零运维、隐私最好
- **没有订阅和额度** —— 你用自己的 Key,想调多少次是你和供应商之间的事
- **没有「托」板块** —— 日常运营、数据报表、营销活动、真人托管属于云端版

需要多设备同步、开箱即用不配 Key、以及运营托管服务的,那是云端 SaaS 版(闭源,另一个仓库)。

## 许可证

[Apache License 2.0](LICENSE)

## 参与贡献与安全

- 开发流程和代码约定见 [CONTRIBUTING.md](CONTRIBUTING.md)
- 安全问题请按 [SECURITY.md](SECURITY.md) 私下报告
- 参与社区时请遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
