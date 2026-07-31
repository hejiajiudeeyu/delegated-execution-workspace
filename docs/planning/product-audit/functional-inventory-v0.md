# 产品功能清单与缺口分析 v0（快扫版）

Created: 2026-07-04 · 方法：路由/CLI/控制台表面扫描 + T-503/504 实证 + CI 审计。
**这是快扫，不是深审**。标 ⚠️ 的判断需要深度审查（见 `audit-charter.md`）确认。

## 一、现有功能面（代码证据）

### 协议层（repos/protocol → @delexec/contracts）
- 请求/结果/事件契约、Ed25519 签名结果、模板 bundle 校验。
- ❗已实证漂移：npm 0.1.2 缺 `validateCatalogGuidanceFields`，源码构建 platform-api 启动即崩。

### 平台 API（platform-api，~24 个路由面）
- 身份：`/v1/users/register`、`/v2/responders/register`、task token 签发+introspect、admin api-key revoke。
- 目录：`/v2/hotlines`（含 admin 生命周期 approve/reject/enable/disable）、`/marketplace/hotlines` + `/marketplace/meta` 公开目录。
- 审核：admin reviews、review-tests、audit-events。
- 计费：admin tenants/recharge/ledger + 自助只读 `/v1/tenants/me/balance|ledger`；hold-settle-refund 已实证；配额窗口/限速字段存在。
- 请求：admin requests、事件批量上报、metrics summary/events、service-resolutions。
- 运维：healthz/readyz/metrics。

### 传输（transport-relay）
- relay_http 收发件箱模式，sqlite 存储。

### 运营控制台（gateway + vanilla console）
- 会话 setup/unlock/recover（T-504 后完整）、admin key 加密托管、审核队列、目录管理、计费操作、请求/审计观察。

### 客户端（delexec-ops CLI，1900 行单文件）
- Caller：`auth register`、`call-hotline`（text/payload、max-charge）、本地 runtime `start`。
- Responder：`enable-responder`、`add-hotline`（process|http 两种 worker、定价声明）、`submit-review`、draft 流。
- 辅助：`ui start`（本地 UI）、`doctor`、`debug-snapshot`、`spec`。

### 部署与门面
- compose profiles（public-stack/platform/relay/all-in-one）、Caddy edge、GHCR 镜像；brand-site（marketplace/docs/quickstarts/双语 SEO）。

**总评：闭环骨架完整且认真（幂等 id、签名、预扣退款、审核流、加密秘钥托管都做了）。骨架不是问题，问题在下面。**

## 二、缺口分析

### A. 产品缺口（挡用户的）——高置信
| # | 缺口 | 后果 | 严重度 |
|---|------|------|--------|
| A1 | **无自助充值/赠点**：recharge 只有 admin 手动接口 | 新 Caller 装完 CLI 后卡死在"没有 PTS"，转化断点，闭环其实不能自助完成 | 🔴 最高 |
| A2 | **无任何通知机制**：审核通过/驳回、余额不足、调用完成全靠自己轮询 | Responder 提交审核后不知道何时能上架；运营也不知道有新审核 | 🔴 |
| A3 | **账户体系极简**：email 注册即得 key，无密码/找回/key 自助轮换（revoke 仅 admin） | key 丢了 = 身份丢了；无法安全地长期运营 | 🟡 高 |
| A4 | Responder 无收益视图（earned 字段存在但无呈现），法币出口已明确 out of scope 但连"账目页"都没有 | 供给侧留存差 | 🟡 |
| A5 | Caller 无 Web 界面、无调用历史 UX（me/ledger 接口在但只有 API） | 已规划 T-505 门户，缺口确认 | 🟡 |
| A6 | ⚠️ 长任务/异步语义弱：疑似轮询等待模式，未见 webhook/callback 接口预留 | 限制可上架的能力类型 | 待审 |

### B. 工程/框架缺口（挡开发的）
| # | 缺口 | 证据/置信 |
|---|------|-----------|
| B1 | **契约发布管线断裂**：源码依赖未发布的 contracts 导出，无 CI 门禁拦截漂移 | 已实证（CI smoke DOA） |
| B2 | **CI 红灯常态化**，发布不受 CI 约束（v0.1.4/0.1.5 带红发布） | 已实证 |
| B3 | ⚠️ platform-api / cli.js 均为千行级单文件手写路由/分发，无模块边界 | 扩展性风险，深审确认拆分方案 |
| B4 | ⚠️ 存储：sqlite 为主（DATABASE_URL 空置暗示 pg 预留未完成?），并发与迁移能力待审 | 待审 |
| B5 | API 版本混杂（v1/v2 并存），无弃用策略文档 | 中置信 |
| B6 | e2e 套件无绿灯证据；浏览器 UI 无自动化验证手段 | 已实证 |
| B7 | ⚠️ 安全面未系统审过：限速仅计费维度、无全局防滥用、admin key 单把无分权 | 待审 |

### C. 好消息（不用焦虑的）
幂等（request_id/recharge_id 客户端生成）、签名结果、hold-settle-refund、审核流、分页、审计留痕——这些"必要接口"**留了**，而且是对的。你担心的"必要功能没做"主要集中在 A1–A3（用户生命周期），不在核心调用协议上。

## 三、优先级判断（v0）

轴 = "新用户能否自助走完闭环并留下来"：

- **P0（并入/紧接当前 loop）**：B1 契约管线 + B2 CI 绿灯（已进 LOOP.md M1）；**A1 自助获得 PTS**（最小方案：注册赠点，平台侧小改动，比支付渠道轻一个量级）。
- **P1（闭环收紧后）**：A2 最小通知（先做站内/console 徽标 + email 单通道）；A3 key 自助轮换与找回；B6 e2e 修绿并进 CI。
- **P2（产品扩张前的地基）**：B3/B4/B5 框架整备（拆模块、存储决策、版本策略）——在 T-505 门户动工**之前**做，否则门户会把债务翻倍。
- **P3**：A4 收益视图、A6 异步语义——由真实用户需求触发。

**对 roadmap 的修订建议**：P4（T-505 门户）之前插入一个 "P3.5 框架整备" 阶段；A1 赠点从"待写一页纸"升级为 M3 后立即执行的正式项。
