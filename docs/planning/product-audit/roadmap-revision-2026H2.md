# Roadmap 2026H2 修订建议（审计产出）

Created: 2026-07-04 · 本文件是 `product-audit` 只读审查（D1–D6）对 `docs/planning/roadmap-2026H2.md` 的 **PR 式修订建议**。只建议、不改原文件、不改 LOOP.md。
证据来源：`functional-inventory-v1.md`（D1/D2）、`architecture-review.md`（D3/D4/D6）、`security-review.md`（D5）。审计锚 platform `e44abfe`。

---

## 一句话结论

**闭环的"骨架"是真的，但"经济闭环"是断的**：Caller 不能自助获得 PTS（租户都要 admin 手建），Responder 结算后**收益不入账**（`responder_earn` 有实现无调用方）。当前 roadmap 把"门面/供给/内容/soft launch"排在闭环硬化之后，却默认经济闭环已成立——**这是最大的排期风险**。次大风险是把"框架整备"隐性推到 T-505 门户（P4），而 D3/D4 表明门户会撞上单实例存储墙。

---

## 修订总览（对照原 roadmap 阶段表）

| 原阶段 | 修订动作 | 理由（维度） |
|---|---|---|
| P0 当前 Loop | **不动**，但补一条"隐藏退出标准"到 LOOP.md 建议（见 §四） | D1：闭环当前非自助 |
| P1 门面与供给 | **前置插入 P0.5 经济闭环补全**（A1 自助 PTS + responder 收益入账） | D1 发现 1/2 🔴 |
| P1/P3 之间 | **新增 P1.5 安全最小硬化**（S1 relay + S2 bootstrap 两个 🔴，公网发布前必做） | D5 S1/S2 |
| P4 前 | **P3.5 框架整备显式化**（模块拆分 + requests 去快照 + CI 发布挡板） | D3/D4/D6 |
| 贯穿 | **CI 发布挡板补齐**并入 P0/P1（不只是 LOOP 战术修 flake） | D6 |

---

## 修订 1（🔴 最高）：P1 之前插入 **P0.5 经济闭环补全**

**现状**：roadmap 把 A1（自助 PTS）列为 P2/P3 "待写一页纸"，把 responder 收益视为 out-of-scope 的 A4。审计推翻了这个优先级：

- **A1 加重**：不仅无自助充值，**计费租户本身要 admin 手工创建**（`server.js:3612` + `billing-store:322`；租户缺失查余额直接 `TenantNotFoundError`）。T-503 的"成功"是 operator 手工建租户+充值 20000 PTS 才达成的（T-503 step 6）。**没有这一步，任何新 Caller 都卡死在"没有 PTS 且无法自助获得"**。
- **A4→🔴（新发现）**：结算只产生 `caller_spend` 借记（`server.js:803`），**全仓无 `responder_earn` 调用方**——记账方向已在 `billing-store:414-418` 实现却从不被调用。**Responder 干完活收益为 0**。

**建议**：新增 **P0.5 经济闭环补全**，作为 P1"供给"的前置：

| 项 | 内容 | 成本 | 证据 |
|---|---|---|---|
| P0.5-a | **注册即建租户**：`registerCallerUser` 末尾调 `createTenant`（否则赠点/自助充值无处落账） | 低（平台侧数行） | `server.js:1202` / `billing-store:322` |
| P0.5-b | **自助获得 PTS**：注册赠点（最小）或 `POST /v1/tenants/me/recharges`（caller-scope，复用 `createRecharge`） | 低 | `server.js:3694` 仅 admin |
| P0.5-c | **responder 收益入账**：结算处（`server.js:786-811`）补一条 `responder_earn` credit 分录 | 低-中 | `billing-store:414` 已实现无调用方 |

**排期理由**：P1 的核心是"吸引 responder 供给"。**供给侧收益为 0 时，做门面吸引 responder 是空转**；P3 soft launch 若 caller 不能自助充值，则"每个注册=一张 operator 人工工单"。P0.5 三项都是低成本平台侧改动，**应 gate P3 soft launch**。

---

## 修订 2（🔴）：新增 **P1.5 安全最小硬化**（公网发布前必做）

**现状**：roadmap 无安全阶段。D5 发现两个 🔴 是"公网已暴露 + 修复极便宜"：

- **S1 relay 零鉴权公网可达**：`transport-relay` 六路由全无鉴权（`transport-relay/src/server.js:186-235`），Caddy 把 `/relay/*` 反代公网（`Caddyfile:15`）。任何人可 `peek` 读任意 receiver 任务信封、`ack` 删他人消息。**最小缓解 = 把 `/relay/*` 从公网 Caddy 撤下（一行）**——relay 本只需 compose 内网可达。
- **S2 bootstrap 自动审核 + 代码默认开**：starlight 以 `approved+enabled` 绕审核创建（`server.js:279`），`ENABLE_BOOTSTRAP_RESPONDERS` **代码默认 true**（`:1368`）。漏设该变量的部署自带一个绕审核的公开热线。**最小缓解 = 代码默认改 false**。

**建议**：**P1.5 安全最小硬化**，插在 P1 与 P3 之间，作为 soft launch 的**硬门槛**：S1（撤 relay 公网）+ S2（bootstrap 默认 false）+ S3 密钥非占位符启动断言（`.env.example` 全 change-me，无强度校验）。三项合计工作量 < 1 天，全部是"公网发布前不做就裸奔"级别。

---

## 修订 3：**P3.5 框架整备显式化**（v0 的 P3.5 直觉，用 D3/D4 落实）

**现状**：roadmap 把框架/存储工作隐性留在 T-505 门户（P4）内。审计表明**门户会撞墙**：

- **D3.2/3.3 单实例存储墙**：`state.requests` 无界快照 + 每写整行重写 JSONB，platform-api 天生单实例（内存 Map + 整行覆盖，多副本会 lost-update）。T-505 门户新增消费面 + 写负载，会加速撞墙。
- **D4.1 拆分与存储互锁**：requests 逻辑和路由缠在单文件，不拆就换不掉存储层。

**建议**：**P3.5 框架整备**，明确内容与顺序（在 P4 门户动工前）：

1. **模块抽取**（D4.1）：先 auth/billing/catalog 三块（最自足、最有测试），把 `createPlatformServer` 收敛为 router。
2. **requests 去快照**（D3.2/3.3）：把 requests + events 从 JSON 快照迁到关系表（参照 billing 轨的做法），解除写放大与单实例约束。**依赖第 1 步的模块边界**。
3. **备份/恢复工具**（D3.7）：补 pg 备份脚本 + 文档（当前零工具、纯内存模式静默可用是部署陷阱）。

**排期理由**：与 v0"P3.5 框架整备插在 T-505 前"一致，但审计给出了**具体项和内部依赖**（拆分→存储→备份），并指出"先拆分不为美观，而为给存储重构提供可替换边界"。

---

## 修订 4：**CI 发布挡板补齐**并入 P0/P1（结构，非战术）

**现状**：LOOP.md 在战术层修单个 flake（1.0b/1.1 billing 500、client publish flake）、triage e2e 超时（1.0c）。但审计发现**结构性挡板缺失**，修完 flake 也拦不住下次漂移：

- **D4.3/D6.3 P0**：`published-images-smoke.yml` 仅 `workflow_dispatch`（手动），`source-integration-check` 用**本地打包源码 contracts**、对"源↔npm 漂移"天生盲。**这是 B1 反复 DOA 的唯一能拦检查，却是手动的**。即时 0.1.3 漂移已修（LOOP 1.0a），但**门禁结构没变**，0.1.4 会重演。
- **D6.1 P0**：e2e 从不在 CI 跑（platform CI 只 `npm test`＝unit+integration）；`test:integration` 脚本**漏跑 2 个已存在文件**（含 `postgres-persistence`，恰护 D3 快照恢复）。

**建议**：把以下三项作为**命名的发布挡板工作项**（并入 P0 收尾或 P1）：
1. 已发布镜像契约面 smoke 从 `workflow_dispatch` 改为镜像构建后自动触发 + 纳入 release gate（拦 B1 漂移的根本补法）。
2. `test:e2e` 本机转绿（dev loop 1.0c 在做）后纳入 CI。
3. 补回 `test:integration` 漏跑的 2 文件。

**理由**：现在的质量投入方向配置反了——tools/ 有 30+ deployability 治理脚本各带测试，而真正验证"产品能否工作"的 e2e/镜像 smoke 反而不在门禁（D6.4）。

---

## 修订 5（对账修正，降低焦虑）：这些 v0 判断被推翻/缓和

审计不是只加压，也澄清了几处 v0 过度担心或判错的：

- **B4 存储"pg 未完成"** → **推翻**：部署态是 Postgres 双 store、迁移自动、计费轨并发安全（CAS+行锁）。问题不是"没做 pg"，是"业务状态没进关系模型"。
- **A2 责任方"全靠轮询、无从得知"** → **缓和**：审核状态有 owner 拉取 API（`/v1/catalog/hotlines/:id`，runtime 自动轮询），`review_reason` 服务端有记录。缺的是"推送"和"把驳回原因透出到返回体/UI"，不是"没有数据"。
- **计费竞态（hold 并发）** → **无资损**：CAS+行锁+`newBalance<0 throws` 兜住，最坏是第二个并发 hold 返回 500 而非 402（UX 级）。
- **审核绕过** → **正常路径稳**：唯一绕过是 S2 bootstrap。
- **幂等/签名** → **确认真做对**：request_id/recharge_id 幂等、结果包 Ed25519 签名+公钥校验是全系统最强防线。

---

## 二、修订后的阶段依赖（建议替换原 roadmap 依赖图）

```
M1(镜像/npm 解卡) ─→ M2 零违规彩排 ─→ M3 首次即成功
        │                                  │
        │            ┌─────────────────────┴──────────────┐
        │            ▼                                     ▼
        │      P0.5 经济闭环补全                   （原）B1 marketplace 适配
        │      (自助PTS + 收益入账 + 注册建租户)          ─→ 首页改版 ─→ Docs Hub
        │            │                                     │
        │            └────────────┬────────────────────────┘
        ▼                         ▼
  CI发布挡板补齐          P1 供给(此时 responder 才有收益基础)
  (镜像smoke自动化+e2e入CI)        │
                                  ▼
                        P1.5 安全最小硬化(S1 relay + S2 bootstrap + S3 密钥断言)
                                  │  ← soft launch 硬门槛
                                  ▼
                        P2 内容/指标 ─→ P3 Soft Launch
                                                │
                                                ▼
                        P3.5 框架整备(拆分→requests去快照→备份) ← T-505 前必做
                                                │
                                                ▼
                                        P4 T-505 用户门户
```

**关键改动**：P0.5 经济闭环 + P1.5 安全硬化是**新增的 launch 前置**；P3.5 框架整备从"隐性/可选"变为 **T-505 显式前置**；CI 挡板从 LOOP 战术升为结构工作项。

---

## 三、优先级快照（若只能做 5 件事，按序）

1. **P0.5-c responder 收益入账**（🔴，结算处补 credit 分录）—— 供给侧经济从 0 到 1，最低成本最高杠杆。
2. **P0.5-a/b 自助 PTS + 注册建租户**（🔴）—— 让闭环真的能自助完成。
3. **S1 撤 relay 公网 + S2 bootstrap 默认 false**（🔴，各一行/一处）—— 公网发布前的裸奔止血。
4. **已发布镜像 smoke 自动化 + 纳入 release gate**（D4.3/B1 根本补法）—— 拦住下一次 DOA。
5. **P3.5 第 1 步：抽取 auth/billing/catalog 模块**—— 为存储重构和门户开路。

---

## 四、建议追加到 LOOP.md 的条目（🔴 级新缺口 · 只建议，不代改）

> 依 charter "发现 🔴 级新缺口 → 给 LOOP.md 追加建议条目"。以下为**建议文本**，由 owner 决定是否并入 LOOP.md（本审计不改 LOOP.md）。

**建议 1 — 复核 loop GOAL 的一处隐藏 gap（可能是退出标准漏洞）**：
LOOP.md GOAL 写"全新用户只依赖公网资源……首次即可零违规跑通 上架→审核→付费调用→结算"。但审计发现：**一个真正全新的 Caller 无法自助获得 PTS**（租户要 admin 手建、无自助充值），T-503 的"成功"依赖 operator 手工充值。建议在 M2/M3 明确：零违规彩排里"operator 为 caller 建租户+充值"这一步**算不算违规/算不算自助**？若 GOAL 要求 caller 全自助，则 A1（P0.5-a/b）是**当前 loop 的隐藏 blocker**，而非 roadmap 远期项。

**建议 2 — M2 彩排前先关 bootstrap（S2）**：
`ENABLE_BOOTSTRAP_RESPONDERS` 代码默认 true（`server.js:1368`），M2 零违规彩排若用未显式设该变量的环境，会出现一个**绕审核的 starlight 公开热线**，可能污染"违规表为空"的判定（意外的已审核目录项）。建议 M2 环境显式设 false，并把"代码默认改 false"列为 M3 硬化候选。

**建议 3 — e2e 纳入 CI（承接 1.0c）**：
1.0c 修好本机 e2e 超时后，建议把 `test:e2e` 纳入 platform CI（当前 `npm test` 不含它），否则修绿后仍无回归保护；同时补回 `test:integration` 漏跑的 `platform-api.integration.test.js` 与 `postgres-persistence.integration.test.js`。

---

## 附：审计交付物清单（均已 `git add`，未 commit）

- `functional-inventory-v1.md` — D1 用户旅程 + D2 API 面（含 51 路由鉴权矩阵）
- `architecture-review.md` — D3 数据存储 + D4 架构可扩展性 + D6 质量基建
- `security-review.md` — D5 威胁面（9 项，S1/S2 为 🔴）
- 本文件 `roadmap-revision-2026H2.md` — 综合修订建议

审计方法遵循 charter：结论挂 `文件:行` 证据；推测均标注；与 v0 逐条对账（确认/推翻/修正）；每维度"前 5 发现" + 长尾入附录。**全程只读，未改任何代码、未改 LOOP.md、只暂存未提交。**
