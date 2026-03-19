# 系统概览

> 英文版：[./system-overview.md](./system-overview.md)
> 说明：中文文档为准。

## 概览

委托执行系统由三个正式仓库组成，并由第四仓编排层进行协同。

## 仓库角色

| 仓库 | 角色 |
|---|---|
| `repos/protocol` | 协议与契约定义（`@delexec/contracts`） |
| `repos/client` | 客户端运行时：buyer/seller 控制器、传输层、运维 CLI |
| `repos/platform` | 自托管平台：API、relay、console、部署配置 |

## 依赖流向

```
protocol/contracts
       |
       v
 +---------+     +-----------+
 | client   |     | platform  |
 +---------+     +-----------+
```

- protocol 是契约上游真相源。
- client 与 platform 都依赖 protocol 契约。
- client 与 platform 之间不得直接互相依赖。

## 共享支撑包

`@delexec/runtime-utils` 与 `@delexec/sqlite-store` 物理位于 client 仓库，但被视为可流向 client 与 platform 的共享支撑包。
