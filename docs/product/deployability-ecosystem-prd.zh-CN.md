# 可部署性生态 PRD

> 英文版：[./deployability-ecosystem-prd.md](./deployability-ecosystem-prd.md)
> 说明：中文文档为准。

更新日期：2026-06-08

## 1. 背景

CALL ANYTHING 现在的仓库边界是正确的：

- `repos/protocol` 负责协议契约和模板
- `repos/client` 负责 caller/responder 本地运行时和 agent-facing tools
- `repos/platform` 负责 platform API、relay、gateway、持久化和正式部署 manifest
- 第四仓负责编排、兼容性台账、验证、本地跨仓开发
- `repos/brand-site` 负责向外解释产品、部署入口和 console 形态

下一阶段的产品目标，是让整个架构像 Sub2API、CLIProxyAPI 这类项目一样：

- 容易部署
- 管理方便
- 结构好理解
- 安全边界清楚
- 出问题时能快速定位

外部参照：

- [Sub2API](https://github.com/Wei-Shaw/Sub2API)：自托管 AI API 聚合服务，强调 Docker 部署、后台管理、数据目录、自动生成 secrets、限流、计费和监控。
- [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)：CLI/API 代理管理服务，强调 Docker 部署、管理 API、热加载、Web UI、日志、Dashboard 和 token/security 控制。

## 2. 产品目标

让 CALL ANYTHING 可以作为一个可管理的本地 / 自托管系统被部署：

- 有一个非常明确的 quick-start 路径，也就是 one obvious quick-start path
- 部署 profile 数量少且命名稳定
- 能自动生成生产级本地 secrets
- 有确定性的 health check
- 有简单的 status / logs 生命周期命令
- console 能看见 runtime 状态
- 第一次暴露到公网之前，安全控制能被用户理解

## 3. 用户画像

- **单人 operator**：想把一个私有工作流封装成 Hotline，不想先啃完整协议。
- **Agent 开发者**：想快速启动、检查、重置本地 caller-skill / MCP loop。
- **自托管管理员**：想部署 public/private platform stack，并清楚 env、端口、日志和安全开关。
- **品牌站读者**：在碰代码前，先理解要部署什么、为什么安全、哪里能管理。

## 4. Readiness 定义

当一个 fresh operator 能完成下面动作时，生态才算「日常可部署」（daily-deployable）：

1. 选择 profile：local agent loop、all-in-one demo、public platform、formal production stack
2. 生成 `.env` secrets，不再手工改 placeholder
3. 用一个命令或一段复制命令启动选定 profile
4. 运行 doctor，并看到所有必要 endpoint 的状态
5. 从一个入口查看 logs 和 container/service 状态
6. 理解哪些数据留在本机、哪些 metadata 到 platform、哪些 secrets 需要轮换
7. 在 brand-site 上看到同一套部署叙事

## 5. 非目标

- 不把 protocol、client、platform 的业务真相搬到第四仓。
- 不复制 `repos/platform` 的正式 deploy manifest。
- 不在 billing、email、public marketplace 自己的 gate 通过前宣称它们 production-ready。
- 不把不安全默认值包装成绿色 ready。

## 6. 能力地图

| 能力 | Owner | 初始工作 |
| --- | --- | --- |
| 兼容性台账 | 第四仓 | change bundles 和必跑 gates |
| 兼容状态 | 第四仓 | `corepack pnpm run compat:status`，以及给当前 bundle、submodule SHA、dirty worktree、blockers 和 warnings metadata 使用的 `corepack pnpm --silent run compat:status -- --json` |
| 可部署性总览 | 第四仓 | `corepack pnpm run deployability:overview`，以及作为全部部署/管理路径只读命令地图的 `corepack pnpm --silent run deployability:overview -- --json`，包含 all-in-one demo profile |
| 可部署性 quickstart | 第四仓 | `corepack pnpm run deployability:quickstart`，以及作为 daily development、all-in-one demo、self-host、public-stack 和 release-review 路径只读首次使用指南的 `corepack pnpm --silent run deployability:quickstart -- --json`；daily development 会在进入更深的 profile-specific 命令前先暴露专用 profile catalog、action-plan profile selector 和 focused dashboard / handoff 示例 |
| 可部署性安全矩阵 | 第四仓 | `corepack pnpm run deployability:safety`，以及作为部署命令 read/write/startup/network/logging 姿态说明矩阵的 `corepack pnpm --silent run deployability:safety -- --json`，包含作为 dashboard-safe read-only 命令的专用 profile catalog 和 action-plan profile selector |
| 可部署性 readiness scorecard | 第四仓 | `corepack pnpm run deployability:readiness`，以及作为人、CI 和管理 UI 使用的独立 daily-deployable scorecard 的 `corepack pnpm --silent run deployability:readiness -- --json`；它复用 command catalog 和 doctor metadata，输出检查证据、summary counts、blockers、warnings、安全说明和下一步命令，让调用方不用解析完整 dashboard 或 handoff payload |
| 可部署性 roadmap | 第四仓 | `corepack pnpm run deployability:roadmap`，以及作为管理 UI 和规划评审使用的只读 PRD milestone view 的 `corepack pnpm --silent run deployability:roadmap -- --json`；它把已满足、受 gate 保护、阻塞和规划中的 deployability 工作分开呈现，让 daily deployability 可见，但不夸大 public production readiness |
| 可部署性 operator status | 第四仓 | `corepack pnpm run deployability:status`，以及作为第一屏管理界面 compact operator status 的 `corepack pnpm --silent run deployability:status -- --json`；它把 readiness、roadmap 和 public-stack recipe 聚合成 status cards、primary next commands、source health 和 safety defaults，且不执行部署命令 |
| 可部署性 doctor | 第四仓 | `corepack pnpm run deployability:doctor`，以及作为 compatibility ledger、顶层 scripts、docs、brand-site 和 safety-contract 对齐状态只读快照的 `corepack pnpm --silent run deployability:doctor -- --json` |
| 可部署性 dashboard | 第四仓 | `corepack pnpm run deployability:dashboard`，以及作为顶层 dashboard 和 CI 的只读聚合 payload 的 `corepack pnpm --silent run deployability:dashboard -- --json`，组合 overview、quickstart、safety、doctor、compatibility、顶层 `profile_selector`、带共享 `attention` metadata 的派生 `profile_summaries`、顶层 `recommended_profile_keys`、ecosystem_readiness 和 per-pipeline summary sections；`--profile <key-or-alias>` 会输出聚焦 dashboard payload，包含 `profile_filter`、过滤后的命令目录、一个所属 pipeline summary 和一个 profile summary，同时让 ecosystem_readiness 保持全局 |
| 可部署性 action plan | 第四仓 | `corepack pnpm run deployability:action-plan`，以及作为只读 operator 下一步动作选择器的 `corepack pnpm --silent run deployability:action-plan -- --json`，把 dashboard readiness 和 command catalog posture 合成 profile 级 recommended commands、dashboard-safe commands、public-exposure gates、service-touching command lists、profile `attention` metadata 和顶层 `recommended_profile_keys`；`--list-profiles` / `--profiles` 输出只读 profile selector 目录，包含 keys、aliases、pipeline keys 和 purposes，且不调用 dashboard/catalog metadata；`--profile <key-or-alias>` 会把输出聚焦到单个 operator 目标，并把未知 profile 作为 blockers 返回 |
| 可部署性 profile catalog | 第四仓 | `corepack pnpm run deployability:profiles`，以及作为管理 UI、dashboard、CI 和 operator docs 使用的专用只读 profile-card catalog 的 `corepack pnpm --silent run deployability:profiles -- --json`；它从 dashboard `profile_summaries` 和共享第四仓 profile registry 派生 labels、aliases、pipeline keys、status、counts、安全说明、下一步命令、JSON 命令、共享 `attention` metadata 和 `recommended_profile_keys`；`--profile <key-or-alias>` 返回单个 profile，未知 profile 返回干净 blocker |
| 可部署性命令目录 | 第四仓 | `corepack pnpm run deployability:commands`，以及作为按 category、posture、首次使用 track 和 pipeline 过滤的只读命令目录的 `corepack pnpm --silent run deployability:commands -- --json`；`filters.profiles` 会输出可渲染 profile selector 的 keys、aliases、pipeline keys 和 purposes；`--profile <key-or-alias>` 会把 operator 熟悉的 profile 名称解析到所属 pipeline；带 profile 参数的命令变体会继承基础安全姿态；专用 profile catalog 和 action-plan profile selector 会出现在 `daily_dev` track；ready-now 命令路径不再出现 `unmapped` category / posture |
| 可部署性 profile runbook | 第四仓 | `corepack pnpm run deployability:runbook`，以及作为单个 profile 只读阶段化 runbook 投影的 `corepack pnpm --silent run deployability:runbook -- --json`；`--profile <key-or-alias>` 输出 `profile_runbook`，按 inspect、gate、start、verify、operate、evidence 阶段组织命令，并复用 profile catalog 与 command catalog metadata，不执行命令 |
| 可部署性 operator menu | 第四仓 | `corepack pnpm run deployability:menu`，以及作为人和管理 UI 第一屏只读 operator menu 的 `corepack pnpm --silent run deployability:menu -- --json`；`corepack pnpm run deployability:menu -- --profile public-stack` 和 `corepack pnpm --silent run deployability:menu -- --profile public-stack --json` 会聚焦 public-stack 第一屏；它把 profile choices、attention、primary command、runbook、action-plan、dashboard、handoff、command catalog 和 public-stack operator-onboarding 入口汇到一起，不执行命令；聚焦 public-stack 的 JSON 会包含来自 `operator:onboarding:plan` 的 `selected_onboarding_plan` |
| 可部署性 profile recipe | 第四仓 | `corepack pnpm run deployability:recipe -- --profile public-stack`，以及作为单个 profile 只读线性首次运行配方的 `corepack pnpm --silent run deployability:recipe -- --profile public-stack --json`；它把 readiness、menu、runbook 和 onboarding metadata 合成 inspect、gate、start、verify、operate、evidence 步骤，不执行命令 |
| 可部署性恢复证据路径 | 第四仓 | `deployability:overview`、`deployability:dashboard`、`deployability:handoff` 和 `deployability:commands -- --pipeline recovery_evidence` 把 ops-report、audit export、backup、restore 和 rotation 命令作为一条 ready-now 证据与恢复管线暴露 |
| 可部署性交接报告 | 第四仓 | `corepack pnpm run deployability:handoff`，以及用于输出 `exports/deployability/` 下不含 secret 的生态交接报告 metadata 的 `corepack pnpm --silent run deployability:handoff -- --json`，包含与 dashboard 相同的 profile selector 目录、派生 profile summaries 和 ecosystem_readiness scorecard；`--profile <key-or-alias>` 会为单个所属 pipeline 写出聚焦交接报告 |
| 日常本地 doctor | 第四仓 | `corepack pnpm run dev:doctor`，以及给 dashboard 和脚本使用的 `corepack pnpm --silent run dev:doctor -- --json` |
| Local agent loop 管理 metadata | 第四仓 | `corepack pnpm run dev:local:plan`、`dev:local:up`、`dev:local:status`、`dev:local:logs` 和 `dev:local:down`，并提供 `--json` 供 dashboard 和脚本消费 |
| Agent-facing smoke | 第四仓 | `corepack pnpm run test:agent-e2e` |
| Self-host 部署地图 | 第四仓 | `corepack pnpm run selfhost:profiles`，包含 `platform`、`public-stack` 和 `all-in-one` profiles |
| Self-host quickstart 序列 | 第四仓 | `corepack pnpm run selfhost:quickstart` |
| Self-host readiness 总览 | 第四仓 | `corepack pnpm run selfhost:readiness -- --all`，以及自动化使用的 `corepack pnpm --silent run ... --json` |
| Self-host 部署 doctor | 第四仓 | `corepack pnpm run selfhost:doctor`，以及用于诊断面板的 `--json` |
| Self-host env 生成器 | 第四仓 | `corepack pnpm run selfhost:init`，以及 `corepack pnpm --silent run selfhost:init -- --json`，用于输出 created/hardened `.env` metadata，且不打印 secret 值或 URL 文本 |
| Self-host profile plan | 第四仓 | `corepack pnpm run selfhost:plan`，以及用于生成文档和 dashboard 的 `--json` |
| Self-host profile 概要 | 第四仓 | `corepack pnpm run selfhost:summary`，以及用于概要卡片的 `--json` |
| Self-host URL inventory | 第四仓 | `corepack pnpm run selfhost:urls`，以及用于 dashboard 和脚本的 `--json` |
| Self-host 声明端口 inventory | 第四仓 | `corepack pnpm run selfhost:ports`，以及用于 dashboard 和脚本的 `--json` |
| Self-host ops handoff | 第四仓 | `corepack pnpm run selfhost:ops-report`，以及用于 dashboard 和管理脚本的 `--json` |
| Self-host preflight gate | 第四仓 | `corepack pnpm run selfhost:preflight`，以及用于部署控制器的 `--json` |
| Self-host runtime status | 第四仓 | `corepack pnpm run selfhost:status`，以及用于 dashboard 和管理脚本的 `--json` |
| Self-host smoke acceptance | 第四仓 | `corepack pnpm run selfhost:smoke`，以及用于 CI、dashboard 和管理脚本的 `--json` |
| Self-host compose config validation | 第四仓 | `corepack pnpm run selfhost:config`，以及用于 CI 和 dashboard 的 `--json` |
| Self-host security review | 第四仓 | `corepack pnpm run selfhost:security-review`，以及用于公开暴露 dashboard 的 `--json` |
| Self-host audit evidence export | 第四仓 | `corepack pnpm run selfhost:audit-export`，以及用于导出 metadata 的 `--json` |
| Self-host backup planning | 第四仓 | `corepack pnpm run selfhost:backup-plan`，以及用于恢复演练脚本的 `--json` |
| Self-host backup validation | 第四仓 | `corepack pnpm run selfhost:backup-validate`，以及用于恢复演练脚本的 `--json` |
| Self-host restore rehearsal | 第四仓 | `corepack pnpm run selfhost:restore-plan`，以及用于恢复演练脚本的 `--json` |
| Self-host 轮换计划与执行 metadata | 第四仓 | `corepack pnpm run selfhost:rotate-plan`，以及 `selfhost:rotate -- --json` / `selfhost:rotate -- --confirm --json`，用于安全 dry-run 和 confirmed rotation metadata |
| Compose 生命周期 wrapper | 第四仓 | 委托到 `repos/platform/deploy/*`；`selfhost:up -- --json`、`selfhost:logs -- --json` 和 `selfhost:down -- --json` 输出不含 raw compose stdout 的命令 metadata |
| Published-image smoke wrapper | 第四仓 | 委托到 `repos/platform` 的 public-stack smoke；`published-image:plan -- --json` 和 `published-image:smoke -- --dry-run --json` 供 release dashboard 和管理脚本消费 |
| Operator onboarding contract | 第四仓 | `operator:onboarding:check` 校验 public-stack/brand-site/runbook 一致性；`operator:onboarding:check -- --json` 给 CI 和 dashboard 输出检查结果与 blockers |
| Public stack deploy manifest | `repos/platform` | 现有 `deploy/public-stack` |
| Billing admin read model | `repos/platform` | admin-only tenant、balance、recharge、ledger endpoints 和 Platform Console 管理页 |
| Runtime console | `repos/client` / `repos/platform` | 状态、日志、设置、审批 |
| 品牌解释 | `repos/brand-site` | 可部署性叙事和 quick-start 入口 |

## 7. 安全默认值

基础要求：

- 自动生成 `TOKEN_SECRET`、`PLATFORM_ADMIN_API_KEY`、console bootstrap secret
- 如果仍有 `change-me` 默认值，要 warning 或 fail
- public stack 不能在 admin secret / bootstrap secret 缺失时被标成 ready
- 文档里明确 local/public 边界
- health check 不泄漏 secrets
- logs/status 命令帮助定位问题，但不 dump `.env`
- runtime status 可以机器读取，供 dashboard 消费，但不泄漏 secret 值
- compose config validation 可以机器读取，但省略可能包含环境值的 compose stdout
- logs metadata 可以机器读取，但省略 raw log stdout，因为应用日志可能包含敏感值
- stop-command metadata 可以机器读取，但省略 compose down stdout，因为 compose
  输出可能包含敏感值
- startup metadata 可以机器读取，但省略 init、preflight 和 compose up stdout，因为
  命令输出可能包含敏感值
- env 初始化 metadata 可以机器读取，输出 created/hardened `.env` 文件、secret
  hygiene 状态、warnings 和下一步命令，但不打印生成后的 secret 值或 profile URL 文本
- smoke metadata 可以机器读取，但省略展开后的 compose config stdout，因为它可能包含环境值
- audit export metadata 可以机器读取，但不打印 admin key 或导出的 audit body
- local agent loop log metadata 可以机器读取，但不打印本地 relay 或 supervisor
  raw log lines
- local agent loop startup / stop metadata 可以机器读取，但省略 child command stdout，
  因为本地 bootstrap 和停止输出可能包含环境相关 runtime 细节
- secret rotation metadata 可以机器读取，输出 dry-run / confirmed 状态、changed
  files、backup path 和下一步命令，但不打印轮换后的 secret 值
- 日常本地 doctor metadata 可以机器读取，输出 prerequisites、runtime health、
  caller-skill 检查、blockers 和下一步命令，但不打印 raw logs 或 secret 值
- 可部署性总览 metadata 可以机器读取，列出 pipelines、命令、JSON 入口、安全说明和
  下一步命令，但不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- 可部署性 quickstart metadata 可以机器读取，列出首次使用 tracks、有序命令、JSON
  入口、安全说明和下一步命令，但不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、
  不打印 secret 值
- 可部署性安全矩阵 metadata 可以机器读取，列出命令分类、read/write/startup/network/logging
  姿态、CI / dashboard 适用性、安全说明和下一步命令，但不读取 `.env`、不调用 Docker、
  不绑定端口、不探测网络、不打印 secret 值
- 可部署性 doctor metadata 可以机器读取，输出 compatibility ledger、scripts、
  文档、brand-site file alignment、brand-site deployability content smoke 和
  safety-contract 检查、blockers、warnings 和下一步命令，但不读取 `.env`、
  不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- 兼容状态 metadata 可以机器读取，输出当前 bundle、submodule SHAs、ledger matches、
  dirty submodules、blockers、warnings 和下一步命令，但不读取 `.env`、不调用 Docker、
  不探测网络、不打印 secret 值
- 可部署性 dashboard metadata 可以机器读取，把 overview、quickstart、safety、
  doctor、compatibility、顶层 `profile_selector`、ecosystem_readiness 和
  per-pipeline summary JSON sections 聚合成一个顶层 payload，但不读取 `.env`、
  不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- 可部署性 action-plan metadata 可以机器读取，把 dashboard 和命令目录合成
  profile 级 recommended commands、dashboard-safe commands、public-exposure gate
  commands、service-touching commands、safety notes、next JSON commands、
  profile `attention` level / rank metadata、primary next commands 和顶层
  `recommended_profile_keys`，但不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、
  不打印 secret 值
- 可部署性 action-plan profile-list metadata 可以机器读取，输出支持的 profile
  keys、aliases、pipeline keys 和 purposes；该模式不调用 dashboard/catalog
  metadata、不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- 可部署性 profile catalog metadata 可以机器读取，提供专用
  `deployability:profiles` 管理 payload，包含 labels、aliases、所属 pipeline keys、
  status、counts、next commands、next JSON commands、safety notes、共享
  `attention` metadata、顶层 `recommended_profile_keys` 和未知 profile blockers；
  这些字段从 dashboard `profile_summaries` 和共享第四仓 profile registry 派生，
  不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- quickstart、safety 和 command-catalog metadata 可以机器读取，把专用 profile
  catalog 和 action-plan profile selector 作为 first-use、read-only、
  dashboard-safe 的顶层命令暴露出来，让 operator 先选择 profile，再进入聚焦
  action plan
- ecosystem_readiness metadata 可以机器读取，把 daily-deployable 定义转成
  dashboard 和 handoff scorecard，覆盖 profile 选择、生成 secrets、启动路径、
  doctor 路径、runtime inspection、边界理解和 brand-site 叙事；所有检查通过时报告
  daily_deployable_with_safety_gates，而不是宣称无需 gate 的公网生产 ready
- `deployability:overview`、`deployability:dashboard` 和 `deployability:handoff`
  共用第四仓 pipeline summary metadata，让命令数、JSON 入口数、dashboard-safe 数、
  CI-safe 数、public exposure gate 数、下一步命令和安全说明在不同 surfaces 间保持一致
- all-in-one demo metadata 可以机器读取，把现有 `all-in-one` selfhost profile
  暴露为本地评估路径，让带 profile 参数的命令变体继承 selfhost safety posture，
  同时避免把它表达成公网暴露或正式 production readiness
- 可部署性命令目录 metadata 可以机器读取，把 overview、quickstart 和 safety
  metadata 合并成可过滤命令列表，并通过 `filters.profiles` 输出支持的 profile
  keys、aliases、所属 pipeline keys 和 purposes；`--profile <key-or-alias>` 是
  pipeline filter 的 operator-friendly alias 层，未知 profile 返回干净 blocker
  而不是回退到全量命令；带 profile 参数的命令变体会继承基础安全姿态，并为本地
  doctor / acceptance 与真实 published-image smoke 命令给出 `runtime_diagnostic`、
  `runtime_acceptance` 和 `delegated_smoke` 明确姿态，但不读取 `.env`、
  不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- dashboard 与 handoff profile selector metadata 可以机器读取，会把同一份命令目录
  `filters.profiles` 目录提升为顶层 `profile_selector` 字段，让管理面不需要知道
  内部 section 路径，也不需要调用 runtime 命令，就能渲染 profile 选择器
- dashboard 与 handoff profile filtering metadata 可以机器读取，支持
  `--profile <key-or-alias>`，复用命令目录 resolver，输出 `profile_filter`，
  把命令目录和 pipeline summary metadata 限制到所属 pipeline，把未知 profile
  报成 blockers，并让 ecosystem_readiness 继续表示全局 daily-deployable scorecard；
  focused dashboard 与 handoff 命令可从 quickstart 和命令目录发现
- dashboard 与 handoff 的 `profile_summaries` metadata 可以机器读取，由
  `profile_selector`、`pipeline_summaries` 和 command-catalog posture 派生，让管理 UI
  可以渲染 profile cards、按共享 `attention.rank` 排序、突出
  `attention.level=safety_gate`，并消费顶层 `recommended_profile_keys`，不需要自己
  join 数组或重新推断风险；这是便利投影，不是新的 profile 真相来源
- 可部署性 profile runbook metadata 可以机器读取，把单个选定 profile 投影成
  `profile_runbook`，按 inspect、gate、start、verify、operate、evidence 阶段组织
  命令。runbook 是 profile catalog 与 command catalog 的投影，不是 runner；它让
  public exposure gate 位于 start 之前，未知 profile 返回干净 blocker，同时不读取
  `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- 可部署性 operator menu metadata 可以机器读取，把 profile choices、attention level、
  primary command、runbook、action-plan、dashboard、handoff、command catalog 和
  public-stack operator-onboarding 入口汇成第一屏。menu 是现有 deployability
  metadata 的便利投影，不是新的真相来源；`corepack pnpm run deployability:menu -- --profile public-stack` /
  `corepack pnpm --silent run deployability:menu -- --profile public-stack --json`
  输出会包含 selected runbook，聚焦 public-stack 的输出还会包含来自只读
  `operator:onboarding:plan` 投影的 `selected_onboarding_plan`，让管理 UI 不需要第二次
  查找也能渲染 preflight、`/console/` setup、gateway credential setup、
  smoke/evidence 和 onboarding contract validation。未知 profile 返回干净 blocker，
  并且不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- 可部署性交接 metadata 可以机器读取，并配套不含 secret 的 Markdown 报告，聚合
  当前 bundle、兼容 warnings、命令地图、profile selector、ecosystem_readiness、
  shared per-pipeline summaries、安全说明和下一步验证命令，但不读取 `.env`、
  不调用 Docker、不探测网络、不打印 secret 值
- 可部署性 roadmap metadata 可以机器读取，输出 PRD milestones、
  satisfied/gated/blocked/planned 状态、evidence commands、PRD sources、
  remaining work、source status 和 next commands，同时不读取 `.env`、不调用 Docker、
  不绑定端口、不探测网络、不打印 secret 值
- recovery evidence metadata 可以机器读取，把现有 ops-report、audit-export、
  backup-plan、backup-validate、restore-plan、rotate-plan 和 rotate 命令暴露成
  `recovery_evidence` 管线，并给出 `writes_report`、`exports_evidence`、
  `read_only` 和 `writes_env` 姿态标签，同时 JSON 不打印 secret 值

## 8. 成功指标

- fresh checkout 可以运行 `deployability:overview`、
  `deployability:overview -- --json`、`deployability:quickstart`、
  `deployability:quickstart -- --json`、`deployability:safety`、
  `deployability:safety -- --json`、`deployability:doctor`、
  `deployability:doctor -- --json`、`deployability:dashboard`、
  `deployability:dashboard -- --json`、`deployability:action-plan`、
  `deployability:action-plan -- --json`、`deployability:profiles`、
  `deployability:profiles -- --json`、`deployability:profiles -- --profile public-stack`、
  `deployability:action-plan -- --profile public-stack`、
  `deployability:action-plan -- --list-profiles`、
  `deployability:action-plan -- --list-profiles --json`、
  `deployability:action-plan -- --profile public-stack --json`、`deployability:commands`、
  `deployability:commands -- --json`、`deployability:commands -- --profile public-stack`、
  `compat:status`、`compat:status -- --json`、
  `deployability:handoff`、`deployability:handoff -- --json`、`test:deployability`、
  `test:deployability-operations`、
  `deployability:commands -- --pipeline recovery_evidence`、
  `deployability:commands -- --pipeline local_agent_loop`、
  `deployability:commands -- --pipeline published_image`、
  `dev:local:plan -- --json`、
  `dev:local:up -- --json`、`dev:local:status -- --json`、
  `dev:local:logs -- --json`、`dev:local:down -- --json`、
  `selfhost:profiles`、`selfhost:quickstart`、
  `selfhost:readiness -- --all`、`selfhost:readiness`、`selfhost:doctor`、
  `selfhost:init`、`selfhost:init -- --json`、`selfhost:summary`、
  `selfhost:preflight`、`selfhost:status`、
  `selfhost:status -- --json`、`selfhost:up -- --json`、`selfhost:logs -- --json`、
  `selfhost:down -- --json`、`selfhost:smoke -- --json`、`dev:doctor`、
  `dev:doctor -- --json`、`corepack pnpm run deployability:readiness`、
  `corepack pnpm --silent run deployability:readiness -- --json`、
  `corepack pnpm run deployability:roadmap`、
  `corepack pnpm --silent run deployability:roadmap -- --json`、
  `corepack pnpm run deployability:status`、
  `corepack pnpm --silent run deployability:status -- --json`、
  `test:agent-e2e`、`mcp:golden-four`、`published-image:plan -- --json`、
  `published-image:smoke -- --dry-run --json`、`published-image:smoke -- --image-tag <candidate-tag>`、
  `selfhost:security-review`、`selfhost:audit-export -- --json`、`selfhost:backup-plan`、
  `selfhost:restore-plan`、`selfhost:rotate-plan`、`operator:onboarding:check`
  和 `operator:onboarding:check -- --json`
- platform billing operator 已有 admin-only API 和 Platform Console 页面，可做
  tenant setup、balance inspection、人工 recharge capture 和 ledger 浏览；终端用户
  billing 仍不进入 ready 结论
- PRD、runbook、README、brand-site 使用同一套 profile 命名
- 增加编排 helper 后，第四仓 CI 仍然绿色
- 更新品牌站文案后，brand-site build 仍然绿色

## 9. 里程碑

### M1：管理骨架

- 增加 PRD。
- 增加 self-host env / lifecycle helper。
- 更新日常 runbook 和 readiness 文档。
- 更新 brand-site 文案，解释新的部署哲学。

### M2：一命令 profile launcher

- 增加 profile-specific `up/down/logs/status` wrapper。
- 增加 `selfhost:up -- --json`，让 dashboard 和管理脚本消费 startup preflight、
  compose-up status、blockers 和 notes，而不是嵌入 init、preflight 或 Docker compose up stdout。
- 增加 `selfhost:logs -- --json`，让 dashboard 和管理脚本读取 log command
  execution、service filter、tail size 与 stderr metadata，而不是嵌入 raw application log stdout。
- 增加 `selfhost:down -- --json`，让 dashboard 和管理脚本读取 stop command
  execution、exit status、blockers 与 stderr metadata，而不是嵌入 raw Docker compose down stdout。
- 每个 profile 增加 smoke check，并增加 `selfhost:smoke -- --json`，让 CI、
  dashboard 和管理脚本消费启动后的 secret hygiene、compose config、public route
  contract、health endpoint、blockers 和 notes metadata，而不是嵌入展开后的
  compose config stdout。
- 对不安全 secrets 给出明确失败信息。

### M3：Console 管理能力对齐

- 在 console surface 展示 runtime status、logs、approval policy、adapter health、billing readiness。
- 增加 operator-first public-stack onboarding checks。
- 在暴露 client-facing billing workflow 前，先补 platform-owned billing admin read model。
- 通过 gateway proxy 把这批 billing read model 暴露为 Platform Console 的 admin-only
  operator 页面，同时不把 admin key 泄漏到浏览器。
- public-stack `/console/`、gateway session flow 与 brand-site Operator Onboarding 叙事保持一致。

### M4：生产硬化

- 增加 backup/restore、secret rotation、audit export、public-stack security review gates。
- 先补一个非破坏性的 `selfhost:security-review` gate，在公网暴露前验证 secret
  hygiene、compose config、public route contract，以及 backup / rotation / smoke
  这些 operator 前置动作。增加 `--json`，让 dashboard 和部署控制器不解析终端文本也能消费
  同一组 public exposure blockers 和 safety notes。
- 增加 `selfhost:plan -- --json`，让生成文档、dashboard 和脚本能消费与终端输出一致的
  只读 profile purpose、services、URLs 和 safety checks。
- 增加 `selfhost:audit-export`，让 operator 能把 platform admin audit events 保存成
  本地 JSON 证据，同时不在终端打印 admin key。增加 `--json`，让 dashboard、CI
  和管理脚本消费 source URL、output path、limit、item count 和 safety notes，
  同时不打印 admin key 或导出的 audit body。
- 增加 `selfhost:ops-report`，让 operator 可以交接一份 Markdown profile 摘要，
  其中包含 URLs、host ports、安全状态和后续命令，但不包含 secret 值。增加
  `--json`，让 dashboard 和管理脚本消费同一组不含 secret 的 handoff 数据，而不必解析
  Markdown。
- 增加 `selfhost:urls`，让 operator 在启动前看清 profile 声明的 URLs 和
  public-stack routes，并用 `--json` 供 dashboard 和部署脚本消费。
- 增加 `selfhost:ports`，让 operator 在启动 profile 或暴露 public-stack 前先看清
  声明的 host ports，并用 `--json` 供 dashboard 和部署脚本消费。
- 增加 `selfhost:preflight -- --json`，让部署控制器消费与 `selfhost:up` 启动前
  相同的 secret hygiene、compose config、routes、blockers 和 safety notes gate。
- 增加 `selfhost:status -- --json`，让 dashboard 和管理脚本能消费 runtime Docker
  compose service state、secret hygiene 状态、health endpoint checks、blockers 和
  safety notes，而不解析终端文本、不打印 secret 值。
- 增加 `selfhost:config -- --json`，让 CI、dashboard 和管理脚本能消费 compose config
  pass/fail、blocker 和 stderr metadata，同时不包含可能带环境值的展开后 compose stdout。
- 增加 `selfhost:summary`，让 operator 用一屏只读输出看清 deploy 路径、URLs、
  声明的 host ports、secret hygiene 状态和下一步命令。
- 增加 `selfhost:doctor` 作为最早的只读部署诊断，覆盖本地工具、profile 文件、
  `.env` 是否存在，以及 secret / public-origin hygiene，并用 `--json` 供诊断面板和部署脚本消费。
- 增加 `selfhost:profiles` 作为只读部署地图，展示内置 profiles、deploy 目录、
  services、声明 host ports 和对应 doctor 命令。
- 增加 `selfhost:quickstart` 作为选定 profile 的只读复制粘贴序列，覆盖 public-stack
  安全复核和交接证据步骤。
- 增加 `selfhost:init -- --json`，让首次启动 dashboard、CI 和部署脚本消费
  created/hardened `.env` metadata、secret hygiene 状态、warnings 和下一步命令，
  同时不解析终端文本、不打印 secret 值。
- 增加 `selfhost:readiness` 作为只读部署就绪总览，合并 profile 文件、`.env`
  状态、secret hygiene、public-stack origin / route 阻断项、URLs、声明 host ports
  和下一步命令。增加 `selfhost:readiness -- --all` 作为内置多 profile readiness 矩阵，
  并让两种形式都支持通过 `corepack pnpm --silent run` 输出 `--json`，供 CI、
  dashboard 和管理脚本消费且保持 stdout 为干净 JSON。
- 要求 operator onboarding contract 把 `selfhost:readiness`、`selfhost:ports` 和
  `selfhost:ops-report` 纳入 public-stack 首次使用路径，避免交接顺序退回只有终端启动和
  smoke 的状态。
- 增加 `selfhost:backup-plan -- --json`，让 dashboard、CI 和恢复演练脚本能消费生成的
  backup directory、有序备份步骤、下一步校验命令和 safety notes，同时不复制文件、
  不 dump 数据库、不读取 secret 值。
- 增加 `selfhost:backup-validate`，让恢复演练先基于已检查的 backup directory
  形状开始，同时不读取或打印 `.env` secrets。增加 `--json`，让恢复演练脚本消费
  file status、blockers、下一步 restore-plan 命令和 safety notes。
- 增加 `selfhost:restore-plan`，让 backup artifact 在任何破坏性恢复动作前有一条
  可见的恢复演练路径。增加 `--json`，让 dashboard 和恢复演练脚本能渲染同一组有序步骤，
  但不执行这些步骤。
- 增加 `selfhost:rotate-plan -- --json`，让 dashboard、CI 和 operator runbook
  能消费 backup-first、dry-run、confirm、restart、smoke 验证这些 secret rotation
  checklist，同时不读取或修改 `.env`。
- 增加 `selfhost:rotate -- --json` 和 `selfhost:rotate -- --confirm --json`，
  让 dashboard、CI 和 operator runbook 能消费 dry-run rotation intent 和
  confirmed rotation artifact metadata，同时不解析终端文本、不打印轮换后的 secret 值。
- 把现有 ops-report、audit export、backup、restore 和 rotation controls 暴露为
  一条一等 `recovery_evidence` deployability 管线，让 operator 能从顶层命令地图
  过滤并交接恢复就绪状态。
- 已发布镜像 smoke 先以第四仓 wrapper 形式接入，正式 image build/publish/release gate 仍归 `repos/platform`。
