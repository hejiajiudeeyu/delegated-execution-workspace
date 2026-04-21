# Console Mode — Content Spec

> **Audience.** 任何要做 ops-console / platform-console UI 的人（设计师 / 前端 / 产品）。
> **Why this exists.** 原型 (`/console/*`) 只验证视觉语言；它的占位文本是「哑实例」，不能直接当业务真相。这份文档是真相 — 每个页面的 region/widget **存在的理由、要服务的真实操作或观测、真实数据来源、空/错状态怎么办**。
>
> **使用规则.**
> - prototype 与 ops-console 落地之间出现内容歧义，**以本 spec 为准**。
> - prototype 改动若动了内容结构（不只是视觉），必须**同步更新本 spec 对应小节**，再合并。
> - ops-console 落地某页时必须先看本 spec 对应小节，确认 region 完整性与 data source 真实性。
> - 任何 region 若没法回答「为什么存在 / 服务什么操作或观测 / 数据来源」三问之一，**不应该上**。

---

## 0 · 通用约定

### 0.1 角色 → 页面归属

| 角色 group | 含义 | 对应 sidebar 区 |
|---|---|---|
| `general` | 跨 caller/responder 的本机运维（健康、引导、传输、日志） | GENERAL |
| `caller` | 当前账号作为「调用方」时关心的页面 | CALLER |
| `responder` | 当前账号作为「接单方」时关心的页面 | RESPONDER |

> 同一个本机进程**同时是 caller 也是 responder**。sidebar 用角色分组 = 用职能分组，不代表"切换账号"。

### 0.2 共享数据源

| Source | 端点 | 字段 | 谁用 |
|---|---|---|---|
| **Status** | `GET /status` （8s 轮询，`useStatus`） | `runtime.{caller,responder,relay}.{pid,running,exit_code,last_error,health.{status,body.ok}}`、`responder.{enabled,responder_id,hotline_count,pending_review_count}`、`config.platform.{enabled,base_url}`、`caller_registered` | Dashboard 全量 / Runtime 健康卡 / Hotline 顶部条 |
| **Platform ping** | `HEAD {platformUrl}/healthz` (3s timeout) | `r.ok || r.status<500` → `platformOk` | Dashboard / 平台不可达警告 |
| **GlobalPolicy** | `GET /caller/global-policy` | `mode: "manual"\|"allow_listed"\|"allow_all"`、`responderWhitelist[]`、`hotlineWhitelist[]`、`blocklist[]` | AccessLists / Preferences / Approvals(加白名单) |
| **Approvals** | `GET /caller/approvals?status=…` （5s 轮询，run 中 2s） | `ApprovalRecord{id, hotlineId, purpose, agentSessionId, inputSummary, hotlineInfo, riskFactors[], overallRisk, status, createdAt, expiresAt, decidedAt, execution}` | Approvals / Calls 侧栏待审批 |
| **Requests** | `GET /requests` （5s 轮询） | `RequestItem{request_id, hotline_id, status, created_at, updated_at, input, responder_id}` | Calls 列表 |
| **Request detail / result** | `GET /requests/{id}` + `GET /requests/{id}/result` | result 含 `available, status, result_package` | Calls detail panel |

### 0.3 状态枚举（不要再发明新词）

| 域 | 枚举 | 显示色 token |
|---|---|---|
| `RequestItem.status` 归一化 | `completed` (SUCCEEDED/COMPLETED) / `failed` (FAILED/ERROR/UNVERIFIED/TIMED_OUT) / `running`（其它） | success / error / info |
| `ApprovalStatus` | `pending` / `approved` / `rejected` / `expired` | warn / success / error / neutral |
| `ApprovalMode` | `manual` / `allow_listed` / `allow_all` | warn (amber) / info (cyan) / **error** (rose, 高警示) |
| `Hotline.review_status` | `local_only` / `pending` / `approved` / `rejected` | caller-tone / warn / success / error |
| `Transport.type` | `local` / `relay_http` / `email` | — |
| Runtime 服务 | `caller` / `responder` / `relay` | role-color |

> ⚠️ prototype 之前出现过 `block-all`、`default-allow`、`manual-review` —— **都不是真实业务枚举**，禁止再用。

### 0.4 Sidebar 分组语义与角色解释

**为什么需要这条.** 「调用方 / 响应方」对新用户是黑话；本机一个进程同时是两者，但用户不知道哪个 sidebar 区对应自己想干的事。

**Group 视觉契约（ConsoleNavGroup 必须支持 description 字段）：**

| group key | 主标 | 11px 副标（**必填**） |
|---|---|---|
| `general` | 概览 | `本机健康、传输与运行时` |
| `caller` | 调用方 | `让 Agent 帮你调用 Hotline` |
| `responder` | 响应方 | `把你写的能力发布成 Hotline` |

- 副标渲染：sidebar 主标下方一行，`text-[11px] text-[var(--brand-muted)] leading-tight mt-px`
- 第一次进入 console（`localStorage["console.tour.done"] !== "1"`）时，三个分组下方临时叠一个 50% 不透明的 spotlight，全屏角落"跳过 / 下一个"按钮 — 一次性 tour，**用户跳过后永不再触发**
- ⚠️ Tour 不是教学，只是把"调用方/响应方"两个词解释清楚；**不要做"完整产品介绍"的 modal 流**

### 0.5 全局帮助入口（`Sidebar Footer · 上手 & 帮助`）

**为什么必须有.** 用户被卡住时只剩"关掉 console 去 Google"的状态是产品死亡信号。Console 必须自带帮助闸门。

**位置.** Sidebar 最下方，永远存在的一块（`mt-auto pt-3 border-t`），三个 link：

| Label | 行为 | 图标 |
|---|---|---|
| `使用指南` | 跳 `/help`（下文 §5.7 内置帮助页） | `BookOpen` |
| `示例 Hotline 速跑` | 直接调 `POST /requests/example` → toast → 跳 calls 定位 | `PlayCircle` |
| `报告问题` | 拉本地诊断包（`POST /runtime/diagnostic-bundle`），下载 + 复制 GitHub issue 模板 | `MessageSquareWarning` |

**禁止.** 把这一区做成 5+ 个 link 的密集导航 —— 它只服务"被卡住时的 self-help"，三个就是上限。

### 0.6 跨页深链 query 约定（`?from=` / `?context=`）

**为什么需要.** 用户从 A 页跳到 B 页之后，必须知道"我从哪儿来 / 完成后回哪儿"。无状态跳转 = 用户迷路。

**Convention：**
- 任何跨页 CTA 跳转都带：`?from=<source-route>` 或 `?context=<json-base64>`（预填表单时用）
- 目标页 ConsoleShell 检测到 `from` query 时，breadcrumb 上方多渲染一条 `← 从 <sourceLabel> 跳过来` chip，点击 = 浏览器后退
- `from` → label 映射表（每加一个 source 就在这里登记，避免散落）：

| from value | label |
|---|---|
| `dashboard-onboarding` | 上手清单 |
| `dashboard-nextup` | 工作台 · 下一步 |
| `calls-retry` | 调用记录 · 重试 |
| `calls-detail` | 调用记录 |
| `approvals-add-whitelist` | 审批中心 · 加入白名单 |
| `approvals-tired-banner` | 审批中心 · 切换模式 |

**禁止.** 拿 `?from=true` 这种没语义的 flag；必须是 enum-like string 出现在上表里。

---

## 1 · `general/DashboardPage` · 工作台

**目的.** 用户每次打开本机 ops-console 的第一眼。回答两个问题：
1. **本机是不是装好了**（4 个进程健康 + 平台可达性）
2. **接下来该干什么**（如果还没注册 caller / 没启用 responder / 没添加 hotline，必须给出明确入口）

**入口.** `/`（默认路由）。
**出口.** caller 注册、平台 toggle 切换、各运维子页（runtime / transport / hotline）。

### 1.1 顶部条件引导：Caller 未注册大卡

- **Why.** 整个 ops-console 在没注册 caller 之前几乎所有 caller-* 页都用不了；这张卡是「**绝对优先**」要让用户看到的事。
- **When show.** `!isCallerRegistered(status)`
- **What.** teal 高亮卡，icon=`UserPlus`，title=「注册 Caller，解锁 Hotline 调用能力」，body 解释一句，CTA=「立即注册」→ `/caller/register`
- **Data.** `status.caller_registered`（兼容字段见 `lib/status.ts`）
- **Hide.** 已注册后整张卡不再渲染（不是变灰，是消失）。
- **Empty/Error.** N/A — 它本身就是空状态的回答。

### 1.2 顶部条件引导：平台模式 toggle 卡

- **Why.** local-vs-platform 是 ops-console 第二重要的运行模式开关；用户必须随时知道现在是哪个模式 + 一键切换。
- **Always show.**
- **What.** 卡片，左：`platformEnabled ? "平台发布已开启" : "当前为本地模式"` + 一段解释（两态文案不同）+ `Platform URL: <code>{platformUrl}</code>`；右：`Button` = `平台已开启 ? 关闭平台发布 : 开启平台发布`，loading 时 disable + "切换中…"
- **Data.** `status.config.platform.enabled`、`status.config.platform.base_url`
- **Action.** `PUT /platform/settings { enabled }` → 成功 `toast.success`(两态文案不同) + `await refresh()`
- **Loading.** 整卡 skeleton（status 还没回来时）
- **Error.** 切换失败 `toast.error("更新平台设置失败", { description })`，按钮回到原态
- **Notes.** 描边色：开启 = violet，关闭 = `border-dashed bg-muted/30`

#### 1.2b 「为什么要开平台模式」价值对比（**L9** · 仅在 `platformEnabled === false` 时显示）

- **Why.** 用户看到 toggle 但不知道开了能多干啥。本地用户最常见的"我开它干嘛"困惑必须有答案。
- **When show.** `!status.config.platform.enabled`
- **位置.** 1.2 toggle 卡正下方；折叠态默认显示，可点 `了解平台模式 →` 展开
- **What.** 折叠 disclosure，title `了解平台模式可以多做什么`，展开后是一张 3 列对比表：

| 维度 | 本地模式（当前） | 平台模式 |
|---|---|---|
| Catalog 来源 | 仅本机 Responder 提供的 hotline | 本机 + 平台社区已发布的 hotline |
| Hotline 可见性 | 仅自己 | 可发布给他人发现 / 调用 |
| 隐私边界 | 完全本地，零网络 | hotline **元数据**会同步到平台；调用输入仍在本机 Responder 进程 |
| 需要的网络 | 无 | 平台 API（`<platformUrl>`）可达 |
| 适合 | 个人脚本 / 内网工具 / 隐私敏感场景 | 想找现成 hotline 用 / 想把能力分享出去 |

- **底部按钮：** `开启平台模式` (primary) + `阅读完整说明 →` link 跳 `/help#platform-mode`
- **关掉这块：** 用户主动 dismiss 后写 `localStorage["dashboard.platform-value-table.dismissed"]="1"`，**仅当当前会话**不再展开；下次刷新仍会出现（避免误关一辈子看不到）
- **禁止.** 把这一块做成"广告/营销" — 它只列**事实差异**，没有诱导文案

### 1.3 平台 API 不可达警告（条件）

- **Why.** 「开了平台发布但 API ping 不通」是用户最容易踩的坑（typo URL / 平台没起 / 网络）。
- **When show.** `platformEnabled && platformOk === false`
- **What.** 黄色 alert，"Platform API 不可达 — `<platformUrl>` 已开启平台发布，因此 catalog 查询与审核同步会受影响。请启动平台服务，或确认 Platform URL 配置正确。"
- **Data.** `platformOk`（来自 `HEAD {platformUrl}/healthz`），`platformUrl`
- **Hide.** `platformOk !== false` 时不显示
- **No action.** 信息性，不带按钮（用户去 transport / config 自己改）

### 1.4 4 进程健康灯网格

- **Why.** 一眼看本机 4 个关键进程是否在跑。这是 dashboard 的"核心仪表"。
- **What.** 2×4 grid（小屏 2×2），每张卡 = 1 个进程
- **4 个固定卡：**

| 卡 | icon | data 来源 | 文案逻辑 |
|---|---|---|---|
| **Caller 进程** | `Server` | `status.runtime.caller.health.body.ok` | undefined→`–` / true→`运行中` / false→`停止` |
| **Responder 进程** | `Zap` | `status.responder.enabled` && `status.runtime.responder.health.body.ok` | `!enabled→未启用` / undefined→`–` / true→`运行中` / false→`停止` |
| **Relay** | `Wifi` | `status.runtime.relay.health.body.ok` | undefined→`–` / true→`运行中` / false→`停止` |
| **Platform API** | `Globe` | `platformOk` | null→`检测中` / true→`可达` / false→`不可达` |

- **每张卡内容**：`HealthDot` + 状态文字。点不可点（这是观测，不是入口）。
- **Empty/Error.** 单值 = `undefined/null` → 灰点 + `–`
- **不要的东西**：sparkline、QPS、SLA 数字 — **本机没有这个数据 pipeline，不要凭空捏造**。

### 1.5 首次上手 5 步引导

- **Why.** 新用户最容易迷失。这一区是从"装好"到"跑通一次端到端调用"的清单。**不是**"看完即消失"的 modal —— 用户走到第几步它都在，做完才折叠成"上手已完成 ✓"小条。
- **What.** 一张大卡 `首次上手流程`，里面 5 行 step item，每行：圆形序号 / done 时变绿+对勾 / 标题 / 一句描述 / 右侧 CTA 按钮（done 后变成 `继续查看` outline）
- **5 步固定**（不能改，跟真实判定挂钩）：

| # | 标题 | 描述 | done 判定 | 按钮 → | from query |
|---|---|---|---|---|---|
| 1 | 注册 Caller | 先获取 Caller 身份，解锁搜索和调用 Hotline 的能力。 | `callerRegistered` | `/caller/register?from=dashboard-onboarding` | dashboard-onboarding |
| 2 | 启用本地 Responder | 本地模式下先启用 Responder Runtime，再添加自己的 Hotline。 | `responderEnabled` | `/responder/activate?from=dashboard-onboarding` | dashboard-onboarding |
| 3 | 添加第一个 Hotline | 创建本地 Hotline，并生成可检查的配置草稿。 | `firstHotlineReady = responderEnabled && hotline_count > 0` | `/responder/hotlines?from=dashboard-onboarding` | dashboard-onboarding |
| 4 | 查看本地草稿 | 确认输入填写说明、输出结构和本地运行配置，再决定是否发布到平台。 | 同上 | `/responder/hotlines?from=dashboard-onboarding` | dashboard-onboarding |
| **5** | **试拨第一个 Hotline** ⭐ | **打开 Catalog，挑一个带 `official` 标签的 Hotline 点「试拨」就能验证端到端跑通。** | `hasFirstCall = requests.length > 0` | **`/caller/catalog?from=dashboard-onboarding`** | **dashboard-onboarding** |

- **5 步的关键性.** Step 5 是**整个 onboarding 的命门** —— 没跑过一次 end-to-end 调用，用户就不算真的"上手"。所有上手清单的现实价值都压在这一步上。**不要为了"5 步太多"删掉它**。
- **CTA 文案规则**：done 时按钮变 `outline` + 文案 `继续查看`；未 done 时 `default` + 各步独立文案（前往注册 / 启用 Responder / 管理 Hotline / 查看草稿 / **打开 Catalog**）。
- **底部尾巴卡（条件性）**："可选后续：发布到平台" / "可选后续：开启平台发布"（两态文案不同），描边样式 violet vs dashed。
- **5 步全 done 时.** 整张卡折叠成一条 success bar："上手已完成 ✓ 5/5。需要时可以重新展开。" + `重新展开` link
- **不要的东西**：通用"配置传输 / 配置告警"步骤 — 真实业务里 transport 是 advanced 配置不是引导步。

### 1.5b 「下一步」卡（NextUp · 永远存在的引导指针）

- **Why.** 用户走完 onboarding 之后，每次开 console 仍然需要"我今天该处理什么"的指引。这块是 **dashboard 顶部第二张卡**（仅次于 1.1 的 caller 注册大卡），永远存在，按当前状态决定内容。
- **位置.** 1.1 caller 未注册大卡之下；1.4 健康灯之上。
- **核心契约.** 一个 6-state state machine，每个 state 决定 title / body / primary CTA / secondary link：

| 优先级 | state | 触发条件 | title | body | primary CTA | secondary link |
|---|---|---|---|---|---|---|
| 1 | `needs_caller_register` | `!callerRegistered` | 先把 Caller 注册了 | 注册之后才能搜 Hotline、试拨、收审批。30 秒搞定。 | 立即注册 → `/caller/register` | `了解 Caller 是什么 → /help#what-is-caller` |
| 2 | `has_pending_approvals` | `pendingApprovals > 0` | 你有 N 个调用等审批 | 这 N 条是 Agent 帮你发起的；审批后 Responder 才会执行。 | 去审批 → `/caller/approvals?from=dashboard-nextup` | `换成自动放行模式 → /caller/preferences` |
| 3 | `has_recent_failures` | 1h 内 `failedCount > 0` | 最近 1 小时有 N 次调用失败 | 看看哪一条出了问题。常见原因：Responder 离线 / 上游超时 / 鉴权过期。 | 查看失败 → `/caller/calls?filter=failed&from=dashboard-nextup` | `Runtime 日志 → /general/runtime` |
| 4 | `needs_first_hotline` | `callerRegistered && hotline_count===0 && !platformEnabled` | 你还没有任何 Hotline 可调 | 两条路：让你的 Responder 发布一个，或者开启平台模式浏览社区已发布的。 | 去 Catalog → `/caller/catalog?from=dashboard-nextup` | `开启平台模式 → /general` |
| 5 | `needs_first_call` | `hotline_count > 0 && requests.length === 0` | 试拨一次跑通端到端 | 从 Catalog 选一个，5 秒内能看到第一条记录。 | 打开 Catalog → `/caller/catalog?from=dashboard-nextup` | `什么是 Hotline → /help#what-is-hotline` |
| 6 | `all_normal` | 以上都不命中 | 一切正常 ✓ | 上次活动 `<lastActivityRelative>` · 今日已完成调用 `<todayCount>` · 没有待审批 | （无主 CTA） | `查看最近调用 → /caller/calls` · `日志 → /general/runtime` |

- **判定顺序.** 按上表自上而下短路；命中第一个就停。**优先级不能乱** —— 如果 caller 没注册，就算有 pending approval 也得先注册。
- **视觉.** 卡左侧 3px 颜色条按 state 切换：危险态（needs_caller_register / has_recent_failures）= `--c-status-error-fg`，警告态（has_pending_approvals）= `--brand-yellow`，引导态（needs_first_hotline / needs_first_call）= `--brand-teal`，正常态（all_normal）= `--c-status-success-fg`
- **图标.** state 对应 icon：UserPlus / ShieldAlert / AlertCircle / PackageSearch / Sparkles / CheckCircle2
- **数据来源.** `useStatus()` + `usePoll(/requests, 5000)` + `usePoll(/caller/approvals?status=pending, 5000)`
- **Empty.** 没数据时显示骨架；不退化成空白
- **禁止.** 这张卡退化到"看完即消失"或"只在 onboarding 阶段出现"。它是常驻的。

### 1.6 服务健康度详细表（操作层）

- **Why.** 1.4 是观测，1.6 是**操作**。当某个进程 down 时，这里能直接拍重启；并显示 PID、错误、退出码。
- **What.** 一张卡 `服务健康度`，内含 4 行 `ServiceRow`，每行：
  - 左：`HealthDot` + 服务名（`caller-controller` / `responder-controller` / `transport-relay` / `platform-api`）
  - 右：状态 Badge（具体文案见下表）+ **down 时显示「重启」按钮**
- **Restart 按钮**：仅在 `ok === false` 时出现；点击 → `POST /runtime/services/{service}/restart` → 成功 `toast.success("{service} 重启指令已发送", { description: "正在等待服务恢复…"})` + 1.5s/3s/5s 三档 setTimeout refresh
- **每行状态映射**：

| 服务 | enabled? | health=true | health=false | platformOk |
|---|---|---|---|---|
| caller-controller | — | `已注册`/`未注册` | `ERROR` | — |
| responder-controller | `disabled` | `ok` | `error` | — |
| transport-relay | — | `ok` | `down` | — |
| platform-api | — | — | — | `检测中…`/`可达`/`不可达` |

- **Empty/Loading.** undefined 时 dot 灰、label `–`
- **Notes.** Platform 这一行**没有**重启按钮（不是本机进程）。

### 1.7 Responder 摘要卡（条件）

- **Why.** 当前账号在做 responder 时，希望快速看见自己 hotline 数和待审核数。
- **When show.** `status.responder` 存在
- **What.** 一张卡，3 行 grid：
  - `Responder ID`: `<mono>{responder_id ?? "–"}</mono>`
  - `Hotline 总数`: `<bold>{hotline_count}</bold>`
  - `待审核`: 平台模式下 `pending_review_count`，本地模式下文案 `本地模式`
- **No action.** 不可点，纯观测
- **Empty.** 没启用 responder 时整张卡不渲染

---

## 2 · `caller/CallsPage` · 调用记录

**定位.** **人类可读的通话日志**。给 caller 看「过去发生了哪些 hotline 调用、为什么发生、结果如何」，不是给开发者看的 raw JSON 调试台。
**不负责.**
- ❌ 审批操作 — 在审批中心做。
- ❌ 发起新调用 — Catalog 「试拨」按钮才是入口（参见 §5.2）。
- ❌ raw 字段对话框 — 机器字段（`request_id` / `responder_id` / 整段 JSON）默认折叠，仅作开发者兜底。

**入口.** sidebar / dashboard 跳转 / catalog 试拨成功后跳。
**出口.** 审批中心、Catalog（"想找新 hotline"）。

### 2.1 页面顶栏

- **Title.** `调用记录`（`PhoneCall` 图标）
- **Description.** `查看你过去发起的 Hotline 调用、执行结果与审批路径。新调用请到 Catalog「试拨」；待审批请到审批中心。`
- **Actions（右上）：**
  - **「去 Catalog 发起调用」按钮**（primary）→ `/caller/catalog`
  - **「审批中心」按钮**（outline，`ShieldCheck` icon，带 pending count badge）→ `/caller/approvals`
  - **「刷新」按钮** → 重新拉 `/requests` + `/caller/approvals`
- **Notes.** 顶栏的两个跳转 button 是关键 affordance — 一个告诉你"想发起新调用去哪"，一个告诉你"想审批去哪"。

### 2.2 三联 Stat 卡

- **Why.** 列表上方的速览盘 + 跳转入口。
- **What.** 3 张并排卡：

| 卡 | data | action |
|---|---|---|
| **待审批 N** | `approvals.filter(s==="pending").length` | 「**去处理审批**」link → `/caller/approvals` |
| **总调用次数** | `requests.length` | 无 action |
| **运行中 N** | `requests.filter(normalize(s)==="running").length` | 无 action |

- **Empty.** 0 时显示 `0`（不要隐藏卡）
- **Loading.** 都显示 `–` 或 skeleton

### 2.3 主从布局：左列表 / 右详情

布局：`grid xl:grid-cols-[1fr_1fr]`（detail 不是细窄边栏，是平等的另一半）

#### 2.3.1 左：通话日志列表（`Card · 通话日志`）

每条 = **CallSummaryRow**，给人类看的 headline，**不暴露机器字段**：

- **第一行（headline）：** `<HotlineDisplayName> · <提炼后的动作短语>` — 16px medium
  - 例 1：`Slack 通知 · 推送 "部署完成" 到 #ops`
  - 例 2：`数据库查询 · 查询 user_id=usr_18429 的最近订单`
  - 例 3：`代码 Review · GitHub PR #4821 (auth bug fix)`
  - 提炼规则：若 hotline 声明了 `display.summary_template`（占位符语法 `{{field}}`）则用模板渲染 `input` 字段；否则取 `input.primary_field`（input_schema 的 primary）+ 兜底 fallback `<HotlineDisplayName> · 调用一次`。
- **第二行（meta）：** `<时间相对值> · <发起方友好名> · <审批路径短语>`
  - 例：`2 min ago · 你手动发起 · 白名单自动放行`
  - 例：`14:08 · 由 ops-agent 发起 · 你 14:07 手动批准`
- **右侧角标：** `OutcomeBadge` — 已发送 / 已完成 / 失败 / 进行中 / 等待结果 / 已拒绝
  - 颜色映射 §0.3 status 枚举，但**文案要中文短语**，不是 raw enum。
- **不显示** request_id / responder_id / hotline_id / created_at ISO 字符串等机器字段（detail 里也是默认折叠）。

- **点击.** `setSelectedId(req.request_id)` → 右侧 detail panel 替换内容
- **Selected highlight.** `bg-muted ring-1 ring-primary/30 + 左侧 2px ink 边`
- **Empty.** `loadingList && skeleton`、否则空 EmptyState：
  - icon + 「暂无调用记录」+ 一句话 `去 Catalog 选一个 Hotline 试拨吧。` + primary 按钮 `打开 Catalog →`
- **筛选（可选 Phase 2）：** 顶部 segmented `全部 / 已完成 / 失败 / 进行中`

#### 2.3.2 右上：审批提醒卡（保留）

不变。**这一卡不是装饰，是 ops-console 长期 UX 决策的关键** — 审批和 calls 在数据上耦合（caller 看 calls 时一定关心待审批），但在操作上必须分页。

- **What.** Card，title=`审批提醒`，body：
  - 一句解释 `待审批请求和批准后的执行结果，已经独立放到「审批中心」统一处理。`
  - 灰条 `当前待审批 N`（mono 数字）
  - 整宽按钮 `前往审批中心` → `/caller/approvals`
- **Always show.**

#### 2.3.3 ❌ 删除：手动测试 Call 折叠卡

**已搬走.** 兜底"手动填 hotline_id 试拨"现在归 Catalog（每个 hotline 卡片都有「试拨」按钮，schema 自动生成表单）。理由：
- Calls 是看历史的页，不是发起调用的页 — 两种心智混在一起增加噪音。
- Catalog 已经知道每个 hotline 的 input schema；从 catalog 进试拨，hotline_id 就已经定下来了。
- 删除这卡使 Calls 页面的"通话日志"定位干净。

### 2.4 Detail Panel（右侧，三段式人类视图）

- **Why.** 给人类看「这个 call 是怎么回事」，不是给开发者看 raw payload。
- **What.** 一张大卡 `Card · 通话详情`，按以下三段排列。
- **每段右上**都有一个不显眼的 `查看原始 JSON` toggle（`<ChevronDown>` icon + 灰字 `12px`），点开当段末尾追加一个 mono terminal-block 显示 raw。

#### Section A · 摘要 (`Summary`)

- **WHAT.** 整段大字 1-2 行，**重述列表 headline 但更完整**：
  - line 1：`<HotlineDisplayName> · <intent verb>`（18px semibold）
  - line 2：`<结果短语，含关键参数>`（14px regular，brand-muted）
- **+** 一行 meta chips：`<OutcomeBadge>` `<时长 chip 例如 "3.2s">` `<approval chip>`
- **生成规则.** 同 §2.3.1 的提炼规则；line 2 优先 `result.human_summary`（responder 自己生成的人话），否则按 `output_display_hints` 提炼一两个关键字段。

#### Section B · 请求背景 (`Why & What was sent`)

定义性 list（label - value 对，`grid grid-cols-[120px_1fr]`）：

| label | value 来源 | 显示 |
|---|---|---|
| 时间 | `created_at` | 绝对时间 + 相对时间双显，例如 `今天 14:08（2 分钟前）` |
| 发起方 | `caller_origin` 字段 | "由你手动发起" / "由 `<agent_session_label>` 发起"（**不是 raw session_id**） |
| 调用的 Hotline | `hotline_id` lookup catalog 拿 display_name + 一行 description | 友好名 + 灰字描述；`mono hotline_id` 仅作 hover tooltip |
| 处理的 Responder | `responder_id` lookup 拿 display_name + adapter type chip | 友好名 + chip `process` / `http`；mono ID hover |
| 审批路径 | derived from `approval` + `policy_mode` | "白名单自动放行" / "全部自动放行" / "你于 14:07 手动批准" / "等待你审批中" / "无需审批（local-only）" |
| 输入参数 | `input` 对象 + hotline `input_schema` | **解析后的 key-value 列表** — 每行：label（来自 `input_schema.field_labels`）+ 人类化 value；不是 raw JSON 大块 |

输入参数的 value 渲染规则：
- string / number / bool → 直接显示；string 太长 (>80) 截断 + `more` 展开
- enum → 显示 label，不是 raw 值
- array → 转成 `<ul>` bullet list（≤5 个全显，>5 折叠 "还有 N 项"）
- object → 嵌一层缩进 + 同样规则；嵌套 >2 层时自动 fallback 到 raw JSON viewer 并提示 "结构较深，已切换为原始视图"
- 缺 schema 时 → fallback 到通用 key-value renderer（`humanizeKey()` 把 snake_case 变成中文/Title Case）

#### Section C · 请求结果 (`Outcome`)

按 status 渲染**不同 layout**：

| status | layout |
|---|---|
| `completed` (success) | green left-border + `CheckCircle2` icon + `已完成` headline + 耗时 + **结果摘要**（`result.human_summary` 优先；否则按 `output_display_hints.field_display_order` 提炼前 3 个字段做 key-value 列表，`primary_field` 加粗）+ 完成时间 + (条件) usage chips |
| `failed` | red left-border + `XCircle` icon + `失败` headline + **error.code mono chip** + **人话原因**（lookup `ERROR_REGISTRY[error.code]?.user_message`，找不到 fallback `error.message`）+ **建议动作**（`ERROR_REGISTRY[error.code]?.suggestion`，例如 "鉴权过期：到 Preferences 重新连接 Slack"）+ **三联 CTA**（详见下表 M5 子节） |
| `running` | blue left-border + `Loader2` 旋转 icon + `Responder 正在执行…` + 已耗时 (live) + 一句 "拿到结果会自动刷新" |
| `result_pending: true` (called but result not back) | amber left-border + `Clock` icon + `Responder 已接收，结果尚未返回` + 一句 "正在 3s 轮询中" + `usePoll` 状态 |
| `pending_approval` | amber left-border + `ShieldAlert` icon + `等待你审批 · 去审批中心 →` + button `打开审批中心` |
| `rejected_by_approval` | red left-border + `ShieldX` icon + `审批被拒绝（你于 14:08 拒绝）` + (条件) 拒绝原因 + **二联 CTA**（详见 M5 子节） |

#### M5 · failed / rejected 状态的下一步 CTA（**强制项**）

每个失败态 outcome 都必须给出"下一步"，否则用户读完没动作可走。

**`failed` 三联 CTA（按重要度排）：**
1. **「重试调用」**（primary）→ `/caller/catalog?hotline_id=<id>&from=calls-retry&prefill=<base64(input)>` —— Catalog 接收到 `hotline_id` + `prefill` 时**直接打开试拨抽屉并预填上次输入**；用户改一两个字段后重发，不必从零开始
   - 条件：`error.retryable`；不可重试时按钮 disabled + tooltip 解释为什么
2. **「查看 Responder 日志」**（outline）→ `/general/runtime?service=responder&filter=<request_id>&from=calls-detail` —— Runtime 页接到 `filter` 时自动 scroll 并高亮含此 request_id 的日志行
3. **「报告问题」**（ghost）→ 触发 §0.5 同款 diagnostic-bundle 流程，预填这条记录的 request_id

**`rejected_by_approval` 二联 CTA：**
1. **「以后自动放行此 Hotline」**（primary）→ 弹一个轻量 confirm（"加入 Hotline 白名单后，该 Hotline 的未来调用会自动放行"）→ 同 §4.3 加白名单逻辑 → toast + 同 §M6 popover 教育
2. **「换成「白名单自动放行」模式」**（outline）→ `/caller/preferences?from=calls-detail`（带 anchor 直达 mode 切换 region）

每段末尾仍可 toggle `查看原始 JSON`（同时显示请求 JSON + 结果 JSON 两块 mono terminal-block）。

#### Polling

- `usePoll(fetchDetail, 3000, enabled: status === "running" || result_pending, skipInitial: true)`
- 拿到终态后停止。

### 2.5 Empty (整页)

- 没任何 request：整页 EmptyState — 大 icon + "你还没有任何调用记录" + 一句话引导 + primary CTA 「打开 Catalog 选一个 Hotline」+ 次级 link 「去 Dashboard 看上手清单」

### 2.6 不该有的东西

- ❌ **manual call form** / **prepare/confirm 表单** —— 搬到 Catalog
- ❌ **request_id / responder_id / hotline_id 等 mono ID 直接出现在列表行** —— 这些是开发者字段，最多放在 detail 的 hover tooltip 或 `查看原始 JSON` 折叠里
- ❌ **整段 raw JSON 默认渲染** —— 默认是 parsed view，raw 是 toggle
- ❌ **审批操作按钮**（批准 / 拒绝）—— 永远在审批中心
- ❌ **不带语义的 status enum 字符串**（比如直接 `completed`、`status: 0`）—— 必须中文化的 OutcomeBadge

### 2.7 数据 / Schema 依赖

为了把"摘要"和"输入参数"渲染成人话，本页必须能拿到：
- `GET /requests` —— 自带 hotline_id / input / result / status / approval（已有）
- `GET /catalog/hotlines/{id}` 的 **`display`** 节点（**Phase 2 protocol 扩展**，详见下）

**`display` schema 节点（建议加到 protocol，本 spec 仅记录约定）：**
```jsonc
{
  "display": {
    "summary_template": "推送 \"{{message}}\" 到 {{channel}}",   // 渲染列表 headline 用
    "field_labels": { "channel": "频道", "message": "消息内容" }, // input field 标签
    "input_field_order": ["channel", "message", "priority"],
    "primary_field": "channel",                                  // 没 template 时退到这个字段
    "output_summary_template": "已发送，message_id {{message_id}}", // outcome 用
    "output_field_order": ["message_id", "delivered_at"],
    "output_field_labels": { "message_id": "消息 ID", "delivered_at": "送达时间" }
  }
}
```
**ops-console 落地策略：**
- 短期：先按字段名做 `humanizeKey()`，没拿到 display 节点照样能跑（fallback graceful）。
- 中期：在 protocol 加 `display` 字段，hotline 作者填，console 自动用上。
- 此节点缺失绝不能让页面崩，只能让"摘要"退化成 `<HotlineDisplayName> · 调用一次`。

---

## 3 · `caller/AccessListsPage` · 名单管理

**目的.** 维护与审批策略协同的 3 份名单（Responder 白 / Hotline 白 / Blocklist）。
**不负责.** 切换审批模式（去 Preferences）。本页 ModeStatusCard 只展示 + 提供跳转。

### 3.1 页面顶栏

- **Title.** `名单管理`
- **Description.** `维护 Responder / Hotline 白名单与 Blocklist。审批中心的「加入白名单」也会沉淀到这里。`（**这句是关键 cross-page hint，不能删**）

### 3.2 ModeStatusCard

- **Why.** 强语义提示：当前模式决定下方 3 份名单是否生效（白名单只在 `allow_listed` 真生效）。
- **What.** 横向 alert，icon + 文字 + 右侧「切换模式」按钮 → `/caller/preferences`
- **Data.** `policy.mode`
- **3 模式映射（**勿改**）：**

| mode | badge 文案 | tone | title | message |
|---|---|---|---|---|
| `manual` | 全部手动审批 | **amber** | 审批模式：全部手动审批 | 下方白名单已保存但当前不会自动放行；切到「白名单自动放行」后才生效。Blocklist 永远生效。 |
| `allow_listed` | 白名单自动放行 | **cyan** | 审批模式：白名单自动放行（生效中） | 命中下方任一白名单的请求会自动放行；其余请求继续走审批中心人工批准。Blocklist 永远生效。 |
| `allow_all` | 全部自动放行 | **rose** | 审批模式：全部自动放行 | 所有 Hotline 调用直接执行，无需审批。下方白名单不会被特殊使用，但 Blocklist 仍然会拒绝命中项。 |

- ⚠️ **不存在 `block-all` 模式**。

### 3.3 Tabs（**3 tab，不是 4**）

- **Order.** Responder 白 → Hotline 白 → Blocklist（统一的，不分 R/H）
- **Tab 内**：每 tab 对应一份名单 = 一个 `ListPanel`

| key | label | meta |
|---|---|---|
| `responderWhitelist` | Responder | icon `ShieldCheck`，cyan |
| `hotlineWhitelist` | Hotline | icon `ShieldCheck`，cyan |
| `blocklist` | 黑名单 | icon `ShieldBan`，**red**（语义警示） |

### 3.4 ListPanel（每 tab 内）

三段：**Header / Body(list-or-empty) / Footer(AddRow)**

#### Header
- title + count chip + (条件)`未生效` chip
- description（每份名单不同，含交叉影响说明）
- **「未生效」chip 出现条件**：白名单 tab + `policy.mode !== "allow_listed"` + `count > 0` — **这个 chip 是核心 affordance，否则用户不懂"我加进去为什么没自动放行"**。Blocklist tab 永远不显示（因为 blocklist 永远生效）。

#### Body
- **List state**：mono ID + 「移除」按钮，hover 时 destructive tone
- **Empty state**：dashed border + 居中淡 icon + emptyTitle + emptyHint（每份不同，要包含**真实业务提示**：例如 Responder 白 emptyHint 提到"在审批中心点「加入白名单」沉淀过来"）

#### Footer
- 上分割线 + label `添加新条目` + AddRow（input mono + 按钮）
- input placeholder 用**真实风格 ID**：
  - responder：`responder_id，例如 my-company-bot`（**不要 `sub_xxx` 这种凭空 ID**）
  - hotline：`hotline_id，例如 local.delegated-execution.workspace-summary.v1`
  - blocklist：`需要封锁的 hotline_id`
- Enter 键提交；submit 时 input + button 都 disable + button 文案 `保存中…`
- 重复添加：`toast.info("该条目已在名单中")`，不报错

### 3.5 数据流

- **Read**：`GET /caller/global-policy`
- **Write**：`PUT /caller/global-policy { ...policy, [listKey]: nextList }` — 整个 policy 一起回写
- **Loading.** 4 个 skeleton（header / mode / tabs / list）
- **Hard error.** policy 拉不到 → 整页 destructive Alert "无法加载名单策略，请刷新后重试。"

### 3.6 不该有的东西

- ❌ 「导出 JSON」按钮（凭空，没业务理由）
- ❌ 4 个 tab 把 blocklist 拆成 R-block + H-block（业务模型只有 1 个统一 blocklist）
- ❌ `block-all` 模式

---

## 4 · `caller/CallerApprovalsPage` · 审批中心

**目的.** 处理 Agent 发起的 Hotline 调用审批；批准后看执行状态。
**入口.** sidebar / Calls 页跳转 / Dashboard 待审批数字跳转 / NextUp 卡跳转。
**出口.** 名单管理（"加入白名单"动作 + 跳转）/ 偏好（切换审批模式）。

### 4.0b 「审批疲劳」横幅（**M7** · 智能 banner）

**Why.** 用户在 manual 模式下连续手动批准 N 次同一个 hotline 之后，明显应该考虑切换到 allow_listed 模式或加白名单。再不主动提醒，用户就会感到"产品在浪费我的时间"。

- **触发条件.** 满足以下**任一**：
  - 当前 30 天内人工批准次数 ≥ 20，且当前模式 = `manual`
  - 同一个 hotline 在 7 天内被人工批准 ≥ 5 次（不分模式）
  - 待审批列表当前 ≥ 5 条
- **位置.** 4.1 顶栏正下方、4.2 filter tabs 之上
- **样式.** 黄色 alert，3px 左边框 brand-yellow，icon `ShieldAlert`
- **三种文案（与触发条件对应）：**
  - 模式累计："过去 30 天你手动批准了 N 次 — 切换到「白名单自动放行」可以省下大部分手动操作。" + 主按钮 `去切换模式 →` (`/caller/preferences?from=approvals-tired-banner`) + 次按钮 `了解三种模式 →` (`/help#approvals`)
  - 同 hotline 高频："你已经在 7 天内手动批准了 N 次 `<hotline display_name>` — 加它到白名单后未来调用自动放行。" + 主按钮 `加入 Hotline 白名单 →` + 次按钮 `了解白名单 →`
  - 队列堆积："当前有 N 条待审批 — 一次性批准信任的 hotline 后，剩下的会显著少。" + 主按钮 `批量批准信任的 →`（打开侧边筛选）+ 次按钮 `了解审批策略 →`
- **可关闭.** `localStorage["approvals.tired-banner.dismissed-at"] = <iso>`，关闭后 24h 内不再出现；下次窗口开启时重新评估
- **数据源.** Phase 1：`items` 全量计算；Phase 2：服务端聚合 `GET /caller/approvals/usage-stats`
- **禁止.** 把 banner 做成"教程式"长解释。三句话以内，主按钮一个就走。

### 4.1 页面顶栏

- **Title.** `Hotline 调用审批` + （条件）pending count amber badge
- **Description.** `Agent 发起的 Hotline 调用需要您手动审批后才能执行`
- **Action.** 「刷新」按钮 → 重新 load
- **Data.** `items` 全量、`pendingCount = items.filter(s==="pending").length`

### 4.2 Filter Tabs（5 个）

- **Order.** `pending` / `approved` / `rejected` / `expired` / `all`
- **labels.** 待审批 / 已批准 / 已拒绝 / 已过期 / 全部
- **Default.** `pending`
- **Action.** 切 tab → 重新 fetch `/caller/approvals?status={tab}`（`all` 时不带 query）
- **What.** 紧凑 button group，active = cyan bg + 白字

### 4.3 ApprovalCard（list 主体）

每条 `ApprovalRecord` 渲染一张卡：

#### Header 行
- 左：`RiskIcon`（高/中=ShieldAlert / 低=ShieldCheck / info=Info） + Hotline displayName（fallback hotlineId）+ mono `hotlineId`
- 右：`RiskBadge`（高风险 red / 中风险 amber / 低风险 blue / 提示 slate）+ `StatusBadge`（pending=amber / approved=green / rejected=red / expired=slate）

#### Context 区（grid）
- `调用目的`：`item.purpose`（条件，整宽）
- `Agent Session`：`item.agentSessionId`（mono）
- `输入摘要`：`item.inputSummary`（条件，整宽）
- `发起时间`：`timeAgo(item.createdAt)`
- 仅 pending 显示：`Clock` + `expiresIn(item.expiresAt)`（含「已过期」时仍显示）

#### 风险因素 chips（条件）
- `item.riskFactors[]` map → 小 chip，hover title=description，颜色按 severity
- 列出每个 factor 的简短 description

#### Actions（仅 pending 显示）
- **「批准」**（绿底）→ `POST /caller/approvals/{id}/approve` → `toast.success("已批准，Agent 可继续执行")` + reload
- **「加入白名单」**（outline）→ 读 `/caller/global-policy` → 检查 hotlineId 已在 → 否则 `PUT /caller/global-policy` 加 → 三类 toast + **M6 教育 popover**（见下）

**M6 · 白名单后教育 popover（强制）**

加白名单是**幂等动作**，但它的"以后会发生什么"完全不显性。如果只弹个一行 toast 用户根本不知道刚才那一下做了什么 — 这是 ops-console 当前最普遍的"我点了但不知道有用没用"困惑来源。

- **触发：** 加白名单**成功**之后（不管是从 Approvals 卡 / Calls 详情 / 名单管理任何地方触发）
- **位置：** anchor 在触发按钮旁边，Popover/Tooltip 形态（不是 modal）
- **保留时长：** 8 秒自动关，鼠标移入则保留；可手动 `×` 关闭
- **内容（按当前 ApprovalMode 不同有 2 个版本）：**
  - 当前 `mode = allow_listed`：
    - title：`已加入白名单 ✓`
    - body：`后续 <hotline display_name> 的调用会自动放行，不再来打扰你。`
    - 一行链接：`查看 / 管理白名单 → /caller/access-lists?from=approvals-add-whitelist`
  - 当前 `mode != allow_listed`（manual 或 allow_all）：
    - title：`已加入白名单 ✓ · 但当前模式不会自动放行`
    - body：`你现在是「{currentModeLabel}」模式 — 名单不生效。切到「白名单自动放行」才会按白名单走。`
    - 主按钮：`切换到白名单自动放行 →` (`/caller/preferences?from=approvals-add-whitelist`)
    - 次链接：`保留当前模式，先看名单 → /caller/access-lists`
- **不要的东西：**
  - ❌ 不要做"恭喜你加入白名单"那种庆祝弹窗
  - ❌ 不要长篇解释三种模式的全部差异（那是 `/help#approvals` 的事）
  - ❌ 不要重复 toast 的内容；popover 是"额外说明"，toast 是"动作回执"
- **可关掉.** 用户在同一会话连续看到该 popover 3 次后自动转为只 toast 不 popover（`sessionStorage["whitelist-popover-shown-count"]`）。

- **「拒绝」**（red outline）→ `POST /caller/approvals/{id}/reject` → 红 toast
- 三按钮 disabled 联动（同时只能进行一个）+ loading 文案
- 右侧灰字提示：`批准后 Agent 可继续执行调用`

#### ExecutionBlock（**仅非 pending 且 item.execution 存在时显示**）
- 这是审批中心特有的"批准之后的执行回放"区域。
- **header**：状态 icon + 文案（`Agent 正在执行调用…` / `执行成功` / `执行失败` / `执行超时`）+ 右上 mono request_id（slice 18）
- **Responder 行**：`User` icon + `由 <responderId> 处理`
- **human_summary**（成功时）：绿色高亮 1 行
- **结构化输出字段**（成功时，`result` 存在）：扁平化（一级 `parent.child`）后按 `output_display_hints.field_display_order` 排，`field_labels` 做 label，`primary_field` 加粗高亮
- **Error**（失败时）：mono error.code + error.message
- **Footer**：完成时间相对值 + 耗时 ms + usage chips
- **整块 tone**：running=blue / succeeded=green / failed=red 边框底色

### 4.4 Polling 策略

- 默认 5s
- 加速到 2s：`items.some(i => i.status==="approved" && i.execution?.status==="running")`
- skipInitial: true

### 4.5 Empty / Loading

- Loading：2 个 skeleton 高 40
- Empty：居中文案，pending tab 时 `暂无待审批请求`，其它 tab `暂无记录`

### 4.6 Prototype 状态

✅ **brand-site prototype 已落地** `console-page-approvals.tsx`：覆盖 5 filter tabs / ApprovalCard / ExecutionBlock / **M7 审批疲劳 banner（3 种触发演示）** / **M6 加白名单后教育 popover（mode 两态对比演示）**。Phase 2 ops-console 落地直接照该原型 + 本节 spec 写。

---

## 5 · 其余 ops 页面 — 简版 spec

> 详细 spec 后续轮迭代时补；以下是不丢失业务关键事实的最小记录。下游落地 ops-console 时**仍然以真实页源码为准**。

### 5.1 `caller/CallerRegisterPage` · 注册 Caller

- 已注册：success 卡 + 跳「浏览 Hotline Catalog」入口
- 未注册：单字段表单（联系邮箱）+ `POST /auth/register-caller { contact_email, mode: "local_only" }`
- 成功 → 1.5s 跳 `/caller/catalog`
- **唯一字段**：邮箱。**不要凭空加** name / org / API key 等。

### 5.2 `caller/CatalogPage` · 热线目录

- **定位扩展.** **既是浏览页，也是发起调用的唯一入口** — Calls 页已删除手动测试表单，所有"我想试着调一下这个 hotline"的动线必须从这里开始。
- 主从：左 list（搜索框 + Hotline 卡片：display_name / mono id / description / task_types chips / tags chips / **「试拨」按钮（primary）** / 「查看详情」link）/ 右 detail panel
- detail：display_name + ReviewBadge + mono id + description + summary block + Input/Output Summary 双卡 + Input Fields 列表（含 type badge + description）+ Output Fields 列表 + Recommended/Limitations 双列 + 底部置「**试拨**」primary 按钮（**整页都有这个 affordance**）

**「试拨」action（drawer / Sheet 抽屉）：**
- 打开 Drawer，title `试拨 · <hotline display_name>`
- 表单字段从 hotline 的 `input_schema` 自动生成（type → 控件：string=Input, enum=Select, number=NumberInput, bool=Switch, multiline=Textarea；用 `display.field_labels` 做 label，`field_descriptions` 做 helper text）
- 必填 client 端校验
- Responder：默认自动选第一个 enabled responder；可下拉手动选
- 「发送调用」按钮（primary，带 `Loader2` loading）+ 「取消」（outline）
- 提交：`POST /calls/prepare` → `POST /calls/confirm`（官方示例 hotline 走 `POST /requests/example`，原 ops-console 行为保留）
- 成功：toast `已发起调用，跳转到调用记录` + 跳 `/caller/calls?selected=<request_id>&from=calls-retry` → Calls 页定位到这条新记录（**保持 from=calls-retry 让用户能"返回 catalog"**）
- 失败：表单内红 alert，停留在抽屉里，不跳走

**Query 参数（来自 deep link）：**
- `?hotline_id=<id>` → 自动选中该 hotline + 自动打开试拨抽屉
- `?prefill=<base64-encoded-json>` → 配合 `hotline_id` 使用，预填表单字段（Calls 页"重试"动线）
- `?from=dashboard-onboarding` → 顶部加一条 sky-blue 横幅 `第一次试拨指南：选一个带 official 标签的 Hotline 点「试拨」即可。结果会自动跳到 调用记录。`，关掉横幅 = `localStorage["catalog.first-call-tip.dismissed"]="1"`
- `?from=dashboard-nextup` → 同上但文案 `Dashboard「下一步」推荐你试拨一次。选一个 Hotline 开始。`
- `?from=calls-retry` → breadcrumb 的 fromContext chip 渲染为 `← 从 调用记录 · 重试 跳过来`
- 兼容：未识别的 `from=` value → 不渲染横幅，但仍传入 ConsoleShell 的 fromContext

**空状态（**M8 · zero hotlines**）：**
- **触发：** `/catalog/hotlines` 返回 `[]`
- **What.** **不允许**只显示"暂无 Hotline"灰字 —— 那是死路。必须显示**双路 EmptyState**：

```
┌─────────────────────────────────────────────┐
│ [大 icon: PackageSearch]                    │
│ 你的 Catalog 是空的                         │
│                                             │
│ ① 让你的 Responder 发布一个 Hotline         │
│   → [打开 Hotline 管理] (primary)           │
│                                             │
│ ② 或者：开启平台模式，浏览社区已发布的       │
│   → [去 Dashboard 启用平台模式] (outline)    │
│                                             │
│ ③ 不想配置？一键加载 3 个 demo Hotline       │
│   → [加载 demo Hotline] (ghost)             │
│   ↳ POST /catalog/load-demo-hotlines         │
└─────────────────────────────────────────────┘
```

- **每个 CTA 都是真路径，不是装饰**；落地时 ③ 必须有真实端点（不存在就建一个最小 endpoint），否则按钮删掉
- **隐藏条件：** 至少有 1 个 hotline 时整个 EmptyState 不渲染

**Data.** `GET /catalog/hotlines` (list) + `GET /catalog/hotlines/{id}` (detail) + `POST /calls/prepare`、`POST /calls/confirm`
**Search.** client-side 过 hotline_id / display_name / description / task_types
**理由（写下来防 drift）.** Catalog 是已经知道 hotline_id 的入口；让用户从 catalog 进试拨，可省去 Calls 页那个"先填 hotline_id 再填字段"的双阶段笨重表单。

### 5.3 `caller/PreferencesPage` · 偏好设置

两块：
1. **GlobalPolicyCard**（审批策略 mode 选择 + 3 项白/黑名单计数 + 「打开名单管理」跳转）
   - 切换 mode 时**必弹 AlertDialog**，根据 from→to 计算 `ModeChangeImpact`（destructive 标志、bullets list 含 4 种 tone：danger/warn/good/neutral、确认按钮文案）
   - 切到 `allow_all` = destructive，确认按钮 `我已确认风险，切换到 allow_all`
2. **自动路由偏好**（`/preferences/task-types`）：task_type → hotline_id 映射表 CRUD

### 5.4 `responder/ResponderHotlinesPage` · Hotline 管理

- 顶部 actions：「添加示例」+「添加」（dialog 表单：hotline_id / display_name / adapter_type process|http / cmd|url / task_types / capabilities / tags / soft & hard timeouts）
- 平台模式 banner（同 Dashboard）
- 列表项：display_name + ReviewBadge + 草稿就绪 / 本地已加载 / adapter_type chip / mono id / task_types chips + 「草稿」按钮 + enable Switch + 删除
- 「草稿」按钮 → 全屏 Dialog，5 tab（概览 / 契约 / 示例 / 使用建议 / 原始）展示 DraftDocument 全字段

### 5.5 `general/RuntimePage` · Runtime 监控

- 顶部 service tab（caller / responder / relay）+ 刷新（5s 自动 silent）
- 每 service：3 卡（Caller/Responder/Relay 健康 + PID + last_error）+ 解释文案 + （条件）告警卡（dedup） + （条件）alert hint 卡 + 日志区（filter text + level filter + dedup 重复行 + 时间分隔符 + 终端样式）+ Debug Snapshot 折叠

### 5.6 `general/TransportPage` · 传输配置

- 通信类型说明卡（local / relay_http / email 三选一）
- 通信类型选择 + 条件性子表单（relay_http: base_url；email: provider+sender+receiver）
- 「保存」+「测试连接」按钮（`POST /runtime/transport/test`）
- 当前配置预览卡

### 5.7 `/help` · 内置「上手 & 帮助」页（**新页**）

- **Why.** §0.5 强制要求 console 自带帮助闸门，否则用户卡住只剩"关掉去 Google"的选项。本页就是这个闸门。
- **路径.** `/help`（顶层路由，不在角色分组下，由 sidebar footer 进入）
- **入口.** Sidebar footer「使用指南」link（§0.5）+ NextUp 卡的 secondary link + 各处 `什么是 X →` link（深 anchor 跳本页）
- **结构.** 双栏：左 8 章 TOC（sticky）+ 右文章正文（markdown 渲染 + anchor 跳转）

**8 章固定（按用户旅程组织，不按系统模块）：**

| anchor | 章 | 一句话内容 |
|---|---|---|
| `#what-is-caller` | 1. 什么是 Caller / Responder | 一图说清"我让 Agent 帮我调东西" vs. "我把能力发布给别人调" |
| `#first-call` | 2. 5 分钟跑通第一次调用 | 端到端：注册 → 启用 responder → 加 hotline → 试拨 → 看结果 |
| `#what-is-hotline` | 3. 什么是 Hotline | 把 Hotline 类比成"REST API + Schema + 审批策略"的复合体 |
| `#approvals` | 4. 审批与白名单 | 三种模式 / 加白名单 / 加黑名单 / 模式切换的 trade-off |
| `#platform-mode` | 5. 本地模式 vs. 平台模式 | 价值对比表（同 §1 L9 那张）+ 何时该开启 + 如何开启 |
| `#troubleshooting` | 6. 常见故障排查 | Responder 连不上 / 调用失败 / 平台 API 不可达 / 审批不动了 |
| `#faq` | 7. FAQ | 8-12 条常见问答 |
| `#feedback` | 8. 反馈与报告问题 | diagnostic-bundle 流程 + GitHub issue 模板 + 邮件 |

- **每章必须有：** title / 1 段开场说"为什么你需要看这章" / 主体 / 一个或多个 inline CTA（"立即注册 →" 跳真实页）
- **数据来源.** Phase 1：markdown 文件 bundled 进 console build；Phase 2：`GET /help/articles?lang=zh-CN` 拉服务端，支持远程更新
- **Search box（可选 Phase 2）：** 顶栏一个"搜帮助"输入框，client-side 过 article 标题 + 一级 heading
- **Empty.** 拉不到文章时显示 fallback "无法加载帮助内容；请直接访问 [docs.delegated-execution.dev]() 或 [GitHub repo]()"
- **禁止.** 把这页做成"产品营销页" —— 它是工具页，每章直奔 user task

---

## 6 · 反模式速查（看到这些立刻拒绝）

| 反模式 | 为什么不行 | 取代方式 |
|---|---|---|
| Sparkline / 趋势线 | 本机没有时序数据 pipeline | 进程健康灯 + 计数 |
| Activity feed | 没有事件 stream 数据源 | 让用户自己看 Calls / Approvals 列表 |
| Total revenue / SLA % | 没有这种语义 | 进程健康 + 待审批 N |
| 「导出 JSON」/「下载报表」 | 没业务理由凭空加按钮 | 删除 |
| 把 Calls detail 搞成可批准 | 审批必须独立页 | 审批中心入口 + 状态联动 chip |
| `block-all` / `default-allow` / `manual-review` 模式 | 不是真实枚举 | 用 manual / allow_listed / allow_all |
| Responder-block + Hotline-block 拆 tab | 只有一个统一 blocklist | 单 blocklist tab |
| 凭空 mock ID（`sub_1bX9cM2Lq`） | 不像真实数据 | `my-company-bot` / `local.delegated-execution.workspace-summary.v1` |
| 装饰性大背景图压在数据区上 | 干扰可读性 | console-mode `<ConsoleBackdrop intensity="branded">` 已经在低强度处理 |
| Calls 列表行直接显示 `request_id` / `responder_id` / mono ID | 不是给开发者看的调试台，是给人看的通话日志 | headline = HotlineDisplayName + 提炼后的动作短语；机器字段塞 detail 的「查看原始 JSON」 toggle |
| Calls detail 默认全屏 raw JSON | 同上；reuse 不行就重写 | 三段式 Summary / 请求背景 / 请求结果，raw JSON 是 toggle 兜底 |
| Calls 页放「手动发起测试 Call」表单 | Calls 是看历史页，不是发起页 | Catalog 每个 hotline 卡的「试拨」按钮 |
| 把 hotline `input` 当 raw JSON 大块往详情里贴 | 看不出输入参数是什么 | 按 `input_schema` + `display.field_labels` 渲染 key-value |

---

## 7 · 维护

- 本文档与原型同步：原型动 region/数据源 → 同 PR 改本 spec。
- ops-console 真实页与本 spec 出现冲突：**本 spec 必须更新**（因为 spec 是真相的镜像，不是 prototype 的脚本）。
- 落地一页前的检查清单：
  1. 对应小节读了吗？
  2. 本页所有 region 都能回答 what/why/data-source 三问吗？
  3. 没有引入反模式 §6 任意一条吗？
  4. 状态枚举跟 §0.3 对得上吗？
