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
- `repos/client`：`83e71ad0d088e869670b2e776578c5b7aaf86886`
- `repos/platform`：`dc7c654964707badbdda8d02d57a6b56b8cf11a5`

当前 bundle 为 `changes/CHG-2026-032.yaml`。

## 当前判断

CHG-2026-032 收口后，当前固定组合已经可以用于日常第四仓开发：

- submodule SHA 完整性已验证
- 边界治理已覆盖新的 platform billing data package
- change bundle 校验通过
- protocol/client/platform 包形态与 deploy-contract 检查通过
- 源码集成路径端到端成功
- ops-console 已出现部署与管理可理解性 surface，并补上 adapter health 可见性

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
- `check:bundles`：通过，使用 `CHG-2026-028`
- `test:contracts`：通过，platform package validation 已识别
  `@delexec/billing-store`
- `test:integration`：通过，完整 request/response 路径成功
- `test:agent-e2e`：通过，脚本已改为当前 `/skills/caller/*` 接口面
- `dev:doctor`：通过，当前本地日常 agent/caller-skill 栈健康
- `selfhost:init` / `selfhost:urls` / `selfhost:preflight`：已新增为
  self-host 管理骨架，用于生成 env、发现 profile，并在 `up` 前检查 routes、
  compose config 和 secret hygiene
- `selfhost:smoke`：local `platform` profile 已通过；`public-stack` 在 public
  origin 仍为 localhost 或栈未启动时会按预期失败
- `test:selfhost-kit`：通过，用临时 profile 覆盖 env 生成和 secret rotation
  dry-run / confirm 行为
- `repos/client` `npm run test:unit`：通过，13 个测试文件、123 条测试；新增
  Runtime deployability panel、Help deployability chapter 和 Skill/MCP adapter
  runtime status 覆盖

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

`corepack pnpm run selfhost:preflight` 现在会在服务启动前组合检查 secret
hygiene、compose config 和 route 输出；`corepack pnpm run selfhost:smoke`
用于启动后 health endpoint 检查。对 public profile，不安全的 public origin 不会被包装
成绿色状态，而是明确 warning / failure。`selfhost:up` 默认会复用 preflight gate，
未通过时不会继续启动；`--force` 是显式 override。

### Console deployability 管理切片

ops-console 的 Runtime 页现在展示部署与管理就绪度面板，解释 `platform`、
`public-stack`、`all-in-one` 三个 profile、推荐的 `selfhost:*` 检查顺序，以及
status / smoke / logs 不输出 secret 值的安全边界。同时它会从 supervisor
`/status` 展示 `skill_adapter` 与 `mcp_adapter` 状态卡；日志 tab 仍只覆盖
caller / responder / relay。

Help 页新增「部署与管理」章节，把 profile 选择、health、logs、secret hygiene
和 Runtime / Transport 入口串起来。它是 M3 的第一段可理解性和运行状态可见性
surface；approval policy 汇总和 billing readiness 的动态状态仍需后续收口。

## 尚不能作为默认日常路径的内容

下面这些方向仍需单独收口，之后才能被视为默认日常工作流：

- 一键本地栈 bootstrap
- profile-specific public-stack smoke，不只是 health/status
- MCP host golden-four 验证脚本化
- Billing P-1 M1.1 之后的 API、读模型、client-facing surface
- console 中 approval policy、billing readiness 的动态状态
- email transport 作为终端用户默认路径
- published-image smoke 与部署验证
- platform-first/operator-first onboarding 作为主要首次使用路径

## 当前 caveat

本文的 readiness 结论覆盖固定 SHA 组合和第四仓 gate 结果，不认证子模块工作树中
无关的未提交改动。

在推广为最终干净日常基线前，请确保 `git status --short` 除了预期的第四仓变更
和明确归属的子模块工作外，没有其他脏状态。
