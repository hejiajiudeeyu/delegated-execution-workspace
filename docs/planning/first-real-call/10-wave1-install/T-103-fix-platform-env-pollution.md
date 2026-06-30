# T-103 修 `PLATFORM_API_BASE_URL` 残留导致 bootstrap 误入 platform 模式

- 仓库：`repos/client`
- 依赖：无（与 T-101/T-102 并行；与 T-101 都改 `cli.js`，后合者负责处理冲突）
- 修复断点：M3
- 完成标志：shell 里残留 `PLATFORM_API_BASE_URL` 时，`bootstrap` 不带 `--platform` 仍走 local_only 并成功

## 背景

`repos/client/apps/ops/src/cli.js` 约 1148-1150 行：只要环境里存在 `PLATFORM_API_BASE_URL`（即使用户没传 `--platform`），`commandBootstrap` 就启用 platform 模式，没有 admin key 时卡在 `awaiting_admin_approval`（约 1272-1317 行）。集成测试 `tests/integration/ops-cli.integration.test.js` 约 636-674 行覆盖了这个现状行为。

期望行为：**显式 `--platform` 参数才进 platform 模式**；仅有环境变量时打印一行警告（提示检测到环境变量、如需 platform 模式请显式传 `--platform`），然后走 local_only。

## 执行步骤

1. 读 `cli.js` 1100-1330 行，弄清 `inferPlatformEnabled` / bootstrap 的判定链；读 `apps/ops/src/config.js` 中相关推导逻辑。
2. 改判定：`commandBootstrap` 仅在显式 `--platform <url>` 时启用 platform；存在 `PLATFORM_API_BASE_URL` 但无 `--platform` 时输出警告并按 local_only 执行。注意只改 bootstrap 入口的判定，**不要**改其他命令（如 `submit-review`）对该环境变量的使用——那些命令本来就需要 platform。
3. 更新集成测试：把 `ops-cli.integration.test.js:636-674` 那条测试改为断言新行为（带残留 env 的 bootstrap → local_only + SUCCEEDED + 输出含警告），并保留/新增一条「显式 `--platform` 仍走 platform 模式」的断言（如已有则不动）。
4. 验证：
   ```bash
   cd repos/client
   export DELEXEC_HOME=/tmp/delexec-t103
   PLATFORM_API_BASE_URL=http://127.0.0.1:9999 npm run ops -- bootstrap --email t@example.com --text "ping"
   ```
   应输出警告且最终 `SUCCEEDED`，不应尝试连 9999 端口。
5. 跑 client 测试全绿后提交；回第四仓 submodule SHA + change bundle + 验证链。

## 验收标准

1. 上述手工验证：残留 env + 无 `--platform` → 警告 + local_only + SUCCEEDED。
2. 显式 `--platform` 行为不变。
3. 集成测试更新且全绿；第四仓验证链全绿。

## 防跑偏

- 不要删除 `PLATFORM_API_BASE_URL` 的支持，其他命令仍依赖它。
- 不要顺手改 bootstrap 的其余流程或输出格式。
