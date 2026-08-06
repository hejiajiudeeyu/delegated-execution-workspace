# 2026-08-05 可用性冲刺 — 先「好用」再 M2

父任务：`../07-17-call-anything-private-capability-network-mvp/prd.md`
决策依据：同目录 `decisions.md` D7（2026-08-05，owner 拍板「先补『好用』再进 M2」）
状态：**已激活**

## 为什么有这一轮

M1 已实证「能用」（真实 MinerU 跨设备 ×2，无人值守、checksum 全过，CHG-2026-192），但三件事挡着「愿意每天用」：

1. 长任务进度不可见（FR-036 todo）——任务在跑什么、跑到哪，console 里看不到；
2. 零告警（FR-066 todo）——2026-07-04 宕机 5.5h 靠撞见发现；「没有告警」曾等于「看不见」（stuck-call 守卫教训，v0.4.1 修复）；
3. 备份工具链不存在——E7 恢复演练无从做起，数据不敢真正托付。

M2 最小 Hotline 服务契约顺延至本轮完成后。

## 入口条件

- [x] **生产 console 解锁**（owner 动作）：✅ 2026-08-05 owner 完成——callanything.xyz console 显示「已解锁·凭据已验证」，Operator API Key 已入加密存储，审批/计费/审计工具可用（owner 截图 + 浏览器实看确认）。
- [x] M1 退出门主体已达（见 `../07-31-M1-public-cross-device-runtime/goal.md` 达成情况表）。
- S3/MinIO 对象存储后端按 D7 记为推迟出 M1，不入本轮。

## 交付单元顺序（每个独立可评审、独立走五件套）

1. ~~**FR-036 进度事件**~~ ✅ **完成 2026-08-05**（CHG-2026-196；protocol `d01ffeb` + client `b9adf9e` + platform `3eab8db`）——观测事件对（PROGRESS/SOFT_TIMEOUT）+ 三锚点叙述 + `/calls/:id` 时间线渲染 + 卡住检测学会分辨「在磨」与「失联」。验收实证：本地 seeded 栈浏览器两次观察，13%→100% 实时推进。生产已滚 v0.4.4（contracts 0.1.5 / ops 0.1.8 已发 npm，owner 逐项授权见 decisions.md D7 追加）。设计与过程记录：`unit-1-progress-events.md`。
   > 顺带：关闭 SOFT_TIMEOUT 被平台 400 静默拒绝的现存缺陷；修 console 详情页把错误体当 call 渲染导致的白屏；两仓 lockfile 钉旧 contracts 的分发陷阱被 CI/镜像烟测双门拦下后修正——本地符号链接开发看不见 lockfile 漂移，这条要记住。
2. ~~**FR-066 最小告警**~~ ✅ **完成 2026-08-06**（CHG-2026-197；protocol `71879fd` + platform `09aafb1`）——owner 选定 **webhook + 6 小时重备**。落地：告警判定复用 console 同一份 `buildAttentionItems()`；HMAC 可选签名；开/重备/恢复三态；按 (kind,target) 独立跟踪且随快照持久化；投递失败在 console 可见。**死人开关**（`liveness_url` 周期 GET + 外部监控）是唯一覆盖「平台自己宕机」的手段——2026-07-04 那次正是这个形态，只做平台内告警等于把动因本身漏掉还制造覆盖假象。NFR-R05 一并达成（180s → 120s）。
   验收实证：浏览器 + 真实接收端跑通闭环——设备离线 → 签名告警自动送达 → console 显示投递与未解决项 → 心跳恢复 → 「已恢复」自动送达；存活 ping 按周期到达。12 例集成全部对真实 HTTP 接收端（stub 会让「什么都没到」这个真正的失败模式直接通过）。
   > ✅ **两项授权均已执行（2026-08-06）**：contracts@0.1.6 已发 npm（run 31079360421）；生产已滚 **v0.4.5**（images run 31079433188，三镜像 + 烟测全绿；`runtime matches release v0.4.5`）——CHG-2026-198。
   > ⚠️ **仍需 owner 一步**：进生产 console 的【设置 / 告警】填 webhook URL（以及最值得填的**存活 ping URL**）。在此之前代码在跑但没有收件人，从运营者视角仍是零告警；2026-07-04 那种宕机没有存活 ping 依旧发现不了。
3. **备份与恢复最小工具链**（platform + workspace）：平台数据备份、恢复脚本 + 一次本地/staging 恢复演练记档（E7 前置）。
   验收：演练成功且步骤可复现。

每个单元业务改动落 owning repo，随四仓组合更新附 change bundle（四仓规则不变）。

## 并行（非开发）

真实使用积累 E1：目前 2/10 次。console 解锁后日常投 MinerU 任务即是推进；使用中的摩擦记下来，作为 M2/M3 的真实输入。

## 退出条件

三个交付单元的验收各有证据，且生产 console 处于可用状态。达成后进入 M2（最小 Hotline 服务契约）。

## 台账

进度写入 `docs/planning/private-capability-network/traceability-ledger.md`（FR-036 / FR-066 行、E7 备注），状态只能由证据推动。
