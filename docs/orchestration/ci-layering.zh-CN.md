# CI 分层

> 英文版：[./ci-layering.md](./ci-layering.md)
> 说明：中文文档为准。

## 概览

本文说明三个正式仓库与第四仓编排层之间的 CI 职责划分。

## 正式仓库 CI

三个正式仓库负责独立 CI：

- install
- build
- test
- release

## 第四仓 CI

本仓库仅负责组合有效性：

- submodule SHA 完整性
- 跨仓工作区安装
- Nx 图与 affected 评估
- 边界校验
- 契约检查
- 源码集成检查
- 变更包校验

## 作业定义

后续可按作业维度补充详细配置与期望输出。
