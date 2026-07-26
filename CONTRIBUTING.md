# 参与贡献

感谢你帮助改进乌托帮。提交代码前，请先确认改动适合开源自部署版：不引入账号、计费、闭源托管服务，也不把用户的 API Key 或经营数据发送给乌托帮平台。

## 开发流程

1. Fork 仓库并从 `main` 创建短分支。
2. 安装依赖并启动开发环境：

   ```bash
   npm install
   npm run setup
   npm run dev
   ```

3. 为行为变更添加测试。预算和风险逻辑放在 `packages/core/test/`，API、安全和供应商协议测试放在 `apps/server/tests/`。
4. 提交前运行：

   ```bash
   npm run check
   ```

5. 发起 Pull Request，说明问题、方案、测试结果以及对隐私或兼容性的影响。

## 代码约定

- 核心计算保持纯函数，避免把 UI 或网络依赖带入 `@utobond/core`。
- 前端只调用 `/api` 网关，不保存或回显完整模型 Key。
- 新增供应商优先兼容现有 OpenAI/Anthropic 协议层，避免引入大型 SDK。
- 不提交 `.env`、`apps/server/data/`、构建产物、编辑器配置或真实业务数据。
- 用户可见行为、环境变量和部署方式变更时同步更新 README 与自部署文档。

提交贡献即表示你同意按仓库的 Apache-2.0 许可证发布该贡献。
