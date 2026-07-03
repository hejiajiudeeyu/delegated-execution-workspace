# 品牌站整体路线图（首页改版之外的板块）

Status: planned（排期见 `docs/planning/roadmap-2026H2.md`）
Owning repo: `repos/brand-site`（B2 涉及消费 platform 公开 API，只读，不动运行时）
Created: 2026-07-04

首页定位改版已单独成案（`homepage-repositioning-plan.md`，"开发者基础设施"方向）。本文件覆盖品牌站其余板块，按优先级排列。

## B1 Marketplace 字段适配与详情页完善（最高优先）

**为什么先做**：首页改版的 S4 证据带依赖它；也是访客判断"网络里有没有真东西"的唯一窗口。TODO.md 已列出字段清单，此处补验收口径。

范围：
- 列表与详情页适配 `summary` / `recommended_for` / `not_recommended_for` / `limitations`；
- `input_attachments` / `output_attachments` 附件声明展示；
- `input_examples` / `output_examples` 示例展示（终端风格代码块，与 quick start 观感一致）；
- Template Bundle 面板（`GET /marketplace/hotlines/:id/template-bundle`）：展示调用模板并提供"复制即用"的 `call-hotline` 命令；
- 站内搜索（现有 search-index 基础上纳入 hotline 字段）；
- 空目录/加载/错误三态兜底（沿用 console-mode 状态规范）。

验收：
- [ ] 任一详情页能让 Caller 不离开页面就拼出一条可运行的 `call-hotline` 命令；
- [ ] 字段缺失时降级展示而非空白；
- [ ] zh/en 对等；build 通过。

## B2 文档中心（Docs Hub）v1

**目标**：把"公网资源"从三篇 quick start 扩成体系，但 v1 只做闭环所需的四件事：

1. 导航框架（Quick Starts / Concepts / Reference / Selfhost 四栏）；
2. Concepts：一页讲清 Caller / Responder / Hotline / PTS / hold-settle-refund / 签名结果（首页 S3 的展开版）；
3. Reference v1：`delexec-ops` 命令参考 + hotline 进程 stdin/stdout 契约附录（后者与 Loop M3.2 是同一份内容，M3.2 完成后收编，不重复写）；
4. Selfhost：现有 public-stack 部署指南的站内化链接（不搬运内容，防止双真相源）。

明确不做（v1）：Protocol 协议全文站内化、Client SDK 文档、API Reference 全集——等 T-505 门户方向定了再排。

验收：
- [ ] 三篇 quick start 从新导航两跳内可达；
- [ ] 彩排中"除 quick start 外还需要查的问题"在 Concepts/Reference 里有答案（以 M2/M3 彩排摩擦清单为测试集）。

## B3 Pricing 页实义化

现状是占位。v1 只需三块：PTS 模型说明（预扣/结算/退款）、Caller 侧费用如何被 `--max-charge-cents` 与 pricing hint 约束、Responder 侧收益与提现现状的诚实说明（法币提现未开放就明说 out of scope）。

## B4 Playground 定位决策

两个选项，改版前必须二选一：
- a) 接真实 demo hotline（echo/translate 类，自营种子之一），变成"零安装先试一次"的转化器；
- b) v1 先从导航摘除，避免半成品损伤可信度。
倾向 a，但依赖运营侧种子热线就位（见冷启动计划 O1），否则执行 b。

## B5 /brand 子页迁移

首页改版的伴随项：现品牌系统/命名/架构内容整体迁至 `/brand`，footer 入口，内容不改写。

## 依赖与顺序

B1 → 首页改版（同一批次可并行开工，B1 先合）→ B2 → B3/B4/B5（轻量，随批搭车）。全部在 M2 彩排通过后启动；每次 brand-site SHA 移动照常走 bundle + 四仓校验。
