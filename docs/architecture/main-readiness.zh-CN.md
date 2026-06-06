# main 就绪清单

> 英文版：[./main-readiness.md](./main-readiness.md)
> 说明：中文文档为准。

更新日期：2026-06-06

## 目的

本文记录第四仓 `main` 分支及其固定子模块组合的当前就绪判断。

第四仓是兼容性台账和本地编排工作区。这里的绿色结论表示当前
protocol/client/platform SHA 组合可用于本地跨仓开发和已认证的源码集成路径。
它不替代三个正式仓库各自拥有的 release gate。

## 当前固定组合

- `repos/protocol`：`da3027100cfe9391f7f8d03be18a108ee2804cf6`
- `repos/client`：`f1d6a2d8c9b83517cdf6ca9803b223847f880e9a`
- `repos/platform`：`5961309c6b0ca4e8df22dbb5be92ac0845bf8d25`
- `repos/brand-site`：`0aba3ab67cae1e77a74e40576c42002b24fca3e9`

当前 bundle 为 `changes/CHG-2026-043.yaml`。

## 当前判断

CHG-2026-043 收口后，当前固定组合已经可以用于日常第四仓开发：

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
- MCP host golden-four 验证已经脚本化，包含第四仓可执行 smoke 和确定性的
  单元式 harness
- brand-site 已有中英双语 Deployability Profiles 文档页，解释部署 profiles、
  ready / planned 边界、secrets 安全默认值、operator-only Billing console 切片和
  security-review gate
- 一键本地栈 bootstrap 已通过托管式 `dev:local:*` 命令可用
- published-image smoke 已有第四仓入口，能审阅 public-stack release images，
  并以 `COMPOSE_NO_BUILD=true` 委托平台仓库 smoke 验证已发布镜像
- platform-first/operator-first onboarding 已有第四仓契约检查，能验证
  public-stack `/console/`、gateway session flow、platform docs、brand-site
  叙事和 source fallback runbook 保持一致
- Billing P-1 已有 admin-only API/read-model 切片，覆盖 tenant 创建、balance
  查询、人工 recharge capture 和 ledger 浏览
- Platform Console 已通过 gateway proxy 暴露 operator-only `/billing` 管理页面，
  用来管理这批 billing read model

这个结论是有边界的。Billing P-1 M1.2 在持久化和 schema 基础上增加了
admin-only platform API/read model 和 operator-only console surface，但还不等于
billing 已经成为完整的 client-facing 或终端用户默认路径。

## 2026-06-06 验证事实

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
- `check:bundles`：通过，使用 `CHG-2026-043`
- `test:contracts`：通过，platform package validation 已识别
  `@delexec/billing-store` 和 `@delexec/platform-api` dependency graph
- `test:integration`：通过，完整 request/response 路径成功
- `test:agent-e2e`：通过，脚本已改为当前 `/skills/caller/*` 接口面
- `dev:doctor`：通过，当前本地日常 agent/caller-skill 栈健康
- `selfhost:init` / `selfhost:urls` / `selfhost:preflight`：已新增为
  self-host 管理骨架，用于生成 env、发现 profile，并在 `up` 前检查 routes、
  compose config 和 secret hygiene
- `selfhost:smoke`：local `platform` profile 已通过；`public-stack` 现在会输出
  并验证 edge route contract，且在 public origin 仍为 localhost 或栈未启动时会按预期失败
- `test:selfhost-kit`：通过，用临时 profile 覆盖 env 生成、secret rotation
  dry-run / confirm 行为、public-stack preflight safety、非破坏性 security review
  和 public route-contract smoke 输出
- `test:mcp-golden-four`：通过，用 fake MCP streamable HTTP host 覆盖可执行
  golden-four smoke，并检查不会泄漏 secret env 值
- `test:local-stack`：通过，覆盖一键本地栈命令顺序、托管进程 status/log 行为
  和 secret-leak guard
- `published-image:plan` / `published-image:smoke -- --dry-run`：通过，覆盖
  public-stack release image registry/tag 可见性、`COMPOSE_NO_BUILD=true` 委托命令
  和 strict smoke 默认值
- `published-image:smoke -- --image-tag latest`：通过，`repos/platform`
  public-stack smoke 以 `mode=published_image` 启动，gateway proxy 场景成功并清理 compose
- `test:published-image-smoke`：通过，用 fake platform repo 覆盖 compose image
  模板校验、dry-run 委托和 secret-leak guard
- `operator:onboarding:check`：通过，验证 public-stack `/console/` 与
  `/gateway/*` route contract、`PLATFORM_CONSOLE_BOOTSTRAP_SECRET`、platform
  operator guide、brand-site Deployability Profiles 和第四仓 source fallback
  runbook 叙事一致
- `test:operator-onboarding`：通过，用 fake repo 覆盖 operator onboarding plan、
  stale platform guide 检出、brand-site planned copy 检出和 secret-leak guard
- `repos/brand-site` `npm run smoke:deployability-content`：通过，覆盖中英双语
  Deployability Profiles 路由与内容契约，包括 admin-only Billing console 叙事和
  `selfhost:security-review` 命令
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
管理入口。

`corepack pnpm run mcp:golden-four` 会把 MCP host-facing 路径变成可执行 smoke：
六工具 discovery、workspace-summary hotline search、request prepare、
`send_request` 签名结果交付，以及 `report_response` 对同一结果包的稳定恢复。

`corepack pnpm run selfhost:preflight` 现在会在服务启动前组合检查 secret
hygiene、compose config 和 route 输出；`corepack pnpm run selfhost:security-review`
增加非破坏性的公开暴露前安全复核，会重复 secret、compose 和 public route-contract
检查，并打印 operator 在把 public stack 视为 exposure-ready 前应运行的 backup、
rotation 和 smoke 命令；`corepack pnpm run selfhost:smoke`
用于启动后 health endpoint 检查，并且对 `public-stack` 会额外验证 `/healthz`、
`/platform/healthz`、`/relay/healthz`、`/gateway/healthz`、`/console/` 的 edge
route contract。对 public profile，不安全的 public origin 不会被包装成绿色状态，而是
明确 warning / failure。`selfhost:up` 默认会复用 preflight gate，未通过时不会继续启动；
`--force` 是显式 override。

`corepack pnpm run published-image:plan` 会审阅 public-stack 的三类 release image：
`rsp-platform`、`rsp-relay` 和 `rsp-gateway`，确认 compose image 模板仍由
`IMAGE_REGISTRY` / `IMAGE_TAG` 参数化。`corepack pnpm run published-image:smoke`
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
public-stack 命令示例已加入 `selfhost:security-review` 作为公开暴露前安全 gate。
仍未 ready 的能力不被包装成绿色状态。页面重复强调 secrets、public origin、billing
readiness 不能被包装成绿色状态。

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
