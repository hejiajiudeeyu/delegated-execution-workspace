# 单元 1：FR-036 进度事件 — 侦察结论与设计

日期：2026-08-05 · 状态：**✅ 完成**（CHG-2026-196；生产 v0.4.4；验收=浏览器实证 13%→100% 实时推进）

## 侦察结论（比预期顺）

通道已存在，本单元不是新建数据面，而是**放行并规范化两类观测事件**：

| 现状 | 位置 |
|---|---|
| 客户端已有事件上报函数 `postRequestLifecycleEvent` → `POST /v1/requests/:id/events`（responder bearer 鉴权） | client `packages/responder-runtime-core/src/index.js:413` |
| 平台已有该路由：鉴权、responder/hotline 归属校验、request 绑定校验、按类型去重、append 进 `request.events`（capped 200） | platform `apps/platform-api/src/server.js:3554` |
| **但平台只放行 `COMPLETED`/`FAILED`**；客户端软超时时发的 `SOFT_TIMEOUT` 会被 400 拒掉且两侧都静默——现存缺陷，本单元一并修 | platform `server.js:3576`；client `index.js:1001` |
| admin 调用详情把 `request.events` 原样作为 `timeline` 返回；console `CallDetailPage` 按 `EVENT_LABEL` 渲染，未知类型显示原文 | platform `server.js:4593`；console `pages/CallDetailPage.tsx`、`lib/vocabulary.tsx:95` |
| 执行状态投影 `projectExecutionState` 只认映射表内的类型，未知类型自然跳过——PROGRESS 不会污染四轴 | platform `server.js:2906` |
| 卡住检测 `isStuckCall` 读最后一个事件的 `at`——进度事件天然刷新「最近活动」，长任务不再被 15 分钟宽限误报为卡住（这正是 FR-036 想要的副作用，写测试固定） | platform `server.js:2964` |

## 设计

### 协议仓（@delexec/contracts，truth source 先行）

- `OBSERVATIONAL_REQUEST_EVENT = { PROGRESS, SOFT_TIMEOUT }`：wire 层观测事件词表。**刻意不进 `CALL_EVENT`**——四轴事件是状态迁移，进度是观测，不是第五根轴。
- `REQUEST_PROGRESS_STAGE = { input_fetching, executing, output_uploading }`。
- `validateRequestProgress(progress)`：`seq` 必填非负整数（客户端每 attempt 单调递增）；`stage` 必填限词表；`percent` 可选 0–100；`message` 可选 ≤280 字符；`attempt_id` 可选 ≤128；**未知键主动拒绝**（沿 artifact 描述符先例）。
- 文档随代码：`docs/current/spec/platform-api-v0.1.md` 的 events 端点段落。
- 版本 0.1.4 → 0.1.5（源码先行；npm 发布属对外发布，待 owner 授权）。

### 客户端仓

- `createTaskRecord` 增加 `progress_seq: 0`；新增 `postTaskProgress(task, platform, stage, {percent, message})`：先用 contracts 校验、再走既有通道，try/catch 尽力而为（进度失败绝不影响任务本身——沿 `finalizeTask` 现有注释语义）。
- 三个锚点：取输入前（仅当有输入 artifact 描述符）`input_fetching`；`executor.execute` 前 `executing`；`sendResultEnvelope` 里上传输出 artifact 前 `output_uploading`。
- `hooks.reportProgress({percent, message})` 传给 executor（与现有 `onSoftTimeout` 并列）——执行器可选上报细粒度进度，MinerU 适配器后续可用，本单元不强制。
- `SOFT_TIMEOUT` 改用 contracts 常量，行为不变（平台现在会收下）。

### 平台仓

- events 路由放行 `PROGRESS`/`SOFT_TIMEOUT`：观测事件**不走** `applyTerminalBillingIfNeeded`；执行已终态则 409（迟到进度不落盘，客户端尽力而为语义天然吞掉）。
- `PROGRESS`：contracts 校验失败 400；按 `(responder_id, attempt_id, seq)` 幂等去重 → 202 `deduped`；append 时**只修剪最老的 PROGRESS**（新 env `PLATFORM_REQUEST_PROGRESS_HISTORY_LIMIT`，默认 50），生命周期事件永不被进度挤掉。
- `SOFT_TIMEOUT`：沿既有按类型去重（每请求一条），带 message。
- console：`EVENT_LABEL` 增 `PROGRESS`/`SOFT_TIMEOUT`；`CallDetailPage` 时间线渲染 `event.progress`（阶段中文 + 百分比 + message）；阶段词表进 vocabulary。

### 测试

- protocol：`validateRequestProgress` 边界（合法/缺 seq/坏 stage/超长 message/未知键/percent 越界）。
- client：集成——带输入+输出 artifact 的任务产生 `input_fetching`→`executing`→`output_uploading` 序列；上报失败不影响任务完成。
- platform：集成——收下并出现在 admin timeline；坏载荷 400；重复 seq 去重；终态后 409；修剪不动生命周期事件；SOFT_TIMEOUT 不再 400；**进度刷新 isStuckCall**。

## 顺序

protocol → client → platform（含 console）→ 四仓 bump + CHG-2026-196 + 五件套 → 本地 seeded stack 浏览器实看验收。npm publish 与生产滚版本最后一并请 owner 授权。
