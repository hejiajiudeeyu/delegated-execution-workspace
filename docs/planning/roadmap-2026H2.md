# 2026 H2 开发与运营总排期（Roadmap）

Created: 2026-07-04 · 本文件是所有计划文档的索引与排期总表；各计划内容以其自身文件为准。
日期为估算，锚点是里程碑完成事件而非日历；Loop 进度变化时只需平移窗口，不改顺序。

## 阶段总览

| 阶段 | 内容 | 前置 | 估算窗口 |
|------|------|------|---------|
| **P0 当前 Loop（付费调用闭环）** | M1 解卡点（client CI→npm 0.1.6、网关镜像→部署）→ M2 零违规彩排 → M3 首次即成功硬化 | 无（进行中） | 7 月上–中旬 |
| **P1 门面与供给** | B1 marketplace 字段适配 → 首页定位改版（含 /brand 迁移）→ B2 Docs Hub v1 → B3/B4 轻量项；并行启动 O1 自营种子热线 | M2 通过 | 7 月下旬–8 月上旬 |
| **P2 内容与预热** | O2 场景内容 3–5 篇、O3 指标就位、每周彩排式回归（O5）开始 | P1 主体完成 | 8 月中旬 |
| **P3 Soft Launch** | O4 门槛清单全绿 → 选 1–2 渠道集中发布 → 反馈进摩擦 backlog | O4 清单 | 8 月底–9 月初 |
| **P4 用户门户 Loop（T-505 家族）** | 浏览器端 Caller/Responder 自助注册登录使用；先写 scope PRD 再开新 loop | P3 反馈输入 | 9 月起 |

## 计划文档索引

| 文档 | 状态 | 阶段 |
|------|------|------|
| `LOOP.md`（仓库根） | active，当前 loop 单一事实源 | P0 |
| `docs/planning/brand-site/homepage-repositioning-plan.md` | planned | P1 |
| `docs/planning/brand-site/site-roadmap.md`（B1–B5） | planned | P1 |
| `docs/planning/operations/cold-start-ops-plan.md`（O1–O5） | planned | P1–P3 |
| T-505 用户门户 scope PRD | **待写**（P3 末动笔，吸收 launch 反馈） | P4 |
| PTS 新用户赠点方案（平台侧小改动） | **待写**（一页纸即可，P2 决策） | P2/P3 |
| Soft launch 物料与渠道清单 | **待写**（P2 末） | P3 |

## 关键依赖链

```
M1(npm 0.1.6 + 网关镜像部署) ─→ M2 零违规彩排 ─→ M3 首次即成功
                                    │
                 ┌──────────────────┴───────────────┐
                 ▼                                  ▼
        B1 marketplace 适配 ─→ 首页改版 ─→ B2 Docs Hub    O1 自营种子热线
                 └──────────────┬───────────────────┘
                                ▼
                    O2 内容 + O3 指标 ─→ O4 门槛全绿 ─→ P3 Soft Launch ─→ P4 T-505
```

## 原则重申

- 每个阶段的改动仍按仓库纪律执行：owning repo 提交 → SHA 更新 → change bundle → 四仓校验；
- P1 之前不改品牌站门面（避免在闭环未证实前营销半成品）；
- P3 之前不做任何公开渠道发布；
- 运营指标（O3）一旦上线，"首次成功率"取代彩排成为常态化质量闸门。
