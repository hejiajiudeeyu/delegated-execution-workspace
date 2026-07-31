# 产品功能清单与缺口分析 v1（深审版）

Created: 2026-07-04 · 按 `audit-charter.md` 执行，逐维度增量更新。
**进度：D1、D2 已完成；D3 待下一轮（数据与存储）。**

审计锚（子模块 SHA，证据行号以此为准）：
- platform `e44abfe`（v0.1.5-3，含 contracts ^0.1.3 依赖提升）· client `a3f66a3` · protocol `b9234e2` · brand-site `ac8ea7b`
- 并行开发 loop 正在推进（contracts 0.1.3 已发 npm），对账结论已考虑该在途变更。

证据路径缩写：`P/` = repos/platform、`C/` = repos/client。`server.js` 未加前缀时指 `P/apps/platform-api/src/server.js`。

---

## D1 用户旅程完备性

### 1. Caller 旅程

| 步骤 | 状态 | 证据 | 说明 |
|---|---|---|---|
| 注册 | ✅ 可自助 | `C/apps/ops/src/cli.js:1843` → `server.js:2830`（`registerUserMax` 限速 :2831）→ `registerCallerUser` `server.js:1202-1224` | email 即得 `user_id` + `sk_caller_*` key。**无邮箱验证**，email 只是存储字符串 |
| 获得 PTS | ❌ 断点 | 赠点逻辑不存在（`registerCallerUser` 无 billing 调用；全仓 grep initial/welcome/grant credit 无果）；充值仅 `POST /v1/admin/billing/tenants/:id/recharges` `server.js:3694`（requireOperator）；租户记录本身也要 admin 先建 `server.js:3612` → `P/packages/billing-store/src/index.js:322`；租户不存在时查余额直接抛 `TenantNotFoundError` `billing-store:166-175` | **注册 ≠ 可用**。T-503 实证：operator 手工 create-tenant + recharge 20000 PTS 后 caller 才能调用（T-503 step 6，含 tenant_id/user_id 字段踩坑） |
| 发现热线 | ⚠️ 可用但断层 | 公开目录 `GET /marketplace/hotlines` `server.js:2931-2955` + brand-site marketplace 页；CLI 命令面无 list/search（dispatch 全表 `C/apps/ops/src/cli.js:1772-1900` 无此命令） | caller 必须去网站抄 `hotline_id`+`responder_id`（`cli.js:1344-1345` 均必填），CLI 内无发现能力 |
| 调用 | ✅ 闭环可用 | 全链 `C/apps/ops/src/cli.js:1341-1449`：token(hold)→delivery-meta→本地 controller→dispatch→轮询结果；hold 不足 402 `server.js:687-692`；FAILED 自动退款 `server.js:751-770`（T-503 step 8 实证） | 等待=纯轮询（`waitFor` `cli.js:1420-1439`，默认 1s 间隔 / 60s 超时 `cli.js:38-39`）。默认 `--max-charge-cents 500` 高于多数热线定价，失败尝试造成超额 hold（T-503 finding） |
| 查账 | ⚠️ API 有、无入口 | `GET /v1/tenants/me/balance` `server.js:3546`、`/ledger` `:3578`（requireCaller）；CLI 无独立命令，仅 call-hotline 尾部附带输出 `cli.js:1445-1449` | 想单独看余额只能裸 curl。hold 过期退款为**惰性回收**，仅挂在这两个查询上（`expireHeldBillingForTenant` 全部调用点=`server.js:3557,3588`） |
| key 丢失恢复 | ❌ 断点 | rotate 全部 admin-only：`/v1/admin/users/:id/api-keys/rotate` `server.js:3903-3918`、responder 同 `:3920-3959`、revoke `:3961`（均 requireOperator） | 自助恢复不存在。又因注册无验证，admin 代轮换时**无法核实请求者身份**（只能凭 contact_email 字符串信任，推测） |

### 2. Responder 旅程

| 步骤 | 状态 | 证据 | 说明 |
|---|---|---|---|
| 注册 | ✅ | `POST /v2/responders/register` `server.js:2846-2864`；CLI `enable-responder` `cli.js:1794` / `responder register` `:1852` | 可带 caller key 关联 owner_user_id；auth 为空时是否允许匿名注册待 D2 鉴权矩阵确认（`server.js:2848-2852` 只拦类型不符，推测可匿名） |
| 上架 | ✅ | draft 流 + `submit-review` `cli.js:1831` → `POST /v2/hotlines` `server.js:2866-2888`（requireAuth，`catalogSubmitMax` 限速） | 模板 bundle 校验在提交链路内 |
| 审核等待期 | ❌ 全盲 | 待审热线 visibility=hidden（`resolveCatalogVisibility` `server.js:924-929`：仅 responder+hotline 双 routable 才 public）；`GET /v2/hotlines/:id` 对非公开项 404 `server.js:2921-2926`；review 路由全在 `/v1/admin/*` `server.js:3815+`；无 owner 视图路由、无任何通知 | responder 提交后**没有任何合法途径**查询自己热线的审核状态，只能反复盲刷 marketplace 等它出现；被驳回则永远等不到且不知原因 |
| 收益查询 | ❌ 比 v0 认知更糟 | billing-store 实现了 `responder_earn` 方向（会累计 `earned_as_responder_cents`，`billing-store:414-418`），但 platform-api 结算只产生 `caller_spend` 借记（`server.js:699,803`）与 `system` 退款（`:599,757,794`），**全仓无任何 `responder_earn` 调用方** | 收益不是"无呈现"，是**根本不入账**：结算金额进平台，无分账分录。营收闭环缺供给侧半边 |
| 更新热线版本 | ❌ 未见机制 | 路由全表无热线更新端点（只有 `POST /v2/hotlines` 创建 + admin 生命周期 `server.js:4247-4333`） | 改价/改模板=重新提交新热线走全套审核（推测，D2 确认 version 字段语义） |
| 下架 | ❌ 无自助 | 平台侧仅 admin disable `server.js:4247`；CLI `disable-hotline`/`remove-hotline` 是**纯本地操作**（`commandSetHotlineEnabled` `cli.js:1083-1111` 只写本地 state+通知本地 supervisor，不调平台） | responder 停 worker → 心跳消失 → availability 转 unhealthy（`server.js:458-462`），但目录条目仍挂着；真正下架要找 admin |
| 服务运行 | ✅ | 心跳 `POST /v1/responders/:id/heartbeat` `server.js:3456`；relay 收发件箱模式 | responder 掉线 → caller 侧 60s 超时退出，hold 靠 TTL 过期（默认 300s，`server.js:1362`）+ 惰性回收退款 |

### 3. Operator 旅程

| 步骤 | 状态 | 证据 | 说明 |
|---|---|---|---|
| 从零部署 | ✅ 较顺 | `P/deploy/public-stack/`（compose+Caddy+README）；`.env.example` 全参数明示（TOKEN_SECRET / PLATFORM_ADMIN_API_KEY / PLATFORM_CONSOLE_BOOTSTRAP_SECRET / DATABASE_URL→Postgres）；三 store 迁移自动执行 `server.js:4385,4398,4409`；缺 TOKEN_SECRET 拒绝启动 `server.js:4416-4418` | 陷阱①：`DATABASE_URL` 和 `SQLITE_DATABASE_PATH` 都不配时**静默以纯内存运行**（`createOptionalPersistence` 返回 null `server.js:4378-4400`），重启丢全部用户/目录/账务关联状态。陷阱②：`.env.example` 全是 change-me 弱默认，无强度校验（D5 细审） |
| 首次解锁 | ⚠️ 已修待发布 | T-503 曾为 major 断点（passphrase 无交接→SSH 重置 volume）；T-504 落地 `POST /session/recover`（`P/apps/platform-console-gateway/src/server.js:447-489`：bootstrap secret + 显式确认 + 破坏性重置 + admin key 重录入） | 生产 rollout 仍在 checklist 未执行（T-504 notes §20-26）；丢 passphrase 且丢 bootstrap secret = 彻底锁死（bootstrap secret 在部署 env，有机器权限即可恢复） |
| 日常审核 | ⚠️ | console 审核队列可用（T-503 steps 3-4 实证，经 gateway `/proxy/v1/admin/*`） | 无"新审核到达"提醒，纯手动刷新（与 A2 同根） |
| 日常计费 | ⚠️ 繁琐 | 建租户+充值全手工：console Billing 面板（T-503 step 6）；`tenant_id` 必须填 caller 的 user_id（T-504 已加 console 解释文案） | 每个新 caller 都需要 operator 两步手工操作才能用（对账 A1） |
| 日常巡检 | ⚠️ | metrics summary/events `server.js:3530,3504`、audit-events `:3987`、healthz/readyz `:2804,2820`；console 有 gateway health card（T-504） | 指标/审计有 API，console 呈现覆盖度部分；无告警通道 |
| 事故恢复 | ❌ 缺口 | **无任何备份/恢复工具**（`P/scripts/`、`Makefile`、`deploy/` grep backup/pg_dump/restore 无果）；状态模型=每次变更全量快照入 Postgres（`onStateChanged→saveSnapshot` `server.js:4431-4435`）+ 启动 hydrate `:4426` | 数据安全完全依赖 operator 自备 Postgres 备份；文档未提示。in-flight hold 随快照恢复、靠惰性回收，平台重启不丢账（好） |

### 4. 断点清单（跨旅程，按严重度）

1. 🔴 **Caller 注册后无法自助获得可用账户**（无赠点、无自助充值、租户都要 admin 手建）——转化必断，闭环不能自助完成。
2. 🔴 **Responder 收益不入账**：结算无 `responder_earn` 分录，供给侧经济激励为零（`responder_earn` 实现存在但无调用方）。
3. 🔴 **Responder 审核等待期全盲**：无 owner 状态查询路由 + 无通知；被拒者无限等待且不知原因。
4. 🟡 key 丢失无自助恢复路径（rotate 仅 admin），且平台无法核实恢复请求者身份（注册无验证）。
5. 🟡 Responder 无自助下架/更新：平台目录的变更权全在 admin。
6. 🟡 Operator 事故恢复无工具链（无备份脚本/文档），纯内存模式静默可用是部署陷阱。

### 5. 绕行成本清单（需人工介入处）

| 场景 | 介入方 | 操作 |
|---|---|---|
| 新 caller 开通 | operator | console 建租户（填 caller user_id）+ 充值，2 步/人 |
| 审核结果告知 | operator→responder | 场外私信/邮件（系统无通道） |
| key 丢失 | operator | admin rotate 路由（3 个），身份核实靠场外 |
| 热线改价/下架 | operator | admin disable/enable；更新=responder 重提+重审 |
| 余额/hold 卡住 | caller 自己 | 调一次 me/balance 触发惰性回收 |

### 6. 本维度前 5 个最重要发现

1. **A1 比 v0 更硬**：不仅无自助充值，**计费租户本身都是 admin 手工建的**（`server.js:3612` + `billing-store:322`；租户缺失时 `TenantNotFoundError` `billing-store:171-173`）。"注册赠点"最小方案需同时解决"注册时自动建租户"，否则赠点无处可记。
2. **收益从不入账（新发现，🔴）**：`responder_earn` 记账方向已在 billing-store 实现（`:414-418`）却无任何调用方——市场分账只差结算处一条 credit 分录的距离，但现状供给侧收入为 0。
3. **Responder 对自己资产零可见性（A2 的锐化）**：不是"通知缺失"的体验问题，而是**连拉取的 API 都没有**（owner 视图路由不存在，待审项对 owner 也是 404）。最小修复是一个 owner-scoped GET，比通知系统轻一个量级。
4. **CLI 命令语义误导**：`disable-hotline`/`remove-hotline` 只改本地 runtime（`cli.js:1083-1111`），用户会误以为已从平台下架。
5. **Operator 断点已从"解锁"移到"备份"**：T-504 修复首解锁后，operator 旅程最大缺口变为无备份/恢复工具与纯内存陷阱。

### 7. 与 v0 清单对账（D1 范围）

| v0 条目 | 判定 | 依据 |
|---|---|---|
| A1 无自助充值/赠点 🔴 | **确认并加重** | 见发现 1；T-503 step 6 实证 |
| A2 无通知机制 🔴 | **确认并加重** | responder 侧连状态拉取 API 都没有（见发现 3）；operator 侧无新审核提醒 |
| A3 账户体系极简（revoke 仅 admin） | **修正** | admin 侧已有 3 个 rotate 路由（`server.js:3903-3959`，v0 未发现）；但自助轮换/找回仍无，严重度维持 🟡高 |
| A4 无收益视图 🟡 | **推翻并升级为 🔴** | 不是"有字段无呈现"——结算根本不产生收益分录（见发现 2） |
| A5 Caller 无 Web/查账 UX | **确认（细化）** | balance/ledger 会在 call-hotline 输出尾部带出（`cli.js:1445-1449`），但无独立命令/界面 |
| A6 异步语义弱 ⚠️ | **确认（细化）** | caller CLI=纯轮询（1s/60s）；`result_delivery` 信封字段存在算部分预留，webhook/callback 路由无。D2 出成本差判断 |
| B4 sqlite 为主、DATABASE_URL 空置 ⚠️ | **修正** | 部署态（public-stack）为 Postgres 双 store（快照+billing）且迁移自动；sqlite 是快照后备选项（`SQLITE_DATABASE_PATH` `server.js:4389-4399`）与 client/relay 本地存储。"空置暗示未完成"不成立。D3 细审并发/迁移质量 |
| B1 契约管线断裂（实证） | **确认，即时漂移在修** | contracts 0.1.3 已发 npm、platform 依赖提升已提交（platform `e44abfe`，并行开发 loop 2026-07-04）；**结构性缺口（CI 门禁拦漂移）仍开放**，D6 出方案 |
| B7 限速仅计费维度 ⚠️ | **部分修正** | 路由级限速存在：registerUserMax `:2831`、registerResponderMax `:2853`、catalogSubmitMax `:2875`（`enforceRateLimit` `:2711`）。覆盖面与强度 D5 审 |

### 8. 附录：长尾与推测标注

- （推测，D2 确认）`/v2/responders/register` 疑似允许无鉴权匿名注册（`server.js:2848-2852` 仅拦鉴权类型不符）。
- （推测）纯内存模式启动时无警告日志；操作者可能长期无感知运行（`server.js:4378-4400` 无 warn 输出，未实测）。
- token TTL 默认 300s（`server.js:1362`）即 hold 生命周期上限；caller CLI 默认 60s 超时先于 hold 过期，超时后账面 hold 需等 TTL+惰性回收。
- `server.js` 内嵌 ~百行级演示 responder 文案与 schema（`:1377-1398+` Starlight bootstrap），生产开关 `ENABLE_BOOTSTRAP_RESPONDERS` 代码默认 true（`:1365-1368`）、public-stack env 显式 false——默认方向反了（D5/D4 记）。
- admin key 未配置时自动生成随机值（`server.js:1363-1364`），若无日志输出则 operator 无从得知（未实测，D5 记）。
- T-503 遗留 minor：`call-hotline` 默认 max-charge 500 与热线实际定价脱钩，造成超额 hold（`cli.js:1347`）。
- 浏览器自动化（console UI 层）在 agent 环境不可用（T-503 violation 3），D6 需给最小 smoke 方案。

---

## D2 API 面完整性与一致性

审计对象：`P/apps/platform-api/src/server.js`（51 路由，单文件手写 if 链 `:2791-4358`）、`P/apps/transport-relay/src/server.js`（6 路由）、`P/apps/platform-console-gateway/src/server.js`（会话/代理，非业务 API）。

### 1. 全量路由 × 方法 × 鉴权矩阵（platform-api）

鉴权级别：`public`=无鉴权 · `any`=任意有效 key（`requireAuth` `:1706`）· `caller`/`responder`（scope 校验 `:1715/:1727`）· `operator`=admin key 或带 admin role 的 caller（`requireOperator` `:1747`）· `optional`=有 key 则校验类型、无 key 也放行（`resolveAuth` `:1697`）。

| 路由 | 方法 | 鉴权 | 幂等键 | 分页 | 证据行 |
|---|---|---|---|---|---|
| /healthz、/readyz、/ | GET | public | — | — | 2804,2820,2825 |
| /metrics | GET | **optional bearer**（token 未配则全开） | — | — | 3809+（`requireMetricsAccess` :2723） |
| /v1/users/register | POST | public（限速 registerUserMax） | 无（每次新建） | — | 2830 |
| /v2/responders/register | POST | **optional**（可匿名） | 无 | — | 2846 |
| /v2/hotlines | POST | any（caller/responder） | 无 | — | 2866 |
| /v2/hotlines | GET | public | — | **无（全量返回）** | 2890 |
| /v2/hotlines/:id | GET | public（仅 public 项） | — | — | 2921 |
| /marketplace/hotlines、/marketplace/meta、/marketplace/hotlines/:id[/template-bundle]、/marketplace/responders/:id | GET | public | — | **无** | 2931-2994 |
| /v1/catalog/hotlines/:id | GET | optional（owner 可见 hidden 项） | — | — | 3008 |
| /v1/catalog/hotlines/:id/template-bundle | GET | optional | — | — | 3028 |
| /v1/tokens/task | POST | caller | **request_id（客户端生成）** | — | 3049 |
| /v1/service-resolutions | POST | caller | — | — | 3072 |
| /v1/tokens/introspect | POST | responder | — | — | 3090 |
| /v1/requests/:id/delivery-meta | POST | caller | request_id | — | 3127 |
| /v1/requests/:id/ack | POST | responder（owner 校验） | 事件去重 :3244 | — | 3209 |
| /v1/requests/:id/events | POST | responder（owner 校验） | — | — | 3257 |
| /v1/requests/:id/events | GET | any（owner 校验 :3364） | — | — | 3353 |
| /v1/requests/events/batch | POST | any | — | — | 3390 |
| /v1/responders/:id/heartbeat | POST | responder（owner） | — | — | 3456 |
| /v1/metrics/events | POST | any | — | — | 3504 |
| /v1/metrics/summary | GET | **any（平台级计数对所有 key 可见）** | — | — | 3530 |
| /v1/tenants/me/balance、/ledger | GET | caller | — | ledger=**cursor** | 3546,3578 |
| /v1/admin/billing/tenants | POST | operator | tenant_id（ON CONFLICT DO NOTHING billing-store:328） | — | 3612 |
| /v1/admin/billing/tenants/:id/balance、/ledger | GET | operator | — | ledger=cursor | 3641,3666 |
| /v1/admin/billing/tenants/:id/recharges | POST | operator | **recharge_id（重复检测 billing-store:626-634）** | — | 3694 |
| /v2/admin/responders、/v2/admin/hotlines | GET | operator | — | **offset** | 3731,3760 |
| /v1/admin/requests、/reviews、/review-tests | GET | operator | — | **offset** | 3792,3815,3837 |
| /v1/admin/review-tests/:id | GET | operator | — | — | 3861 |
| /v1/admin/users/:id/roles | POST | operator | — | — | 3879 |
| /v1/admin/users/:id/api-keys/rotate | POST | operator | — | — | 3904 |
| /v1/admin/responders/:id/api-keys/rotate、/signing-keys/rotate | POST | operator | — | — | 3921,3938 |
| /v1/admin/api-keys/revoke | POST | operator | — | — | 3961 |
| /v1/admin/audit-events | GET | operator | — | offset | 3987 |
| /v1/admin/hotlines/:id/review-tests | POST | operator | — | — | 4010 |
| /v2/admin/responders/:id/{approve,reject,enable,disable} | POST | operator | — | — | 4138-4247 |
| /v2/admin/hotlines/:id/{approve,reject,enable,disable} | POST | operator | — | — | 4248-4333 |

Relay（`transport-relay`）：`/v1/messages/{send,poll,ack,peek}`、`/v1/receivers/:id/health`、healthz——**全部无鉴权**（`:186-235`）。Caddyfile 把 `/relay/*` 直接反代到公网（`deploy/public-stack/Caddyfile:15-17`）。见 D5。

### 2. v1/v2 并存的真实差异与弃用策略

**结论：v1/v2 前缀不是版本代际，是历史偶然，无任何弃用策略。** 证据——同一资源域跨前缀随意分布：
- 注册：caller=`/v1/users/register`，responder=`/v2/responders/register`（同为注册，前缀不同）。
- 目录：提交/公开列表=`/v2/hotlines`，但详情/模板=`/v1/catalog/hotlines/:id`（同一热线，读详情降到 v1）。
- admin：计费/请求/审核/key=`/v1/admin/*`，但 responder/hotline 生命周期=`/v2/admin/*`。

没有 `Deprecation`/`Sunset` 头、没有版本协商、没有 `/v1`→`/v2` 迁移文档（grep deprecat/sunset 于 server.js 无果）。**影响**：任何"v2 是 v1 升级版"的直觉都是错的，客户端必须逐路由记忆前缀（`C/apps/ops/src/cli.js` 里就是硬编码混用）。这不是"双版本并存需弃用策略"问题，而是"前缀语义为零、需要一次性归一"问题——成本低（改路由字符串+客户端），但越晚做客户端硬编码越多。

### 3. 一致性缺陷（横切）

1. **分页三套并存**：offset（admin 列表 `paginateItems` :2226）／ cursor（billing ledger `encodeCursor` billing-store:95）／ **无（公开 marketplace/catalog 列表全量返回** `:2949,2917`）。公开列表无上限，目录增长后是响应体膨胀+扫描风险（D4 记）。
2. **错误码命名多族**：`CONTRACT_*`（校验）、`AUTH_*`（鉴权）、裸域码（`CATALOG_HOTLINE_NOT_FOUND`/`REQUEST_NOT_FOUND`）、**两套 billing 前缀并存**（`ERR_BILLING_*` :3705 与 `BILLING_*`/`PREPAID_BALANCE_INSUFFICIENT` :690）。错误体形状也不统一：多数 `{error:{code,message,retryable}}`，注册类却直接 `{error}` 透传（`:2837,2858`）。
3. **鉴权语义不一致**：`/v1/metrics/summary` 用 `requireAuth`（任意 key 可读平台级事件计数），而同族 `/v1/admin/*` 需 operator——读侧防线不齐。
4. **`retryable` 字段时有时无**：部分错误带（`:662,690`），多数不带，客户端无法统一决定重试。

### 4. 缺失接口清单（"现在留 vs 以后加"成本差）

| 缺失接口 | 现状 | 现在留的成本 | 以后加的成本 | 判断 |
|---|---|---|---|---|
| **自助充值** `POST /v1/tenants/me/recharges` | 仅 admin recharge :3694 | 低：复用 `createRecharge`，加 caller-scope 路由 + 建租户 | 高：叠加通知/风控后再补，且 A1 断点持续放血 | **现在留**（🔴，见 D1 发现 1） |
| **注册即建租户+赠点** | register 不碰 billing :1202 | 低：register 末尾调 `createTenant`+可选 grant recharge | 中 | **现在留**（🔴） |
| **责任侧收益分录** `responder_earn` | 记账方向已实现无调用方（billing-store:414） | 低：结算处 :803 补一条 credit | 高：历史结算无法回填分账 | **现在留**（🔴，D1 发现 2） |
| **用户级 key 自助轮换** `POST /v1/users/me/api-keys/rotate` | 仅 admin :3904 | 中：需先解决身份核实（注册无验证） | 中 | 依赖账户体系，可 P1 |
| **webhook/callback**（结果/审核/余额推送） | 无任何回调注册路由 | 中：需签名+重试+死信设计 | 中：真需求触发时再加 | **以后加**（轮询兜底可用，A6） |
| **通知拉取** `GET /v1/notifications` | 无 | 低：站内事件表+游标拉取 | 低 | 与 A2 绑定，P1 |
| **owner 审核状态查询** | ✅ **已存在**：`/v1/catalog/hotlines/:id` owner 可见 hidden 项（:3008 + `canViewCatalogItemDetail` :959-971），runtime 已自动轮询（`C/apps/ops/src/supervisor.js:1988-2009`）；返回体含 `review_status`/`latest_review_test`/`submission`（`buildCatalogDetail` :1004） | — | — | **不用加**（修正 D1） |

### 5. 幂等/契约"好消息"复核（确认 v0 判断成立）

- request_id 客户端生成，token 重发经"请求绑定 + hold 状态"双重幂等（`issueTaskToken` :2251-2260 拒绝跨 caller/responder 复用；`applyBillingHoldIfNeeded` :655-657 held 态直接复用不重复扣）。
- recharge_id 幂等含重复冲突检测（billing-store:626-634，`RechargeDuplicateKeyError`）。
- tenant 创建 `ON CONFLICT DO NOTHING`（billing-store:328）。
- 结论：**核心写路径幂等设计是对的**，与 v0 "好消息" 一致。

### 6. 本维度前 5 个最重要发现

1. **D1 发现 3 需修正**：owner 审核状态查询 API **存在**（`/v1/catalog/hotlines/:id` 对 owner 放行 hidden 项，runtime 自动轮询）。真实缺口收窄为：无推送通知、驳回原因未在返回体体现（`buildCatalogDetail` 只带 review_status/submission，未见 reject_reason 字段——待 D 附录确认）、且状态刷新依赖 runtime 常驻。严重度从 🔴 降为 🟡。
2. **relay 完全无鉴权且公网可达**（`transport-relay:186-235` + `Caddyfile:15`）：任何人可 poll/peek 任意 receiver 的收发件箱信封。这是 D5 的高危项，此处登记。
3. **v1/v2 前缀无语义**：不是弃用策略缺失，是需要一次性路由归一；越晚客户端硬编码越深。
4. **分页三套 + 公开列表无上限**：marketplace/catalog 列表随目录增长无界返回，是 D4 扩展性的具体债。
5. **`/v1/metrics/summary` 任意 key 可读平台级计数**：读侧鉴权与 admin 族不齐，轻度信息泄露。

### 7. 与 v0 清单对账（D2 范围）

| v0 条目 | 判定 | 依据 |
|---|---|---|
| B5 API 版本混杂（v1/v2），无弃用策略 | **确认并锐化** | 前缀无代际语义（见 D2.2），归一成本低但随时间上升 |
| A6 异步语义弱、无 webhook/callback 预留 | **确认** | 全路由无回调注册；`result_delivery` 信封是唯一异步预留（成本判断见 D2.4：轮询兜底可用，webhook 以后加） |
| A2 通知机制缺失 | **部分修正** | responder 审核状态有 owner 拉取 API（自动轮询），缺的是"推送"与"驳回原因呈现"，非"无从得知" |
| B7 限速仅计费维度 | **进一步修正** | 注册/提交路由有限速（D1 已记）；但**读侧鉴权不齐**（metrics/summary）与 **relay 零鉴权**是更实的面（见 D5） |

### 8. D2 附录（长尾/推测）

- （推测）`/v2/responders/register` optional 鉴权即匿名可注册 responder（`:2846-2856`，auth 为 null 时不拦）——女巫面，D5 细审。
- `/metrics`（Prometheus）在 `metricsBearerToken` 未配时全开（`requireMetricsAccess` :2724 `if (!metricsBearerToken) return true`），public-stack env 未见该 token 设置——公网 `/platform/metrics` 可能裸奔，D5 记。
- `/v1/requests/events/batch`（:3390）用 `requireAuth`（any），跨 caller/responder 批量取事件的越权边界待 D5 逐条核（此处仅登记）。
- 驳回原因（reject reason）是否随 owner 查询返回：`buildCatalogDetail` :1004-1010 未显式带 reject_reason，需在 D 终稿前确认 submission 结构是否含之。
- relay `/v1/messages/peek`（GET，:222）非破坏性读取全量队列，无鉴权——信封内容泄露面最大处。

---

## D3 数据与存储（待本轮之后执行）
