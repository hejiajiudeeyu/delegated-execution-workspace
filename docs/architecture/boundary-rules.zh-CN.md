# 边界规则

> 英文版：[./boundary-rules.md](./boundary-rules.md)
> 说明：中文文档为准。

## 概览

边界约束由第四仓通过 `tools/project-boundaries.yaml` 与 Nx 项目分组实施。

## 项目分组

| 分组 | 包 |
|---|---|
| `protocol/contracts` | `@delexec/contracts` |
| `shared/runtime-support` | `@delexec/runtime-utils`, `@delexec/sqlite-store` |
| `client/runtime` | `@delexec/buyer-controller`, `@delexec/buyer-controller-core`, `@delexec/seller-controller`, `@delexec/seller-runtime-core` |
| `client/transports` | `@delexec/transport-*` |
| `client/ops` | `@delexec/ops` |
| `platform/data` | `@delexec/postgres-store` |
| `platform/api` | `@delexec/platform-api` |
| `platform/relay` | `@delexec/transport-relay` |
| `platform/gateway` | `@delexec/platform-console-gateway` |

## 允许依赖

- `protocol` -> `client`
- `protocol` -> `platform`
- `shared/runtime-support` -> `client`
- `shared/runtime-support` -> `platform`

## 禁止依赖

- `client` -> `platform`
- `platform` -> `client`
