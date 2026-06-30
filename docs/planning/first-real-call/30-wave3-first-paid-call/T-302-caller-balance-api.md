# T-302 Caller 侧余额查询 API

- 仓库：`repos/platform`
- 依赖：T-301 已合并
- 修复断点：M6（RFC 规划的 `/v1/tenants/*` 未实现）
- 完成标志：Caller 用自己的 api_key 能查到自己的余额与最近账单，查不到别人的

## 背景

billing 目前只有 admin 面（`/v1/admin/billing/tenants/*`）。RFC 规划了 caller 自查面 `/v1/tenants/*` 但 `server.js` 路由表里没有。没有它，付费 Caller 是「盲扣」，第一笔付费调用没法向用户解释钱去哪了。

## 执行步骤

1. 读 P-1 RFC 中 `/v1/tenants/*` 的端点形状；读 `server.js` 中 admin billing 路由（2691-2807 行）和现有 caller 鉴权中间件的写法。
2. 实现最小两个端点（路径以 RFC 为准，RFC 未冻结则用以下默认）：
   - `GET /v1/tenants/me/balance` — 当前鉴权 caller 对应 tenant 的余额、货币单位
   - `GET /v1/tenants/me/ledger?limit=&cursor=` — 本 tenant 账本分页（复用 admin ledger 的分页实现，过滤为本 tenant）
   鉴权：复用现有 caller api_key 中间件；tenant 归属从鉴权身份解析，**不接受**用户传 tenant id（杜绝越权读）。
3. 错误处理：caller 无对应 tenant（未开计费）→ 返回明确的「billing 未启用」结构化响应而非 500。
4. 集成测试（放进 `platform-api-billing.integration.test.js` 或新文件）：
   - caller A 能查自己余额/账本
   - caller A 拿不到 caller B 的数据（鉴权隔离）
   - 无 tenant 的 caller 得到 billing 未启用响应
5. platform 测试全绿；提交；第四仓 SHA + change bundle + 验证链。

## 验收标准

1. 两端点实现且三类集成测试全绿。
2. 路由形状与 RFC 一致（或在回复中注明 RFC 未冻结、采用了默认形状）。
3. 第四仓验证链全绿。

## 防跑偏

- 不做充值端点（充值仍走 admin 手工，Wave 3 范围内不变）。
- 不做 UI；client/ops-console 的余额展示是后续独立工作。
