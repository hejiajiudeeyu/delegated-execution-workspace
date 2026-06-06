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
| Self-host env 生成器 | 第四仓 | `corepack pnpm run selfhost:init` |
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

## 8. 成功指标

- fresh checkout 可以运行 `selfhost:init`、`selfhost:status`、`dev:doctor`、`test:agent-e2e`
  、`published-image:plan`、`selfhost:security-review` 和 `operator:onboarding:check`
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
  这些 operator 前置动作。
- 增加 `selfhost:audit-export`，让 operator 能把 platform admin audit events 保存成
  本地 JSON 证据，同时不在终端打印 admin key。
- 已发布镜像 smoke 先以第四仓 wrapper 形式接入，正式 image build/publish/release gate 仍归 `repos/platform`。
