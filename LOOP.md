# LOOP.md — 长线开发循环状态（单一事实源）

> 每轮 loop 醒来先读本文件；每轮收尾必须更新"Backlog 状态"和"证据日志"。
> 本文件由 loop 维护；人工修改优先级/边界时直接编辑本文件即可。

## 目标（Goal）

一个全新用户，只依赖公网资源（callanything.xyz 文档、npm 上的 `@delexec/ops`、浏览器 `/console/`），三个角色（Responder / Caller / Operator）**首次即可零违规**跑通：

**上架 → 审核 → 付费调用 → `BILLING_SETTLED` 结算** 的完整闭环。

### 退出标准（全部满足即 loop 完成）

1. T-503 式彩排的**违规表为空**（无 SSH、无直连 `/v1/admin/*` curl、Operator 全程浏览器 `/console/`、Caller/Responder 全程 npm 正式包）。
2. **连续 3 次**全新身份彩排一次成功、零求助（只看公网文档）。
3. 每次彩排的摩擦清单中不再出现新的 blocker/major 级条目。

## 边界（Out of Scope —— 防漂移清单）

> loop 外事项的总排期见 `docs/planning/roadmap-2026H2.md`（P1 门面与供给 → P2 内容预热 → P3 soft launch → P4 用户门户）。

- ❌ email transport 接入（relay_http 是已验证路径，不挡闭环）
- ❌ 浏览器端普通用户门户（注册/登录/自助），归 T-505+ 家族，是下一个 loop
- ❌ marketplace 消费端 UI 重设计
- ❌ 多运营者 RBAC / 正式多租户身份体系
- ❌ 法币结算、提现、真实支付渠道
- ❌ 品牌站首页定位改版（已定案为"开发者基础设施"方向，计划见 `docs/planning/brand-site/homepage-repositioning-plan.md`；执行顺位 = M2 通过 → marketplace 字段适配 → 改版，不进本 loop）
- ✅ 模板上传/填充：只做到 `call-hotline` 闭环所需程度（现有 template bundle 能力为基线）
- ✅ CLI 修缮：仅限彩排摩擦清单驱动的条目

## 里程碑与 Backlog（按依赖排序，每轮取最上面一个未阻塞项）

### M1 解除外部卡点

| # | 事项 | Owning repo | 状态 | 备注 |
|---|------|-------------|------|------|
| 1.0a | **修复 platform-api 容器启动崩溃**:源码引用 `validateCatalogGuidanceFields`,但 npm 上的 `@delexec/contracts@0.1.2` 无此导出 → 源码构建的 public-stack 起不来(selfhost 路径实际已断)。按仓库规则先发新版 contracts,再更新 platform | `repos/protocol` → `repos/platform` | done (2026-07-04) | contracts@0.1.3 已发 npm(protocol `b9234e2`,publish run 28684335553);platform `e44abfe` 重钉 `^0.1.3`;CI run 28684633860 compose-smoke ✓ 57s;CHG-2026-172 |
| 1.0b | **修 platform-api billing 集成测试 CI 500 flake**（`preserves submitted hotline pricing hints` 在 CI 500、本地过）——与 client 仓库 publish 被卡的"integration 500 flake"是同一症状家族，疑似同一个平台侧间歇 bug | `repos/platform` | waiting(诊断已上线,等下次 CI 现场) | 根因未复现:本地 Node26 单文件 40x + node:22 双核容器全套件 40x 均绿;POST /v2/hotlines 全路径代码审查无随机抛点。platform `92701bb` 给两处 500 出口(全局 catch + sendBillingError 兜底)加 console.error 栈日志,flaky 断言带响应体;client CI 经 vitest alias 直用 platform main 源码,诊断自动传导(client 集群样本 run 28583183537 = 4 文件 11×500,顺序执行,指向 runner 资源耗尽如 EMFILE)。下次 CI 命中即自曝根因,届时回收此项;CHG-2026-173 |
| 1.0c | 本机 e2e 套件 6/6 `beforeAll` 10s 超时（4 服务冷启超过 hookTimeout）——triage：调 hookTimeout 或查启动退化；CI 不跑 e2e，此套件当前无处于绿的证据 | `repos/platform` | done (2026-07-04) | triage 推翻"冷启慢"假设:真因=拆分后 e2e 仍引用已迁至 client 仓的入口 + platform-api 直跑自加载本机遗留 `deploy/platform/.env`(compose 内部主机名 DATABASE_URL)。platform `72feba2`:sibling client 解析 + 死进程快速失败 + HERMETIC_STORE_ENV + 对齐现行 ops 契约 → **6/6 文件 7/7 用例 10s 全绿**(拆分后首个绿证据);CHG-2026-174 |
| 1.1 | 修复 client CI flake（integration 500 / unit localStorage），让 publish workflow 变绿 | `repos/client` | todo（先做 1.0b） | GH run 28583183537 是失败样本 |
| 1.2 | 发布 `@delexec/ops@0.1.6` 到 npm | `repos/client` | blocked by 1.1 | 0.1.6 代码已验证（T-503 用本地 tgz 跑通） |
| 1.3 | 打新 `platform-console-gateway` 镜像（含 T-504 recovery+UI），补 release notes；**前置 = main CI 绿灯（1.0a/1.0b），不再带红灯发布** | `repos/platform` | blocked by 1.0 | 现网 v0.1.5；参考 `docs/archive/releases/` 惯例 |
| 1.4 | Aliyun public-stack 滚动到新网关镜像；确认生产 env 有 `PLATFORM_CONSOLE_BOOTSTRAP_SECRET` 且已录入交接文档 | `repos/platform` deploy | blocked by 1.3 | platform-api/relay 不动 |

### M2 T-503 零违规重演

| # | 事项 | Owning repo | 状态 | 备注 |
|---|------|-------------|------|------|
| 2.1 | 全新身份彩排：Operator 全程浏览器 `/console/`（含丢口令恢复路径演练一次）；**必须包含真实浏览器人工走查**——T-504 的新会话 UI 至今只有单测与 API 冒烟证据，从未在浏览器里被打开过 | 第四仓（彩排记录） | blocked by M1 | 模板沿用 `docs/planning/first-real-call/50-wave5-operator/T-503-findings.md` |
| 2.2 | 违规表为空 → 归档报告，Wave 5 关闭 | 第四仓 | blocked by 2.1 | |

### M3 首次即成功硬化（摩擦清单清零）

| # | 事项 | Owning repo | 状态 | 备注 |
|---|------|-------------|------|------|
| 3.1 | `call-hotline` 默认 `--max-charge-cents` 从 hotline pricing hint 取值 | `repos/client` | todo | T-503 finding：默认 500 造成超额冻结 |
| 3.2 | 公网文档补 hotline 进程 stdin/stdout 契约附录（`input.input.text` / `output.summary`） | `repos/brand-site` + `repos/client` | todo | T-503 finding |
| 3.3 | 彩排新暴露的摩擦逐项立卡清零 | 按归属 | ongoing | 来源 = 每次彩排报告 |
| 3.4 | 连续 3 次全新身份彩排一次成功 → 达成退出标准 | 第四仓 | blocked by 3.1–3.3 | |

## 每轮迭代协议

1. 读本文件 + 最近一条证据日志；取最上面一个未阻塞的 backlog 项。
2. 改动只做在 owning repo；跨仓组合变更必须走：owning repo 提交 → 子模块 SHA 更新 → `changes/CHG-*.yaml` → 四仓校验五件套（`check:submodules` / `check:boundaries` / `check:bundles` / `test:contracts` / `test:integration`）。
3. 声称完成前必须有对应校验/测试证据；测试失败如实记录，不粉饰。
4. 收尾：更新 backlog 状态 + 追加证据日志一行 + 提交（子模块推送按既定流程）。
5. 遇到需要生产 secrets、真实部署或不可逆操作且无既定授权时：写清楚阻塞点停在原地，不绕行。

### 环境备忘

- 本机无 `corepack`：跑 `test:integration` 用 corepack→pnpm@10.11.0 shim，或先 `npm i -g corepack`。
- pnpm store 里 `better-sqlite3` 若再次回退为 Node 22 ABI：进 `node_modules/.pnpm/better-sqlite3@12.8.0/node_modules/better-sqlite3` 执行 `npx node-gyp rebuild`。
- 详见 `docs/planning/first-real-call/50-wave5-operator/T-504-rollout-notes.md`。
- 子模块 `package.json` 依赖 specifier 变更后:四仓根目录 `corepack pnpm install` 刷新 `pnpm-lock.yaml`(否则 `test:integration` 内部 frozen install 报 `ERR_PNPM_OUTDATED_LOCKFILE`);且任何 `pnpm install` 都可能把 better-sqlite3 换回旧 ABI,需按上条重建。
- 与产品审计 loop(写 `docs/planning/product-audit/`,只暂存不提交)共用四仓 git 暂存区:本 loop 提交前先摘出外来暂存路径,提交后恢复其暂存状态。

## 证据日志（append-only，最新在上）

| 日期 | 轮次/事项 | 结果 | 证据 |
|------|-----------|------|------|
| 2026-07-04 | 轮3(loop):1.0c e2e 套件复活 | 根因三层:client 侧入口已迁走(spawn 秒死但傻等 10s)/ platform-api 直跑自加载本机 gitignored `deploy/platform/.env` 的 compose 内部 DATABASE_URL / ops-supervisor 期望落后现行契约(platform features 开关、示例 id 改名)。修复后 e2e **6/6 文件 7/7 用例 10s 全绿**(拆分后首绿);platform npm test 15过/2跳 + packages/deploy/docs 检查绿;五件套一次全过 | CHG-2026-174;platform `72feba2` |
| 2026-07-04 | 轮2(loop):1.0b 诊断埋点(根因未复现,如实记录) | 80 次压测零复现(本地 Node26 billing 文件 40x;node:22 双核容器全套件 40x);提交路径审查无随机抛点 → platform `92701bb` 两处 500 出口加栈日志 + 断言带响应体;发现 client CI 经 vitest alias 直用 platform main 源码(诊断自动传导);platform 全套验证绿;四仓五件套过——check:bundles 拦下一次我手写错的 platform_sha,已修正重验 | CHG-2026-173;platform `92701bb`;client 集群样本 run 28583183537 |
| 2026-07-04 | 轮1(loop):1.0a 修复 selfhost 启动崩溃 | `@delexec/contracts@0.1.3` 发布(纯增量导出);platform-api 重钉 `^0.1.3` + platform 锁与四仓 pnpm-lock 刷新;本地 public-stack smoke source_build ✓;platform main CI **全绿**(compose-smoke 57s ✓,platform job 本次也绿);四仓五件套全过 | CHG-2026-172;protocol `b9234e2`(publish run 28684335553);platform `e44abfe`(CI run 28684633860) |
| 2026-07-04 | 突击审计（应 owner 质疑） | 发现三笔硬欠账进 M1：platform main CI 自 ≥6/21 全红（含两次带红灯发布）；源码构建 public-stack 因 contracts@0.1.2 缺 `validateCatalogGuidanceFields` 导出而 DOA；本机 e2e 6/6 hook 超时。billing 500 flake 在 CI 复现、本地不复现 | GH runs 28681832219 / 28582756950 / 27897689953；本机 `npm run test:e2e` 输出 |
| 2026-07-04 | 预备：T-504 完成（网关 /session/recover + 会话面板状态化重构） | platform 单测 33 过、集成 15 过/2 跳；四仓五件套全过；CHG-2026-170/171 passed/passed | `T-504-rollout-notes.md`、platform `928af80`+`4ea820c`（已推 origin/main） |
| 2026-07-02 | 预备：T-503 彩排（功能性成功，3 条违规） | 付费调用 `BILLING_SETTLED`；违规：npm 未发包、SSH 重置、未走浏览器 UI | `T-503-findings.md` |
