# 可部署性管线 PRD

> 英文版：[./deployability-pipelines-prd.md](./deployability-pipelines-prd.md)
> 说明：中文文档为准。

更新日期：2026-06-06

## 管线 A：Local Agent Loop

目标：让本地 caller-skill / MCP loop 成为最快开发路径。

必备命令：

- `corepack pnpm run dev:doctor`
- `corepack pnpm run dev:local:plan`
- `corepack pnpm run dev:local:up`
- `corepack pnpm run dev:local:status`
- `corepack pnpm run dev:local:logs`
- `corepack pnpm run test:agent-e2e`
- `corepack pnpm run test:local-stack`
- `corepack pnpm run test:mcp-golden-four`
- `corepack pnpm run mcp:golden-four`
- `corepack pnpm run dev:client:bootstrap`
- `corepack pnpm run dev:client:supervisor`

验收：

- doctor 通过
- 一键本地 bootstrap 能按文档顺序启动 platform、relay、client bootstrap 和
  supervisor
- 托管 relay / supervisor 的 status、logs、down 命令可用
- 六个 caller-skill actions 可见
- 内置 workspace-summary Hotline 能端到端跑通
- 可执行 MCP golden-four smoke 能验证 tool discovery、hotline search、
  request prepare、签名结果交付和 report recovery
- docs 和 brand-site 都把这条路描述成最快本地路径

## 管线 B：Self-host Platform Profile

目标：让 `repos/platform/deploy/platform` 可以安全初始化和检查。

必备命令：

- `corepack pnpm run selfhost:init`
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
- `corepack pnpm run selfhost:status`
- `corepack pnpm run selfhost:smoke`
- `corepack pnpm run selfhost:security-review`
- `corepack pnpm --silent run selfhost:security-review -- --json`
- `corepack pnpm run selfhost:audit-export`
- `corepack pnpm run selfhost:config`
- `corepack pnpm run selfhost:plan`
- `corepack pnpm run selfhost:summary`
- `corepack pnpm --silent run selfhost:summary -- --json`
- `corepack pnpm run selfhost:urls`
- `corepack pnpm --silent run selfhost:urls -- --json`
- `corepack pnpm run selfhost:ports`
- `corepack pnpm --silent run selfhost:ports -- --json`
- `corepack pnpm run selfhost:logs`
- `corepack pnpm run selfhost:ops-report`
- `corepack pnpm run selfhost:backup-plan`
- `corepack pnpm run selfhost:backup-validate`
- `corepack pnpm --silent run selfhost:backup-validate -- --backup-dir <dir> --json`
- `corepack pnpm run selfhost:restore-plan`
- `corepack pnpm run selfhost:rotate-plan`
- `corepack pnpm run test:selfhost-kit`

验收：

- `.env` 缺失时从 `.env.example` 创建
- placeholder secrets 被生成值替换
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
- status 能显示 Docker compose 状态和 health endpoints
- smoke 同时检查 secret hygiene、compose config 和 health endpoints
- preflight 在 `up` 前检查 secret hygiene、compose config 和 routes，不要求服务已运行；
  `--json` 保持同一 exit-code 语义，并输出机器可读的 secret hygiene、compose
  config、routes、blockers 和 safety notes，不打印 secret 值
- `selfhost:up` 默认复用 preflight gate；未通过时不继续启动，除非显式 `--force`
- logs 支持按 service 和 tail 行数过滤
- summary 会输出一屏只读 profile 概要，包括 deploy 路径、URLs、声明的 host
  ports、secret hygiene 状态和下一步命令，但不调用 Docker、不绑定 socket、不探测网络、
  不打印 secret 值；`--json` 返回同一组概要卡片数据，供 dashboard 和脚本消费
- backup / rotation 在破坏性动作前先输出明确计划
- security review 是非破坏性的公开暴露前 gate，会检查 secret hygiene、compose
  config、route contract 和 backup / rotation / smoke 前置动作
- audit export 会把 platform admin audit events 写成本地 JSON 证据，同时不打印
  admin key
- ops report 会写出包含 URLs、host ports、secret hygiene 状态和 operator 命令的
  Markdown 交接 artifact，但不包含 raw secret 值
- urls 会打印选定 profile 的 URL inventory，但不调用 Docker、不绑定 socket、
  不探测网络、不打印 secrets；`--json` 返回同一组 URL inventory，供 dashboard 和脚本消费
- ports 会打印选定 profile 声明的 host port 使用情况，但不绑定 socket 或调用 Docker；
  `--json` 返回同一组声明端口 inventory，供 dashboard 和脚本消费
- backup validate 会检查 `.env`、`postgres.sql` 和 `compose.config.txt` 的存在与大小，
  但不读取或打印 secret 值；`--json` 返回机器可读的 file status、blockers、下一步
  restore-plan 命令和 safety notes，供 dashboard、CI 和恢复演练脚本消费
- restore plan 会基于 backup directory 输出恢复演练步骤，但不停止服务或导入 SQL
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
- `corepack pnpm run published-image:smoke`
- `corepack pnpm run test:published-image-smoke`

必备行为：

- plan 输出 `rsp-platform`、`rsp-relay`、`rsp-gateway` 的 registry/tag
  解析结果
- plan 校验 `repos/platform/deploy/public-stack/docker-compose.yml` 中三类
  release image 都通过 `IMAGE_REGISTRY` 和 `IMAGE_TAG` 参数化
- smoke 委托到 `repos/platform` 的 `test:public-stack-smoke`
- smoke 默认设置 `COMPOSE_NO_BUILD=true`，让平台 smoke 拉取已发布镜像而不是本地 build
- smoke 默认使用 strict Docker 模式；只有显式 `--allow-skip` 才允许本地探测式跳过
- 命令输出只显示 registry、tag 和命令形状，不打印 admin key、bootstrap secret 或 `.env` 值

验收：

- operator 在实际运行 Docker 前能审阅将要验证的镜像和平台 smoke 命令
- `--image-registry` 和 `--image-tag` 可用于候选 release tag
- dry-run 可在无 Docker 环境中验证编排契约
- 真实 published-image smoke 的容器启动、health 和 gateway 场景仍由
  `repos/platform` 拥有

## 管线 G：Operator Onboarding Contract

目标：让 platform-first/operator-first 不再只是 runbook，而是可以被第四仓检查的
首次使用契约。

必备命令：

- `corepack pnpm run operator:onboarding:plan`
- `corepack pnpm --silent run operator:onboarding:plan -- --json`
- `corepack pnpm run operator:onboarding:check`
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

验收：

- operator 不需要先读完整协议，就能知道 public-stack 首次打开哪里、如何写入 admin
  credential、如何看 readiness 总览、声明了哪些 ports、如何生成不含 secrets 的交接报告、
  如何验证 gateway proxy
- 管理 surface 或 CI job 可以通过 `corepack pnpm --silent run operator:onboarding:plan -- --json`
  消费干净 JSON 版 first-use plan
- 文档与实际 public-stack route contract 不一致时，第四仓 check 失败
- 这条路径仍不把 billing、email transport 或 marketplace production readiness 包装成已完成
- billing 管理证据只覆盖 admin-only Platform Console 页面，不能被描述成终端用户
  billing ready
