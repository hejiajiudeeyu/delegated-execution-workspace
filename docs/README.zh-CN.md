# 文档索引

> 英文版：[./README.md](./README.md)
> 说明：中文文档为准。

这里是第四仓编排层的文档根目录。

业务文档位于对应子模块仓库。本目录仅记录编排、架构决策和运维流程。

`.zh-CN.md` 为中文配对文档；双语内容不一致时以中文为准。

## 编排（Orchestration）

跨仓变更流程、开发者工作流、CI 分层与回滚流程。

- [跨仓变更流程](orchestration/cross-repo-change-process.md)
- [开发者工作流](orchestration/developer-workflow.md)
- [CI 分层](orchestration/ci-layering.md)
- [回滚手册](orchestration/rollback-playbook.md)

## 架构（Architecture）

系统级架构、边界治理与集成路径文档。

- [系统概览](architecture/system-overview.md)
- [边界规则](architecture/boundary-rules.md)
- [集成路径](architecture/integration-path.md)

## 运行手册（Runbooks）

常见任务的分步操作指南。

- [本地开发准备](runbooks/local-dev-setup.md)
- [故障排查](runbooks/troubleshooting.md)

## 决策记录（Decisions）

重要设计决策的 ADR 文档。

- [ADR-001：第四仓目的](decisions/001-fourth-repo-purpose.md)

## 双语规范

双语文档配对规则与翻译维护流程。

- [Bilingual Convention](bilingual-convention.md)
- [双语规范（中文）](bilingual-convention.zh-CN.md)

## 子模块文档

各子模块维护自己的文档体系：

- [Protocol Docs](../repos/protocol/docs/current/README.md)
- [Client Docs](../repos/client/docs/current/README.md)
- [Platform Docs](../repos/platform/docs/current/README.md)
