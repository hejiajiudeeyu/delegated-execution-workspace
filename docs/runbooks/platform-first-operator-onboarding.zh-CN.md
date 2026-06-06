# 平台优先 / operator 优先 onboarding

> 英文版：[./platform-first-operator-onboarding.md](./platform-first-operator-onboarding.md)
> 说明：中文文档为准。

本文档描述当前固定第四仓 SHA 组合下，已经真实支持的 operator-first onboarding 路径。

它刻意比完整的公网产品指南更窄。目标是说明：operator 如何先把平台侧拉起来，再让 client 通过两种分支接入该平台：自动审批成功链，或人工审批停顿链。

## 适用范围

本文覆盖：

- 通过 `repos/platform/deploy/platform` 启动 platform API + PostgreSQL
- 通过 `repos/platform` 启动 standalone relay
- 通过 `repos/client` 源码 `delexec-ops` 完成 bootstrap
- 官方 example hotline 的审批处理
- public-stack `/console/` + gateway session flow 作为公网 operator 首次进入点

本文 **不** 预设：

- billing 或 quota enforcement 已经接入
- email 已经成为默认 transport 路径
- `repos/client` 内存在镜像型 smoke 脚本

对于公网主机，`deploy/public-stack` 现在已经通过
`platform-console-gateway` 打包 `platform-console` 静态 UI；首次进入使用
`/console/`，credential-backed operator API 使用 `/gateway/*`。

## Public Stack 首次使用路径

当 operator 从公网 bundle 而不是本地源码集成 loop 开始时，使用这条路径：

```bash
corepack pnpm run selfhost:init -- --profile public-stack
corepack pnpm run selfhost:readiness -- --profile public-stack
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm run selfhost:preflight -- --profile public-stack
corepack pnpm run selfhost:up -- --profile public-stack
corepack pnpm run selfhost:smoke -- --profile public-stack
corepack pnpm run selfhost:ops-report -- --profile public-stack
corepack pnpm run published-image:smoke -- --image-tag latest
corepack pnpm run operator:onboarding:check
```

预期结果：

- `/console/` 通过 `platform-console-gateway` 提供 operator UI
- `/gateway/session/setup` 初始化 gateway 本地密钥存储
- `/gateway/credentials/platform-admin` 持久化 platform admin credential
- `/gateway/proxy/v2/admin/hotlines` 证明已认证 gateway proxy 可用
- `selfhost:readiness` 在服务公开绑定前展示 profile 文件、`.env` 状态、
  secret hygiene、public origin / route 阻断项、URLs、host ports 和下一步命令
- `selfhost:ports` 在服务公开绑定前展示声明的 host ports
- `selfhost:ops-report` 写出不含 secrets 的 Markdown 交接报告，包含 URLs、
  host ports、secret hygiene 状态和下一步命令
- `operator:onboarding:check` 确认 platform docs、public-stack route contract、
  brand-site 叙事和 source fallback runbook 仍然一致

## 当前支持的两条 operator 分支

当前 checkout 支持两条 operator-first 分支。

### 分支 A：client 侧已拿到 operator 凭据

适用于 operator 可以把 `PLATFORM_ADMIN_API_KEY` 提供给 client bootstrap 环境的情况。

预期结果：

- `delexec-ops bootstrap --platform ...` 自动完成审批步骤
- example request 一次运行到 `SUCCEEDED`

### 分支 B：client 侧暂时不拿 operator 凭据

适用于 operator 不希望把 admin 凭据注入 client bootstrap 环境的情况。

预期结果：

- `delexec-ops bootstrap --platform ...` 停在 `stage = awaiting_admin_approval`
- operator 另外批准 responder 与 hotline
- client 再次运行 `delexec-ops bootstrap` 或 `delexec-ops run-example`

这两条分支在当前代码库里都成立。它们代表不同的信任与接入方式，不是不同产品。

## 前置准备

在第四仓工作区根目录执行：

```bash
corepack pnpm install
cp repos/platform/deploy/platform/.env.example repos/platform/deploy/platform/.env
```

至少在 `repos/platform/deploy/platform/.env` 中设置：

```env
TOKEN_SECRET=replace-with-a-local-dev-secret
PLATFORM_ADMIN_API_KEY=sk_admin_local_dev
```

## 步骤 1：先拉起 operator 侧

启动平台栈和 standalone relay：

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
```

验证健康：

```bash
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8090/healthz
```

预期：

- platform API 在 `:8080` 健康
- relay 在 `:8090` 健康

## 步骤 2：选择 client bootstrap 分支

### 分支 A：自动审批路径

带上 platform 访问和 admin 凭据运行 bootstrap：

```bash
PLATFORM_ADMIN_API_KEY=sk_admin_local_dev \
ADMIN_API_KEY=sk_admin_local_dev \
TRANSPORT_TYPE=relay_http \
TRANSPORT_BASE_URL=http://127.0.0.1:8090 \
node repos/client/apps/ops/src/cli.js bootstrap \
  --email you@example.com \
  --platform http://127.0.0.1:8080 \
  --text "Summarize this bootstrap request."
```

预期结果：

- `ok = true`
- `status = "SUCCEEDED"`
- steps 至少包含：
  - `platform_enabled`
  - `review_submitted`
  - `responder_enabled`
  - `supervisor_started`
  - `responder_approved`
  - `hotline_approved`
  - `catalog_visible`
  - `request_succeeded`

### 分支 B：人工审批停顿路径

不带 admin 凭据运行 bootstrap：

```bash
TRANSPORT_TYPE=relay_http \
TRANSPORT_BASE_URL=http://127.0.0.1:8090 \
node repos/client/apps/ops/src/cli.js bootstrap \
  --email you@example.com \
  --platform http://127.0.0.1:8080
```

预期结果：

- `ok = false`
- `stage = "awaiting_admin_approval"`
- `hotline_id = "local.delegated-execution.workspace-summary.v1"`
- steps 至少已经包含：
  - `platform_enabled`
  - `caller_registered`
  - `example_hotline_added`
  - `review_submitted`
  - `responder_enabled`
  - `supervisor_started`

这里是受支持的停顿点，不应被简单理解成路径失败。

## 步骤 3：人工审批的两种方式

如果你走的是分支 B，需要在 operator 侧批准 responder 和 hotline。

### 方式 1：直接调用 admin API

```bash
curl -X POST http://127.0.0.1:8080/v2/admin/responders/<responder_id>/approve \
  -H 'Authorization: Bearer sk_admin_local_dev' \
  -H 'Content-Type: application/json' \
  -d '{"reason":"manual integration approval"}'

curl -X POST http://127.0.0.1:8080/v2/admin/hotlines/local.delegated-execution.workspace-summary.v1/approve \
  -H 'Authorization: Bearer sk_admin_local_dev' \
  -H 'Content-Type: application/json' \
  -d '{"reason":"manual integration approval"}'
```

### 方式 2：使用第四仓 helper script

```bash
PLATFORM_ADMIN_API_KEY=sk_admin_local_dev \
PLATFORM_API_BASE_URL=http://127.0.0.1:8080 \
node tools/approve-example.mjs <responder_id>
```

## 步骤 4：回到 client 侧继续

批准完成后，再次运行 bootstrap，或者只重跑 example request。

### 继续运行 bootstrap

```bash
TRANSPORT_TYPE=relay_http \
TRANSPORT_BASE_URL=http://127.0.0.1:8090 \
node repos/client/apps/ops/src/cli.js bootstrap \
  --email you@example.com \
  --platform http://127.0.0.1:8080 \
  --text "Summarize this bootstrap request."
```

### 只补跑 example request

```bash
TRANSPORT_TYPE=relay_http \
TRANSPORT_BASE_URL=http://127.0.0.1:8090 \
node repos/client/apps/ops/src/cli.js run-example \
  --text "Summarize this bootstrap request."
```

检查运行态：

```bash
node repos/client/apps/ops/src/cli.js status
```

## 成功标准

只有当以下条件全部满足时，才把当前 checkout 的 operator-first 路径视为 ready：

1. platform API 和 relay 健康
2. client bootstrap 达到以下两者之一：
   - 直接 `SUCCEEDED`
   - 先停在 `awaiting_admin_approval`，批准后再达到 `SUCCEEDED`
3. example hotline 在批准后变得可见
4. example request 到达 `SUCCEEDED`
5. `delexec-ops status` 显示 caller / responder 运行态健康

## 当前仍不在 readiness claim 内

以下内容仍然不在这条路径的 readiness 声明内：

- billing / quota 行为
- email 作为 operator-first 主 transport 路径
- 对所有 image / compose profile 的广义终端用户部署保证

## 相关文档

- [main 就绪清单](../architecture/main-readiness.zh-CN.md)
- [集成路径](../architecture/integration-path.zh-CN.md)
- [本地开发准备](./local-dev-setup.zh-CN.md)
- [Platform 公共栈运维指南](../../repos/platform/docs/current/guides/public-stack-operator-guide.zh-CN.md)
- [Client 源码集成运行手册](../../repos/client/docs/current/guides/source-integration-runbook.zh-CN.md)
