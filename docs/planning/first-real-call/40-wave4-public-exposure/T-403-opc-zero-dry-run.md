# T-403 OPC #0：第一条真实 Hotline 上架演练

- 仓库：不改代码（演练卡）；发现的缺陷回 owning 仓库开新卡
- 依赖：T-401、T-402 完成
- 完成标志：「陌生 Caller 付费调用陌生 Responder」第一次在生产真实发生，全程只用公开文档

## 当前状态

已解除 npm / paid-Hotline docs blocker（2026-06-13）：T-401/T-402 已上线，`@delexec/ops@0.1.1` 已发布并通过干净 npm install paid-pricing smoke；中英文 Responder quick start 的生产演练命令已包含 `--fixed-price-cents`、`--currency` 和 `--billing-disclosure-url`，并已部署到 callanything.xyz。下一步是人工执行 OPC #0 演练；演练中仍需严格遵守“只用公开文档，不看源码/第四仓工具”的规则。

2026-06-13 更新：agent-owned 演练记录包已准备好。`T-403-findings.md` 已创建为 draft 模板，只记录 preflight 证据与待填写字段；正式人工演练完成前不得把本卡标为 complete。公开预检已确认 npm 包可见、站点/platform/relay/gateway health 可用、marketplace API 返回诚实空目录、Console HTML 可访问、公开 docs/quick starts/llms 含 bootstrap-first golden path。

2026-06-13 追加：人工演练前发现 Responder quick start 后续步骤仍把 package-first 用户引向 `npm run ops -- ...` 源码命令。已在 `repos/brand-site` 修复并部署：中英文 Responder quick start 的 responder identity、add-hotline、submit-review、status 等步骤现在使用已发布的 `delexec-ops ...` CLI。该修复不代表 T-403 完成；正式人工演练仍需从公开页面实际执行并回填 `T-403-findings.md`。

2026-06-13 再追加：人工演练前又发现 `@delexec/ops@0.1.0` 不能从公开 Responder flow 声明/提交付费 `pricing_hint`。已在 `repos/client` 修复并通过 GitHub Actions 发布 `@delexec/ops@0.1.1`；随后在 `repos/brand-site` 把生产演练 Responder 命令补上 fixed-price pricing flags 并部署到 Aliyun。该修复仍不代表 T-403 完成；正式人工演练必须产生真实 Responder、真实 Caller、operator 审核/充值、Marketplace 可见性、付费调用、余额/ledger 对账证据。

2026-06-14 追加：正式 public-docs rehearsal 第一次尝试在第一步 `npm install -g @delexec/ops@0.1.1` 失败，原因是发布 tarball 在 npm global install 场景下无法给 `better-sqlite3` lifecycle script 提供可用的 `prebuild-install`。已在 `repos/client` 修复全局安装打包路径并发布 `@delexec/ops@0.1.2`；真实 `npm install -g @delexec/ops@0.1.2` smoke 已通过。该修复仍不代表 T-403 完成；需要重新从公开文档启动演练并回填真实生产付费调用证据。

2026-06-14 再追加：重新启动 public-docs rehearsal 后，`delexec-ops auth register --platform https://callanything.xyz/platform` 又暴露 path-prefix bug：CLI 丢掉 `/platform` 前缀并解析 brand-site HTML。已在 `repos/client` 修复 URL join 并发布 `@delexec/ops@0.1.3`；真实 global install + prefixed platform registration smoke 已通过。该修复仍不代表 T-403 完成；需要再次重新从公开文档启动演练并回填真实生产付费调用证据。

## 背景

这是整个计划的终点验收：你自己扮演 OPC #0（第一个 Responder），用另一台机器/账号扮演陌生 Caller。**规则：全程只允许看 callanything.xyz 公开文档，禁止看源码、禁止用第四仓工具。** 每一次违规求助都是一个新断点，要记录。

## 执行步骤

1. `[人工]` Responder 侧（你，机器 A）：
   1. 按官网 quick-start-responder 从 `npm install -g @delexec/ops` 开始
   2. 准备一个真实有用的小能力（建议：你已有的某个脚本/文档服务包装成 `--cmd` hotline）
   3. `submit-review` 提交到生产 platform
2. `[人工]` Operator 侧（你，生产 console）：双审批 + enable，确认 marketplace 页出现该条目
3. `[人工]` 给 Caller 的 tenant 手工充值（admin recharge）
4. `[人工]` Caller 侧（另一台机器/干净环境，机器 B）：
   1. 按官网 quick-start-caller 安装
   2. 在 marketplace 看到 Hotline → 发起付费调用 → 收到签名结果
5. 对账：`/v1/tenants/me/balance` 与 ledger 与预期单价一致；platform console `/billing` 可见这笔流水
6. agent 部分：把演练全程记录（每步耗时、卡点、违规求助点）整理到 `T-403-findings.md`，按 blocker/major/minor 分级，每个发现标注 owning 仓库——这是下一轮计划的输入。

## 验收标准

1. 一笔真实付费调用完成：调用成功 + 扣费正确 + 双端可对账。
2. `T-403-findings.md` 存在，含完整卡点记录与分级。
3. 全程未使用源码知识的步骤清单（或诚实记录哪几步不得不违规）。

## 防跑偏

- 演练中发现缺陷不要现场修，记录下来开新卡——演练的价值就在于暴露真实摩擦。
- Hotline 内容选最小可用的，不要为演练开发新能力。
