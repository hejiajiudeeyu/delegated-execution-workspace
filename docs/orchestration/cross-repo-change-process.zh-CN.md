# 跨仓变更流程

> 英文版：[./cross-repo-change-process.md](./cross-repo-change-process.md)
> 说明：中文文档为准。

本仓库是 synthetic monorepo superproject，定位为开发编排层，而非业务真相源。

## 强约束

1. `workspace:*` 仅用于第四仓开发期解析，不得成为正式发布依赖。
2. 本仓库 `main` 分支只能指向已验证兼容的 submodule 组合。
3. 本仓库只负责编排、校验、路由；业务变更必须落在 `repos/` 下对应仓库。

## 仓库职责

允许做的事情：

- 提供统一 Codex/Cursor 工作区
- 编排本地跨仓集成
- 校验集成与契约兼容性
- 记录并认证 protocol/client/platform 的兼容提交组合

禁止做的事情：

- 定义新业务 schema、协议字段或运行时行为
- 复制 protocol/client/platform 源码形成新真相源
- 取代三个正式仓库的发布职责

## CI 职责分层

### 正式仓库 CI

继续负责：

- 独立 install
- 独立 build
- 独立 test
- 独立 release

第四仓不得替代上述发布门禁。

### 第四仓 CI

仅负责组合有效性：

- submodule SHA 完整性
- 跨仓工作区安装
- Nx 图与 affected 评估
- 契约检查
- 源码集成检查
- 变更包校验

目标是回答：指定 protocol/client/platform SHA 组合是否可用。

建议作业拆分：

- `submodule-integrity`
- `workspace-install`
- `nx-graph-and-affected`
- `contracts-check`
- `source-integration-check`
- `change-bundle-validate`

## 日常变更流程

1. 先在拥有者正式仓库开发。
2. 在本仓库创建或更新集成分支。
3. 将各子模块移动到目标分支或提交。
4. 在 `changes/` 新增或更新对应 YAML 变更包。
5. 运行第四仓检查。
6. 在正式仓库完成合并。
7. 将本仓库 `main` 更新到已验证兼容的 SHAs。

## main 分支规则

- `main` 必须始终指向最新已验证兼容组合。
- 实验性组合可以存在于集成分支，不可长期留在 `main`。
- `main` 是兼容性台账，应始终可用于 Codex/Cursor 与本地源码集成。

## 变更包要求

每次跨仓组合更新都必须包含 YAML 变更包。

必填字段：

- `change_id`
- `goal`
- `protocol_sha`
- `client_sha`
- `platform_sha`
- `owner`
- `risk_level`
- `affected_scope`
- `contracts_check`
- `integration_check`
- `notes`

推荐格式：

```yaml
change_id: CHG-2026-001
goal: establish fourth-repo synthetic monorepo orchestration
protocol_sha: abc123
client_sha: def456
platform_sha: ghi789
owner: hejiajiudeeyu
risk_level: medium
affected_scope:
  - protocol
  - client
  - platform
contracts_check: passed
integration_check: passed
notes: source integration and boundary checks succeeded
```

## 回滚规则

本仓库是兼容性台账。回滚方式是将 submodule SHA 恢复到上一个已验证变更包，而不是先改写正式仓库历史。

每个已验证变更包都应作为可回滚目标保留；若新组合失败，恢复到上个已验证组合并重跑第四仓检查。

## 子模块更新策略

日常遵循以下流程：

1. 在正式仓库分支上开发。
2. 在本仓库创建集成分支。
3. 子模块指向目标分支或提交。
4. 新增/更新该组合的变更包 YAML。
5. 运行第四仓检查。
6. 在正式仓库合并。
7. 将本仓库 `main` 移动到已验证 SHAs。

本仓库 `main` 不得指向长期实验性组合。

## 边界治理

Nx 用于图可视化和 affected 评估。边界规则显式定义在 `tools/project-boundaries.yaml`。

世界模型分组：

- `protocol/contracts`
- `shared/runtime-support`
- `client/runtime`
- `client/transports`
- `client/ops`
- `platform/data`
- `platform/api`
- `platform/relay`
- `platform/gateway`

允许边：

- `protocol -> client`
- `protocol -> platform`
- `shared/runtime-support -> client`
- `shared/runtime-support -> platform`

禁止边：

- `client -> platform`
- `platform -> client`

`@delexec/runtime-utils` 与 `@delexec/sqlite-store` 虽物理位于 client 仓库，但按共享支撑包处理，以保持边界策略与当前实现一致，并避免 platform 对 client 产品层耦合回流。

## Agent 规则

Agent 可以在本仓库执行路由、校验、编排与 submodule SHA 更新。

Agent 禁止：

- 在此处新增业务 schema、协议字段或运行时实现
- 复制三个正式仓库源码形成新真相源
- 通过改编排文件规避拥有者仓库必要变更
- 未通过第四仓集成检查即宣称跨仓工作完成
- 未附带变更包就更新 submodule SHAs
