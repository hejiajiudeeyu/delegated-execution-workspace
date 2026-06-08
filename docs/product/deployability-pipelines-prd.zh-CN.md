# 可部署性管线 PRD

> 英文版：[./deployability-pipelines-prd.md](./deployability-pipelines-prd.md)
> 说明：中文文档为准。

更新日期：2026-06-08

## 管线 0：Deployability Overview

目标：在 operator 或 dashboard 选择具体 local、self-host、public-stack、
onboarding 或 release-image 路径前，先给出一个只读命令地图和一个兼容状态快照。

必备命令：

- `corepack pnpm run deployability:overview`
- `corepack pnpm --silent run deployability:overview -- --json`
- `corepack pnpm run deployability:quickstart`
- `corepack pnpm --silent run deployability:quickstart -- --json`
- `corepack pnpm run deployability:safety`
- `corepack pnpm --silent run deployability:safety -- --json`
- `corepack pnpm run deployability:doctor`
- `corepack pnpm --silent run deployability:doctor -- --json`
- `corepack pnpm run deployability:dashboard`
- `corepack pnpm --silent run deployability:dashboard -- --json`
- `corepack pnpm run deployability:commands`
- `corepack pnpm --silent run deployability:commands -- --json`
- `corepack pnpm run compat:status`
- `corepack pnpm --silent run compat:status -- --json`
- `corepack pnpm run deployability:handoff`
- `corepack pnpm --silent run deployability:handoff -- --json`
- `corepack pnpm run test:deployability-overview`
- `corepack pnpm run test:deployability-quickstart`
- `corepack pnpm run test:deployability-safety`
- `corepack pnpm run test:deployability-doctor`
- `corepack pnpm run test:deployability-dashboard`
- `corepack pnpm run test:deployability-commands`
- `corepack pnpm run test:compat-status`
- `corepack pnpm run test:deployability-handoff`

验收：

- overview 列出 Local Agent Loop、Selfhost Platform、Public Stack、
  Operator Onboarding 和 Published Image 路径
- overview 为每条路径列出人工命令和机器可读 JSON 命令
- overview 是只读的：不读取 `.env`、不调用 Docker、不绑定端口、不探测网络 endpoint
- quickstart 列出 Daily Development、Selfhost Platform、Public Stack 和
  Release Review 四条首次使用路径，按顺序给出命令，但不执行命令
- `deployability:quickstart -- --json` 输出干净的 track、step、安全默认值和下一步命令
  metadata，不混入终端文本或 secret 值
- safety matrix 会列出 top-level、local-loop、self-host、public-stack 和
  release-review 命令的 read/write/startup/stop/Docker/network/logging 姿态，
  但不执行命令
- `deployability:safety -- --json` 输出干净的命令姿态、CI / dashboard 适用性、
  安全默认值和下一步命令 metadata，不混入终端文本或 secret 值
- doctor 把 compatibility ledger、顶层 scripts、文档、brand-site 和
  safety-contract 对齐状态收成一个只读快照，不执行 Docker、不读取 `.env`、
  不探测网络、不打印 secrets
- `deployability:doctor -- --json` 输出干净的 checks、blockers、warnings、
  evidence、安全默认值和下一步命令 metadata，不混入终端文本或 secret 值
- `deployability:dashboard -- --json` 输出一个干净的顶层 payload，包含
  overview、quickstart、safety、doctor 和 compatibility sections、section status、
  per-pipeline summaries、blockers、warnings、安全默认值和下一步命令，不读取 `.env`、
  不调用 Docker、不绑定端口、不探测网络、不打印 secret 值
- `deployability:commands -- --json` 输出干净的命令目录，包含 category、posture、
  track 和 pipeline filters，并合并 overview、quickstart 和 safety metadata，
  同时让带 profile 参数的命令变体继承基础安全姿态，不读取 `.env`、不调用 Docker、
  不绑定端口、不探测网络、不打印 secret 值
- `deployability:overview -- --json` 输出干净的 pipeline、安全默认值和下一步命令
  metadata，不混入终端 `[ok]` / `[fail]` 文本或 secret 值
- docs 和 brand-site 把它描述成第一张命令地图，而不是替代各管线自己的
  doctor / readiness / smoke gate
- `compat:status -- --json` 用干净 JSON 输出当前 bundle、submodule SHA matches、
  dirty submodule warnings、blockers 和下一步验证命令，且不读取 `.env`、不调用
  Docker、不探测网络、不打印 secret 值
- dirty submodules 是可见 warnings；最新 bundle SHA mismatch 和 dirty gitlink
  marker 仍然是 blockers
- `deployability:handoff` 会把不含 secret 的 Markdown 报告写入
  `exports/deployability/`，也可以用 `--output` 指定路径；JSON 形式输出同一组
  bundle、compatibility、command-map、per-pipeline summaries、安全说明和下一步命令
  metadata，不混入终端文本或 secret 值

## 管线 A：Local Agent Loop

目标：让本地 caller-skill / MCP loop 成为最快开发路径。

必备命令：

- `corepack pnpm run dev:doctor`
- `corepack pnpm --silent run dev:doctor -- --json`
- `corepack pnpm run dev:local:plan`
- `corepack pnpm --silent run dev:local:plan -- --json`
- `corepack pnpm run dev:local:up`
- `corepack pnpm --silent run dev:local:up -- --json`
- `corepack pnpm run dev:local:status`
- `corepack pnpm --silent run dev:local:status -- --json`
- `corepack pnpm run dev:local:logs`
- `corepack pnpm --silent run dev:local:logs -- --json`
- `corepack pnpm run dev:local:down`
- `corepack pnpm --silent run dev:local:down -- --json`
- `corepack pnpm run test:agent-e2e`
- `corepack pnpm run test:local-stack`
- `corepack pnpm run test:mcp-golden-four`
- `corepack pnpm run mcp:golden-four`
- `corepack pnpm run dev:client:bootstrap`
- `corepack pnpm run dev:client:supervisor`

验收：

- doctor 通过
- `dev:doctor -- --json` 输出干净的机器可读 prerequisites、runtime health、
  caller-skill 检查、blockers 和下一步命令 metadata，且不打印 raw logs 或 secret 值
- 一键本地 bootstrap 能按文档顺序启动 platform、relay、client bootstrap 和
  supervisor
- 托管 relay / supervisor 的 status、logs、down 命令可用
- `dev:local:plan -- --json` 输出同一套启动顺序、state directory、托管 service
  pid / log 文件和 safety notes，但不启动服务、不读取 secrets
- `dev:local:up -- --json` 输出启动步骤状态、托管 relay / supervisor 日志文件、下一步
  验证命令和 safety notes，但不打印 child command stdout
- `dev:local:status -- --json` 输出 relay / supervisor running state、pid / log
  metadata 和下一步验证命令，不打印 secret 值
- `dev:local:logs -- --json` 只输出日志文件存在性和 line-count metadata，不打印
  raw log lines，因为本地 relay / supervisor 日志可能包含敏感 runtime 输出
- `dev:local:down -- --json` 输出停止步骤状态和 safety notes，但不打印 child command
  stdout；`--keep-platform` 会让 platform profile 不进入停止步骤
- 六个 caller-skill actions 可见
- 内置 workspace-summary Hotline 能端到端跑通
- 可执行 MCP golden-four smoke 能验证 tool discovery、hotline search、
  request prepare、签名结果交付和 report recovery
- docs 和 brand-site 都把这条路描述成最快本地路径

## 管线 B：Self-host Platform Profile

目标：让 `repos/platform/deploy/platform` 可以安全初始化和检查。

必备命令：

- `corepack pnpm run selfhost:init`
- `corepack pnpm --silent run selfhost:init -- --json`
- `corepack pnpm run selfhost:profiles`
- `corepack pnpm --silent run selfhost:profiles -- --json`
- `corepack pnpm run selfhost:quickstart`
- `corepack pnpm --silent run selfhost:quickstart -- --json`
- `corepack pnpm run selfhost:readiness -- --all`
- `corepack pnpm --silent run selfhost:readiness -- --all --json`
- `corepack pnpm run selfhost:readiness`
- `corepack pnpm --silent run selfhost:readiness -- --json`
- `corepack pnpm run selfhost:doctor`
- `corepack pnpm --silent run selfhost:doctor -- --json`
- `corepack pnpm run selfhost:preflight`
- `corepack pnpm --silent run selfhost:preflight -- --json`
- `corepack pnpm run selfhost:up`
- `corepack pnpm --silent run selfhost:up -- --json`
- `corepack pnpm run selfhost:status`
- `corepack pnpm --silent run selfhost:status -- --json`
- `corepack pnpm run selfhost:smoke`
- `corepack pnpm --silent run selfhost:smoke -- --json`
- `corepack pnpm run selfhost:security-review`
- `corepack pnpm --silent run selfhost:security-review -- --json`
- `corepack pnpm run selfhost:audit-export`
- `corepack pnpm --silent run selfhost:audit-export -- --json`
- `corepack pnpm run selfhost:config`
- `corepack pnpm --silent run selfhost:config -- --json`
- `corepack pnpm run selfhost:plan`
- `corepack pnpm --silent run selfhost:plan -- --json`
- `corepack pnpm run selfhost:summary`
- `corepack pnpm --silent run selfhost:summary -- --json`
- `corepack pnpm run selfhost:urls`
- `corepack pnpm --silent run selfhost:urls -- --json`
- `corepack pnpm run selfhost:ports`
- `corepack pnpm --silent run selfhost:ports -- --json`
- `corepack pnpm run selfhost:logs`
- `corepack pnpm --silent run selfhost:logs -- --json`
- `corepack pnpm run selfhost:down`
- `corepack pnpm --silent run selfhost:down -- --json`
- `corepack pnpm run selfhost:ops-report`
- `corepack pnpm --silent run selfhost:ops-report -- --json`
- `corepack pnpm run selfhost:backup-plan`
- `corepack pnpm --silent run selfhost:backup-plan -- --json`
- `corepack pnpm run selfhost:backup-validate`
- `corepack pnpm --silent run selfhost:backup-validate -- --backup-dir <dir> --json`
- `corepack pnpm run selfhost:restore-plan`
- `corepack pnpm --silent run selfhost:restore-plan -- --backup-dir <dir> --json`
- `corepack pnpm run selfhost:rotate-plan`
- `corepack pnpm --silent run selfhost:rotate-plan -- --json`
- `corepack pnpm --silent run selfhost:rotate -- --json`
- `corepack pnpm --silent run selfhost:rotate -- --confirm --json`
- `corepack pnpm run test:selfhost-kit`

验收：

- `.env` 缺失时从 `.env.example` 创建
- placeholder secrets 被生成值替换
- `selfhost:init -- --json` 返回干净的 created/hardened `.env` metadata、
  secret hygiene 状态、warnings、changed files 和下一步命令，不打印生成后的
  secret 值或 URL 文本行
- profiles 列出内置部署 profiles、用途、deploy 目录、service 数量、声明 host
  ports 和对应 doctor 命令，但不读取 `.env` 或触碰 Docker；`--json` 返回同一组
  profile selector 数据，供 console、dashboard 和脚本消费
- quickstart 打印选定 profile 的推荐复制粘贴命令序列，但不执行 Docker、不修改文件、
  不打印 secrets；`--json` 返回同一组有序序列，供 console 和脚本消费
- readiness 打印单个 profile 的只读部署总览，`readiness --all` 打印内置 profiles
  矩阵；两者都会合并 profile 文件存在性、`.env` 状态、secret hygiene、public-stack
  origin / route 阻断项、URLs、声明 host ports 和下一步命令，但不执行 Docker、不修改文件、
  不探测网络、不绑定 socket、不打印 secrets；`--json` 会为相同的单 profile 或
  全 profile readiness 检查输出机器可读的 `ok`、`blockers` 和 `next` 字段
- doctor 检查本地工具可见性、profile 文件、`.env` 是否存在，以及 secret /
  public-origin hygiene，但不调用 `docker compose`、不启动服务、不探测网络、不打印
  secret 值；`--json` 返回同一组检查、阻断状态和下一步命令，供 dashboard 和脚本消费，
  并保持相同 exit-code 语义
- status 能显示 Docker compose 状态和 health endpoints；`--json` 返回同一组
  runtime service state、secret hygiene 状态、health checks、blockers 和 safety
  notes，供 dashboard 和管理脚本消费，且不打印 secret 值
- config 会校验 Docker compose config；`--json` 返回 pass/fail、blocker 和 stderr
  metadata，供 CI、dashboard 和管理脚本消费，并省略可能包含环境值的展开后 compose stdout
- smoke 同时检查 secret hygiene、compose config、public route contract 和
  health endpoints；`--json` 返回同一组启动后验收结果、blockers、route contract、
  health metadata 和 safety notes，供 CI、dashboard 和管理脚本消费，并省略可能包含环境值的展开后
  compose config stdout
- preflight 在 `up` 前检查 secret hygiene、compose config 和 routes，不要求服务已运行；
  `--json` 保持同一 exit-code 语义，并输出机器可读的 secret hygiene、compose
  config、routes、blockers 和 safety notes，不打印 secret 值
- `selfhost:up` 默认复用 preflight gate；未通过时不继续启动，除非显式 `--force`
- `selfhost:up -- --json` 返回机器可读的 init、preflight、compose-up、blockers
  和 notes 字段，但不打印 init、preflight 或 Docker compose up stdout
- logs 支持按 service 和 tail 行数过滤；`--json` 返回 command metadata、
  exit status、stderr lines、选定 service 和 tail size，并省略 Docker compose
  logs stdout，因为应用日志可能包含敏感值
- down 会停止选定 profile；`--json` 返回 command metadata、exit status、
  stderr lines 和 blockers，并省略 Docker compose down stdout，因为 compose 输出可能包含敏感值
- summary 会输出一屏只读 profile 概要，包括 deploy 路径、URLs、声明的 host
  ports、secret hygiene 状态和下一步命令，但不调用 Docker、不绑定 socket、不探测网络、
  不打印 secret 值；`--json` 返回同一组概要卡片数据，供 dashboard 和脚本消费
- plan 会输出只读部署地图，包括 purpose、services、URLs 和 safety checks，但不调用
  Docker、不打印 secrets；`--json` 返回同一组 profile 解释数据，供 dashboard、生成文档和脚本消费
- backup / rotation 在破坏性动作前先输出明确计划
- security review 是非破坏性的公开暴露前 gate，会检查 secret hygiene、compose
  config、route contract 和 backup / rotation / smoke 前置动作
- audit export 会把 platform admin audit events 写成本地 JSON 证据，同时不打印
  admin key；`--json` 返回 source URL、output path、limit、item count 和
  safety notes 等导出 metadata，同时不打印 admin key 或导出的 audit body
- ops report 会写出包含 URLs、host ports、secret hygiene 状态和 operator 命令的
  Markdown 交接 artifact，但不包含 raw secret 值；`--json` 返回同一组不含 secret
  的 handoff 数据，供 dashboard、CI 和管理脚本消费，且不会写 Markdown 文件
- urls 会打印选定 profile 的 URL inventory，但不调用 Docker、不绑定 socket、
  不探测网络、不打印 secrets；`--json` 返回同一组 URL inventory，供 dashboard 和脚本消费
- ports 会打印选定 profile 声明的 host port 使用情况，但不绑定 socket 或调用 Docker；
  `--json` 返回同一组声明端口 inventory，供 dashboard 和脚本消费
- backup plan 会打印手动备份 checklist，但不复制文件、不 dump 数据库、不读取 secret
  值；`--json` 返回同一组 backup directory、有序 plan steps、下一步
  backup-validate 命令和 safety notes，供 dashboard、CI 和恢复演练脚本消费
- backup validate 会检查 `.env`、`postgres.sql` 和 `compose.config.txt` 的存在与大小，
  但不读取或打印 secret 值；`--json` 返回机器可读的 file status、blockers、下一步
  restore-plan 命令和 safety notes，供 dashboard、CI 和恢复演练脚本消费
- restore plan 会基于 backup directory 输出恢复演练步骤，但不停止服务或导入 SQL；
  `--json` 返回同一组有序恢复步骤和 safety notes，供 dashboard、CI 和恢复演练脚本消费
- rotate plan 会输出手动 secret rotation checklist，但不读取或修改 `.env`；
  `--json` 返回同一组 backup-first、dry-run、confirm、restart、smoke 验证步骤和
  safety notes，供 dashboard、CI 和 operator runbook 消费
- rotate dry-run JSON 会输出选定 `.env` 路径、将被轮换的 key、下一步命令和
  safety notes，但不修改文件、不打印 secret 值；confirmed rotate JSON 会写出
  `.env.rotate-backup-*` artifact，并返回 changed-file metadata、restart / smoke
  下一步命令和 safety notes，但不打印新生成的 secret 值
- selfhost kit 对 env 创建、secret rotation dry-run / confirm 行为有自动化覆盖
- 命令不打印 secret 值

## 管线 C：Public Stack Profile

目标：让 `repos/platform/deploy/public-stack` 在公网暴露前就能被理解。

必备行为：

- self-host helper 支持 `--profile public-stack`
- 自动生成 admin 和 bootstrap secrets
- 输出 public route 列表
- `selfhost:preflight -- --profile public-stack` 在 `up` 前检查 public routes 和暴露前阻断项
- `selfhost:security-review -- --profile public-stack` 在不启动服务的情况下检查
  public exposure contract；`--json` 返回同一组 secret hygiene、compose config、
  route contract、operational prerequisites、blockers 和 safety notes，供 dashboard
  和部署控制器消费
- `selfhost:up -- --profile public-stack` 默认受 preflight 阻断，防止 unsafe public origin 被直接启动
- 当 `PUBLIC_SITE_ADDRESS` 仍是 localhost 时给出明确 warning
- 当 public origin 仍不安全时，public-stack smoke 应失败
- `selfhost:smoke -- --profile public-stack` 检查 public route contract，不只检查 health endpoint 是否能连通

验收：

- operator 在 `up` 前能看到端口、路由和 secrets 状态
- operator 能用一个非破坏性命令，在把 stack 视为可公网暴露前完成安全复核
- smoke 能列出并验证 `/healthz`、`/platform/healthz`、`/relay/healthz`、`/gateway/healthz`、`/console/` 对应的 edge route
- docs 解释 platform、relay、gateway、console、edge 的角色

## 管线 D：Management Console

目标：把 operational state 从纯终端检查迁移到 console surface。

验收：

- runtime 页展示 platform、relay、caller、responder、skill adapter、MCP adapter
- settings 页解释 local/public mode 和 approval policies
- logs 页能引导定位问题，但不 dump secrets
- billing readiness 是显式状态，而不是暗示已经 ready
- Platform Console 有 admin-only `/billing` 页面，可通过 gateway proxy 做 tenant
  setup、balance inspection、人工 recharge capture 和 ledger review
- public-stack 的 `/console/` 和 gateway session flow 能作为 operator 首次进入点被解释和验证

## 管线 E：Brand Site

目标：让公开叙事和可部署性工作一致。

验收：

- homepage / docs 解释部署 profiles
- `/docs/deployability-profiles` 与 `/en/docs/deployability-profiles` 解释
  Local Agent Loop、Selfhost Platform、Public Stack、Management Console、
  ready-now / planned 边界和 secrets 安全默认值
- console prototype 强调管理能力，而不只是视觉精致
- self-host 文案诚实区分「现在可用」和「计划中」
- brand-site build 与 deployability-content smoke 通过

## 管线 F：Published Image Release Smoke

目标：让 public-stack 的已发布镜像验证有一个第四仓入口，同时不复制
`repos/platform` 的 release 实现。

必备命令：

- `corepack pnpm run published-image:plan`
- `corepack pnpm --silent run published-image:plan -- --json`
- `corepack pnpm run published-image:smoke`
- `corepack pnpm --silent run published-image:smoke -- --dry-run --json`
- `corepack pnpm run test:published-image-smoke`

必备行为：

- plan 输出 `rsp-platform`、`rsp-relay`、`rsp-gateway` 的 registry/tag
  解析结果
- plan 校验 `repos/platform/deploy/public-stack/docker-compose.yml` 中三类
  release image 都通过 `IMAGE_REGISTRY` 和 `IMAGE_TAG` 参数化
- plan `--json` 输出同一组 image refs、compose 路径、platform smoke script、委托命令、
  smoke env metadata 和 safety notes，但不打印 secret env 值
- smoke 委托到 `repos/platform` 的 `test:public-stack-smoke`
- smoke `--dry-run --json` 输出同一组 image refs、委托命令、smoke env metadata、
  dry-run result status 和 safety notes，但不运行 Docker，也不打印 delegated smoke stdout
- smoke 默认设置 `COMPOSE_NO_BUILD=true`，让平台 smoke 拉取已发布镜像而不是本地 build
- smoke 默认使用 strict Docker 模式；只有显式 `--allow-skip` 才允许本地探测式跳过
- 命令输出只显示 registry、tag 和命令形状，不打印 admin key、bootstrap secret 或 `.env` 值

验收：

- operator 在实际运行 Docker 前能审阅将要验证的镜像和平台 smoke 命令
- CI、dashboard 和 release-management 脚本可以在决定是否运行 Docker 前消费干净 JSON plan
- `--image-registry` 和 `--image-tag` 可用于候选 release tag
- dry-run 可在无 Docker 环境中验证编排契约
- release-management 脚本可以在启动 strict Docker smoke 前消费干净 JSON dry-run status
- 真实 published-image smoke 的容器启动、health 和 gateway 场景仍由
  `repos/platform` 拥有

## 管线 G：Operator Onboarding Contract

目标：让 platform-first/operator-first 不再只是 runbook，而是可以被第四仓检查的
首次使用契约。

必备命令：

- `corepack pnpm run operator:onboarding:plan`
- `corepack pnpm --silent run operator:onboarding:plan -- --json`
- `corepack pnpm run operator:onboarding:check`
- `corepack pnpm --silent run operator:onboarding:check -- --json`
- `corepack pnpm run test:operator-onboarding`

必备行为：

- plan 给出 public-stack first-use 顺序：生成 env、readiness 总览、声明端口盘点、
  preflight、`up`、打开 `/console/`、gateway session setup、credential persistence、
  route smoke、不含 secrets 的 ops 交接报告、published-image smoke
- plan `--json` 输出同一组 first-use 阶段、命令、安全说明和下一步验证命令，供 console、
  CI 与部署脚本消费，不需要解析终端文本，也不打印 secrets
- check 校验 public-stack `Caddyfile`、compose 和 README 对 `/console/`、
  `/gateway/*`、`PLATFORM_CONSOLE_BOOTSTRAP_SECRET` 的契约一致
- check 校验 platform operator guide 不再声称 `platform-console` 未打包
- check 校验第四仓 source operator runbook 仍覆盖自动审批与人工审批停顿两条分支，
  并包含 public-stack 的 `selfhost:readiness`、`selfhost:ports` 与
  `selfhost:ops-report` 交接命令
- check 校验 brand-site Deployability Profiles 把 Operator Onboarding 标成可验证路径，
  而不是 planned
- check `--json` 输出同一组 pass/fail checks、文件引用、blockers、安全说明和下一步
  验证命令，不需要解析终端文本，也不打印 secrets

验收：

- operator 不需要先读完整协议，就能知道 public-stack 首次打开哪里、如何写入 admin
  credential、如何看 readiness 总览、声明了哪些 ports、如何生成不含 secrets 的交接报告、
  如何验证 gateway proxy
- 管理 surface 或 CI job 可以通过 `corepack pnpm --silent run operator:onboarding:plan -- --json`
  消费干净 JSON 版 first-use plan
- 管理 surface 或 CI job 可以通过 `corepack pnpm --silent run operator:onboarding:check -- --json`
  消费干净 JSON 版 onboarding contract check results
- 文档与实际 public-stack route contract 不一致时，第四仓 check 失败
- 这条路径仍不把 billing、email transport 或 marketplace production readiness 包装成已完成
- billing 管理证据只覆盖 admin-only Platform Console 页面，不能被描述成终端用户
  billing ready
