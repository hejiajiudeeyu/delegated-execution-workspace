# T-503 Operator Console Rehearsal

- 仓库：不改业务代码（演练卡）；发现缺陷回 owning 仓库开新卡
- 依赖：T-501、T-502 完成
- 完成标志：新 Responder + 新 Caller + Operator **仅经 `/console/` 与三份公开 quick start** 完成一笔生产付费调用；`T-503-findings.md` 中 **operator rule violations 为空**

## 背景

Wave 5 终验收：把 T-403 最大 operator violation（SSH + admin API）关闭，同时证明 T-404/T-405/T-502 文档与生产 console 合在一起仍通。

Grilling 共识：**实用型 replay** — 允许同一人、同一台机器分饰 Responder / Caller / Operator，但必须是 **三个新的生产身份**。

## Rule Of The Run

| 角色 | 允许 | 禁止 |
| --- | --- | --- |
| **Responder** | `https://callanything.xyz/docs/quick-start-responder/` + `npm install -g @delexec/ops@<published>` | 源码、第四仓工具、admin API |
| **Caller** | `https://callanything.xyz/docs/quick-start-caller/` + 已发布 npm 包 | 同上 |
| **Operator** | `https://callanything.xyz/docs/quick-start-operator/` + `https://callanything.xyz/console/` + 部署 `.env` 中的 bootstrap/admin 凭据 | SSH、直连 `/v1/admin/*` curl、platform 私有 runbook |

**不算 violation**：Operator 从 Aliyun `.env` 私下读取 bootstrap secret / admin API key 并在 console UI 输入。

**算 violation**：任何 operator 步骤需 SSH 或 admin curl 才能完成。

演练中 **不要现场修生产**；记录 findings，演练后开卡。

## 执行步骤

1. `[人工]` 创建 evidence 目录，例如 `/tmp/delexec-t503-<UTCSTAMP>/`；保存三份公开 docs HTML snapshot。
2. `[人工]` **Responder**（机器 A 或隔离 temp prefix）：
   - 按 Responder quick start 从 global npm install 开始
   - 提交 **新的** paid Hotline（最小 process/`--cmd` 能力即可；用 `--cwd "$PWD"`）
   - `submit-review` 后停止，等待 operator
3. `[人工]` **Operator**（仅 console + Operator quick start）：
   - 打开 `/console/`，按 Operator quick start 完成 session + credential
   - Reviews：approve responder + hotline，enable
   - 确认 Marketplace 公开可见新 Hotline
4. `[人工]` **Caller**（隔离 env；可与 Responder 同主机）：
   - 按 Caller quick start 注册 **新** Caller
5. `[人工]` **Operator**（继续 console）：
   - Billing：为新 Caller `user_id` create tenant + manual recharge
6. `[人工]` **Caller**：
   - 启动 caller runtime（公开文档方式）
   - `delexec-ops call-hotline` 调用 **步骤 2 的新 Hotline**
7. `[人工]` 对账：signed result、`BILLING_SETTLED`、balance/ledger 与定价一致；Operator 在 console Billing 区能看到 ledger 证据。
8. Agent 部分：把全程写入 `T-503-findings.md`（模板见同目录）；分级 blocker/major/minor，标注 owning repo。

## 验收标准

1. 一笔 **新** Hotline 的生产付费调用成功（signed `ok` result + 正确扣费）。
2. Responder 与 Caller 路径 **零** public-docs rule violations。
3. Operator 路径 **零** rule violations（无 SSH、无 admin curl）。
4. `T-503-findings.md` 存在，含 step log、metadata、completion checklist。
5. 演练中发现的缺陷 **未** 在演练中修复；每条有 proposed follow-up 与 owning repo。

## 防跑偏

- 不要复用 OPC0 Hotline 作为唯一证明（除非 Responder 步骤仍要求新 submit-review 且新 request id）。
- 不要把 bootstrap/admin secret 写入 findings 或任务卡。
- 本卡完成 **不等于** self-host 完整 operator 手册完成——仅证明 callanything.xyz hosted operator 公开路径。
