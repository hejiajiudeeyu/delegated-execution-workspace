# M1 公网跨设备 Runtime — 入口条件与交付单元

父任务：`../07-17-call-anything-private-capability-network-mvp/prd.md`
状态：**已激活**（Wave 0 于 2026-07-31 完成，入口架构决策全部落档）

## 入口门（全部已满足）

| 决策 | 落点 |
|---|---|
| A-01 artifact 数据通道 | 协议仓 `docs/planned/design/mvp-architecture-decisions.zh-CN.md` |
| A-02 Provider 连接模型 | 同上 |
| A-03 重启与对账 | 同上 |
| A-04 共享状态边界 + 四轴状态模型 | 同上（含合法迁移与资金矩阵） |
| A-07 元数据保留 | 平台仓 `docs/planned/design/mvp-policy-decisions.zh-CN.md` |

## 硬前置（✅ 已于 2026-07-31 解除）

原前置：transport-relay 六路由无鉴权，任何人可读/注入/删除任务信封（审计 S1）。2026-07-31 分两步关闭——先在 Caddy 与生产 nginx 双侧撤下公网暴露（止血，CHG-2026-181），再落地 A-02 的 authenticated relay inbox（根治，CHG-2026-183）。

**私有文档与证据现在可以进入该通道。** 后续单元若引入新的数据面（如 artifact 直传），需各自重新评估暴露面，不得默认继承本结论。

## 交付单元顺序（每个独立可评审、独立走五件套）

1. ~~**relay 鉴权 + 可见性租约**~~ ✅ **完成 2026-07-31**（platform `f26a08b` + client `0867e1b`，CHG-2026-183）——admin token + receiver-scoped token、admin-only 签发端点、可见性租约、租约保护的幂等 ACK（stale lease → 409）；memory/sqlite 双 store 同语义，sqlite 就地加列保留既有队列；direct-run 无凭据拒绝启动（捕获并修好三处裸启路径：e2e、打包服务烟测、compose）；e2e 7/7 在鉴权下绿。
2. **最小 M1 协议切片**（`repos/protocol`）——声明式 Hotline 身份/版本、Call 四轴状态与合法迁移、artifact 描述符、终态与对账事件。**先发 contracts 再动 client/platform**（仓库纪律）。
3. **设备 enrollment 与能力上报**（`repos/platform` + `repos/client`）——受控凭据注册（去掉匿名 responder 注册）、心跳带容量与版本、online/degraded/offline/maintenance。
4. **artifact 通道**（`repos/platform` + `repos/client`）——受限槽位分配、直传、checksum 提交、按描述符授权下载；对象存储进官方 compose。
5. **重启对账**（`repos/client` + `repos/platform`）——本地 append-only journal、签名对账报告、按可恢复性等级收口；**未知态绝不自动结算**。
6. **真实 MinerU 跨设备跑通**——正常流程无 SSH / 远程桌面 / admin curl / 手工搬运。

## 退出条件

一次真实 MinerU 任务跨设备无人值守完成，artifact 校验一致，且失败矩阵（接受前离线、执行中断连、重复提交、重复交付、部分 artifact、重启、超时+宽限、过期版本、重试）各有明确行为与证据。

## 台账

进度写入 `docs/planning/private-capability-network/traceability-ledger.md` 的 M1 表，状态只能由证据推动。
