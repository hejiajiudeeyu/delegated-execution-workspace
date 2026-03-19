# Agent 工作流

> 英文版：[./agent-workflow.md](./agent-workflow.md)
> 说明：中文文档为准。

本文定义第四仓内 agent 必须遵守的开发流程。

Agent 必须把本仓库视为编排与兼容性工作区，而不是业务真相源。

## 必读顺序

在进行任何修改前，按以下顺序阅读：

1. `README.md`
2. `docs/orchestration/cross-repo-change-process.md`
3. `docs/orchestration/developer-workflow.md`
4. `docs/orchestration/agent-workflow.md`
5. `AGENTS.md`

## 工作模型

Agent 可在本仓库执行以下工作：

- submodule 组合管理
- 本地跨仓集成
- 契约与源码集成检查
- 兼容性账本更新
- 编排脚本与运行手册维护

Agent 不得把本仓库用作新的业务真相源。

## 必须遵守的开发顺序

对每个跨仓任务，Agent 必须遵守以下顺序：

1. 判断目标业务变更归属哪个拥有者仓库。
2. 仅在 `repos/` 下对应子模块中完成业务修改。
3. 在本仓库更新 submodule 引用到目标提交。
4. 在 `changes/` 下新增或更新变更包。
5. 运行必需的第四仓校验命令。
6. 只有在校验通过后，才可报告跨仓任务完成。

## 归属判断

修改代码前，按以下路由判断：

- 协议 schema、contracts、协议模板 -> `repos/protocol`
- client runtime、controller、transport、operator 流程 -> `repos/client`
- platform API、relay、gateway、deploy、persistence -> `repos/platform`
- 编排脚本、变更包、运行手册、兼容性校验 -> 第四仓

如果一个改动会改变业务行为，但实际只修改了第四仓文件，必须停止并将改动移动到对应拥有者子模块。

## 完成门禁

在以下检查全部通过前，Agent 不得声称跨仓工作已完成：

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

## 变更包规则

每一次跨仓 submodule SHA 移动都必须有 `changes/` 下对应的变更包文件。

变更包必须：

- 包含全部必填字段
- 精确记录当前 `protocol`、`client`、`platform` 的 submodule SHA
- 反映当前校验状态

如果 submodule SHA 变化，变更包必须在同一次工作中同步更新。

## 禁止性捷径

Agent 不得：

- 在第四仓新增业务 schema 或协议字段
- 在此处新增运行时实现并把它变成新的真相源
- 从 `repos/protocol`、`repos/client` 或 `repos/platform` 拷贝源码出来
- 仅靠修改编排文件来规避拥有者仓库必须做的修改
- 未执行第四仓校验就报告成功
- 更新 submodule SHA 却不更新对应变更包

## 推荐工作方式

- 对实验性 SHA 组合使用 integration 分支
- 保持 `main` 只记录已验证兼容组合
- 在 `AGENTS.md` 中维持简短 agent 规则
- 在 `docs/orchestration/` 中维护详细流程
- 优先使用 fail-fast 脚本校验，而不是只依赖文字约束
