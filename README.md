# 乌托帮 UTOBANG

[![CI](https://github.com/liukunyao92-zq/utobond-open/actions/workflows/ci.yml/badge.svg)](https://github.com/liukunyao92-zq/utobond-open/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> 开店前把账算明白的帮助台。Python 后端 + React 前端,
> 接入你自己的大模型 API,Key 由本机保管,不限次数。

面向小微创业者,两条主线各一套模型:

- **线下实体店** —— 选址、装修、证照、排班。最怕「签了约才发现算不过账」。
- **线上店铺** —— 流量、转化、投流、退货率。最怕「钱投出去了单没回来」。

当前项目包含两个板块:**帮(开店帮助)** 和 **自定义(模型设置 / 数据存储)**。
日常运营托管、账号与订阅不在当前项目范围内。

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
| 自定义 | 数据存储 | 默认 SQLite 持久化，也可连接 MySQL | — |

线上/线下主线的切换只出现在「帮」板块 —— 只有这些页面的内容跟主线绑定。

**没配 Key 也能完整跑通**:AI 调用失败会自动落到内置模板,金额仍按你填的参数实时计算,流程不中断。

## 快速开始

需要 Node.js ≥ 20.19(跑前端)和 Python ≥ 3.9(跑后端)。

一条命令启动：

```bash
python3 start.py
```

首次运行会自动创建 Python 虚拟环境、安装依赖、构建前端并启动服务；后续仅在依赖或源码变化时刷新。打开 http://localhost:8787 即可使用：业务数据默认写入本机 SQLite；左侧「模型设置」可以保存多套 API 配置并手动启用。

可选参数：

```bash
python3 start.py --host 0.0.0.0 --port 9000
python3 start.py --refresh  # 强制刷新依赖并重新构建
```

需要前后端热更新时使用开发模式：

```bash
npm install
npm run setup
npm run dev
```

开发模式前端地址为 http://localhost:5173，API 服务在 8787。

也可以先写进环境变量:

```bash
cp apps/server/.env.example apps/server/.env
```

## 支持哪些模型

内置预设,选了就自动填好接口地址:

| 供应商 | 协议 | 备注 |
|---|---|---|
| DeepSeek | OpenAI | 性价比高,中文场景稳,推荐首选 |
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

- 多套 API 配置和各自的 Key 存在 `apps/server/data/llm.json`(权限 0600)或 `.env`,**都在你自己的机器上**
- 任一时刻只启用一套配置；在「模型设置」点击“启用”即可切换，立即生效且不用重启
- 旧版单配置 `llm.json` 会在首次修改时自动升级为配置列表，原有 Key 不会丢失
- 接口回显永远脱敏(`sk-a••••klmn`),前端拿不到完整 Key
- 请求不经过乌托帮平台且没有遥测；提示词和经营数据会发送给你选择的模型供应商
- 只有使用 Ollama 等本机模型时,模型请求才完全不离开机器

部署给团队用、不想让别人改 Key?设 `LLM_CONFIG_LOCKED=1`,配置只认环境变量,网页设置页变只读。

## 业务数据存储

- 默认使用 `apps/server/data/utobond.db`，基于 Python 内置 SQLite，无需安装数据库
- 左侧「数据存储」可配置 MySQL 主机、端口、库名、用户名、密码和 SSL
- 切换存储前会测试连接，并尝试把当前业务快照复制到新存储
- MySQL 密码保存在权限 `0600` 的 `apps/server/data/storage.json`，接口只返回脱敏状态
- 可用 `STORAGE_CONFIG_LOCKED=1` 锁定存储设置；服务器部署也支持全部使用环境变量

## 仓库结构

```
utobond-open/
├── start.py       Python 一键启动器
├── packages/
│   ├── core/     @utobond/core  纯逻辑:预算引擎、风险规则、内置模板、AI 能力契约(带单测)
│   └── ui/       @utobond/ui    业务界面(React),按 edition 装配
├── apps/
│   ├── web/      Web 前端(Vite)
│   └── server/   Python / FastAPI 后端:AI 网关 + 模型设置 + SQLite/MySQL 持久化
└── docs/
    ├── PRD.md          产品稿
    └── SELF-HOSTING.md 部署与运维
```

`packages/ui` 用一个 `edition` 配置对象控制能力装配。当前入口启用「帮 + 自定义」,
不装配订阅、付费墙、平台后台和「托」板块。

```bash
npm test        # core + 后端测试；core 行覆盖率门槛 90%，后端总覆盖率门槛 75%
npm run build   # 产出 apps/web/dist;Python 后端检测到 dist 会直接托管,单端口部署
npm run check   # 发布前完整检查:测试 + 生产构建
```

## 产品边界

刻意不做,不是没做完:

- **没有账号体系** —— 打开就能用
- **不做账号隔离** —— 本地版使用一份业务快照；多人部署时应在反向代理层加鉴权
- **没有订阅和额度** —— 你用自己的 Key,想调多少次是你和供应商之间的事
- **没有「托」板块** —— 日常运营、数据报表、营销活动、真人托管需要另行扩展

多设备同步、平台统一模型 Key 和运营托管服务可在此项目之外按实际需求接入。

## 许可证

[Apache License 2.0](LICENSE)

## 参与贡献与安全

- 开发流程和代码约定见 [CONTRIBUTING.md](CONTRIBUTING.md)
- 安全问题请按 [SECURITY.md](SECURITY.md) 私下报告
- 参与社区时请遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
