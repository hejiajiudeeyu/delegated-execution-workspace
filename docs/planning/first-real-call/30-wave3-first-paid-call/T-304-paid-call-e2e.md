# T-304 付费调用端到端联调脚本

- 仓库：第四仓（`tools/`，属于跨仓集成验证，符合第四仓职责边界）
- 依赖：T-301、T-302 已合并
- 完成标志：一条命令在本地复现「充值 → 付费调用 → 扣费 → 对账」全流程并断言金额正确

## 背景

第四仓已有 `tools/agent-e2e/agent-e2e-test.py` 与 `test:agent-e2e` 跑通免费调用闭环。本卡在其基础上加付费场景，作为 Wave 3 的总验收，也是 Wave 4 公网部署前的回归门。

## 执行步骤

1. 读 `tools/agent-e2e/agent-e2e-test.py` 与 `package.json` 里 `test:agent-e2e` 的接线方式，理解它如何起 platform + client 并发起调用。
2. 新建 `tools/paid-call-e2e.mjs`（风格对齐 tools/ 下现有 mjs 脚本），流程：
   1. 以 `BILLING_ENFORCEMENT=enforced` 起本地 platform（复用现有 e2e 的启动基建）
   2. 注册 caller + responder，上架一条**有定价**的测试 hotline（走审批 API 用 admin key 双审批）
   3. 断言：未充值时调用被拒（402 类错误）
   4. admin 手工充值 N 点（`POST /v1/admin/billing/tenants/{id}/recharges`）
   5. 发起调用至 SUCCEEDED
   6. 断言：`GET /v1/tenants/me/balance` 余额 = N - 单价；ledger 含预扣+结算记录
   7. 再断言一次失败调用（可用不存在的 hotline 或人为失败）后余额不变（冲正生效）
3. 在根 `package.json` 加 `test:paid-call-e2e` 脚本；写配套 `tools/paid-call-e2e.test.mjs` 如 tools 下其他脚本有测试惯例的话（参考 `tools/mcp-golden-four.test.mjs` 的模式）。
4. 跑通：`corepack pnpm run test:paid-call-e2e` 全绿。
5. 提交第四仓（本卡无 owning 仓库业务改动，无需新 submodule SHA；若发现 T-301/302 缺陷需回那些仓库修，按规则走 SHA+bundle）。

## 验收标准

1. `corepack pnpm run test:paid-call-e2e` 一条命令全流程绿，输出含三次金额断言结果。
2. 脚本不污染全局环境（隔离 DELEXEC_HOME、临时端口、退出清理）。
3. 五命令验证链全绿。

## 防跑偏

- 不在第四仓写任何业务逻辑，脚本只编排两端已有 API/CLI。
- 发现 platform/client 缺陷时停下报告，回 owning 仓库修，不在脚本里 workaround。
