# Owner 决策记录（2026-07-31）

> 本文件记录 owner 于 2026-07-31 会话中拍板的方向与授权，作为 `prd.md` 待批事项的批准落点。owning-repo ADR 在 Wave 0 执行时按 A-01–A-09 逐条落档，引用本记录。

## D1 方向：先自己用起来（selfhost 私有网络）

- 本阶段唯一真相源 = 本任务 `prd.md`（2026-07-16 战略冻结版）。
- 根目录 `LOOP.md`（公网 marketplace 闭环 loop）**归档封存**：其 M2 彩排计数（2.1/2.2）与 M3 退出标准不再推进；双真相源冲突就此消除。未尽事项（e2e 入 CI、CLI 摩擦项等）不自动作废，按新程序里程碑择要吸收。
- `docs/planning/roadmap-2026H2.md` 的 P1–P4 阶段表随本决策失效待修订（修订时机 = Wave 0 出 traceability ledger 之后）。
- 07-15 console 重写任务维持 **paused**（按 prd.md 建议：等 M1–M3 API 与授权契约成立后复用其 Operator 侧研究）。

## D2 技术决策授权：按推荐默认执行

- prd.md「Recommended MVP Architecture Baseline (Provisional)」表中的 **A-01 至 A-09 推荐方案获批**为 MVP 基线，含 A-05 验收窗与 A-07 保留期的临时数字默认值。
- 事后任何一条均可由 owner 修改；Wave 0 spike 若发现推荐方案不成立，如实报告并回到 owner 重批，不得静默偏离。
- 执行方式：agent 按推荐默认推进，仅在**花钱、删数据、对外发布**三类动作前回询 owner。

## D3 派生决定（随 D1 自动落定）

- **PTS 语义**：Operator 发放的内部配额（守恒记账）。不做对外自助充值/购买；audit 的 P0.5 经济闭环蓝图（`docs/planning/product-audit/P0.5-economic-closure-implementation.md`）**不按原样执行**（prd.md 明令）；`responder_earn` 入账形态推迟到 M3 结算语义设计时一并定。
- **旧 loop 彩排违规判定问题**（operator 手工建租户+充值算不算违规）：随 loop 归档作废，不再需要答案。

## D4 止血批（2026-07-31 已执行）

- S1：public-stack Caddy 边缘停止代理 relay 业务路由（仅保留 `/relay/healthz`）——platform `1c8f206`。
- S2：`ENABLE_BOOTSTRAP_RESPONDERS` 代码默认改 `false`（fail-safe）——platform `1c8f206`。
- 集成套件复活：`test:integration` 补回漏跑的 2 文件并修复其过时断言——platform `9584fdf`，套件 37 过 / 2 跳。
- 随附四仓组合更新：`changes/CHG-2026-181.yaml`。
- **未完成、待单独确认**：生产主机（Aliyun host nginx，非 Caddy）撤下 `/relay/` 公网代理与 `/platform/metrics` 暴露——需要生产操作授权。生产 env 已显式 `ENABLE_BOOTSTRAP_RESPONDERS=false`，S2 无需滚动生产。

## 遗留待办指针（不在本轮范围）

- Wave 0（架构基线 + M0 release manifest）按 `goal.md` 契约另行启动。
- 安全长尾：S3 弱密钥断言、S4 admin 单点、S5 metrics 默认拒绝、S6 注册限速收紧（见 `docs/planning/product-audit/security-review.md`）。
- 质量长尾：e2e 纳入 CI、published-image smoke 进 release gate（见 `architecture-review.md` D6）。
