# M4 第一方 Research Hotline — 入口条件与交付单元（拟议稿）

父任务：`../07-17-call-anything-private-capability-network-mvp/prd.md`（Wave 4）
状态：**拟议**（2026-08-16 M3 验收关账后，owner 以多选题选定 M4 为下一轮主线；本文件是开工讨论稿，交付单元排序与三个开工决策落定后才激活）

## 入口条件

- [x] M3 验收关账（2026-08-16，decisions.md D9；生产 v0.4.18-ops.0.1.24，四仓 CI 绿）
- [ ] A-08 Research boundary ADR 落档（PRD 决策门：无 ADR 不开工。方向已由 D2 批准——独立私有 Research 仓 + 公开 Responder Runtime 背后的私有 OCI worker，内部 HTTP/Unix-socket 适配器；四仓只记 image digest/证据，永不持有私有 Research 源码或隐藏 API）
- [ ] research 私仓创建（ADR-003 引用的独立私仓至今不存在；创建方式待 owner）

## 范围（PRD Wave 4 五条，映射到已有机器）

1. **结构化一次性 Research Brief + 三档位**——复用 M2 的契约机器：`input_schema` / 双向示例 / `not_recommended_for` / `service_tier` / `execution_budget_s`（deep 档默认 4h 预算是为这类活留的）/ `fulfillment_mode`。预计协议仓零新增字段；若 spike 发现表达不了的语义，回 owner。
2. **Decision Brief + Evidence Pack**——claim-evidence 映射、反证、假设、缺口、as-of 日期、公私证据分离、方法与构建标识；作为 artifact 通道的多件输出交付（E1 已证 22 件/次的量级没问题）。
3. **新路线发现单独标注；abstain 必须携带下一个实验**；Deep 档默认人工复核且必须披露。
4. **只走公开 Runtime/Platform API**——发现、预算同意、artifact、交付校验、验收、修订、审计、结算全部经正门。这是 M5 的可检查证据（台账 M4 表最后一行）。
5. Stable/Preview、canary、tracing、回滚（P1 硬化，允许后置到退出后补）。

## 退出（PRD Wave 4）

**≥1 个真实技术路线决策经完整固定服务流交付，无隐藏 API。**（E5 满额要 3 个决策 + 2 个推动动作 + 1 次重复使用，归 M5 dogfood 持续积累；M4 只要求第一个。）

## 待 owner 的开工决策（激活前多选题）

1. research 私仓的名字与创建方式（agent 建私仓 / owner 自建后给地址）。
2. 第一个真实决策题目——dogfood 要真问题，由 owner 出题。
3. Deep 档人工复核的表达：直接用 `fulfillment_mode: confirm`（调用方确认）够不够，还是需要 responder 侧「交付前人工放行」这个新语义（后者动协议，要单独裁定）。

## 随行小项（跟主线走，不占交付单元）

- 告警收件人：owner 在生产 console【设置/告警】填 webhook URL 与存活 ping URL（挂账已两轮）。
- 备份定时化 + 异地（E7 剩余；单主机备份挡不住主机整体丢失）。
- `check:submodules` 增加脏工作树检测（M3 计划随行项顺延）；protocol 仓 `packages/contracts` 下三个未跟踪生成物该进 .gitignore（owning repo 小改）。
- M3 挂账里的 capacity 入流与 FR-021 客户端主动决定，若 M4 执行中顺路撞上则顺手收，否则继续挂。
