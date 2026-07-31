# 安全审查（Security Review）— D5 威胁面

Created: 2026-07-04 · 按 `audit-charter.md` D5 执行。**只读审查**，结论挂证据。每项给出：现状 / 风险等级 / 最小缓解。
审计锚：platform `e44abfe` · `server.js` = `repos/platform/apps/platform-api/src/server.js`，`Caddyfile` = `repos/platform/deploy/public-stack/Caddyfile`。

风险等级：🔴 高（可直接被利用 / 数据或资金面）· 🟠 中（配置依赖 / 需组合）· 🟡 低（信息泄露 / UX）· 🟢 观察项。

---

## 威胁面总表（按严重度）

| # | 威胁 | 等级 | 一句话 |
|---|---|---|---|
| S1 | relay 零鉴权且公网可达 | 🔴 | 任何人可读/注入/删除任意 receiver 的任务信封 |
| S2 | bootstrap 责任方自动审核通过 + 代码默认开 | 🔴 | 未显式关闭的部署自带一个绕过审核的公开热线 |
| S3 | 弱默认密钥 + 无强度校验 | 🟠 | `.env.example` 全 `change-me`，照抄即公开可知 |
| S4 | admin key 单点无分权 | 🟠 | 单把密钥泄露=平台全控，无轮换无多密钥 |
| S5 | `/metrics` 未配 token 时全开 + 公网暴露 | 🟠 | `/platform/metrics` 可能裸奔 |
| S6 | 女巫注册（无验证 + 松限速） | 🟡 | 可零成本刷注册与审核队列 |
| S7 | `/v1/metrics/summary` 任意 key 可读平台级计数 | 🟡 | 跨租户信息泄露 |
| S8 | hold 并发 TOCTOU | 🟡 | 无资损，但第二个并发 hold 返回 500 而非 402 |
| S9 | CORS `*` | 🟢 | Bearer API 无 ambient 凭据，CSRF 面有限 |

---

## S1 🔴 relay 零鉴权且公网可达

- **现状**：transport-relay 六个路由 `/v1/messages/{send,poll,ack,peek}`、`/v1/receivers/:id/health` **全部无鉴权**（`repos/platform/apps/transport-relay/src/server.js:186-235`），且 Caddy 把 `/relay/*` 直接反代到公网（`Caddyfile:15-17`）。`peek`（GET，`:222`）非破坏性返回某 receiver 的全部队列信封；`poll` 可取走；`send` 可注入；`ack` 可删除。
- **利用**：receiver 名可从 delivery_meta / 请求流推断（`local://relay/<receiver>/<request_id>` 格式，`server.js:914`）。攻击者可（a）读取他人任务输入/结果信封（泄露）、（b）伪造结果信封投递（篡改，但结果包有 Ed25519 签名，caller 侧 `expected_signer_public_key_pem` 会拒伪造——签名是这里的救命稻草）、（c）`ack` 删除他人消息（拒绝服务）。
- **风险**：🔴。签名机制挡住了"伪造结果"，但**读取泄露**与**删除 DoS**不需要伪造签名，直接可用。
- **最小缓解**：relay 加基于 receiver-token 的鉴权（send 时签发、poll/ack 时校验），或至少把 `/relay/*` 从公网 Caddy 撤下、仅内网可达（platform-api↔relay↔responder 都在 compose 网络内，公网暴露 relay 无必要）。后者是一行 Caddy 改动，成本最低。

## S2 🔴 bootstrap 责任方自动审核通过 + 代码默认开

- **现状**：bootstrap 责任方（starlight）以 `status:"enabled", review_status:"approved"` 直接创建（`server.js:279,295`），**绕过审核流**。开关 `ENABLE_BOOTSTRAP_RESPONDERS` 的**代码默认是 `true`**（`readBooleanEnv(process.env.ENABLE_BOOTSTRAP_RESPONDERS, true)`，`server.js:1368`）。public-stack `.env.example` 显式设 false（`:33`），但任何**不基于该 example、或漏设该变量**的部署都会自带一个已审核通过、公开可见的热线。
- **风险**：🔴（默认不安全方向）。正常提交路径是稳的——新责任方 `review_status:"pending"`（`:2521`）、新热线 `review_status:"pending"`（`:2578`），可见性要 `approved+enabled`（`resolveCatalogVisibility`，D1），无自审绕过。**唯一绕过就是 bootstrap**，且默认开。
- **最小缓解**：把代码默认改为 `false`（fail-safe），bootstrap 仅在显式开启时生效；文档明确 bootstrap 仅用于本地演示。

## S3 🟠 弱默认密钥 + 无强度校验

- **现状**：`.env.example` 关键密钥全是占位符——`TOKEN_SECRET=change-me-public-token-secret`、`PLATFORM_ADMIN_API_KEY=sk_admin_change_me`、`PLATFORM_CONSOLE_BOOTSTRAP_SECRET=change-me-public-bootstrap-secret`（`deploy/public-stack/.env.example:24,27,29`）。启动仅校验 `TOKEN_SECRET` **存在**（缺失才拒启，`server.js:4416-4418`），**不校验强度**；admin key 未设时静默生成随机值且不输出（`:1363-1364`），operator 无从得知 → 要么锁死、要么被迫用弱示例值。
- **风险**：🟠。照抄 example 部署 = 三把密钥公开可知；bootstrap secret 弱 → S 与 S2/S4 组合可被 `/session/recover` 重置控制台（见 S4）。
- **最小缓解**：启动时对三把密钥做"非占位符 + 最小长度"断言，命中弱值直接拒启并打印指引；admin key 生成时至少 warn 一行到日志。

## S4 🟠 admin key 单点，无分权无轮换

- **现状**：全平台管理权系于单个 `PLATFORM_ADMIN_API_KEY`（`server.js:1363`）。`requireOperator` 接受该 admin key 或带 admin role 的 caller（`:1747-1765`）；role 授予本身又是 admin-only（`:3879`）。无 admin key 轮换路由、无多 admin key、无按操作分权（审核/计费/密钥管理共用同一把）。
- **风险**：🟠。单点泄露=全控（改余额、审批任意热线、轮换任意用户 key、读全量审计）。gateway 侧已加密托管 admin key（T-504）缓解了"控制台明文存储"，但密钥本身仍是单点。
- **最小缓解**：短期——支持 admin key 轮换（复用已有的 caller/responder rotate 模式）+ 文档化托管；中期——按能力分权（审核员 / 计费员 / 超管三类 scope），与 D2 的鉴权归一一起做。

## S5 🟠 `/metrics` 未配 token 时全开 + 公网暴露

- **现状**：Prometheus `/metrics` 由 `requireMetricsAccess` 守卫，但 `if (!metricsBearerToken) return true`——**未配 token 即全开**（`server.js:2723-2733`）。public-stack `.env.example` 未见该 token 设置项，且 Caddy 把 `/platform/*` 反代公网（`Caddyfile:11-13`）→ `/platform/metrics` 可能公网可读。
- **风险**：🟠。泄露内部指标（请求量、错误率、租户活动量级），辅助侦察。
- **最小缓解**：默认要求 metrics token（未配则拒绝 `/metrics` 而非放行），或在 Caddy 层把 `/platform/metrics` 从公网路径排除。

## S6 🟡 女巫注册（无验证 + 松限速）

- **现状**：`POST /v1/users/register` 公开、**无邮箱验证**（email 仅存字符串，`server.js:1202-1206`）；`POST /v2/responders/register` **可匿名**（optional 鉴权，`:2846-2856`）；注册限速默认极松——`registerUserMax/registerResponderMax/catalogSubmitMax` 默认各 **1000/min**（`:848-850`）。
- **风险**：🟡。变现被 A1 挡住（注册拿不到 PTS，需 admin 建租户+充值），所以"注册即薅点"不成立；但可**零成本刷审核队列**（catalogSubmitMax 1000/min 提交待审热线），淹没 operator 审核（与 A2 无通知叠加，运营侧更难分辨）。也放大 D3 的写快照成本（每注册一次写整快照）。
- **最小缓解**：收紧默认限速（注册类降到个位数/分钟/IP）；responder 注册要求已认证 caller（去掉匿名路径）；审核提交按责任方配额。

## S7 🟡 `/v1/metrics/summary` 任意 key 可读平台级计数

- **现状**：`requireAuth`（任意有效 key）即可读 `total_events` 与按类型分布（`server.js:3530-3543`），非 operator 限定，与同族 `/v1/admin/*` 的 operator 门槛不齐。
- **风险**：🟡。任何注册用户可窥平台活动量级（跨租户信息泄露）。
- **最小缓解**：提升到 `requireOperator`，或返回仅调用者自身范围的计数。

## S8 🟡 hold 并发 TOCTOU（无资损）

- **现状**：`applyBillingHoldIfNeeded` 先 `getBalance` 再 `applyBalanceDelta`，二者是**独立的 await，非同一事务**（`server.js:681-702`）。两个并发 token 请求可都通过 `balance < max_charge` 的 402 前置检查（`:687`），随后各自 `applyBalanceDelta`。
- **判定（计费竞态结论）**：**不会资损**——`applyBalanceDelta` 内有 `FOR UPDATE` 行锁 + 版本 CAS + `newBalance < 0 throws would_break_invariant`（`billing-store:464-465`，D3 已验证）。第二个并发 hold 会在 DB 层被不变量挡住。**唯一问题**：它抛 `BillingInternalError` → 返回 **500 ERR_BILLING_INTERNAL** 而非干净的 **402 余额不足**，误导客户端重试逻辑。
- **风险**：🟡（correctness/UX，非安全资损）。charter 点名的"计费竞态（hold 并发）"结论=**已被计费轨的 CAS 兜住，无资损**。
- **最小缓解**：把 `would_break_invariant` 映射为 402（可重试语义），或把余额检查并入 applyBalanceDelta 事务。

## S9 🟢 CORS 通配

- **现状**：所有响应 + OPTIONS 预检均 `access-control-allow-origin: *`（`server.js:134,2797`）。
- **风险**：🟢。API 用 Bearer header 鉴权、无 cookie/ambient 凭据，CORS `*` 不直接构成 CSRF；公开端点本就该开放。仅在未来引入基于 cookie 的控制台同源调用时需收紧。
- **最小缓解**：暂无需动；若 gateway 引入 cookie 会话再按需收敛 origin。

---

## 本维度前 5 个最重要发现

1. **S1 relay 零鉴权公网可达（🔴）**：读泄露 + 删 DoS 无需伪造签名即可用；撤下公网暴露是一行 Caddy 改动，性价比最高。
2. **S2 bootstrap 自动审核 + 默认开（🔴）**：审核绕过的唯一现实路径，且代码默认方向不安全；改默认为 false 即闭合。
3. **S3/S4 密钥治理（🟠×2）**：弱默认无校验 + admin 单点无轮换无分权，是"配置一旦照抄就裸奔"的系统性风险。
4. **审核绕过与计费竞态的正式结论**：正常审核路径稳（pending→admin→approved，`review_reason` 记录驳回原因）；hold 并发无资损（CAS 兜底）。charter 两个重点关切**在正常路径上是安全的**，风险集中在 bootstrap 默认与错误码 UX。
5. **S6 女巫刷审核队列（🟡）**：变现被 A1 天然挡住，但刷待审队列淹没运营的路径开放，且与 A2（无通知）叠加放大。

## 与 v0 清单对账（D5 范围）

| v0 条目 | 判定 | 依据 |
|---|---|---|
| B7 安全面未系统审过；限速仅计费维度、无全局防滥用、admin key 单把无分权 | **确认并展开** | admin 单点=S4；限速其实覆盖注册/提交但默认过松=S6；新增 relay 零鉴权 S1、bootstrap 绕过 S2、metrics 暴露 S5 三项 v0 未列 |
| A3 账户体系极简、注册无验证 | **确认（安全视角）** | 无邮箱验证=女巫地基 S6；key 丢失无自助恢复且 admin 无法核实身份（D1）在此叠加为社工面 |

## D5 附录（长尾/推测）

- `review_reason` 字段在责任方与提交记录中存在（`server.js:2524`）——**回答 D2 遗留问题**：驳回原因服务端有记录；缺的只是把它呈现给 owner 的返回体字段/UI（`buildCatalogDetail` 未显式带出，D2 附录待办可关闭为"数据在、未透出"）。
- 结果包 Ed25519 签名 + `expected_signer_public_key_pem` 校验（`server.js:2053`、client 侧 `verifyReviewResult`）是全系统最强的一道防线，挡住了 relay 篡改的"伪造结果"分支——**这是真做对的安全设计**，S1 的缓解不应削弱它。
- （推测）token introspect（`/v1/tokens/introspect`）仅 responder 可调，但 task_token 是 HMAC 签名的自包含凭据（`signToken`/`parseToken` `:173-203`）；其密钥=TOKEN_SECRET，故 S3 的 TOKEN_SECRET 弱值会直接危及 task token 不可伪造性——弱 TOKEN_SECRET 是比 admin key 更深的单点。
- （推测）`/v1/requests/events/batch`（any-key）跨请求批量取事件的越权边界未逐条复核；D2 已登记，此处标为待运行时验证项。
- gateway `/session/recover`（T-504）用 bootstrap secret 授权破坏性重置——S3 弱 bootstrap secret 使该恢复流成为控制台接管路径，三项（S2 默认、S3 弱值、S4 单点）在此交汇。
