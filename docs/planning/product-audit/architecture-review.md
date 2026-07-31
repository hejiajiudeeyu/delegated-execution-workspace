# 架构审查（Architecture Review）— D3 数据与存储 / D4 架构与可扩展性

Created: 2026-07-04 · 按 `audit-charter.md` D3/D4 执行（D6 质量基建并入本文档 §D6）。**只读审查**，结论挂证据。
**进度：D3、D4、D6 已完成；D5（安全）见 `security-review.md`。**

审计锚：platform `e44abfe` · 证据路径 `P/` = repos/platform，`server.js` 指 `P/apps/platform-api/src/server.js`。

---

## D3 数据与存储

### 1. 双轨存储的真实状态：一半生产级，一半玩具

平台数据分裂在两个完全不同的一致性域：

**A 轨——计费（关系型，生产级）** `P/packages/billing-store/` + `postgres-store/migrations/002_p1_tenant_balance.sql`：
- 规范 schema：`tenant_balance` 主键 + `CHECK (credit_balance_cents >= 0)` 非负约束 + ENUM 类型 + 复合索引（`002:29-89`）。
- 并发安全：`SELECT ... FOR UPDATE` 行锁 + 乐观版本 CAS（`UPDATE ... WHERE version = $4`，失败重试至 `MAX_CAS_RETRIES=5`，`index.js:446-495`）。
- 追加式流水 `tenant_balance_ledger`，ULID 主键、前后余额快照入账（`:502-527`）。
- 充值幂等含重复检测（`RechargeDuplicateKeyError`，`:626-634`）。
- **判定：这一轨可多实例、可并发、可审计，是认真做的。**

**B 轨——其余一切（单 JSON blob，玩具级）** `postgres-store/src/index.js` + migration `001`：
- 表结构 `service_state_snapshots(service_name TEXT, state_json JSONB, updated_at TEXT)`——**无主键、无 UNIQUE 约束**（`001_l0_state_snapshots.sql:6-10`）。
- 全平台状态（users / apiKeys / responders / catalog / templates / requests / submissions / reviewTests / metricsEvents / auditEvents / reviewEvents，`serializePlatformState` `server.js:1654-1667`）在内存里是 Map，**每次变更整体序列化**。
- 落盘方式：`saveSnapshot` 对整行 `DELETE` 再 `INSERT` 整个 JSONB（`postgres-store:74-92`），由 `onStateChanged` 在几乎每个写路由后触发（`server.js` 内 20+ 处 `persistPlatformState`）。
- **判定：这一轨是"内存对象 + 全量转储"，不是数据库设计。**

### 2. 🔴 写放大无上限（硬扩展墙）

- `state.requests` 是 Map，全程只有 `.set`（`server.js:1779`），**无 `.delete`、无淘汰、无归档**——每一次历史调用永久驻留快照。
- 对比：per-request 的 `events` 数组有 200 上限（`pushCapped` `:1831`），metricsEvents/auditEvents/reviewEvents 有 5000 上限（`:1942,1954,3524`）——**唯独 requests 集合无界**。
- 后果：每次写（新建 hold、心跳触发的惰性回收、审核动作）都要 `JSON.stringify` 整个 state 并重写整行，**单次写成本 = O(累计历史请求数)**。目录/用户越用越大，每个写越来越慢，且无拐点——这是持续劣化，不是阈值劣化。
- 量级参照：T-503 一次真实调用就在 requests 里留下含多条事件的记录；生产跑几万次调用后，每次心跳都在重写几十 MB JSONB。

### 3. 🔴 platform-api 天生单实例（无横向扩展 / 无 HA）

- 权威状态在进程内存 Map，落盘是"整行覆盖"。两个 platform-api 副本各自 boot 时 `hydratePlatformState` 载入快照到各自内存（`server.js:4426`），此后各自 `saveSnapshot` 覆盖同一行 → **后写者全量覆盖前写者（lost update）**。
- 没有分布式锁、没有变更日志、没有乐观版本（B 轨那行没有 version 列）。
- 结论：**当前架构下 platform-api 只能单进程单实例**。计费轨（A 轨）本身可并发，但引用它的请求/持有状态（B 轨）不可并发——扩展性被 B 轨钉死。这是全维度最重的架构约束。

### 4. ⚠️ 跨轨一致性缺口（崩溃窗口）

hold 的钱在 A 轨（`applyBalanceDelta` 提交进 ledger），hold 指向的 request 在 B 轨（`request.billing.state='held'` 存内存待快照）。二者非同一事务：
- `applyBillingHoldIfNeeded`（`server.js:694-720`）先提交计费扣减，再写内存 request.billing，随后才 `persistPlatformState`。
- （推测，需运行时复现确认）若在"计费已提交"与"快照已保存"之间进程崩溃：ledger 里 pending 已扣、但重启后加载的快照没有这条 hold 的 request 记录 → 出现**孤儿 hold**（钱锁住、无 request 指针可回收）。惰性回收 `expireHeldBillingForTenant`（`:626`）遍历的是快照内的 requests，遍历不到孤儿。
- 缓解现状：无。无对账任务、无启动时 ledger↔request 校验。

### 5. ⚠️ 迁移机制：能用，但脆

`migrate()`（两 store 同构，`postgres-store:41-67` / `billing-store:294-320`）：
- 机制：`schema_migrations(version, applied_at)`，按文件名排序应用未见过的 `.sql`，每个包在事务里。
- 缺陷①**无校验和**：已应用的迁移文件事后被改动，`existing.rowCount > 0` 直接 `continue` 静默跳过——schema 漂移不可检测。
- 缺陷②**DDL 非幂等**：`002` 用裸 `CREATE TYPE`/`CREATE TABLE`（无 `IF NOT EXISTS`，`002:1,29`）。若 `schema_migrations` 记录丢失但表还在（灾备半恢复场景），重跑迁移会因 "type already exists" 报错卡死。
- 缺陷③**无 down 迁移 / 无回滚路径**。
- 缺陷④**目录跨包共享**：billing-store 的 `DEFAULT_MIGRATIONS_DIR` 指向 `../../postgres-store/migrations`（`billing-store:21`）——两个包跑同一套迁移，所有权语义混乱（快照表 001 与计费表 002 同锅）；靠 `schema_migrations` 版本去重侥幸不重复建。启动时 billing.migrate 与 snapshot.migrate 顺序执行（`server.js:4419→4424`）无并发，暂不炸，但设计上是耦合债。

### 6. 核心表模型能否承载（charter D3 三问）

| 能力 | 现状 | 判定 |
|---|---|---|
| **多 key / 多租户** | 一个 identity 一把 key：`user.api_key` 单值，rotate 即"撤旧建新"（`server.js:1265-1285`）；tenant_balance 主键=tenant_id=caller user_id，一租户一用户 | ❌ 不支持多活 key（无法无停机轮换、无法按用途分权 key）；租户=用户，无组织/团队层级 |
| **热线多版本** | catalog item 无版本历史；更新=重新提交走全审（D1 确认）；快照只存当前目录态，无 version 表 | ❌ 无版本化；改价/改模板不可追溯、不可回滚、不可灰度 |
| **异步任务状态** | requests + 每请求 events 数组存快照；events 有 200 上限但 requests 集合无界（见 D3.2） | ⚠️ 功能可承载短任务，但存储模型是扩展墙；长任务/大量并发任务会放大写成本 |

### 7. 备份与灾备

- **无任何备份/恢复工具链**：`P/scripts/`、`Makefile`、`deploy/` 全域 grep `backup`/`pg_dump`/`restore` 无果（D1 已录）。
- 数据耐久性 100% 依赖 operator 自建 Postgres 备份，**部署文档未提示这一责任**（`deploy/public-stack/README` 未见备份章节）。
- 纯内存陷阱：`DATABASE_URL` 与 `SQLITE_DATABASE_PATH` 都不配时静默纯内存运行（`server.js:4378-4400`），重启丢全部 B 轨状态，无告警（D1 已录）。
- sqlite 后备：`@delexec/sqlite-store` 为独立包（不在 platform/packages 下，走 npm 依赖），仅当显式设 `SQLITE_DATABASE_PATH` 才启用；public-stack 默认走 Postgres（`.env.example:21`）。sqlite 快照同为"整文件 blob"模型，并发能力更弱（单写者），仅适合单机开发。

### 8. 本维度前 5 个最重要发现

1. **存储是"一半生产级、一半玩具"**（D3.1）：计费轨规范且并发安全，其余全平台状态是单 JSON blob 全量转储。产品的核心资产（用户、目录、请求）落在玩具轨上。
2. **写放大无上限（🔴 硬扩展墙，D3.2）**：`state.requests` 永不淘汰 + 每写整体重写 JSONB，单写成本随累计请求数线性增长，无拐点。
3. **platform-api 天生单实例（🔴，D3.3）**：内存 Map + 整行覆盖 ⇒ 不能多副本、不能 HA，B 轨把 A 轨的并发能力也一起锁死。
4. **跨轨崩溃窗口（⚠️，D3.4）**：hold 的钱（A 轨事务）与 hold 的请求（B 轨快照）非原子，崩溃可致孤儿 hold，无对账兜底。
5. **模型承载力缺口（D3.6）**：单 key/身份、热线无版本化、请求无界——三项都在"产品扩张前必须先解决的地基"清单上。

### 9. 与 v0 清单对账（D3 范围）

| v0 条目 | 判定 | 依据 |
|---|---|---|
| B4 sqlite 为主 / DATABASE_URL 空置暗示 pg 未完成 / 并发与迁移待审 | **大幅修正** | 部署态是 Postgres 双 store，迁移自动执行且计费轨并发安全（CAS+行锁）——"pg 未完成"不成立。真正问题不是"没做 pg"，而是"**B 轨根本没进 pg，只是把 pg 当 blob 仓库**"。并发边界：A 轨安全，B 轨单实例 |
| A6 异步任务语义弱 | **补充存储侧证据** | requests 无界快照是长任务/高并发的存储墙（D3.2/D3.6） |
| C（好消息：幂等/流水留痕对） | **确认并加强** | 计费轨的 CAS+ULID 流水+重复检测确实是对的（D3.1 A 轨） |

### 10. D3 附录（长尾/推测）

- `service_state_snapshots` 无 UNIQUE(service_name)，`loadSnapshot` 取 `rows[0]`；若历史上产生重复行则加载不确定（当前 DELETE+INSERT 事务保证单行，风险低但约束缺失）。
- （推测）两 store 各自 `new Pool()`（`postgres-store:35`、`billing-store:265`）——同一 DATABASE_URL 开两个连接池，连接数翻倍，未见池上限配置。
- rate limit 默认极松（register 1000/min，`server.js:848-850`）——存储侧看，配合"每注册写快照"，是廉价写放大 + 女巫注册的双重放大器（转 D5）。
- `hydratePlatformState`（`:1670`）用 Map 循环覆盖 8 个集合，metricsEvents/auditEvents/reviewEvents 走单独的 `splice` 恢复（`:1691-1693`）——**已核实三类历史重启后会恢复**（推翻初稿的相反推测）。

---

## D4 架构与可扩展性

### 1. platform-api 单文件（4449 行）拆分方案与时机

现状：`server.js` 一个文件，~90 个顶层函数 + 一个巨型 `createPlatformServer` 内的 51 分支 if 链路由（`:2791-4358`）。**好消息：函数边界已经存在**——每个路由处理器都调用命名清晰、职责单一的函数（`issueTaskToken`/`applyBillingHoldIfNeeded`/`requireOperator`/`buildMarketplaceHotlineSummary`…）。缺的只是**文件边界**，不是设计边界。所以拆分是低风险的机械抽取，不是重写。

建议的模块切割（按内聚度，函数已现成）：

| 目标模块 | 归入的现有函数（证据行） | 内聚度 |
|---|---|---|
| `auth.js` | resolveAuth/requireAuth/requireCaller/requireResponder/requireOperator（`:1698-1765`）、isOperatorAuth/canManageResponder/canViewCatalogItemDetail（`:933-971`） | 高，纯函数 |
| `billing.js` | expireHeldBilling*（`:575-641`）、applyBillingHoldIfNeeded（`:642`）、applyTerminalBillingIfNeeded（`:741`）、pricingHintMaxCharge/billingValidationError/isBillingEnforced（`:491-535`） | 高，已有独立测试面 |
| `catalog.js` + `marketplace.js` | sanitizeCatalogItem/buildCatalog*（`:376-443`）、resolveCatalogVisibility/Availability（`:917-930`）、buildMarketplace*（`:1030-1189`） | 高 |
| `identity.js` | registerCallerUser/registerResponderIdentity/addUserRole/revokeApiKey/rotate*（`:1203-1353,2698`） | 高 |
| `requests.js` | getOrCreateRequest/appendRequestEvent/normalizeResultDelivery/createDeliveryMeta/issueTaskToken/resolveServiceRequest（`:1768-2352`） | 中 |
| `reviews.js` | buildReviewTransportConfig/createReviewTransport/runReviewTestHarness/verifyReviewResult（`:890-2213`） | 中 |
| `state.js` | createPlatformState/serialize/hydrate/persistPlatformState/createOptional*（`:1355,1654-1696,4378-4411`） | 高 |
| `router.js` | 只剩 `createPlatformServer` 的分发，委托上述模块 | — |

**时机建议**：在 **T-505 门户动工之前** 完成 auth/billing/catalog 三块抽取（它们最自足、最有测试）。理由——门户会新增一个消费 platform-api 的表面（且 D3 已指出请求存储需重构），若在单文件上叠门户，路由链会从 51 分支继续膨胀，债务翻倍。**先抽取的价值不在美观，而在给 D3 的存储重构（把 requests 从快照挪到关系表）提供一个能改的边界**——现在 requests 逻辑和路由缠在一个文件里，无法单独替换存储层。

### 2. cli.js 单文件（1908 行）拆分

现状：单个 `main()` + ~40 分支 group/command if 链（`C/apps/ops/src/cli.js:1772-1902`），每个 `commandX` 已是独立函数。建议：命令表驱动（`{ "auth:register": commandAuthRegister, ... }` 查表替代 if 链）+ `commands/*.js` 分文件。**风险低于 platform-api**（CLI 无并发状态、命令间无共享可变状态）。**时机**：优先级低于 platform-api，可随 A1/A3（自助充值、key 轮换要加新命令）时顺手做——新命令本就要碰 dispatch，届时一并表驱动化。

### 3. 🔴 contracts 发布管线：门禁设计对，但漏了关键一环

**现有管线（相当完整）**：`test:release-gate`（root `package.json`）串联 deployability 套件 + operations + `check:submodules/boundaries/bundles` + `test:contracts` + `test:integration`。其中：
- `test:integration`=`source-integration-check.mjs`：`npm pack` **本地** protocol 源码为 tgz（`tools/source-integration-check.mjs:135`）→ `pnpm install --frozen-lockfile`（`:209`）→ 从源码起栈跑集成流。
- `test:contracts`=`contracts-check.mjs`：边界检查 + sync-local-contracts + 各仓 package 校验。

**🔴 结构性漏洞**：`test:integration` 用的是**本地打包的 contracts 源码**，因此它对"源码 ↔ 已发布 npm 包"的漂移**天生盲**——本地 pack 永远是最新源，集成检查永远绿。而生产 DOA（v0 B1 实证：npm 0.1.2 缺 `validateCatalogGuidanceFields`，GHCR 镜像启动即崩）发生在**用 npm 装 contracts 构建的镜像**上。**这条路径（published-image smoke，`tools/published-image-smoke.mjs`）不在 `test:release-gate` 链里**——release gate 用源码集成绿灯放行，而已发布产物是坏的。

- 即时状态：platform-api 已声明 `@delexec/contracts: ^0.1.3`（`repos/platform/apps/platform-api/package.json`），并行 loop 已发 0.1.3 到 npm，本次漂移即将闭合。
- **但门禁本身没变**：下一次源码需要 0.1.4 的新导出、而 npm 仍停在 0.1.3 时，release gate 仍会绿灯、生产仍会 DOA。
- **最小门禁补法**：在 release gate 加一步"已发布产物契约面断言"——按每个服务 `package.json` 声明的版本范围解析**已发布**的 `@delexec/contracts`，断言服务实际 import 的符号面在该已发布包里存在（或直接 `docker run` GHCR 镜像打 `/readyz`）。这一步正是当前缺的"拦漂移的门"。

### 4. 传输层抽象：架构可插拔，事实单实现

- **接口层是真的**：responder-runtime-core 面向抽象 `transport.send()`/`transport.poll()` 编写（`C/packages/responder-runtime-core/src/index.js:288,753`），runtime 不知道具体传输。client 侧 transport 配置支持三型 `local`/`relay_http`/`email`，email 还分 `emailengine`/`gmail` 两 provider（`C/apps/ops/src/config.js:146-175`）。
- **但只有 relay/http 端到端实现**：实际搬运消息的只有 relay（外部 transport-relay 或 supervisor 内嵌 in-memory relay，`C/apps/ops/src/supervisor.js:1069-1095` 的 `/v1/messages/send|poll` 是纯队列）。
- **email 是"配置 + 凭据测试"外壳，无搬运实现**：`validateTransportConfig`（`supervisor.js:380-410`）校验 email 配置、`testEmailEngineTransport`/`testGmailTransport`（`:755-867`）能真连 EmailEngine/Gmail 验凭据——但**没有任何 email adapter 实现 `.send()`/`.poll()`**，没有 IMAP 轮询、没有 SMTP 发送。全仓无 nodemailer/smtp 实现（grep 无果）。platform 侧同理：delivery_meta 会吐 `kind:"email"` 的 `secondary_task_delivery` 描述符（`server.js:2062-2073`）、`normalizeResultDelivery` 接受 `"email"`（`:1814`），但平台也不发邮件。
- **判定（确认 charter 疑点并锐化）**：不是"字段存在未验证"——字段存在、凭据甚至能实测连通，但**没有一条代码路径真的用 email 投递任务或结果**。传输层是"为可插拔留了接口和配置，只落地了 relay 一种"。要上线 email 需补一个实现 `send/poll` 的 adapter，接口成本已付、实现成本未付。

### 5. 本维度前 5 个最重要发现

1. **🔴 contracts 门禁漏"已发布产物"这一环（D4.3）**：release gate 用本地源码集成，对源↔npm 漂移天生盲；published-image smoke 不在门内。这正是 v0 B1 反复 DOA 的结构根因，且未闭合。
2. **单文件可拆且低风险（D4.1）**：platform-api 90 个函数的边界已存在，缺的只是文件边界；auth/billing/catalog 三块应在 T-505 门户前抽取——不为美观，而为给 D3 存储重构提供可替换边界。
3. **传输层"接口真、实现单"（D4.4）**：抽象干净，但只有 relay 端到端；email 是凭据可测的空壳，无 send/poll 实现。
4. **cli.js 表驱动化可搭车做（D4.2）**：随 A1/A3 新增命令时顺手把 40 分支 if 链改成命令表。
5. **拆分与存储互锁（D3×D4）**：D3 的 requests 无界快照要重构、D4 的路由要拆分，二者是同一件事的两面——requests 逻辑当前和路由缠在一个文件，不拆就换不掉存储层。

### 6. 与 v0 清单对账（D4 范围）

| v0 条目 | 判定 | 依据 |
|---|---|---|
| B1 契约管线断裂、无 CI 门禁拦漂移 | **确认并定位到具体缺口** | release gate 缺"已发布产物契约面断言"（D4.3）；即时漂移在修但结构未变 |
| B3 platform-api/cli.js 千行单文件、无模块边界 | **确认，给出可执行拆分方案与时机** | 函数边界已存在，机械抽取；auth/billing/catalog 先行，门户前完成（D4.1/D4.2） |
| D30/传输层 email transport 字段存在未验证 | **确认并锐化** | 接口可插拔、email 凭据可实测，但无 send/poll 实现，非端到端（D4.4） |

### 7. D4 附录（长尾/推测）

- root `package.json` 无 `workspaces` 字段、`packageManager: pnpm@10.11.0`——四仓靠 nx + 各子模块自身 workspace 组织；`workspace:*` 未在子模块 package.json 出现（grep 无果），符合 CLAUDE.md "workspace:* 仅开发期链接" 的边界。
- tools/ 下 deployability-* 有 30+ 个脚本 + 等量测试（`deployability:overview/safety/gates/...`）——治理/报告工具**极重**，与"业务代码单文件未拆"形成反差：治理面过度工程、运行时面欠拆分。（推测）这批 deployability 工具的维护成本可能已超过它们拦截的真实缺陷，值得单独盘点 ROI（不在本审计范围）。
- （推测）两个 store 各开 `new Pool()`（D3.10）在容器内叠加 nx/pnpm 的连接，生产并发下的 pg 连接数上限需实测。
- published-image-smoke 存在（`tools/published-image-smoke.mjs` + `:smoke` script）但不在 release-gate——它是**手动/独立**跑的，不是门禁。把它纳入 gate 是 D4.3 补法的最省事路径。

---

## D6 质量基建

### 1. e2e 套件：实现完整，但从不在 CI 跑（→"无绿灯证据"的真因）

- **套件是真的、且是协议级 e2e**：`repos/platform/tests/e2e/` 有 success / timeout / token-expired / signature-invalid / result-invalid / ops-supervisor 六个流；`http-process-system.js` 启动**真实的** relay + platform + caller + responder 四个进程（`startNodeHttpService`，`:45-109`）跑完整调用链。这不是 mock，是端到端。
- **但 CI 从不调用它**：platform CI（`repos/platform/.github/workflows/ci.yml:17`）只跑 `npm test`＝`test:unit && test:integration`；**`test:e2e` 不在任何 CI 路径**。报告 `tests/reports/latest.json` 显示 `total_cases: 0`（`generated_at 2026-07-03`）——即最近一次只跑了 reset、没产出用例。
- **判定**：v0 B6"e2e 无绿灯证据"的真因是两层——(a) e2e **从不在 CI 跑**（结构），(b) 本机跑则**红**：LOOP.md 1.0c + 证据日志（2026-07-04）记录 6/6 在 `beforeAll` 10s hookTimeout 超时（4 服务冷启超过 hook 上限）。所以状态不是"未知"而是"本机已知红、CI 无覆盖"。修绿两步：调 hookTimeout / 查启动退化让本机转绿（并行 dev loop 的 1.0c 已在做）→ 再把 `test:e2e` 纳入 CI 门禁（本审计的结构性补充）。
- **附带缺口**：`test:integration` 脚本**显式只列 4 个集成文件**（gateway/relay-http/billing-store/platform-api-billing，`package.json`），**漏掉目录里存在的 2 个**——`platform-api.integration.test.js` 与 `postgres-persistence.integration.test.js`。后者恰是 D3 快照持久化的测试，**存在却不跑**。

### 2. 浏览器层自动化：零真实浏览器覆盖

- **现状**：全仓无 playwright/puppeteer/selenium（grep 无果）。控制台"测试"是 vitest + jsdom 的**模型层单测**（`platform-console-nav-model/human-view/session-view/view-models.test.js`）——测的是视图逻辑，不是真实浏览器渲染。
- T-503 的浏览器 MCP 在 agent 环境失败（`about:blank`，D1 已录），所以**服务态的 vanilla JS 控制台从未被真实浏览器验证过**——setup/unlock/recover、审核队列、计费面板的真实渲染与交互全靠人工目视（T-503 手工确认）。
- **最小可行方案（哪怕 smoke 一条）**：一条 Playwright headless 用例，对 compose 起来的 `/console/` 做：加载 → 断言 locked session panel 渲染 → 用已知 passphrase 登录 → 断言 Review Queue 面板出现。这一条就能把"控制台是否能开、能否解锁、核心面板是否挂载"变成可回归的门禁。注意 T-503 的 `about:blank` 是**浏览器 MCP 工具**的问题，正规 Playwright 安装不受此影响。

### 3. CI 必须门禁哪些（发布挡板，按优先级）

现有超级仓 CI（`.github/workflows/ci.yml`）：submodule-integrity → workspace-install → {nx-graph, change-bundle-validate, contracts-check, source-integration-check}。**缺的发布挡板**：

| 优先级 | 门禁 | 现状 | 为什么必须 |
|---|---|---|---|
| P0 | **已发布镜像契约面 smoke** | `published-images-smoke.yml` 仅 `workflow_dispatch`（手动），不在任何自动门；`published-image-smoke.mjs` 不在 release-gate | 这是 v0 B1 反复 DOA 的**唯一能拦住它的检查**，却是手动的（D4.3/S 交叉）。改为 push/PR 或 pre-publish 必跑 = 最高杠杆 |
| P0 | **e2e 协议流** | 实现完整、从不在 CI 跑（D6.1） | 成功路径 + 失败模式（超时/签名/退款）是产品核心契约；不跑=每次发布都在赌 |
| P1 | **完整集成套件** | 脚本漏跑 2 个已存在文件（含 postgres 持久化，D6.1） | 补回 2 个文件，尤其 postgres-persistence（护 D3 快照恢复） |
| P1 | **client 发布门绿灯** | client CI 跑 unit+integration+packages，但 T-503/504 记录其红/flaky（integration 500 / localStorage jsdom flake）阻塞 0.1.6 发布 | 发布挡板必须真绿；先去 flake（localStorage/jsdom + 跨仓 integration 500） |
| P2 | **一条 `/console/` 浏览器 smoke** | 无（D6.2） | 把控制台"能开能解锁"纳入回归 |

### 4. 本维度前 5 个最重要发现

1. **e2e 从不运行（D6.1）**：套件是完整的协议级 e2e，但 CI 不调用、报告 0 用例；"无绿灯"是"没跑"不是"跑挂"，真实状态未知，先跑再修。
2. **集成脚本静默漏跑 2 文件（D6.1）**：`test:integration` 只列 4/6，漏掉的 `postgres-persistence` 恰好护着 D3 最脆的快照恢复——存在却不跑是"看着有覆盖、实则没有"。
3. **零真实浏览器覆盖（D6.2）**：控制台只有 jsdom 模型单测，服务态 UI 从未被真实浏览器回归；一条 Playwright smoke 即可兜底。
4. **P0 门禁缺两块（D6.3）**：已发布镜像 smoke（手动化）+ e2e（不跑）——两个最该当发布挡板的检查都不在自动门内，与 D4.3 的 contracts 漂移是同一病根的两个症状。
5. **治理工具过重 vs 运行时验证过轻**：tools/ 30+ deployability 脚本每个带测试（D4 附录），而真正验证产品能否工作的 e2e/浏览器/发布镜像 smoke 反而不在门禁——质量投入的方向配置反了。

### 5. 与 v0 清单对账（D6 范围）

| v0 条目 | 判定 | 依据 |
|---|---|---|
| B6 e2e 无绿灯证据；浏览器 UI 无自动化验证 | **确认并定位根因** | e2e 本机红（hookTimeout，LOOP 1.0c）+ CI 不跑、报告 0 用例（D6.1）；浏览器零真实覆盖（D6.2） |
| B2 CI 红灯常态化、发布不受 CI 约束 | **确认并给挡板清单** | client 发布门 flaky（D6.3 P1）；P0 挡板（镜像 smoke 手动 + e2e 不跑）缺失（D6.3） |
| B1 契约漂移无门禁 | **与 D4.3 合流** | 镜像 smoke 是唯一能拦漂移的检查却手动化（D6.3 P0） |

### 6. D6 附录（长尾/推测）

- e2e `setup.js` 仅注册 `afterAll(writeFlowReport)`；`test:e2e` = reset-report → vitest → flow-issue-reporter（`package.json`）。报告基建齐全，只差"被调用"。
- CI 用 Node 22（`ci.yml` setup-node 22），dev 机是 Node 26——better-sqlite3 ABI 差异（memory）只影响本地，CI 不受影响；但意味着**本地跑 e2e 需先 rebuild better-sqlite3**，是 e2e 未在本地被顺手跑起来的可能原因之一（推测）。
- client CI 需 checkout platform 作为集成依赖（`client/.github/workflows/ci.yml:19-30`）——跨仓耦合使 client 发布门受 platform 状态影响，flake 面更大。
- （推测）`published-images-smoke.yml` 手动化可能是因为它依赖 GHCR 镜像已构建（`images.yml`），存在时序依赖；改造为"镜像构建后自动触发"比"push 即跑"更合理。
