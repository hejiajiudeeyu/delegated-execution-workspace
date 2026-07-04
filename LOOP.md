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
| 1.1 | 修复 client CI flake（integration 500 / unit localStorage），让 publish workflow 变绿 | `repos/client` | done (2026-07-04) | 两个新鲜样本连续全绿:rerun 28582744343(今日三仓组合)+ push run 28688332305(client `ab748f8`)。localStorage 真身=vitest happy-dom 环境在 Node26 不暴露 Web Storage(Node22 有)→ `ab748f8` 加 setup.web-storage.js 内存兜底,单测 138/138;integration 500 未复现(1.0b 诊断持续在岗);publish workflow 的测试关卡即同套件,正式变绿由 1.2 dispatch 验证;CHG-2026-175 |
| 1.2 | 发布 `@delexec/ops@0.1.6` 到 npm | `repos/client` | done (2026-07-04) | publish run 28688824620 全绿并发布,`npm view @delexec/ops version` = 0.1.6,bundleDependencies 完整;首次 dispatch(00:04 UTC)暴露第 4 种 flake:NextUpCard "今日计数"跨 UTC 午夜窗口,client `c53cf7a` 钉死测试时钟修复;CHG-2026-176 |
| 1.3 | 打新 `platform-console-gateway` 镜像（含 T-504 recovery+UI），补 release notes；**前置 = main CI 绿灯（1.0a/1.0b），不再带红灯发布** | `repos/platform` | done (2026-07-04) | tag `v0.1.6`(platform `5d141e5`)→ Images run 28689171280 三镜像推 GHCR + published-image-smoke ✓ 35s——v0.1.4 以来首次全绿协同发布(v0.1.5 当时 Images run 28582756950 亦失败);v0.1.6.md + 回填 v0.1.5.md + 矩阵两行;notes 明确 `/session/recover` 需 `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`;CHG-2026-177 |
| 1.4 | Aliyun public-stack 滚动到新网关镜像；确认生产 env 有 `PLATFORM_CONSOLE_BOOTSTRAP_SECRET` 且已录入交接文档 | `repos/platform` deploy | done (2026-07-04) | 到场发现**生产已宕机 5.5h**(主机 03:08 重启 + restart=no)→ owning repo 修 restart 策略(platform `707b480`)+ 滚动恢复一并完成:gateway v0.1.5→**v0.1.6**,api/relay 保持 v0.1.2;公网 healthz/console 全 200,`session-view.js` 指纹确认新版;`/session/recover` 空 body 403(在线且拒未授权);bootstrap secret 确认在位(只验键不看值);交接双落点=主机 ALIYUN-OPS-README 新增章节 + 四仓 `docs/planning/operations/aliyun-public-stack-handover.md`;CHG-2026-178 |

### M2 T-503 零违规重演

> **2026-07-04 owner 边界变更**:人工走查判定现有 console"设计反人性、反逻辑、指引不清"(摩擦 M1–M10,见 `T-503-rerun-manual-findings.md`),决定**前端推倒重建**后再计数彩排。决议:仅重建 UI 层(网关 API 冻结,保留 `/proxy/*` 演进通道);React 与 client ops-console 同栈;流程 = 设计稿 → owner 拍板 → 实现 → 自动化浏览器回归 → 彩排计数。

| # | 事项 | Owning repo | 状态 | 备注 |
|---|------|-------------|------|------|
| 2.0a | Console 重建 · 设计稿(信息架构/交互规范/关键界面稿),owner 拍板后进入实现 | `repos/platform`(设计稿先落四仓 planning) | todo | 需求输入 = M1–M10 + owner 走查体感 + 自动化run截图;交互底线:操作反馈内联可见、非2xx绝不渲染空态、凭据保存必须验活、敏感操作无默认值、静态资产带指纹 |
| 2.0b | Console 重建 · 实现 + 单测 + 自动化浏览器回归(Playwright 全流程绿) | `repos/platform` | blocked by 2.0a | 含退役未服务的旧 React 原型;发版走 tag→Images→滚生产 |
| 2.1 | 全新身份彩排：Operator 全程浏览器 `/console/`（含丢口令恢复路径演练一次）；**必须包含真实浏览器人工走查** | 第四仓（彩排记录） | blocked by 2.0b(重建后重新计数) | 2026-07-04 自动化跑通旧UI全流程零违规(`T-503-rerun-automated-run.md`,CHG-2026-179);owner 人工走查贡献 M1–M10 后判定重建,本次不计数 |
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
| 2026-07-04 | 轮10(loop):owner 人工走查 + 重建决议 | owner 浏览器走查贡献 10 条摩擦(占位符陷阱、401 伪装空态、假 Ready、无引导等,全指向 console 交互架构)→ owner 判定推倒重建;决议:仅前端(网关 API 冻结)、React 同栈、设计稿先行、重建后再计彩排;backlog 新增 2.0a/2.0b,2.1 改挂其后 | `T-503-rerun-manual-findings.md`(M1–M10);owner 对话记录 |
| 2026-07-04 | 轮9(loop):2.1 自动化跑通 + v0.1.7 紧急修复 | owner 真实浏览器 1 分钟命中 blocker:console API 子路径在任何边缘反代下断裂(前导斜杠丢 `/gateway` 前缀,潜伏 3 版,历来测试全走直连 :8085)→ platform `49b4273` 修复+8 单测,**v0.1.7** 发布(Images 28692687385 绿)并滚生产;自动化 Chromium 操作员全流程(恢复演练 RESET→解锁→凭据→审批→建户+充值 20000)+ Caller 付费调用 → **`BILLING_SETTLED`**,本次运行违规表**空**;口令按清单第 5 步入主机交接;五件套全过(check:bundles 又拦下一次手写 SHA) | CHG-2026-179;platform `36d1839`+tag `v0.1.7`;`T-503-rerun-automated-run.md`;req_cb9c8a87 |
| 2026-07-04 | 轮8(loop):2.1 彩排就绪化 → **loop 停车待决策** | T-503 三违规中两条根因确认移除(npm 0.1.6 清洁房安装+CLI ✓;浏览器恢复面上线 ✓);公网四页 200;重演 runbook 落档(恢复演练前置为 Operator 第 0 步的方案);剩余唯一硬门槛="真实浏览器人工走查"须 owner 决策执行方式,按迭代协议第 5 条停车 | `T-503-rerun-runbook.md`;cleanroom 安装于 job tmp;本轮无子模块变更(无新 CHG) |
| 2026-07-04 | 轮7(loop):1.4 生产滚动 + 宕机恢复 | 到场发现主机 03:08 重启后全栈宕机 5.5h(restart=no)——根因修在 owning repo(全服务 `unless-stopped`,platform `707b480`)并随滚动恢复;gateway → v0.1.6(api/relay 留 v0.1.2);验证:主机 4 容器 Up+策略生效、api/gateway 200、`/session/recover` 空body 403、公网三端点 200、`session-view.js` 版本指纹 ✓;bootstrap secret 在位;交接文档主机+四仓双落点;五件套全过。**M1 除 1.0b(等 CI 现场)外全部关闭,M2 解除阻塞** | CHG-2026-178;platform `707b480`;`aliyun-public-stack-handover.md` |
| 2026-07-04 | 轮6(loop):1.3 v0.1.6 协同镜像发布 | 发版文档补齐(v0.1.6.md、回填 v0.1.5.md 并如实记录红灯发布、矩阵两行);tag `v0.1.6` → 三镜像推 GHCR + published-image-smoke ✓(35s)——**v0.1.4 以来首次全绿协同发布**;tag/main CI 均绿;五件套全过。1.4(Aliyun 滚动)为生产操作,单独一轮处理 | CHG-2026-177;platform `5d141e5` + tag `v0.1.6`;Images run 28689171280 |
| 2026-07-04 | 轮5(loop):1.2 ops 0.1.6 发布 | 首次 dispatch 在 UTC 00:04 失败 → 捕获**跨午夜时间 flake**(NextUpCard "今日计数" fixture 落昨日),`c53cf7a` 钉死测试时钟;二次 dispatch **publish workflow 全绿并发布**,npm 上 `@delexec/ops@0.1.6` 可见、bundle 完整(1.2MB);T-503 "npm 未发包"违规的根因就此移除;五件套全过 | CHG-2026-176;client `c53cf7a`;publish runs 28688671014(失败样本)/ 28688824620(发布) |
| 2026-07-04 | 轮4(loop):1.1 client CI 解卡 | integration 500:rerun 28582744343 在今日组合(contracts 0.1.3 + platform 诊断)下**全绿**,未复现;unit localStorage:根因=vitest happy-dom 环境 Node26 下不暴露 Web Storage(Node22 有)→ setup.web-storage.js 内存兜底,本地 138/138 + integration 86/86 + packages ok;push run 28688332305 亦**全绿**(连续两绿);五件套全过 | CHG-2026-175;client `ab748f8`;runs 28582744343 / 28688332305 |
| 2026-07-04 | 轮3(loop):1.0c e2e 套件复活 | 根因三层:client 侧入口已迁走(spawn 秒死但傻等 10s)/ platform-api 直跑自加载本机 gitignored `deploy/platform/.env` 的 compose 内部 DATABASE_URL / ops-supervisor 期望落后现行契约(platform features 开关、示例 id 改名)。修复后 e2e **6/6 文件 7/7 用例 10s 全绿**(拆分后首绿);platform npm test 15过/2跳 + packages/deploy/docs 检查绿;五件套一次全过 | CHG-2026-174;platform `72feba2` |
| 2026-07-04 | 轮2(loop):1.0b 诊断埋点(根因未复现,如实记录) | 80 次压测零复现(本地 Node26 billing 文件 40x;node:22 双核容器全套件 40x);提交路径审查无随机抛点 → platform `92701bb` 两处 500 出口加栈日志 + 断言带响应体;发现 client CI 经 vitest alias 直用 platform main 源码(诊断自动传导);platform 全套验证绿;四仓五件套过——check:bundles 拦下一次我手写错的 platform_sha,已修正重验 | CHG-2026-173;platform `92701bb`;client 集群样本 run 28583183537 |
| 2026-07-04 | 轮1(loop):1.0a 修复 selfhost 启动崩溃 | `@delexec/contracts@0.1.3` 发布(纯增量导出);platform-api 重钉 `^0.1.3` + platform 锁与四仓 pnpm-lock 刷新;本地 public-stack smoke source_build ✓;platform main CI **全绿**(compose-smoke 57s ✓,platform job 本次也绿);四仓五件套全过 | CHG-2026-172;protocol `b9234e2`(publish run 28684335553);platform `e44abfe`(CI run 28684633860) |
| 2026-07-04 | 突击审计（应 owner 质疑） | 发现三笔硬欠账进 M1：platform main CI 自 ≥6/21 全红（含两次带红灯发布）；源码构建 public-stack 因 contracts@0.1.2 缺 `validateCatalogGuidanceFields` 导出而 DOA；本机 e2e 6/6 hook 超时。billing 500 flake 在 CI 复现、本地不复现 | GH runs 28681832219 / 28582756950 / 27897689953；本机 `npm run test:e2e` 输出 |
| 2026-07-04 | 预备：T-504 完成（网关 /session/recover + 会话面板状态化重构） | platform 单测 33 过、集成 15 过/2 跳；四仓五件套全过；CHG-2026-170/171 passed/passed | `T-504-rollout-notes.md`、platform `928af80`+`4ea820c`（已推 origin/main） |
| 2026-07-02 | 预备：T-503 彩排（功能性成功，3 条违规） | 付费调用 `BILLING_SETTLED`；违规：npm 未发包、SSH 重置、未走浏览器 UI | `T-503-findings.md` |
