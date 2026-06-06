# 可部署性生态 PRD

> 英文版：[./deployability-ecosystem-prd.md](./deployability-ecosystem-prd.md)
> 说明：中文文档为准。

更新日期：2026-06-06

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

- 有一个非常明确的 quick-start 路径
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

当一个 fresh operator 能完成下面动作时，生态才算「日常可部署」：

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
| 日常本地 doctor | 第四仓 | `corepack pnpm run dev:doctor` |
| Agent-facing smoke | 第四仓 | `corepack pnpm run test:agent-e2e` |
| Self-host 部署地图 | 第四仓 | `corepack pnpm run selfhost:profiles` |
| Self-host quickstart 序列 | 第四仓 | `corepack pnpm run selfhost:quickstart` |
| Self-host readiness 总览 | 第四仓 | `corepack pnpm run selfhost:readiness -- --all`，以及自动化使用的 `corepack pnpm --silent run ... --json` |
| Self-host 部署 doctor | 第四仓 | `corepack pnpm run selfhost:doctor`，以及用于诊断面板的 `--json` |
| Self-host env 生成器 | 第四仓 | `corepack pnpm run selfhost:init` |
| Self-host profile plan | 第四仓 | `corepack pnpm run selfhost:plan`，以及用于生成文档和 dashboard 的 `--json` |
| Self-host profile 概要 | 第四仓 | `corepack pnpm run selfhost:summary`，以及用于概要卡片的 `--json` |
| Self-host URL inventory | 第四仓 | `corepack pnpm run selfhost:urls`，以及用于 dashboard 和脚本的 `--json` |
| Self-host 声明端口 inventory | 第四仓 | `corepack pnpm run selfhost:ports`，以及用于 dashboard 和脚本的 `--json` |
| Self-host ops handoff | 第四仓 | `corepack pnpm run selfhost:ops-report`，以及用于 dashboard 和管理脚本的 `--json` |
| Self-host preflight gate | 第四仓 | `corepack pnpm run selfhost:preflight`，以及用于部署控制器的 `--json` |
| Self-host runtime status | 第四仓 | `corepack pnpm run selfhost:status`，以及用于 dashboard 和管理脚本的 `--json` |
| Self-host security review | 第四仓 | `corepack pnpm run selfhost:security-review`，以及用于公开暴露 dashboard 的 `--json` |
| Self-host backup planning | 第四仓 | `corepack pnpm run selfhost:backup-plan`，以及用于恢复演练脚本的 `--json` |
| Self-host backup validation | 第四仓 | `corepack pnpm run selfhost:backup-validate`，以及用于恢复演练脚本的 `--json` |
| Self-host restore rehearsal | 第四仓 | `corepack pnpm run selfhost:restore-plan`，以及用于恢复演练脚本的 `--json` |
| Self-host rotation planning | 第四仓 | `corepack pnpm run selfhost:rotate-plan`，以及用于 operator runbook 和 dashboard 的 `--json` |
| Compose 生命周期 wrapper | 第四仓 | 委托到 `repos/platform/deploy/*` |
| Published-image smoke wrapper | 第四仓 | 委托到 `repos/platform` 的 public-stack smoke |
| Operator onboarding contract | 第四仓 | `operator:onboarding:check` 校验 public-stack/brand-site/runbook 一致性 |
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

## 8. 成功指标

- fresh checkout 可以运行 `selfhost:profiles`、`selfhost:quickstart`、
  `selfhost:readiness -- --all`、`selfhost:readiness`、`selfhost:doctor`、
  `selfhost:init`、`selfhost:summary`、`selfhost:preflight`、`selfhost:status`、
  `selfhost:status -- --json`、`dev:doctor`、
  `test:agent-e2e`、`published-image:plan`、
  `selfhost:security-review` 和 `operator:onboarding:check`
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
- 每个 profile 增加 smoke check。
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
  本地 JSON 证据，同时不在终端打印 admin key。
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
- 增加 `selfhost:summary`，让 operator 用一屏只读输出看清 deploy 路径、URLs、
  声明的 host ports、secret hygiene 状态和下一步命令。
- 增加 `selfhost:doctor` 作为最早的只读部署诊断，覆盖本地工具、profile 文件、
  `.env` 是否存在，以及 secret / public-origin hygiene，并用 `--json` 供诊断面板和部署脚本消费。
- 增加 `selfhost:profiles` 作为只读部署地图，展示内置 profiles、deploy 目录、
  services、声明 host ports 和对应 doctor 命令。
- 增加 `selfhost:quickstart` 作为选定 profile 的只读复制粘贴序列，覆盖 public-stack
  安全复核和交接证据步骤。
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
- 已发布镜像 smoke 先以第四仓 wrapper 形式接入，正式 image build/publish/release gate 仍归 `repos/platform`。
