# Hotline & Responder 字段审计报告

> 审计时间：2026-06-20
> 审计方法：Grilling session，逐字段走查当前 Registration Draft、平台提交 body、平台持久化实体、本地运行时配置

---

## Findings 汇总

### F1 — `summary` / `description` 展示场景缺失

**结论**：保留两个字段。`summary` 用于 Marketplace 列表页，`description` 用于详情页。

**问题**：当前没有两个不同的展示场景消费它们。

**行动**：Marketplace 列表页展示 `summary`，详情页展示 `description`。

---

### F2 — `capabilities` 与 `tags` 合并

**结论**：合并为统一的 `tags` 字段。`task_types` 保留用于结构化过滤。

**理由**：Agent 检索时不区分 capability 和 tag，两个字段语义重叠，增加 Responder 填写困惑。合并后 Agent 检索链路为 `task_types` 枚举过滤 → `tags` + `description` + `summary` 语义匹配。

**行动**：
- 代码中 `capabilities` 合并入 `tags`
- CLI `--capability` 标记为 deprecated，映射到 `--tag`
- 平台提交 body 和持久化实体中去除 `capabilities`

---

### F3 — Agent 检索链路四个 Gap

#### Gap 1（P0）：死字段激活
`recommended_for`、`not_recommended_for`、`limitations` 在 Registration Draft 中定义，但无任何消费方。

**行动**：目录 API 返回这三个字段，Agent 检索链路消费。

#### Gap 2（P0）：`trust_tier` 提升
当前 `trust_tier`（untrusted/trusted/verified）藏在 `pricing_hint` 子字段中，语义错位。

**行动**：提升为 Responder 级独立字段，从 `pricing_hint` 中移除。

#### Gap 3（P1）：负载/延迟暴露
`queue_depth` 和 `est_exec_p95_s` 仅在 transport 内部，未暴露到目录 API。

**行动**：目录 API 返回这两个运行时指标，Agent 可按负载/延迟选择。

#### Gap 4（P2）：运营指标预留
缺少完成率、平均响应时间、历史评分等指标。

**行动**：数据模型预留位置，待平台运营成熟后实现采集和展示。

---

### F4 — `input_summary` / `output_summary` 保留

**结论**：保留。同时服务 Agent 快速筛选和人类审批/审计场景。

**问题**：当前无实际消费方。

**行动**：与 F1 一起激活展示场景。

---

### F5 — 附件字段暂隐藏，三阶段文件传输

**结论**：`input_attachments` / `output_attachments` 代码保留，但不在 Registration Draft 中向用户暴露。

**三阶段文件传输计划**：

| 阶段 | 模式 | 方案 |
|------|------|------|
| 近期 | 本地模式 | 专用文件夹，task JSON 中传路径引用 |
| 中期 | 平台模式 v1 | 邮箱通道投递附件 |
| 远期 | 平台模式 v2 | 平台自营文件存储与传输 |

附件字段在对应阶段的传输能力就绪后激活。

---

### F6 — `pricing_hint` 硬约束需版本化

**结论**：`pricing_hint` 定位为硬约束（计费承诺）。

**问题**：Responder 修改 `pricing_hint` 时缺少版本化机制，可能影响在途任务计费基准。

**行动**：
- pricing_hint 变更绑定 `submission_version`
- 在途任务按旧版本计费
- 新任务按新版本计费
- Caller 侧 `max_charge_cents` 双向校验已实现，保持不变

---

### F7 — 邮箱字段重命名

**结论**：两个字段保留，语义重新定义。

| 原字段 | 新字段 | 用途 | 消费者 |
|--------|--------|------|--------|
| `contact_email` | `delivery_email` 或 `task_inbox_email` | 任务/附件投递的机器通道 | 机器 |
| `support_email` | `support_email`（保持） | 工单入口，人工支持 | 人类 |

**行动**：
- 重命名 `contact_email`
- 注册校验拦截 `@test.local` 等占位符默认值

---

### F8 — `template_ref` 预留

**结论**：设计意图合理（Agent 调用模板包：输入填写指南 + 输出解读指南 + 附件格式要求）。

**行动**：
- 近期不暴露给用户
- 先激活底层散落字段（schema / examples / recommended_for）
- 远期实现 template_ref 包管理机制（版本、安装、分发）

---

### F9 — Responder 自我介绍字段缺失

**结论**：新增 Responder 级描述字段。

**行动**：
- 新增 `description`：Responder 背景、团队、专长描述
- 新增 `service_domain`：服务领域声明
- 注册流程和目录 API 同步支持

---

### F10 — `service_id` 限定 self-host

**结论**：`service_id` 仅限 self-host 模式用于同一运维方的多实例池化。

**理由**：公共 Platform 上无法校验不同 Responder 的行为等价性，跨 Responder 池化会导致不可预期结果。

**行动**：
- 字段保留，标记 `scope: self-host`
- 公共注册流程不暴露
- Self-host 模式下同一 `service_id` 要求 schema / pricing_hint 一致性校验

---

### F11 — Soft/Hard Timeout 行为定义

**结论**：

| 类型 | 触发行为 | 任务状态 |
|------|---------|---------|
| Soft timeout | Supervisor 发 warning 信号 → Caller 收到状态事件推送 → 执行继续 → Adapter 可选返回部分结果/进度 | 继续执行 |
| Hard timeout | Supervisor 强制终止进程（SIGKILL） → 收集部分结果 → 返回 `timed_out` 终态 → 计费截止 | 终止 |

**行动**：
- Supervisor 实现信号发送机制
- Caller 侧实现状态事件推送
- Adapter 协议文档说明 soft timeout 信号处理（可选）

---

### F12 — 双通道投递与幂等

**结论**：任务 JSON 走 relay + email 双通道冗余投递，附件仅走 email / 远期平台自托管。

**行动**：
- `task_delivery_address` 保持 relay 通道
- `delivery_email` 作为第二通道同时投递 JSON + 附件
- Responder 侧按 `task_id` 幂等去重
- 远期平台自托管投递体系上线后 email 通道退役

---

## 开发优先级

### P0 — 近期必修（当前开发周期）

| Finding | 行动摘要 |
|---------|---------|
| F3-Gap1 | 激活 `recommended_for` / `not_recommended_for` / `limitations` 死字段 |
| F3-Gap2 | `trust_tier` 从 `pricing_hint` 提升为 Responder 级独立字段 |
| F6 | `pricing_hint` 版本化更新机制 |

### P1 — 中期（下一开发周期）

| Finding | 行动摘要 |
|---------|---------|
| F1 | Marketplace 列表页/详情页分别展示 summary/description |
| F2 | `capabilities` 合并入 `tags` |
| F3-Gap3 | `queue_depth` / `est_exec_p95_s` 暴露到目录 API |
| F4 | `input_summary` / `output_summary` 激活消费 |
| F5 | 三阶段文件传输（本地文件夹 → 邮箱 → 平台自营） |
| F7 | `contact_email` 重命名 + 占位符拦截 |
| F9 | Responder 新增 `description` / `service_domain` |
| F10 | `service_id` 标记 self-host scope |
| F11 | Soft/hard timeout 信号机制实现 |
| F12 | 双通道投递 + 幂等去重 |

### P2 — 远期

| Finding | 行动摘要 |
|---------|---------|
| F3-Gap4 | 运营指标数据模型预留（完成率、评分等） |
| F8 | `template_ref` 包管理机制 |
| F5-v2 | 平台自营文件传输 |
| F12-退役 | email 通道退役 |
