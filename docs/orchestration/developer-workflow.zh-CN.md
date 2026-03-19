# 开发者工作流

> 英文版：[./developer-workflow.md](./developer-workflow.md)
> 说明：中文文档为准。

## 工作模型

本仓库是以下三者的统一工作区：

- `repos/protocol`
- `repos/client`
- `repos/platform`

三个子模块仍是唯一业务真相源。

## 标准准备

1. `git submodule update --init --recursive`
2. `corepack pnpm install`
3. 首次源码集成运行时，允许编排脚本在 `repos/client` 与 `repos/platform` 内执行子模块本地安装
4. 需要时在 `repos/platform/deploy/platform/.env` 创建本地环境文件
5. 在宣称跨仓任务完成前，必须运行第四仓检查

## 标准跨仓循环

1. 在拥有者仓库修改
2. 在本仓库更新 submodule SHAs
3. 新增或更新对应变更包
4. 运行：
   - `pnpm check:submodules`
   - `pnpm check:boundaries`
   - `pnpm check:bundles`
   - `pnpm test:contracts`
   - `pnpm test:integration`
5. 仅在上述通过后，才可将组合提升到 `main`

## CI 分层

三个正式仓库继续负责：

- install
- build
- test
- release

本仓库仅负责：

- workspace install
- graph 与 affected 评估
- 边界校验
- 契约检查
- 源码集成检查
- 变更包校验

## 边界规则

- protocol 在本工作区内不依赖其他包
- client 可依赖 protocol
- platform 可依赖 protocol
- 共享支撑包可流向 client 与 platform
- client 产品/运行时包不得依赖 platform 包
- platform 包不得依赖 client 产品/运行时包

第四仓通过包依赖检查与 Nx 分组实施这些边界。

## 源码集成路径

定义为：

- `repos/platform` 启动 `deploy/platform`
- `repos/platform` 启动独立 relay
- `repos/client` 运行源码 `delexec-ops`
- client 使用指向 platform relay 的 `relay_http`

这是第四仓认证要求的基线集成路径。

推荐命令：

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
corepack pnpm run dev:client:status
corepack pnpm run dev:approve-example
corepack pnpm run test:integration
```

## 变更包纪律

每一次跨仓 SHA 移动都必须对应 `changes/` 下一个变更包文件。

变更包是以下事项的最小管理单元：

- 评审
- CI 展示
- 回滚
- 已验证兼容历史
