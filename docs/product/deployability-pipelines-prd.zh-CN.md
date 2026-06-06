# 可部署性管线 PRD

> 英文版：[./deployability-pipelines-prd.md](./deployability-pipelines-prd.md)
> 说明：中文文档为准。

更新日期：2026-06-06

## 管线 A：Local Agent Loop

目标：让本地 caller-skill / MCP loop 成为最快开发路径。

必备命令：

- `corepack pnpm run dev:doctor`
- `corepack pnpm run test:agent-e2e`
- `corepack pnpm run test:mcp-golden-four`
- `corepack pnpm run mcp:golden-four`
- `corepack pnpm run dev:client:bootstrap`
- `corepack pnpm run dev:client:supervisor`

验收：

- doctor 通过
- 六个 caller-skill actions 可见
- 内置 workspace-summary Hotline 能端到端跑通
- 可执行 MCP golden-four smoke 能验证 tool discovery、hotline search、
  request prepare、签名结果交付和 report recovery
- docs 和 brand-site 都把这条路描述成最快本地路径

## 管线 B：Self-host Platform Profile

目标：让 `repos/platform/deploy/platform` 可以安全初始化和检查。

必备命令：

- `corepack pnpm run selfhost:init`
- `corepack pnpm run selfhost:preflight`
- `corepack pnpm run selfhost:status`
- `corepack pnpm run selfhost:smoke`
- `corepack pnpm run selfhost:config`
- `corepack pnpm run selfhost:plan`
- `corepack pnpm run selfhost:urls`
- `corepack pnpm run selfhost:logs`
- `corepack pnpm run selfhost:backup-plan`
- `corepack pnpm run selfhost:rotate-plan`
- `corepack pnpm run test:selfhost-kit`

验收：

- `.env` 缺失时从 `.env.example` 创建
- placeholder secrets 被生成值替换
- status 能显示 Docker compose 状态和 health endpoints
- smoke 同时检查 secret hygiene、compose config 和 health endpoints
- preflight 在 `up` 前检查 secret hygiene、compose config 和 routes，不要求服务已运行
- `selfhost:up` 默认复用 preflight gate；未通过时不继续启动，除非显式 `--force`
- logs 支持按 service 和 tail 行数过滤
- backup / rotation 在破坏性动作前先输出明确计划
- selfhost kit 对 env 创建、secret rotation dry-run / confirm 行为有自动化覆盖
- 命令不打印 secret 值

## 管线 C：Public Stack Profile

目标：让 `repos/platform/deploy/public-stack` 在公网暴露前就能被理解。

必备行为：

- self-host helper 支持 `--profile public-stack`
- 自动生成 admin 和 bootstrap secrets
- 输出 public route 列表
- `selfhost:preflight -- --profile public-stack` 在 `up` 前检查 public routes 和暴露前阻断项
- `selfhost:up -- --profile public-stack` 默认受 preflight 阻断，防止 unsafe public origin 被直接启动
- 当 `PUBLIC_SITE_ADDRESS` 仍是 localhost 时给出明确 warning
- 当 public origin 仍不安全时，public-stack smoke 应失败
- `selfhost:smoke -- --profile public-stack` 检查 public route contract，不只检查 health endpoint 是否能连通

验收：

- operator 在 `up` 前能看到端口、路由和 secrets 状态
- smoke 能列出并验证 `/healthz`、`/platform/healthz`、`/relay/healthz`、`/gateway/healthz`、`/console/` 对应的 edge route
- docs 解释 platform、relay、gateway、console、edge 的角色

## 管线 D：Management Console

目标：把 operational state 从纯终端检查迁移到 console surface。

验收：

- runtime 页展示 platform、relay、caller、responder、skill adapter、MCP adapter
- settings 页解释 local/public mode 和 approval policies
- logs 页能引导定位问题，但不 dump secrets
- billing readiness 是显式状态，而不是暗示已经 ready

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
