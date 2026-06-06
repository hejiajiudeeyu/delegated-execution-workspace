# 本地开发准备

> 英文版：[./local-dev-setup.md](./local-dev-setup.md)
> 说明：中文文档为准。

## 前置要求

- Node.js >= 20
- 已启用 corepack（`corepack enable`）
- pnpm 10.x（通过 corepack 管理）
- Docker（用于 platform 部署）
- 支持 submodule 的 Git

## 安装步骤

1. 克隆并初始化子模块：

```bash
git clone <repo-url>
cd delegated-execution-dev
git submodule update --init --recursive
```

2. 安装工作区依赖：

```bash
corepack pnpm install
```

3. 创建环境文件：

```bash
cp repos/platform/deploy/platform/.env.example repos/platform/deploy/platform/.env
# 按本地配置修改 .env
```

4. 运行第四仓校验：

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

5. 启动本地源码集成：

```bash
# 一键托管本地 loop：
corepack pnpm run dev:local:plan
corepack pnpm run dev:local:up
corepack pnpm run dev:local:status

# 如果你想拆成多个终端，也可以用底层命令：
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
```

`dev:local:up` 会初始化 `platform` self-host profile，托管启动 standalone relay，
运行一次 client bootstrap，并托管启动 ops supervisor。pid 和日志都写在
`.run/local-stack/`。

停止托管本地 loop：

```bash
corepack pnpm run dev:local:down
```

查看托管进程日志：

```bash
corepack pnpm run dev:local:logs -- --service relay --tail 80
corepack pnpm run dev:local:logs -- --service supervisor --tail 80
```

检查日常本地栈健康状态：

```bash
corepack pnpm run dev:doctor
corepack pnpm run test:agent-e2e
corepack pnpm run mcp:golden-four
corepack pnpm run test:local-stack
corepack pnpm run test:selfhost-kit
```

初始化并检查 self-host profile：

```bash
corepack pnpm run selfhost:init
corepack pnpm run selfhost:plan
corepack pnpm run selfhost:urls
corepack pnpm run selfhost:preflight
corepack pnpm run selfhost:status
corepack pnpm run selfhost:smoke
```

Public operator stack：

```bash
corepack pnpm run selfhost:init -- --profile public-stack
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm run selfhost:preflight -- --profile public-stack
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm run selfhost:status -- --profile public-stack
corepack pnpm run selfhost:smoke -- --profile public-stack
```

`selfhost:up` 会自动先运行同一组 preflight gate。若 public origin 或 secret
hygiene 未通过，默认不会继续启动；只有显式传入 `--force` 才会绕过该阻断。

`selfhost:security-review` 是非破坏性的公开暴露前安全复核。它复用 secret
hygiene、compose config 和 public route contract 检查，并打印 backup、rotation
和 smoke 命令，帮助 operator 在把 public stack 视为 exposure-ready 前完成收口。
该命令不打印 secret 值。

验证已发布 public-stack 镜像：

```bash
corepack pnpm run published-image:plan
corepack pnpm run published-image:smoke -- --image-registry ghcr.io/hejiajiudeeyu --image-tag latest
corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>
corepack pnpm run test:published-image-smoke
```

`published-image:smoke` 默认会设置 `COMPOSE_NO_BUILD=true` 和
`STRICT_COMPOSE_SMOKE=true`，并委托 `repos/platform` 的 public-stack smoke。
如果只是本地查看命令形状，可以使用 `--dry-run`；如果显式允许无 Docker 环境跳过，
才传 `--allow-skip`。

检查 operator 首次使用契约：

```bash
corepack pnpm run operator:onboarding:plan
corepack pnpm run operator:onboarding:check
corepack pnpm run test:operator-onboarding
```

运维辅助命令：

```bash
corepack pnpm run selfhost:logs -- --service platform-api --tail 80
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm run selfhost:audit-export -- --profile public-stack
corepack pnpm run selfhost:backup-plan
corepack pnpm run selfhost:rotate-plan
corepack pnpm run selfhost:rotate -- --confirm
```

`selfhost:audit-export` 会读取选定 profile 的 `.env`，调用 platform admin audit
endpoint，并把 JSON 证据写入 `exports/audit/<profile>/`；也可以用 `--output`
指定路径。它会使用 admin key 发起请求，但不会把 key 打印到终端。
