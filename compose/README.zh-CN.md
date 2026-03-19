# Compose 编排

> 英文版：[./README.md](./README.md)
> 说明：中文文档为准。

本目录保留用于第四仓库开发时的编排产物。

第四仓库不复制 `repos/platform` 中的正式部署清单。

当前策略：

- 本地平台启动使用 `repos/platform/deploy/platform/docker-compose.yml`
- 公网运维部署归属 `repos/platform` 所有
- 本目录中新增的 compose 文件仅用于跨仓库开发流程编排，不得用于生产部署
