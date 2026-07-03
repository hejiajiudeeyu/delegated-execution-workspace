# 品牌站定位改版计划 — 开发者基础设施方向

Status: planned（执行时机：Loop M2 零违规彩排通过之后）
Owning repo: `repos/brand-site`（纯前端与文案，不动任何运行时仓库）
Created: 2026-07-04

## 1. 定位

### 一句话

- **中文主定位语**：给 AI Agent 的电话网络。
- **副句**：把任何能力上架成一条热线（Hotline）；任何 Agent 一次调用，拿到签名结果，自动结算。
- **English**: The phone network for AI agents. Publish any capability as a Hotline — any agent can call it once and get a signed result with settled billing.

### 定位逻辑

产品的本质动作是"调用"（Call），不是"浏览商店"也不是"读协议"。所以像 Stripe 讲支付那样讲调用：

- 主叙事 = **开发者基础设施**（调用网络）；
- marketplace 是"网络里真的有东西"的**证据**，不是门面（目录冷启动阶段，商店定位会把空旷摆上首屏）；
- 开放协议与 selfhost 是**二级叙事**（信任与出路：不锁定、可自建），放次级板块，不当主标题。

### 三类访客与各自的一句话

| 访客 | 心里的问题 | 我们的回答 | 去处 |
|------|-----------|-----------|------|
| 能力提供者 | 我的技能/Agent 能不能变现 | 上架成 Hotline，按次收 PTS | Responder quick start |
| Agent 开发者 | 我的 Agent 缺个能力，怎么可靠地调 | 一条命令，签名结果，失败自动退款 | Caller quick start |
| 自建者/企业 | 能不能不依赖你们跑 | 开放协议 + selfhost 部署路径 | Operator / selfhost 文档 |

**首页的唯一 KPI：三类访客在第一屏之内被分流进各自的 quick start。** 这与 Loop 目标（新用户只靠公网资源首次跑通闭环）是同一件事——品牌站现阶段首先是零违规彩排的"公网资源"腿，其次才是营销。

## 2. 叙事结构（首页的逻辑骨架）

**承诺 → 路径 → 原理 → 证据 → 出路**，五段递进：

1. 承诺（Hero）：一句话 + 看得见的一次真实调用；
2. 路径（分流）：三张角色卡，各带第一条命令；
3. 原理（How it works）：四步调用流，解释钱和信任怎么流动；
4. 证据（Proof）：真实 marketplace 条目 + 真实签名结果/结算记录；
5. 出路（Open）：协议开放、可自建，打消锁定顾虑。

## 3. 首页板块划分（自上而下）

### S1 Hero — 承诺 + 实况终端

- 左：主定位语、副句、双 CTA：**「发起第一次调用」**（Caller quick start）/ **「发布你的热线」**（Responder quick start）。
- 右：终端风格演示块（console-mode 的 terminal 令牌已有），内容必须与真实 CLI 输出一致（M2 彩排后用真实产物校对）：

```
$ delexec-ops call-hotline --platform https://callanything.xyz/platform \
    --hotline-id demo-translate --text "把这段话翻成英文" --max-charge-cents 50
✔ hold 50 PTS · responder answered in 3.2s
✔ signature verified (Ed25519)
✔ BILLING_SETTLED · charged 50 PTS
{ "status": "ok", "summary": "Translate this paragraph into English…" }
```

- 现有 heroFacts（四层配色）整块移除出首页。

### S2 三角色分流卡

三张等宽卡片（Responder 橙 / Caller 青 / Operator 黄，语义色只作 accent 条）：标题用访客的自我陈述（"我有能力想变现" / "我的 Agent 需要调用能力" / "我要自己部署一套"），卡内一句价值 + 第一条命令 + 进入对应 quick start 的链接。

### S3 How it works — 四步调用流

复用现有 `callFlowSteps` 素材但改写为用户视角：① Responder 上架 Hotline（核心实现保持私有）→ ② 平台审核后进入 marketplace → ③ Caller 一条命令调用，费用预扣（hold）→ ④ 签名结果返回，成功结算 / 失败自动退款。每步下方一行"钱与信任"注脚（审核上架、Ed25519 签名、hold-settle-refund）。

### S4 Proof — 真实证据带

- Marketplace 实时预览：拉取真实 `/marketplace/hotlines` 的 3–6 条（依赖 TODO 中的字段适配：summary、recommended_for、示例）；
- 一张真实的签名结果 + 结算 ledger 展示（M2 彩排产物，脱敏后使用）；
- 空目录兜底：条目不足时展示"即将上线"占位而非空列表。

### S5 计费一句话

PTS 预付点数模型的三行说明（预扣 → 成功结算 / 失败退款 → 台账可查），链接 /pricing。

### S6 开放与自建（二级叙事）

"协议开放，随时可以自己跑"：链接协议文档与 selfhost 部署指南。黄色 tier 语义在此使用。

### S7 Footer

常规链接 + **Brand / Design System 入口**——现首页的品牌系统、命名对照、架构分层整体搬到 `/brand` 子页保留（对内仍是好材料，不再当门面）。

## 4. 设计语言

- 全面沿用已有 console-mode 令牌体系（纸底、单像素边框、小圆角、Space Grotesk + IBM Plex Mono、状态徽章色），与 platform console、operator 文档形成同一族观感——"网站长得就像这个产品的控制台"本身即是定位表达。
- 四层语义色（绿/蓝/紫/黄）降级为 accent 与角色编码，不再作为内容主体出现在首页。
- 中英双语对等（现有 content.ts / content-en.ts 双轨结构保留），SEO 板块（blog/compare/faq/glossary）不动。

## 5. 执行边界与验收

**范围**：仅 `repos/brand-site` 的首页（App.tsx + content*.ts + 新 /brand 路由）与导航；marketplace 字段适配是独立前置项（TODO.md 已列）。**不改** 协议、运行时、console、quick start 文档结构。

**前置依赖**：
1. M2 彩排通过（拿到真实签名结果/结算截图当证据素材）；
2. marketplace 字段适配完成（S4 才有像样的实时预览）。

**验收清单**：
- [ ] 首屏一屏内完成三角色分流（移动端亦然）；
- [ ] hero 终端演示与真实 CLI 输出逐字段一致；
- [ ] 品牌系统内容在 /brand 可达，首页不再出现配色规范类内容；
- [ ] 中英文案对等，`npm run build` 通过，现有 SEO 路由无回归；
- [ ] 首页所有 CTA 落点均为真实可跑通的 quick start（与零违规彩排使用同一批文档）。

**记账**：brand-site SHA 移动时照常走 change bundle + 四仓校验。

## 6. 与 Loop 的关系

本计划**在当前 loop 边界之外**（不挡付费调用闭环），已在 LOOP.md 挂为 parked 事项。唯一的交叉点：M3.2（hotline stdin 契约附录）会改 quick start 文档，属于 loop 内；本计划不重复做。执行顺位：M2 通过 → marketplace 字段适配 → 本改版。
