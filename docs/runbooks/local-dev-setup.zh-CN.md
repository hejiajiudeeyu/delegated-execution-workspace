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
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
```

检查日常本地栈健康状态：

```bash
corepack pnpm run dev:doctor
corepack pnpm run test:agent-e2e
corepack pnpm run test:selfhost-kit
```

初始化并检查 self-host profile：

```bash
corepack pnpm run selfhost:init
corepack pnpm run selfhost:plan
corepack pnpm run selfhost:urls
corepack pnpm run selfhost:status
corepack pnpm run selfhost:smoke
```

Public operator stack：

```bash
corepack pnpm run selfhost:init -- --profile public-stack
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm run selfhost:status -- --profile public-stack
corepack pnpm run selfhost:smoke -- --profile public-stack
```

运维辅助命令：

```bash
corepack pnpm run selfhost:logs -- --service platform-api --tail 80
corepack pnpm run selfhost:backup-plan
corepack pnpm run selfhost:rotate-plan
corepack pnpm run selfhost:rotate -- --confirm
```
