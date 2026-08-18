---
id: 0001
title: 协议仓其余规范未逐条对照运行时（architecture.md 之外的部分）
status: open
created: 2026-08-16
origin: 2026-08-16 会话「hotline 从 0 注册流程走查」收尾（工作台转录 inbox/agent-sessions/2026-08-13/claude-878f38dc.md L476、L507）· 治理批第二批提案 A4，用户 2026-08-16 采纳
actor: agent
---
# 协议仓规范体检的剩余范围

## 要做什么

对照运行时逐条核这几份，各出一条结论（仍成立 / 已更新 / 标注为历史快照）：

- `repos/protocol/docs/current/spec/remote-hotline-scope.md` 与 `.zh-CN.md`
- `repos/protocol/docs/current/spec/platform-api-v0.1.md` 与 `.zh-CN.md`（中英差异）
- `repos/platform/docs/current/spec/` 下的同名副本（存在第二份，须确认哪份是真源）

`architecture.md` 已于 2026-08-16 重写（CHG-2026-248），不在此列。

## 为什么要做

- 上一轮是**定向体检**：只跑了能当场证伪的检查（引用完整性、台账证据规则、生产漂移），**不是逐文件通读**——这一点在收尾里已明确声明（转录 L476）。不落队列的话，"体检做过了"会被下一个 agent 读成"全仓都核过了"。
- **停更已用 git 复核过（2026-08-16，非 agent 自述）**：
  - `remote-hotline-scope.md` / `.zh-CN.md` 最后提交 **2026-03-28**（"replace subagent terminology"），**4 个半月未动**
  - `platform-api-v0.1.md` 2026-08-05 / `.zh-CN.md` 2026-08-02——**中文版落后英文版 3 天**，差异未核
- `architecture.md` 的教训说明风险实在：一份自称"原则级真相源"的文档停在 2026-04-01，对 `service_tier` / `execution_budget` / `acceptance_window` / `delivery_integrity` / 结算 / 信任分级的提及**全部为零**，还把不存在的路径列为真相源。同代文档很可能同病。

## 验收

三组文档各出一条结论；中英差异要么消除要么显式标注哪份为真源。
