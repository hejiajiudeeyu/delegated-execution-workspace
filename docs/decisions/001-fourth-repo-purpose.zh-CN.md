# ADR-001：第四仓目的

> 英文版：[./001-fourth-repo-purpose.md](./001-fourth-repo-purpose.md)
> 说明：中文文档为准。

## 状态

已接受（Accepted）

## 背景

委托执行系统跨越 protocol、client、platform 三个仓库，开发与测试需协同进行。跨仓变更需要验证特定 SHA 组合是否兼容。

## 决策

建立第四仓作为 synthetic monorepo superproject。本仓库：

- 提供统一 Codex/Cursor 工作区
- 编排本地跨仓集成
- 校验契约与集成兼容性
- 记录已验证的 protocol/client/platform 提交组合

本仓库**不**：

- 定义业务 schema、协议字段或运行时行为
- 从三个正式仓库复制源码形成新真相源
- 取代正式发布所有权

## 影响

- 所有业务变更必须在对应子模块仓库完成。
- `workspace:*` 仅用于开发期解析，不得进入正式发布。
- `main` 分支只能指向已验证兼容的 submodule SHAs。
- 每次跨仓 SHA 更新都必须包含变更包 YAML。
