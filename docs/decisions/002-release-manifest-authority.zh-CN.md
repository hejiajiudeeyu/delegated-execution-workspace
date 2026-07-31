# ADR-002：Release Manifest 权威归属（A-09）

> 英文版：[./002-release-manifest-authority.md](./002-release-manifest-authority.md)
> 说明：中文文档为准。

## 状态

已接受（Accepted，2026-07-31 owner 批准）

## 背景

阶段 PRD 的 E0 要求"仓库、发布物与部署事实一致"。当前不一致是常态而非例外：

- 生产曾运行 gateway v0.2.0，而四仓 `main` 仍记录 platform v0.1.7 的 gitlink，对应 change bundle 未提交（2026-07-31 已收口）。
- "当前组合"靠"最新的 `changes/CHG-*.yaml` 文件"推断，没有显式的当前指针。
- 运行中的服务此前不报告自身版本，只能靠 release note 与人工记忆核对部署事实（FR-082 缺口）。

一旦 Platform 也生成一份跨仓 manifest，就会出现两个都自称权威的组合真相源——这正是 PRD 风险 R6"第四仓成为第二事实源"的镜像风险。

## 决策

**Workspace（第四仓）生成并冻结不可变的 release manifest；owning 服务只报告自身观测到的构建事实供比对。**

具体：

1. **不可变 manifest**：`releases/manifests/<release_id>.yaml` 一次写入不再修改，记录 protocol/client/platform/brand 的 SHA 与发布物（npm 版本、镜像 tag）。
2. **小指针**：`releases/current.yaml` 只含 `release_id` 与 `manifest_sha256`，指向当前认证组合。指针小到可以一眼核对。
   - **命名约束（2026-08-01 实证补充）**：若该组合**发布了镜像**，`release_id` **必须等于镜像所用的 git tag**（如 `v0.3.0`）——因为那正是构建期注入、由 `/buildz` 上报的值。用日期式 id 会让漂移校验永远不匹配；首次真实滚动即被校验器拦下并据此修正。无镜像的组合可继续用日期式 id（服务上报 null → 判定为 undetermined，符合预期）。
3. **观测事实**：platform-api / transport-relay / platform-console-gateway 各自暴露 `GET /buildz`，报告 component、version、git sha、image digest、console 资产指纹、release id、manifest hash。**报告的是观测，不是权威**；未注入的值报 null，绝不猜测。
4. **漂移校验器**：workspace 工具比对"观测事实"与"canonical manifest"，不一致即阻断（FR-083），并分别报告 HEAD/index/worktree/bundle/manifest/artifact/runtime 各层差异。
5. **Platform 不得生成第二份 canonical 跨仓 manifest。**

## 后果

- 认证顺序固定：owning repo 发布 → 更新 gitlink 与 change bundle → 五件套通过 → 才更新 `current.yaml`。指针滞后于 bundle 是正常的，反之则是错误。
- manifest 不可变意味着修正只能通过发新 release_id，不能就地改写历史，回滚因此天然有记录（FR-084）。
- 服务需要在镜像构建期注入构建事实（Dockerfile build args + images workflow），否则 `/buildz` 只能报 null，漂移校验降级为"无法判定"而非"通过"。
- 现有 `changes/CHG-*.yaml` 机制保持权威地位，manifest 不取代它：bundle 记录"这次变更"，manifest 记录"当前认证组合是哪一个"。
- 生产探测需要网络可达运行环境；本地执行的校验必须标注为 local-only，不得当作发布证据。
