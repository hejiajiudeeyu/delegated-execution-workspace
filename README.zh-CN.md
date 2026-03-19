# 委托执行工作区

> 英文版：[./README.md](./README.md)
> 说明：中文文档为准。

本仓库是第四仓（synthetic monorepo superproject），用于跨仓库开发编排与集成验证。

它不替代三个正式仓库：

- `repos/protocol` -> `delegated-execution-protocol`
- `repos/client` -> `delegated-execution-client`
- `repos/platform` -> `delegated-execution-platform-selfhost`

本仓库职责仅限于：

- 提供统一 Codex/Cursor 工作区
- 编排本地跨仓集成
- 校验契约与集成兼容性
- 记录已验证的 protocol/client/platform 提交组合

本仓库不得成为新的业务真相源。

## 本仓库负责内容

- git submodule 组合管理
- 工作区安装与开发期本地依赖链接
- Nx 图与 affected 评估、边界检查
- 源码集成编排
- 变更包（change bundle）记录
- 面向跨仓开发的 Agent 路由规则

## 本仓库不负责内容

- 协议 schema、协议字段或契约真相
- client 运行时真相
- platform 运行时真相
- 正式 npm 或镜像发布

所有业务变更必须在 `repos/` 下对应拥有者仓库完成。

## 强约束

1. `workspace:*` 仅用于第四仓开发期解析，正式发布不得依赖。
2. 本仓库 `main` 分支只能指向已验证兼容的 submodule SHA 组合。
3. 本仓库只负责编排、校验、路由；业务变更必须落在对应子模块仓库。

## 仓库结构

- `repos/protocol` -> 协议真相源子模块
- `repos/client` -> 客户端产品子模块
- `repos/platform` -> 自托管平台子模块
- `changes/` -> 变更包 YAML 文件
- `docs/` -> 编排、架构、运行手册、决策记录
- `tools/` -> 编排与校验脚本

## CI 职责分层

正式仓库 CI 继续负责：

- 独立安装
- 独立构建
- 独立测试
- 独立发布

第四仓 CI 仅负责组合有效性：

- submodule SHA 完整性
- 跨仓工作区安装
- Nx 图与 affected 评估
- 边界校验
- 契约与源码集成检查
- 变更包校验

第四仓 CI 用于证明某个 protocol/client/platform SHA 组合可协同工作，不替代正式仓库发布门禁。

## 日常工作流

1. 先在业务所属正式仓库完成变更。
2. 将本仓库子模块指向目标分支或提交。
3. 在 `changes/` 下新增或更新变更包。
4. 运行第四仓检查。
5. 在正式仓库完成合并。
6. 将本仓库 `main` 更新到已验证兼容的 SHAs。

## 常用命令

初始化工作区：

```bash
corepack pnpm install
```

初始化/同步子模块：

```bash
git submodule update --init --recursive
corepack pnpm run submodules:sync
```

运行第四仓校验：

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

查看 Nx 工作区：

```bash
NX_DAEMON=false corepack pnpm exec nx show projects
NX_DAEMON=false corepack pnpm exec nx graph --affected
```

启动本地源码集成：

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
```

## 文档入口

- [文档索引](docs/README.md)
- [跨仓变更流程](docs/orchestration/cross-repo-change-process.md)
- [开发者工作流](docs/orchestration/developer-workflow.md)
- [CI 分层](docs/orchestration/ci-layering.md)
- [系统概览](docs/architecture/system-overview.md)
- [边界规则](docs/architecture/boundary-rules.md)
- [本地开发准备](docs/runbooks/local-dev-setup.md)
- [AGENTS.md](AGENTS.md)
- [CLAUDE.md](CLAUDE.md)
