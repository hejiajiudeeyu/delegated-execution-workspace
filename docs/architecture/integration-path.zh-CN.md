# 集成路径

> 英文版：[./integration-path.md](./integration-path.md)
> 说明：中文文档为准。

## 概览

源码集成（source integration）是第四仓认证所要求的基线集成路径。

## 集成组件

1. **Platform**：`repos/platform` 启动 `deploy/platform`
2. **Relay**：`repos/platform` 启动独立 relay
3. **Client**：`repos/client` 运行源码 `delexec-ops`
4. **Transport**：client 使用指向 platform relay 的 `relay_http`

## 命令

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
corepack pnpm run dev:client:status
corepack pnpm run dev:approve-example
corepack pnpm run test:integration
```

## 认证标准

第四仓认证的含义是：某个 protocol/client/platform SHA 组合可无错误完成上述源码集成路径。
