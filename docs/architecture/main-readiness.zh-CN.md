# main 就绪清单

> 英文版：[./main-readiness.md](./main-readiness.md)
> 说明：中文文档为准。

更新日期：2026-05-02

## 目的

本文记录第四仓 `main` 分支当前的就绪判断。

目标不是罗列所有计划能力，而是把下面三类内容拆开：

- 当前固定 SHA 组合上已经验证为可用的内容
- 只通过第四仓认证链验证过的内容
- 明确还不属于当前默认主路径、仍需单独做 readiness 的内容

## 当前固定组合

- `repos/protocol`：`3f036da107d17807f0518972feccce0e323f8eed`
- `repos/client`：`bdf6c2c14cdaccd56c2cb959091ac313ecee2c0f`
- `repos/platform`：`18313db01016256cb504b01c3bfca8bb9668c066`

## 当前判断

当前 `main` 对“本地优先 client 主路径”以及“第四仓认证的源码集成路径”可判定为可用。

这个判断是刻意收窄的。它 **不** 等于所有计划中的部署形态、计费面、email 工作流、或者历史文档里提过的测试层都已经达到 production-ready。

## 已证实可用

### 1. 第四仓认证链

当前固定 SHA 组合上，以下工作区认证命令通过：

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

这证明：

- submodule SHA 与兼容性台账一致
- 跨仓边界规则仍成立
- change bundle 存在且结构有效
- contracts、包形态、部署配置解析、源码集成检查均通过

### 2. 本地优先 fresh-home client 主路径

2026-05-02 已在本工作区对全新 `DELEXEC_HOME` 做过人工复验。

复验路径：

```bash
node apps/ops/src/cli.js bootstrap --email you@example.com
node apps/ops/src/cli.js status
node apps/ops/src/cli.js ui start --no-browser
```

实际直接观察到：

- `bootstrap` 在干净 home 下成功完成
- caller 以 `local_only` 模式完成本地注册
- 官方 example hotline 在本地成功创建
- supervisor 管理的服务全部拉起并健康
- example request 到达 `SUCCEEDED`
- `ui start` 在 workspace Vite 启动修复后，能够按指定 host/port 重新进入

### 3. 当前验证 / 文档入口已对齐

`repos/client` 中最容易误导使用者的验证入口文档已经对齐到当前 checkout 事实。

已对齐文档包括：

- `repos/client/tests/README.md`
- `repos/client/tests/README.zh-CN.md`
- `repos/client/docs/current/testing/testing-strategy.md`
- `repos/client/docs/current/testing/testing-strategy.zh-CN.md`
- `repos/client/docs/current/guides/deployment-guide.md`
- `repos/client/docs/current/guides/deployment-guide.zh-CN.md`

这意味着：

- 当前 checkout 不再把缺失的 `tests/e2e` 或镜像型 smoke 脚本当作可运行真相
- 操作者现在能直接看到正确的本地测试、包校验、第四仓认证入口

## 已验证但范围较窄

### 源码集成路径

`corepack pnpm run test:integration` 会验证 [集成路径](integration-path.md) 中定义的基线源码集成链路：

- 来自 `repos/platform` 的 platform API
- 来自 `repos/platform` 的 standalone relay
- 来自 `repos/client` 的源码 `delexec-ops`
- 含审批在内的一条完整 request/response 成功链路

这个结论比单纯 unit/integration 更强，但它依然只是“源码集成认证路径”成立，不应被扩大解释成所有部署模式都 ready。

## 尚未作为当前默认主路径重新认证

下面这些方向，不应因为 `main` 对本地优先基线可用，就被视为已经 ready：

- 计费与额度行为
- email transport 作为终端用户默认路径
- 镜像型 smoke 与 published-image 验证路径
- 旧文档里提过但当前 checkout 并不存在的广义 E2E 层
- 以平台 / operator 为首要入口的完整 onboarding 流程

这些方向可能已经有代码、部分测试或旧文档，但在当前这轮里还没有被重新确立为 `main` 的默认 readiness 基线。

## 下一阶段的边界用法

后续选题建议按下面的边界来切：

- 如果目标是提升当前默认产品路径，就继续推进 client 可用性、onboarding、本地 transport、本地 UI 体验
- 如果目标是扩展支持的部署形态，就把计费、email、镜像 / 部署验证当作新的 readiness track，单独定义验收标准
- 不要再在文档里恢复历史测试层的宣称，除非同一个 checkout 里也恢复了对应文件与脚本

## 推荐下一条工作线

建议下一步做一份更细的模块化 readiness 审计，按模块明确写成：

1. 本地优先 client 主路径：已验证
2. 跨仓源码集成：已验证
3. 平台优先 / operator 优先 onboarding：仅通过认证链部分验证
4. email transport：功能存在，但尚未重新认证为当前默认路径
5. billing：尚未形成 readiness 收口模块
