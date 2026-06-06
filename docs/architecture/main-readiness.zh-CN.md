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
- `repos/platform`：`dc7c654964707badbdda8d02d57a6b56b8cf11a5`

当前 bundle 为 `changes/CHG-2026-037.yaml`。

## 当前判断

CHG-2026-037 收口后，当前固定组合已经可以用于日常第四仓开发：

- submodule SHA 完整性已验证
- 边界治理已覆盖新的 platform billing data package
- change bundle 校验通过
- protocol/client/platform 包形态与 deploy-contract 检查通过
- 源码集成路径端到端成功
- ops-console 已出现部署与管理可理解性 surface，并补上 adapter health、
  approval policy posture 和 billing readiness 显式可见性
- public-stack smoke 已补上 public route contract 检查，不只依赖通用
  health endpoint 可达性
- MCP host golden-four 验证已经脚本化，包含第四仓可执行 smoke 和确定性的
  单元式 harness
- brand-site 已有中英双语 Deployability Profiles 文档页，解释部署 profiles、
  ready / planned 边界和 secrets 安全默认值

这个结论是有边界的。Billing P-1 M1.1 增加了 platform 持久化和 schema
基础，但还不等于 billing 已经成为完整的终端用户默认路径。

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
- `check:bundles`：通过，使用 `CHG-2026-036`
- `test:contracts`：通过，platform package validation 已识别
  `@delexec/billing-store`
- `test:integration`：通过，完整 request/response 路径成功
- `test:agent-e2e`：通过，脚本已改为当前 `/skills/caller/*` 接口面
- `dev:doctor`：通过，当前本地日常 agent/caller-skill 栈健康
- `selfhost:init` / `selfhost:urls` / `selfhost:preflight`：已新增为
  self-host 管理骨架，用于生成 env、发现 profile，并在 `up` 前检查 routes、
  compose config 和 secret hygiene
- `selfhost:smoke`：local `platform` profile 已通过；`public-stack` 现在会输出
  并验证 edge route contract，且在 public origin 仍为 localhost 或栈未启动时会按预期失败
- `test:selfhost-kit`：通过，用临时 profile 覆盖 env 生成和 secret rotation
  dry-run / confirm 行为、public-stack preflight safety 和 public route-contract
  smoke 输出
- `test:mcp-golden-four`：通过，用 fake MCP streamable HTTP host 覆盖可执行
  golden-four smoke，并检查不会泄漏 secret env 值
- `repos/brand-site` `npm run smoke:deployability-content`：通过，覆盖中英双语
  Deployability Profiles 路由与内容契约
- `repos/brand-site` `npm run build`：通过，包含 client build、SSR build 和新
  deployability docs routes 的 prerender 输出
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

### Billing P-1 M1.1 基础

platform 子模块现在包含第一段实际 billing 实现里程碑：

- `@delexec/billing-store`
- `002_p1_tenant_balance.sql`
- billing persistence 的 unit 和 integration 测试
- platform package validation wiring

第四仓边界表已把该 package 视为 `platform/data`。

### Agent-facing caller-skill smoke

`corepack pnpm run test:agent-e2e` 现在会验证当前 `/skills/caller/*`
渐进式披露接口面，且不再需要外部 LLM key。它覆盖 manifest 发现、hotline 搜索、
hotline 读取、request prepare、request send、response report，并使用内置的
workspace-summary hotline 作为样例。

`corepack pnpm run dev:doctor` 会检查这条日常路径需要的本地前置条件和 runtime
health endpoint。

`corepack pnpm run mcp:golden-four` 会把 MCP host-facing 路径变成可执行 smoke：
六工具 discovery、workspace-summary hotline search、request prepare、
`send_request` 签名结果交付，以及 `report_response` 对同一结果包的稳定恢复。

`corepack pnpm run selfhost:preflight` 现在会在服务启动前组合检查 secret
hygiene、compose config 和 route 输出；`corepack pnpm run selfhost:smoke`
用于启动后 health endpoint 检查，并且对 `public-stack` 会额外验证 `/healthz`、
`/platform/healthz`、`/relay/healthz`、`/gateway/healthz`、`/console/` 的 edge
route contract。对 public profile，不安全的 public origin 不会被包装成绿色状态，而是
明确 warning / failure。`selfhost:up` 默认会复用 preflight gate，未通过时不会继续启动；
`--force` 是显式 override。

### Console deployability 管理切片

ops-console 的 Runtime 页现在展示部署与管理就绪度面板，解释 `platform`、
`public-stack`、`all-in-one` 三个 profile、推荐的 `selfhost:*` 检查顺序、
status / smoke / logs 不输出 secret 值的安全边界，以及显式 Billing readiness
状态。Billing 当前被标为 P-1 M1.1 基础，不等于生产默认可用；API、读模型、
client-facing surface 完成前不能把 billing 标成 ready。同时它会从 supervisor
`/status` 展示 `skill_adapter` 与 `mcp_adapter` 状态卡；日志 tab 仍只覆盖
caller / responder / relay。

Help 页新增「部署与管理」章节，把 profile 选择、health、logs、secret hygiene
和 Runtime / Transport 入口串起来。它是 M3 的第一段可理解性和运行状态可见性
surface。Preferences 页已新增 approval policy 部署策略摘要，展示当前审批模式、
白名单 / Blocklist 数量、本地模式建议，以及公开或团队部署前不要把 `allow_all`
作为默认策略的安全边界。

### Brand-site 可部署性叙事

brand-site 现在通过 `/docs/deployability-profiles` 和
`/en/docs/deployability-profiles` 提供中英双语公开入口，解释 Local Agent Loop、
Selfhost Platform、Public Stack 和 Management Console。页面明确区分 ready now 与
planned：当前本地 loop、selfhost、public-stack safety checks 已可解释；更完整的
platform-first console onboarding 仍是 planned。同时页面重复强调 secrets、public
origin、billing readiness 不能被包装成绿色状态。

## 尚不能作为默认日常路径的内容

下面这些方向仍需单独收口，之后才能被视为默认日常工作流：

- 一键本地栈 bootstrap
- Billing P-1 M1.1 之后的 API、读模型、client-facing surface
- email transport 作为终端用户默认路径
- published-image smoke 与部署验证
- platform-first/operator-first onboarding 作为主要首次使用路径

## 当前 caveat

本文的 readiness 结论覆盖固定 SHA 组合和第四仓 gate 结果，不认证子模块工作树中
无关的未提交改动。

在推广为最终干净日常基线前，请确保 `git status --short` 除了预期的第四仓变更
和明确归属的子模块工作外，没有其他脏状态。
