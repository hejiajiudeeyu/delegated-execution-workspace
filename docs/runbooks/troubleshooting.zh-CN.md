# 故障排查

> 英文版：[./troubleshooting.md](./troubleshooting.md)
> 说明：中文文档为准。

## 常见问题

### 子模块未初始化

```bash
git submodule update --init --recursive
```

### 工作区安装失败

确认已启用 corepack，且 pnpm 版本与 `package.json` 的 `packageManager` 一致：

```bash
corepack enable
corepack pnpm install
```

### 边界检查失败

检查 `tools/project-boundaries.yaml`，确认是否引入了新的跨边界导入。参考[边界规则](../architecture/boundary-rules.md)。

### 源码集成启动失败

1. 确认 platform 的 `.env` 已正确配置。
2. 确认 Docker 正在运行（platform 部署需要）。
3. 确认所有子模块位于预期提交。
