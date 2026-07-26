# 自部署指南

## 环境要求

- Node.js ≥ 20(用到原生 `fetch` 和 `node --watch`)
- 不需要数据库,不需要 Redis,不需要任何外部服务

## 一、本机跑

```bash
npm install
npm run dev
```

- 前端 http://localhost:5173
- 后端 http://localhost:8787
- 开发期 `/api` 由 Vite 代理到后端,前端代码里只写相对路径

## 二、配模型

两种方式,**配置文件优先于环境变量**。

### 方式 A:网页里配(推荐)

打开左侧「模型设置」→ 选供应商 → 填 Key 和模型名 → 点「测试连接」确认通了 → 保存。
立即生效,不用重启。配置写到 `apps/server/data/llm.json`,权限 `0600`。

### 方式 B:环境变量

```bash
cp apps/server/.env.example apps/server/.env
```

| 变量 | 说明 |
|---|---|
| `LLM_PROVIDER` | `deepseek` / `openai` / `anthropic` / `moonshot` / `zhipu` / `dashscope` / `ollama` / `custom` |
| `LLM_API_KEY` | API Key(`ollama` 可留空) |
| `LLM_MODEL` | 模型 ID,留空用该供应商默认值 |
| `LLM_BASE_URL` | 接口地址,留空用官方地址;接中转站时必填 |
| `LLM_CONFIG_LOCKED` | 设 `1` 则锁死:网页设置页只读,只认环境变量 |
| `UTOBOND_CONFIG_DIR` | 配置文件目录,默认 `<后端工作目录>/data` |
| `PORT` | 后端端口,默认 8787 |

> 早期版本的 `ANTHROPIC_API_KEY` 仍然认,会自动当作 `LLM_PROVIDER=anthropic`。

### 接中转站

绝大多数中转站是 OpenAI 协议:

```
LLM_PROVIDER=custom
LLM_BASE_URL=https://你的中转站/v1
LLM_API_KEY=中转站给你的 key
LLM_MODEL=中转站支持的模型名
```

`baseURL` 通常以 `/v1` 结尾。填错最常见的表现是 404 —— 用「测试连接」能立刻看出来。

### 用本机模型(完全离线)

```bash
ollama pull qwen2.5:14b
```

```
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:14b
```

小参数量模型不一定能稳定吐 JSON。解析失败会自动落内置模板,不会报错给用户,但 AI 定制的效果会打折。想要稳,用 14B 以上。

## 三、上线

```bash
npm run build            # 产出 apps/web/dist
npm start                # 起后端
```

`apps/web/dist` 是纯静态文件,丢 Nginx / Caddy / 对象存储都行。前端与后端不同域时,给前端设:

```
VITE_API_BASE=https://api.你的域名.com/api
```

Nginx 同域反代的话更省事:

```nginx
location /api/ { proxy_pass http://127.0.0.1:8787; }
location /     { root /var/www/utobond; try_files $uri /index.html; }
```

### systemd

```ini
[Unit]
Description=utobond server
After=network.target

[Service]
WorkingDirectory=/opt/utobond/apps/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
User=utobond

[Install]
WantedBy=multi-user.target
```

配置文件会写到 `WorkingDirectory/data/`,记得这个目录对运行用户可写,并纳入备份。

## 四、安全须知

- **别把后端直接暴露到公网**。它没有鉴权 —— 谁能访问 `/api/settings/llm` 谁就能改你的模型配置(读不到完整 Key,但能换成自己的地址)。放在内网,或前面挂一层 Basic Auth / 反代鉴权。
- 需要多人使用又要控制配置权限:设 `LLM_CONFIG_LOCKED=1`。
- `apps/server/data/` 已在 `.gitignore` 里,别手动加进版本库。

## 五、排查

| 现象 | 原因 | 怎么办 |
|---|---|---|
| 页面能用但结果都标「内置模板」 | 没配 Key 或调用失败 | 「模型设置」点测试连接看具体报错 |
| 测试连接报 404 | baseURL 不对 | 多半少了或多了 `/v1` |
| 测试连接报 401 | Key 不对或没权限 | 换 Key;中转站确认额度 |
| 测试连接超时 | 网络不通 | OpenAI 官方需要代理;中转站换线路 |
| 保存后提示已锁定 | `LLM_CONFIG_LOCKED=1` | 改环境变量后重启 |
| 结果偶尔很离谱 | 小模型不稳 | 换更大的模型;这类失败会自动落模板 |

后端启动时会打印当前模型和配置来源,先看那一行。
