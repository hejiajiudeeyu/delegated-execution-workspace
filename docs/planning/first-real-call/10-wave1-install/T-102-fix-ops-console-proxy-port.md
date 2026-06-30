# T-102 修 ops-console 代理端口写死 8079

- 仓库：`repos/client`
- 依赖：无（可与 T-101 并行，但避免同时改 `cli.js` 的同一区域；如冲突，T-101 先合）
- 修复断点：M2
- 完成标志：`OPS_PORT_SUPERVISOR=8179 delexec-ops ui start` 时控制台页面 API 正常

## 背景

`repos/client/apps/ops-console/vite.config.ts`（约 14-35 行）把 `/status`、`/catalog` 等所有 API 代理目标写死为 `http://127.0.0.1:8079`。而官网与 `docs/current/guides/local-mode-onboarding.md`（约 55-60 行）都建议用户用 `OPS_PORT_SUPERVISOR=8179/8189` 起 supervisor，此时 UI 全部 API 请求打到错误端口。

`delexec-ops ui start` 的实现在 `apps/ops/src/cli.js` 约 271-303 行，它通过 pnpm 拉起 vite，因此修复点是让 vite 配置读环境变量。

## 执行步骤

1. 读 `repos/client/apps/ops-console/vite.config.ts` 全文、`apps/ops/src/cli.js` 260-310 行，确认 `ui start` 如何传环境给 vite 进程。
2. 改 `vite.config.ts`：代理目标改为 `http://127.0.0.1:${process.env.OPS_PORT_SUPERVISOR || 8079}`（保持 8079 为默认值，行为向后兼容）。所有代理条目统一用同一个变量，不要漏。
3. 改 `cli.js` 的 `ui start`：确保拉起 vite 子进程时把当前进程的 `OPS_PORT_SUPERVISOR`（以及 supervisor 实际使用的端口，如果 CLI 内部有解析后的端口值，优先传解析后的值）注入子进程 env。
4. 验证：
   ```bash
   cd repos/client && npm install
   export DELEXEC_HOME=/tmp/delexec-t102 && export OPS_PORT_SUPERVISOR=8179
   npm run ops -- bootstrap --email t@example.com --text "ping"
   npm run ops -- start &   # 或按仓库文档以后台方式起 supervisor
   npm run ops -- ui start
   # 用 curl 打 vite dev server 的代理路径验证（端口看 ui start 输出）：
   curl -s http://127.0.0.1:<vite端口>/status | head -c 200
   ```
   `/status` 应返回 supervisor JSON 而非 ECONNREFUSED 代理错误。验证完杀掉进程。
5. 若 `apps/ops-console` 有单测能覆盖（看 `repos/client/tests/unit/ops-console.*`），按现有风格补一条配置层面的断言；如不可行，在验收回复中说明并以手工 curl 证据代替。
6. client 仓库测试全绿后提交；回第四仓更新 submodule SHA + change bundle + 验证链。

## 验收标准

1. `OPS_PORT_SUPERVISOR=8179` 时 vite 代理 `/status` 返回 200 JSON。
2. 不设环境变量时行为与现在一致（默认 8079）。
3. client 测试全绿；第四仓验证链全绿。

## 防跑偏

- 不要改 supervisor 的端口逻辑。
- 不要把 vite 配置重构成多环境配置体系，只做环境变量透传。
