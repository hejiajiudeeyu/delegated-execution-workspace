# 冷启动运营计划（Cold-Start Ops Plan）

Status: planned（排期见 `docs/planning/roadmap-2026H2.md`；启动前置 = Loop M2 通过）
Created: 2026-07-04

冷启动的死结是双边市场空转：没有热线就没有 Caller，没有 Caller 就没人上架。解法是**供给自营、需求场景化、公开发布延后到证据齐全**。

## O1 种子供给：自营热线（第一优先）

自己当第一批 Responder，上架 5–8 条**真实有用**（不是 echo demo）的热线，每条都走正式公网流程（等于持续的 T-503 回归测试）：

| 候选热线 | 价值 | 定价参考 |
|----------|------|---------|
| 中英互译（文本） | 通用、易验证 | 低价 PTS |
| 长文摘要 | Agent 常见外包需求 | 低价 |
| 网页内容提取→结构化 JSON | 工具型、展示 input/output schema 能力 | 中价 |
| 代码评审意见（单文件） | 面向开发者受众、自证产品 | 中价 |
| 定时提醒/回叫（演示异步语义） | 展示协议能力差异化 | 低价 |
| playground 专用 demo 线 | 支撑品牌站 B4 | 免费/极低 |

要求：每条热线有 `summary`/`recommended_for`/示例字段齐全（喂给 B1 marketplace 展示）；可用性纳入监控（availability_status healthy）。

## O2 需求侧：场景内容而非拉新

冷启动期不买量。做 3–5 篇"场景配方"内容（复用 SEO blog 轨道）：「让你的 Agent 学会打电话」「用 50 PTS 外包一次翻译」「为什么 Agent 需要签名结果」——每篇以真实 CLI 会话为主体，结尾落到 Caller quick start。中英双语。

## O3 指标（从第一天就量）

北极星：**每周成功结算的付费调用数（非自调用）**。
过程指标：
- TTFC（time-to-first-call）：新 Caller 从进 quick start 到首次 `BILLING_SETTLED` 的时长；
- 首次成功率：新身份彩排/真实用户首调一次成功比例（Loop M3 的退出标准延续为运营指标）；
- 供给健康度：健康热线数、审核时长；
- 渠道：quick start 页 → npm install 的转化（站内埋点仅此一处，v1 用最简方案）。

## O4 公开发布（soft launch）门槛

全部满足才对外发（Show HN / V2EX / 即刻 / X dev 圈）：
- [ ] 零违规彩排通过且连续 3 次首次成功（Loop 退出标准）；
- [ ] 自营热线 ≥5 条健康在架；
- [ ] 首页改版 + B1 marketplace 上线；
- [ ] `@delexec/ops` npm 正式包安装即用；
- [ ] 丢口令恢复、退款等"坏路径"文档齐全（已具备大半）。
发布物料：一篇 launch 文 + hero 终端 GIF + marketplace 截图。首发渠道选 1–2 个集中打，收集反馈进摩擦清单，而不是广撒。

## O5 反馈回路

- GitHub Issues 作为唯一公开反馈入口（brand-site 页脚、文档页脚统一指向）；
- 每条真实用户摩擦 → 进 LOOP.md 式 backlog（M3.3 机制延续）；
- 每周一次"彩排式回归"：用全新身份跑一遍闭环，防止公网路径悄悄坏掉。

## 边界

- 不做付费投放、不做法币充值渠道运营、不做人工客服承诺；
- PTS 初始赠点策略（如新 Caller 赠 200 PTS）需要平台侧小改动，先挂 roadmap，不进当前 loop。
