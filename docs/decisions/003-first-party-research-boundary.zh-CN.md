# ADR-003：第一方 Research 项目边界（A-08）

> 英文版：[./003-first-party-research-boundary.md](./003-first-party-research-boundary.md)
> 说明：中文文档为准。

## 状态

已接受（Accepted，2026-07-31 owner 批准）· 落地时机：M4

## 背景

阶段 PRD 把"第一方技术路线决策简报 Hotline"定为旗舰工作负载，同时给出一条硬约束：**第一方必须只使用公开 Runtime 与 Platform API，不得依赖隐藏业务 API**（PRD 10.8 明令禁止"隐藏业务 API""绕过预算、验收、退款和审计"）。

这带来一个仓库拓扑问题：研究编排、搜索规划、来源筛选、模型路由、冲突处理属于闭源竞争力（PRD 10.8 允许闭源），但它又必须作为一个普通 Responder 接入网络。若把它塞进现有四仓任一处，闭源逻辑与开源 Runtime 会混在同一发布单元里，"没有隐藏 API"将无法被证明。

## 决策

**第一方 Research 作为独立私有仓库存在，以私有 OCI worker 形态运行在公开 Responder Runtime 之后，优先通过内部 HTTP / Unix socket adapter 对接。**

边界：

| 项 | 归属 |
|---|---|
| 搜索/分析工作流、Evidence Pack、Decision Brief、人工复核、内部质量工程 | 独立私有 Research 仓库 |
| Hotline 契约、adapter、schema、示例、运行框架 | 公开（协议/客户端仓，PRD 10.8 要求公开） |
| Responder 生命周期、artifact 收发、本地诊断 | `repos/client`（普通 Responder Runtime，无特权分支） |
| 身份、路由、Call 状态、PTS、验收、争议、审计 | `repos/platform`（与任何第三方 Provider 走同一条路径） |
| 镜像 digest 与组合证据记录 | 第四仓（只记录，不拥有源码） |

硬约束：

1. **不得为第一方在 Platform 开任何特权路径**。第一方 Hotline 与未来 Partner 的 Hotline 走完全相同的提交、预算、校验、验收、审计、结算链路。
2. **第四仓可以记录 Research 镜像 digest 与证据，但绝不承载其源码或私有 API。**
3. 第一方允许的差异只有 PRD 10.8 列举的透明项：官方标记、推荐位、Stable/Preview、预留容量、canary、快速回滚、更长版本支持——**全部是运营层可见差异，不是技术层暗道**。
4. 人工参与必须公开披露（Deep 档默认人工复核），不得隐藏。

## 后果

- M4 开工前需创建该私有仓库并确定其发布方式（私有 registry 的镜像 digest）。**本决策不创建仓库**，只固定边界；仓库创建属对外动作，需单独授权。
- 由于第一方走公开 API，M1–M3 的 API 完备性直接决定 M4 能否开工——这也是 PRD 把 M4 排在 M3 之后的原因。
- 第一方"只用公开 API"这一点是可验证的：Research worker 的全部平台调用都应能在审计日志中以普通 Responder 身份出现。M5 应把"第一方无特权路径"作为一条可检查证据。
- 风险 R5（Research 成功但平台不成立）要求分别统计 Runtime / Selfhost / Research 指标，本边界使这种分别统计成为可能。
