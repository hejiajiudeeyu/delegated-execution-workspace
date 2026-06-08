# main 就绪清单

> 英文版：[./main-readiness.md](./main-readiness.md)
> 说明：中文文档为准。

更新日期：2026-06-08

## 目的

本文记录第四仓 `main` 分支及其固定子模块组合的当前就绪判断。

第四仓是兼容性台账和本地编排工作区。这里的绿色结论表示当前
protocol/client/platform SHA 组合可用于本地跨仓开发和已认证的源码集成路径。
它不替代三个正式仓库各自拥有的 release gate。

## 当前固定组合

- `repos/protocol`：`da3027100cfe9391f7f8d03be18a108ee2804cf6`
- `repos/client`：`f1d6a2d8c9b83517cdf6ca9803b223847f880e9a`
- `repos/platform`：`5961309c6b0ca4e8df22dbb5be92ac0845bf8d25`
- `repos/brand-site`：`46d71b8c7e0b9848229f56edf8edf0dad316b2dd`

当前 bundle 为 `changes/CHG-2026-097.yaml`。

## 当前判断

CHG-2026-097 收口后，当前固定组合已经可以用于日常第四仓开发：

- submodule SHA 完整性已验证
- 边界治理已覆盖新的 platform billing data package
- change bundle 校验通过
- protocol/client/platform 包形态与 deploy-contract 检查通过
- 源码集成路径端到端成功
- ops-console 已出现部署与管理可理解性 surface，并补上 adapter health、
  approval policy posture 和 billing readiness 显式可见性
- public-stack smoke 已补上 public route contract 检查，不只依赖通用
  health endpoint 可达性
- `selfhost:security-review` 已成为非破坏性的公开暴露前安全复核 gate，覆盖
  secret hygiene、compose config、route contract 和 backup / rotation / smoke
  前置动作
- `selfhost:audit-export` 已成为本地 JSON 审计证据导出 helper，调用现有
  platform admin audit endpoint，但不打印 admin key，并支持 `--json` 输出不含导出
  audit body 的 metadata
- `selfhost:ops-report` 已成为不含 secrets 的 Markdown 运维交接报告，记录
  URLs、host ports、secret hygiene 状态和后续命令，并支持 `--json` 供 dashboard
  和管理脚本消费
- `selfhost:status` 已成为启动后的 runtime 管理快照，并支持 `--json` 输出 Docker
  compose service state、secret hygiene 状态、health endpoint checks、blockers 和
  safety notes，同时不打印 secret 值
- `selfhost:up` 已成为受 preflight 保护的选定 profile 启动命令，并支持 `--json`
  输出 init、preflight、compose-up、blocker 和 note metadata，同时省略可能包含敏感值的
  命令 stdout
- `selfhost:logs` 已成为私有 operator 终端的 raw logs 视图，并支持 `--json`
  输出 command metadata、service/tail filters、exit code 和 stderr metadata，同时
  省略 raw log stdout，因为应用日志可能包含敏感值
- `selfhost:down` 已成为选定 profile 的停止命令，并支持 `--json` 输出 command
  metadata、exit code、blockers 和 stderr metadata，同时省略 compose down stdout，
  因为 compose 输出可能包含敏感值
- `selfhost:config` 已成为 compose config validation 命令，并支持 `--json` 输出
  pass/fail、blocker 和 stderr metadata，同时省略可能包含环境值的展开后 compose stdout
- `selfhost:ports` 已成为非破坏性的声明 host port 清单，让 operator 在启动
  self-host profile 前先看清端口占用
- `selfhost:summary` 已成为只读的一屏 profile 概要，让 operator 在启动 Docker
  或写交接报告前先看清 deploy 路径、URLs、声明 host ports、secret hygiene 状态和
  下一步命令
- `selfhost:doctor` 已成为最早的只读部署诊断命令，覆盖本地工具、profile 文件、
  `.env` 是否存在，以及 secret / public-origin hygiene
- `selfhost:profiles` 已成为只读部署地图，展示内置 profiles、deploy 目录、
  services、声明 host ports 和对应 doctor 命令
- `selfhost:plan` 已成为选定 profile 的只读部署地图，展示 purpose、deploy 路径、
  services、URLs、安全检查和 notes，并支持 `--json` 供生成文档、dashboard 和管理脚本消费
- `selfhost:quickstart` 已成为只读的复制粘贴命令序列，按选定 profile 输出
  public-stack 安全复核和交接证据步骤
- `selfhost:readiness -- --all` 已成为只读多 profile readiness 矩阵，
  `selfhost:readiness` 继续作为选定 profile 的 readiness 总览；两者都支持
  通过 `corepack pnpm --silent run` + `--json` 以相同 exit-code 语义输出机器可读自动化结果
- `selfhost:backup-plan` 已成为非破坏性的备份 checklist，并支持 `--json` 输出机器可读的
  backup directory、有序步骤、下一步校验命令和 safety notes
- `selfhost:backup-validate` 已成为非破坏性的 backup artifact 形状检查命令，让
  operator 在恢复演练前先确认文件存在与大小
- `selfhost:restore-plan` 已成为非破坏性的恢复演练命令，让 operator 在任何
  恢复动作触碰 live data 前先明确恢复顺序
- `selfhost:rotate-plan` 已成为非破坏性的 secret rotation checklist，并支持
  `--json` 输出机器可读的 backup-first、dry-run、confirm、restart、smoke 验证步骤和
  safety notes
- `selfhost:rotate` 已支持 `--json` 输出机器可读的 dry-run 和 confirmed rotation
  metadata，记录 rotated-key 名称、changed files、backup path、restart / smoke
  下一步命令和 safety notes，但不打印 secret 值
- MCP host golden-four 验证已经脚本化，包含第四仓可执行 smoke 和确定性的
  单元式 harness
- brand-site 已有中英双语 Deployability Profiles 文档页，解释部署 profiles、
  ready / planned 边界、secrets 安全默认值、operator-only Billing console 切片和
  profiles / quickstart / readiness / doctor / summary / security-review / audit-export /
  ports / ops-report / backup-validate / restore-plan / rotate-plan / rotate-json gate、
  pipeline_summaries 和 profile-specific command variants 的 inherited safety posture
- 一键本地栈 bootstrap 已通过托管式 `dev:local:*` 命令可用，并为 plan / up /
  status / logs / down 提供 `--json` metadata，让 dashboard 和脚本不用解析终端文本、
  不打印 raw log lines，也不嵌入 child command stdout
- `dev:doctor -- --json` 已成为日常本地 agent/caller-skill 诊断的机器可读输出，
  覆盖 prerequisites、runtime health、caller-skill manifest / search 检查、blockers
  和下一步命令，同时不打印 raw logs 或 secret 值
- `deployability:overview` 已成为 Local Agent Loop、Selfhost Platform、Public Stack、
  Operator Onboarding 和 Published Image 路径的只读第一张命令地图，并支持
  `--json`，同时不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- `deployability:quickstart` 已成为 fresh checkout 的只读首次使用指南，会列出
  Daily Development、Selfhost Platform、Public Stack 和 Release Review tracks、
  有序命令和 JSON 入口，同时不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、
  不打印 secret 值
- `deployability:safety` 已成为只读安全姿态矩阵，用来说明 deployability、
  selfhost、dev 和 release 命令是否会写文件、启动或停止服务、调用 Docker、
  探测网络、打印私有终端文本或承担公网暴露 gate，并支持 `--json`，同时不读取
  `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- `deployability:doctor` 已成为只读 deployability readiness 快照，用来检查
  compatibility ledger、顶层 scripts、文档、brand-site file alignment、
  brand-site deployability content smoke 和 safety-contract 是否对齐，并支持
  `corepack pnpm --silent run deployability:doctor -- --json`，同时不读取
  `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- `deployability:dashboard` 已成为给 dashboard 和 CI 使用的只读聚合 payload，
  会组合 overview、quickstart、safety、doctor、compatibility sections 和
  per-pipeline summaries，并支持
  `corepack pnpm run deployability:dashboard` 和
  `corepack pnpm --silent run deployability:dashboard -- --json`，同时不读取 `.env`、
  不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- `deployability:overview`、`deployability:dashboard` 和 `deployability:handoff`
  已共用一个第四仓 pipeline summary metadata builder，并通过一致性测试保持命令数、
  JSON 入口数、dashboard-safe 数、CI-safe 数和 public exposure gate 数对齐
- `deployability:commands` 已成为给人、dashboard 和 CI 使用的只读命令目录，
  会把 overview、quickstart 和 safety metadata 合并成可按 category、posture、
  首次使用 track 和 pipeline 过滤的列表，并让带 profile 参数的命令变体继承基础安全姿态，
  并支持 `corepack pnpm run deployability:commands`
  和 `corepack pnpm --silent run deployability:commands -- --json`，同时不读取 `.env`、
  不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- `compat:status` 已成为只读兼容台账快照，会把最新 bundle SHAs 和当前 submodule
  gitlinks 做对齐检查，把 dirty submodule worktree 报成 warnings，并把 ledger mismatch
  或 dirty gitlink marker 保持为 blockers，同时不读取 `.env`、不调用 Docker、不探测网络、
  不打印 secret 值
- `deployability:handoff` 已成为不含 secrets 的生态级交接报告，会写入
  `exports/deployability/`，聚合当前 bundle metadata、兼容 warnings、命令地图、
  shared per-pipeline summaries、安全说明和下一步验证命令，并支持 `--json`，同时不读取
  `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- call-anything-brand-site Deployability Profiles 已说明 dashboard 和 handoff 共用的
  `pipeline_summaries` contract，包括 catalog、CI-safe、dashboard-safe、public
  exposure gate、next command 和 next JSON command 字段
- published-image smoke 已有第四仓入口，能审阅 public-stack release images，
  并以 `COMPOSE_NO_BUILD=true` 委托平台仓库 smoke 验证已发布镜像
- platform-first/operator-first onboarding 已有第四仓契约检查，能验证
  public-stack `/console/`、gateway session flow、platform docs、brand-site
  叙事、source fallback runbook、readiness 总览、声明 host-port 盘点和不含 secrets
  的 ops 交接报告保持一致
- Billing P-1 已有 admin-only API/read-model 切片，覆盖 tenant 创建、balance
  查询、人工 recharge capture 和 ledger 浏览
- Platform Console 已通过 gateway proxy 暴露 operator-only `/billing` 管理页面，
  用来管理这批 billing read model

这个结论是有边界的。Billing P-1 M1.2 在持久化和 schema 基础上增加了
admin-only platform API/read model 和 operator-only console surface，但还不等于
billing 已经成为完整的 client-facing 或终端用户默认路径。

## 2026-06-07 验证事实

当前固定组合上，以下第四仓必跑 gate 已通过：

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

实际结果：

- `check:submodules`：通过
- `check:boundaries`：通过，已把 `@delexec/billing-store` 归入
  `platform/data`
- `check:bundles`：通过，使用 `CHG-2026-097`
- `test:contracts`：通过，platform package validation 已识别
  `@delexec/billing-store` 和 `@delexec/platform-api` dependency graph
- `test:integration`：通过，完整 request/response 路径成功
- `test:agent-e2e`：通过，脚本已改为当前 `/skills/caller/*` 接口面
- `dev:doctor`：通过，当前本地日常 agent/caller-skill 栈健康；`dev:doctor -- --json`
  现在会输出干净的机器可读诊断，不混入 `[ok]` / `[fail]` 终端文本或 secret 值
- `deployability:overview -- --json`：通过，输出五条可部署性路径、人工命令、
  JSON 入口、安全默认值和下一步命令，不混入 `[ok]` / `[fail]` 终端文本或 secret 值
- `deployability:quickstart -- --json`：通过，输出四条首次使用路径、有序命令、
  JSON 入口、安全默认值和下一步命令，不混入终端文本或 secret 值
- `deployability:safety -- --json`：通过，输出 deployability、selfhost、dev 和
  release 命令的 read/write/startup、Docker、network、private-terminal-text、
  public-exposure-gate、CI-safe 和 dashboard-safe 姿态，不混入终端文本或 secret 值
- `deployability:doctor -- --json`：通过，输出 compatibility ledger、顶层 scripts、
  文档、brand-site file alignment、brand-site content smoke 和 safety-contract
  checks、warnings、blockers、evidence、安全默认值和下一步命令，不混入终端文本或
  secret 值
- `deployability:dashboard -- --json`：通过，输出 overview、quickstart、safety、
  doctor 和 compatibility sections、section status、blockers、warnings、安全默认值
  、per-pipeline summaries 和下一步命令，不混入终端文本或 secret 值
- `test:deployability-pipeline-summaries`：通过，证明 dashboard 和 handoff 输出同一份
  shared `pipeline_summaries` payload
- `test:deployability`：通过，用一条命令运行 overview、quickstart、safety、doctor、
  dashboard、pipeline-summary 一致性、命令目录、handoff 和 compatibility status
  顶层 deployability regression suite
- `test:deployability-operations`：通过，用一条命令运行 daily local doctor、
  local-stack lifecycle metadata、self-host kit 行为、published-image smoke 编排和
  operator onboarding contract tests 组成的 operator-facing 部署与管理回归套件
- `deployability:overview -- --json` / `deployability:safety -- --json` /
  `deployability:commands -- --json`：通过，aggregate regression gate 和
  operations regression gate 已能从 next commands、明确的 top-level
  `contract_test` safety posture 和可搜索命令目录中发现
- `deployability:commands -- --json`：通过，输出命令目录及 category、posture、track
  和 pipeline filters，来源于 overview、quickstart 和 safety metadata，并让带
  profile 参数的命令变体继承基础安全姿态，不混入终端文本或 secret 值
- `compat:status -- --json`：通过，报告当前 bundle 与当前
  protocol/client/platform/brand-site gitlinks 匹配；同时把既有 dirty submodule
  worktree 作为 warnings 暴露，而不是误判为 ledger blockers
- `deployability:handoff -- --json`：通过，会在 `exports/deployability/` 下写入
  Markdown 交接报告，同时返回当前 bundle、compatibility、command-map、
  shared per-pipeline summaries、安全说明和下一步验证 metadata，不混入终端文本或 secret 值
- `selfhost:profiles` / `selfhost:quickstart` / `selfhost:readiness -- --all` /
  `selfhost:readiness` / `selfhost:doctor` / `selfhost:init` / `selfhost:init -- --json` /
  `selfhost:plan` / `selfhost:summary` / `selfhost:urls` / `selfhost:preflight`：已新增为
  self-host 管理骨架，用于发现 profile、复制粘贴启动序列、只读 readiness 矩阵和
  单 profile 总览、部署诊断、生成 env 与机器可读 created/hardened `.env` metadata、
  输出选定 profile 部署地图、一屏 profile 概要、
  发现 URLs，并在 `up`
  前检查 routes、compose config 和 secret hygiene
- `selfhost:smoke`：local `platform` profile 已通过；`public-stack` 现在会输出
  并验证 edge route contract，且在 public origin 仍为 localhost 或栈未启动时会按预期失败
- `test:selfhost-kit`：通过，用临时 profile 覆盖 env 生成、不泄漏 secret 值或 URL
  文本的 init JSON metadata、只读 profile map 输出、
  只读 doctor 输出、只读 quickstart 序列、只读 readiness 矩阵和总览、secret rotation dry-run /
  confirm 行为、rotate JSON metadata、一屏 summary 输出、public-stack preflight safety、非破坏性
  security review、不泄漏 secret 的 admin audit export、restore planning 和 public
  route-contract smoke 输出
- `test:mcp-golden-four`：通过，用 fake MCP streamable HTTP host 覆盖可执行
  golden-four smoke，并检查不会泄漏 secret env 值
- `test:local-stack`：通过，覆盖一键本地栈命令顺序、托管进程 status/log 行为、
  JSON plan / up / status / log / down metadata 和 secret-leak guard
- `published-image:plan -- --json` / `published-image:smoke -- --dry-run --json`：通过，
  覆盖 public-stack release image registry/tag 可见性、`COMPOSE_NO_BUILD=true`
  委托命令、strict smoke 默认值和机器可读 release-plan / dry-run smoke metadata
- `published-image:smoke -- --image-tag latest`：通过，`repos/platform`
  public-stack smoke 以 `mode=published_image` 启动，gateway proxy 场景成功并清理 compose
- `test:published-image-smoke`：通过，用 fake platform repo 覆盖 compose image
  模板校验、dry-run 委托和 secret-leak guard
- `operator:onboarding:check`：通过，验证 public-stack `/console/` 与
  `/gateway/*` route contract、`PLATFORM_CONSOLE_BOOTSTRAP_SECRET`、platform
  operator guide、brand-site Deployability Profiles 和第四仓 source fallback
  runbook 叙事、`selfhost:readiness`、`selfhost:ports`、`selfhost:ops-report` 一致；
  `operator:onboarding:check -- --json` 会以干净 JSON 输出同一组检查结果、文件引用、
  blockers、notes 和下一步命令，不打印 secret 值
- `test:operator-onboarding`：通过，用 fake repo 覆盖 operator onboarding plan、
  stale platform guide 检出、brand-site planned copy 检出、runbook 交接命令漂移检出
  中的 readiness / ports / ops-report 漂移检出和 secret-leak guard
- `repos/brand-site` `npm run smoke:deployability-content`：通过，覆盖中英双语
  Deployability Profiles 路由与内容契约，包括 admin-only Billing console 叙事和
  `selfhost:security-review` / `selfhost:audit-export` / `selfhost:profiles` / `selfhost:quickstart` / `selfhost:readiness -- --all` / `selfhost:readiness` / `selfhost:doctor` /
  `selfhost:init -- --json` / `selfhost:init -- --profile public-stack --json` / `selfhost:summary` / `selfhost:ports` / `selfhost:logs -- --json` / `selfhost:ops-report` / `selfhost:status -- --json` / `selfhost:config -- --json` /
  `selfhost:backup-validate` / `selfhost:restore-plan` / `selfhost:rotate -- --profile public-stack --json` / `selfhost:rotate -- --profile public-stack --confirm --json` / `deployability:quickstart` / `deployability:quickstart -- --json` / `deployability:safety` / `deployability:safety -- --json` / `deployability:doctor` / `corepack pnpm run deployability:doctor` / `corepack pnpm --silent run deployability:doctor -- --json` / `deployability:dashboard` / `corepack pnpm run deployability:dashboard` / `corepack pnpm --silent run deployability:dashboard -- --json` / `deployability:commands` / `corepack pnpm run deployability:commands` / `corepack pnpm --silent run deployability:commands -- --json` / `deployability:handoff` / `deployability:handoff -- --json` / `operator:onboarding:check -- --json` / `published-image:smoke -- --dry-run --json` 命令
- `repos/brand-site` `npm run build`：通过，包含 client build、SSR build 和新
  deployability docs routes 的 prerender 输出
- `repos/platform` platform-console view-model unit test：通过，覆盖 Billing
  readiness、balance 和 ledger summary
- `repos/platform/apps/platform-console` `npm run build`：通过，覆盖 Billing 页面
  route 和侧边栏入口
- `repos/client` `npm run test:unit`：通过，14 个测试文件、125 条测试；新增
  Runtime deployability panel、Help deployability chapter、Skill/MCP adapter
  runtime status、Preferences approval policy deployability 和 explicit billing
  readiness 覆盖

## 当前可用内容

### 第四仓认证链

工作区可以认证一组 protocol/client/platform SHA，记录为 change bundle，并通过
本地必跑 gate 验证。

### 源码集成基线

`corepack pnpm run test:integration` 会验证
[集成路径](integration-path.md) 中定义的基线源码集成链路：

- 来自 `repos/platform` 的 platform API
- 来自 `repos/platform` 的 standalone relay
- 来自 `repos/client` 的源码 `delexec-ops`
- 含审批在内的一条完整 request/response 成功链路

### Billing P-1 M1.2 admin read model

platform 子模块现在包含第一批实际 billing 实现里程碑：

- `@delexec/billing-store`
- `002_p1_tenant_balance.sql`
- billing persistence 的 unit 和 integration 测试
- platform package validation wiring
- admin-only `/v1/admin/billing/*` routes，覆盖 tenant 创建、balance 查询、
  人工 recharge capture 和 ledger 浏览
- platform API integration 覆盖 admin auth、tenant miss 错误映射、recharge
  capture 和 ledger filter
- Platform Console `/billing` route，能通过 gateway `/proxy/*` 进行 tenant setup、
  balance refresh、人工 recharge capture 和 ledger review

第四仓边界表已把该 package 视为 `platform/data`。

### Agent-facing caller-skill smoke

`corepack pnpm run test:agent-e2e` 现在会验证当前 `/skills/caller/*`
渐进式披露接口面，且不再需要外部 LLM key。它覆盖 manifest 发现、hotline 搜索、
hotline 读取、request prepare、request send、response report，并使用内置的
workspace-summary hotline 作为样例。

`corepack pnpm run dev:doctor` 会检查这条日常路径需要的本地前置条件和 runtime
health endpoint。

`corepack pnpm run dev:local:up` 是日常 agent loop 的托管式一键本地 bootstrap。
它会初始化并启动 platform profile，托管启动 relay，运行 client bootstrap，再托管启动
ops supervisor。`dev:local:status`、`dev:local:logs` 和 `dev:local:down` 提供对应的
管理入口。`dev:local:plan -- --json`、`dev:local:up -- --json`、
`dev:local:status -- --json`、`dev:local:logs -- --json` 和
`dev:local:down -- --json` 给 dashboard 和脚本提供机器可读 metadata；lifecycle JSON
省略 child command stdout，logs JSON 只报告日志文件 metadata，不打印 raw log lines。

`corepack pnpm run mcp:golden-four` 会把 MCP host-facing 路径变成可执行 smoke：
六工具 discovery、workspace-summary hotline search、request prepare、
`send_request` 签名结果交付，以及 `report_response` 对同一结果包的稳定恢复。

`corepack pnpm run selfhost:profiles` 会列出内置部署 profiles、deploy 目录、
service 数量、声明 host ports 和对应 doctor 命令，但不会读取 `.env`、检查 Docker
或打印 secret 值；
`corepack pnpm run selfhost:quickstart` 会按选定 profile 打印推荐复制粘贴命令序列，
并在适用时包含 public-stack security、published-image、onboarding 和交接证据步骤，
但不会运行 Docker、修改文件、读取 `.env` 或打印 secret 值；
`corepack pnpm run selfhost:plan` 会打印选定 profile 的只读部署地图：purpose、deploy
目录、env 路径、services、URLs、安全检查和 notes。它不会调用 Docker、修改文件、
探测网络或打印 secret 值；`--json` 会输出同一组 map，供生成文档、dashboard 和管理脚本消费；
`corepack pnpm run selfhost:readiness -- --all` 会输出所有内置 profile 的只读
readiness 矩阵；`corepack pnpm run selfhost:readiness` 会输出选定 profile 的部署就绪
总览。两者都会合并 profile 文件、`.env` 状态、secret hygiene、public-stack origin /
route 阻断项、URLs、声明 host ports 和下一步命令，但不会调用 Docker、绑定 socket、
探测网络、修改文件或打印 secret 值；任一形式都可增加 `--json`，CI、dashboard
和管理脚本应通过 `corepack pnpm --silent run` 调用，以在保持相同 readiness exit code
的同时保留干净 JSON stdout；
`corepack pnpm run selfhost:doctor` 现在会诊断本地工具可见性、profile 文件、`.env`
是否存在，以及 secret / public-origin hygiene，但不会调用 `docker compose`、启动服务、
探测网络或打印 secret 值；
`corepack pnpm run selfhost:preflight` 现在会在服务启动前组合检查 secret
hygiene、compose config 和 route 输出；`corepack pnpm run selfhost:security-review`
增加非破坏性的公开暴露前安全复核，会重复 secret、compose 和 public route-contract
检查，并打印 operator 在把 public stack 视为 exposure-ready 前应运行的 backup、
rotation 和 smoke 命令；`corepack pnpm run selfhost:audit-export` 会读取选定 profile
的 `.env`，调用现有 platform admin audit endpoint，并把响应写为
`exports/audit/<profile>/` 下的本地 JSON 证据，同时不打印 admin key；`--json`
会输出 source URL、output path、limit、item count 和 safety notes，但不打印
admin key 或导出的 audit body；
`corepack pnpm run selfhost:ops-report` 会把 Markdown 交接报告写入
`exports/selfhost/<profile>/`，记录 URLs、host ports、secret hygiene 状态和
operator 命令，但不写入 raw secret 值；`--json` 会输出同一组不含 secret 的
handoff 数据，且不写 Markdown 文件；
`corepack pnpm run selfhost:status` 是启动后的 runtime 管理快照。它会调用 Docker
compose `ps`、检查 secret hygiene 状态，并探测配置的 health endpoints，但不打印
secret 值；`--json` 会为 dashboard 和管理脚本输出同一组 runtime service state、
health checks、blockers 和 safety notes；
`corepack pnpm run selfhost:smoke` 是启动后的验收 gate。它会检查 secret hygiene、
Docker compose config、public route contract 和配置的 health endpoints，但不打印
secret 值；`--json` 会输出 smoke pass/fail、blockers、route contract、health
metadata 和 safety notes，并省略可能包含环境值的展开后 compose config stdout；
`corepack pnpm run selfhost:up` 是受保护的启动命令。它会运行 init、preflight，
再执行 Docker compose `up -d`；`--json` 会输出 init、preflight、compose-up、blockers
和 notes metadata，同时省略可能包含敏感值的命令 stdout；
`corepack pnpm run selfhost:logs` 是私有 operator 终端的 raw logs 视图，支持
`--service` 和 `--tail`；`--json` 会输出 command metadata、选定 service、tail
size、exit code 和 stderr metadata，同时省略 raw log stdout，因为应用日志可能包含敏感值；
`corepack pnpm run selfhost:down` 会通过 Docker compose 停止选定 profile；
`--json` 会输出 command metadata、exit code、blockers 和 stderr metadata，同时省略
compose down stdout，因为 compose 输出可能包含敏感值；
`corepack pnpm run selfhost:config` 会校验选定 profile 的 compose config。文本形式
会给私有 operator 终端打印 compose 输出；`--json` 会输出 pass/fail、blocker 和
stderr metadata，同时省略可能包含环境值的展开后 compose stdout；
`corepack pnpm run selfhost:ports` 会打印选定 profile 声明的 host ports，但不会
绑定 socket、检查本地网络或调用 Docker；
`corepack pnpm run selfhost:summary` 会输出只读的一屏 profile 概要，包含 deploy
路径、URLs、声明 host ports、secret hygiene 状态和下一步命令，但不会调用 Docker、
绑定 socket、探测网络或打印 secret 值；
`corepack pnpm run selfhost:backup-plan` 会打印 backup directory、私下复制 `.env`、
PostgreSQL dump 和 compose config 记录命令，但不会复制文件、dump 数据库或读取
secret 值；
`corepack pnpm run selfhost:backup-validate` 会检查 backup directory 里的 `.env`、
`postgres.sql` 和 `compose.config.txt` 存在与大小，但不读取或打印 `.env` secret
值；
`corepack pnpm run selfhost:restore-plan` 会基于 backup directory 输出停机、私下
复核 `.env`、导入 `postgres.sql`、重启和 smoke 验证顺序，但不会停止服务或导入 SQL；
`corepack pnpm run selfhost:rotate-plan` 会输出 backup-first、停机窗口、dry-run、
confirmed rotation、restart 和 smoke 验证 checklist，但不会读取或修改 `.env`；
`corepack pnpm --silent run selfhost:rotate -- --json` 会输出机器可读的 dry-run
rotation metadata，但不修改 `.env`；`corepack pnpm --silent run selfhost:rotate -- --confirm --json`
会执行与文本模式相同的 backup / rotated `.env` 写入，并返回 changed-file、
backup-path、restart / smoke 下一步命令和 safety metadata，但不打印 secret 值；
`corepack pnpm run selfhost:smoke`
用于启动后 health endpoint 检查，并且对 `public-stack` 会额外验证 `/healthz`、
`/platform/healthz`、`/relay/healthz`、`/gateway/healthz`、`/console/` 的 edge
route contract；`corepack pnpm --silent run selfhost:smoke ... --json` 会把同一组启动后验收证据输出给
CI、dashboard 和管理脚本，同时不嵌入展开后的 compose config stdout。对 public profile，不安全的 public origin 不会被包装成绿色状态，而是
明确 warning / failure。`selfhost:up` 默认会复用 preflight gate，未通过时不会继续启动；
`--force` 是显式 override。

`corepack pnpm run published-image:plan` 会审阅 public-stack 的三类 release image：
`rsp-platform`、`rsp-relay` 和 `rsp-gateway`，确认 compose image 模板仍由
`IMAGE_REGISTRY` / `IMAGE_TAG` 参数化。`published-image:plan -- --json` 会输出同一组
image refs、委托命令、smoke env metadata 和 safety notes，供 release dashboard 和
管理脚本消费，同时不打印 secret env 值。`published-image:smoke -- --dry-run --json`
会输出 dry-run smoke status，但不启动 Docker，也不打印 delegated smoke stdout。
`corepack pnpm run published-image:smoke`
会以 strict Docker 模式委托 `repos/platform` 的 `test:public-stack-smoke`，并设置
`COMPOSE_NO_BUILD=true`，让平台 smoke 拉取已发布镜像而不是本地 build。
第四仓只拥有这个编排入口；实际镜像 build、publish 和 release gate 仍由
`repos/platform` 拥有。

### Console deployability 管理切片

ops-console 的 Runtime 页现在展示部署与管理就绪度面板，解释 `platform`、
`public-stack`、`all-in-one` 三个 profile、推荐的 `selfhost:*` 检查顺序、
status / smoke / logs 不输出 secret 值的安全边界，以及显式 Billing readiness
状态。Billing 当前被标为 P-1 M1.2 admin-read-model 基础，不等于生产默认可用；
client-facing surface、enforcement 和 end-user consent flow 完成前不能把 billing
标成 ready。同时它会从 supervisor
`/status` 展示 `skill_adapter` 与 `mcp_adapter` 状态卡；日志 tab 仍只覆盖
caller / responder / relay。

Help 页新增「部署与管理」章节，把 profile 选择、health、logs、secret hygiene
和 Runtime / Transport 入口串起来。它是 M3 的第一段可理解性和运行状态可见性
surface。Preferences 页已新增 approval policy 部署策略摘要，展示当前审批模式、
白名单 / Blocklist 数量、本地模式建议，以及公开或团队部署前不要把 `allow_all`
作为默认策略的安全边界。

Platform Console 现在新增了具体的 Billing 管理页，面向 operator 使用。它复用现有
console gateway proxy：浏览器只访问 `/proxy/*`，gateway 在服务端注入已保存的
admin key。页面明确标注为 admin-only，不把它包装成生产默认 billing。

### Brand-site 可部署性叙事

brand-site 现在通过 `/docs/deployability-profiles` 和
`/en/docs/deployability-profiles` 提供中英双语公开入口，解释 Local Agent Loop、
Selfhost Platform、Public Stack 和 Management Console。页面明确区分 ready now 与
planned：当前本地 loop、selfhost、public-stack safety checks、published-image
smoke 和 Operator Onboarding 已可解释。Management Console 文案也开始说明
admin-only Billing 页面是 operator surface，不等于 client-facing billing ready；
public-stack 命令示例已加入 `selfhost:security-review`、`selfhost:audit-export`、`selfhost:audit-export -- --json`、
`selfhost:profiles`、`selfhost:quickstart`、`selfhost:readiness -- --all`、`selfhost:readiness`、`selfhost:readiness -- --json`、`selfhost:doctor`、`selfhost:init -- --json`、`selfhost:init -- --profile public-stack --json`、`selfhost:summary`、`selfhost:ports`、`selfhost:up -- --json`、`selfhost:smoke -- --json`、`selfhost:logs -- --json`、`selfhost:down -- --json`、`selfhost:ops-report`、`deployability:safety`、`deployability:safety -- --json`、`deployability:doctor`、`corepack pnpm run deployability:doctor`、`corepack pnpm --silent run deployability:doctor -- --json`、`deployability:dashboard`、`corepack pnpm run deployability:dashboard`、`corepack pnpm --silent run deployability:dashboard -- --json`、`deployability:commands`、`corepack pnpm run deployability:commands`、`corepack pnpm --silent run deployability:commands -- --json`、`deployability:handoff`、`operator:onboarding:check -- --json`、`selfhost:backup-validate`、
`selfhost:plan`、`selfhost:plan -- --json`、`selfhost:backup-plan`、`selfhost:restore-plan`、`selfhost:rotate-plan`、`selfhost:rotate -- --profile public-stack --json`、`selfhost:rotate -- --profile public-stack --confirm --json`，分别作为公开暴露前安全、证据、端口可见性、交接报告、
启动序列、人工和机器可读 readiness 总览、选定 profile 部署地图、机器可读部署地图、安全启动/日志/停止命令 metadata、机器可读交接、备份计划、备份工件校验、恢复演练、轮换计划和轮换 metadata 命令。仍未 ready 的能力不被包装成绿色状态。
页面重复强调 secrets、public origin、billing readiness 不能被包装成绿色状态。

## 尚不能作为默认日常路径的内容

下面这些方向仍需单独收口，之后才能被视为默认日常工作流：

- Billing P-1 admin-only read model 之后的 client-facing surface、enforcement
  和 end-user consent flow
- email transport 作为终端用户默认路径

另外，published-image wrapper 只有在对目标 `IMAGE_REGISTRY` / `IMAGE_TAG` 运行真实
`published-image:smoke` 后，才构成某个发布镜像 tag 的部署验证事实；dry-run 只验证
编排契约。

## 当前 caveat

本文的 readiness 结论覆盖固定 SHA 组合和第四仓 gate 结果，不认证子模块工作树中
无关的未提交改动。

在推广为最终干净日常基线前，请确保 `git status --short` 除了预期的第四仓变更
和明确归属的子模块工作外，没有其他脏状态。
