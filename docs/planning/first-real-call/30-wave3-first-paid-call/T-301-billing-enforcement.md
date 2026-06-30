# T-301 计费 enforcement 接入调用主路径

- 仓库：`repos/platform`（主）；可能涉及 `repos/protocol`（见步骤 2 的判断）
- 依赖：无（可与 Wave 1/2 并行）；是 Wave 3 其余卡的前置
- 修复断点：B1（调用不扣费）
- 完成标志：余额不足的 tenant 无法发起调用；成功调用后 ledger 出现扣费记录
- 注意：这是全计划**最大**的一张卡，建议用较强的模型执行，或拆两个会话（先读后写）

## 背景

billing 地基已就绪但未接线：

- 表结构：`repos/platform/packages/postgres-store/migrations/002_p1_tenant_balance.sql`（balance / quota_window / ledger / recharge_request 四表）
- Store：`packages/billing-store/src/index.js` 已实现 `applyBalanceDelta`（约 427 行起）、`createRecharge` 等
- Admin API：`apps/platform-api/src/server.js` 2691-2807 行（建租户、查余额、手工充值、账本分页），有集成测试 `tests/integration/platform-api-billing.integration.test.js`
- **缺口**：token 签发路径（`server.js` 约 2258-2396 行，`issueTaskToken` / delivery-meta）完全不碰 billing
- 设计依据：P-1 实现 RFC（已冻结，见 platform 仓库 `docs/` 下 planned RFC 及第四仓 `changes/CHG-2026-026.yaml`、`CHG-2026-028.yaml`）

## 执行步骤

### 阶段 A：读懂再动手

1. 通读 P-1 RFC（platform 仓库 docs 里 `planned`/billing 相关文档）+ `002_p1_tenant_balance.sql` + `billing-store/src/index.js` 完整 API 面。
2. 读 `server.js` 的调用主路径：用户注册 → hotline 调用请求 → `issueTaskToken` → delivery-meta → 结果回传/ACK。画出「应在哪一步预扣、哪一步结算、哪一步退款」的对照表，**写进本卡同目录的 `T-301-design-notes.md`** 后再继续。
3. 判断是否需要 protocol 仓库改动：检查 `@delexec/contracts` 是否已有 hotline 定价字段（价格、币种/点数单位）。
   - 若 protocol 已有定价字段 → 直接用。
   - 若没有 → **停下**，在 design-notes 里写明需要的最小协议字段提案（如 `pricing: { credits_per_call: number }`），输出给用户决策后再继续。协议字段必须先在 `repos/protocol` 落地并发版，禁止在 platform 私自扩展。

### 阶段 B：最小实现（RFC 已有设计的，按 RFC；RFC 没写死的，按以下默认）

4. 调用前检查：在 token 签发入口处，若目标 hotline 定价 > 0，查 caller tenant 余额；不足则返回 402 风格的结构化错误（错误码命名跟 server.js 现有错误风格一致）。
5. 扣费时机（最小闭环默认）：token 签发成功即记 `pending` 预扣（ledger 条目 + 余额扣减，走 `applyBalanceDelta`，幂等键用 task/request id）；任务终态 `SUCCEEDED` 时把 pending 结算为 `settled`；终态失败/超时把 pending 冲正（退款 ledger 条目）。若 RFC 冻结了不同的时机/形状，以 RFC 为准。
6. 免费 hotline（定价 0 或无定价）完全绕过 billing 路径，行为与现在一致——这保证存量测试不挂。
7. 配置开关：加 `BILLING_ENFORCEMENT=disabled|enforced`（env），默认 `disabled`，让现有部署行为不变；`enforced` 时启用上述检查。开关读取方式与 server.js 现有 env 处理一致。

### 阶段 C：测试与收尾

8. 集成测试新增（参照 `platform-api-billing.integration.test.js` 的基建）：
   - enforced + 余额不足 → 调用被拒，无 ledger 残留
   - enforced + 余额充足 → 调用成功，ledger 有预扣与结算两条记录，余额正确
   - enforced + 调用失败 → 冲正记录，余额回到调用前
   - disabled → 行为与现在一致
9. 跑 platform 仓库全部测试；提交（提交信息引用 P-1 RFC 编号）。
10. 第四仓：submodule SHA + change bundle（说明这是 P-1 M2 接线）+ 五命令验证链。

## 验收标准

1. `T-301-design-notes.md` 存在且包含扣费时机对照表与协议字段判断结论。
2. 四类集成测试全绿；platform 既有测试无回归。
3. `BILLING_ENFORCEMENT` 默认关闭时行为与主干完全一致。
4. 第四仓验证链全绿。

## 防跑偏

- 不做支付通道、不做配额窗口（quota_window 表先不用，除非 RFC M2 范围明确包含）。
- 不改 relay/transport；计费只发生在 platform-api。
- 协议字段缺失时必须停下等决策，禁止用 hotline metadata 私塞价格字段绕过 protocol。
