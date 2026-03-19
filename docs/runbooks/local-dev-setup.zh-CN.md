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
