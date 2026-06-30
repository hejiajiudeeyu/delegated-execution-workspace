# first-real-call 战役计划

目标：让「陌生 Responder 上线 + 陌生 Caller 付费调用」第一次真实发生。

断点分析与依据见 `00-report/breakpoint-analysis.md`。

## 文件夹结构

```
00-report/                  断点分析汇报（为什么做这些）
10-wave1-install/           Wave 1：安装路径修通
20-wave2-honest-docs/       Wave 2：官网诚信对齐
30-wave3-first-paid-call/   Wave 3：第一笔付费调用
40-wave4-public-exposure/   Wave 4：公网首发
50-wave5-operator/          Wave 5：Operator 公网 console 流程
```

每个 wave 文件夹内是编号任务卡（`T-xxx-*.md`）。任务卡按编号顺序执行；卡内标注了可并行的例外。

## 怎么用便宜的 API agent 执行任务卡

给执行 agent 的提示词模板（每张卡一个独立会话，不要混卡）：

```
你在仓库 /Users/hejiajiudeeyu/Documents/Projects/delegated-execution-dev 中工作。
先完整阅读这两个文件，再开始：
1. docs/planning/first-real-call/README.md（本文件，了解规则）
2. docs/planning/first-real-call/<wave 目录>/<任务卡文件名>
严格按任务卡的【执行步骤】操作，不要做卡外的事。
完成后逐条核对【验收标准】，把每条的核对结果（命令+输出摘要）写进回复。
任何一步与卡内描述不符时，停下来报告差异，不要自行绕过。
```

## 所有执行 agent 必须遵守的硬规则

1. **业务改动只发生在 owning 仓库**（`repos/client`、`repos/platform`、`repos/brand-site`、`repos/protocol`）。第四仓只改编排、change bundle、文档。
2. **顺序**：owning 仓库改动并提交 → 第四仓更新 submodule SHA → 在 `changes/` 新增 change bundle YAML（抄 `changes/CHG-template.yaml`，编号顺延）→ 跑第四仓验证。
3. **第四仓验证链**（声称完成前必须全绿）：
   ```bash
   corepack pnpm run check:submodules
   corepack pnpm run check:boundaries
   corepack pnpm run check:bundles
   corepack pnpm run test:contracts
   corepack pnpm run test:integration
   ```
   若 owning 仓库提交尚未 push 到远端，用 `SKIP_ORIGIN_REACHABILITY=1` 跑并在回复中注明「本地未推送验证」。
4. **快速回路**用 `corepack pnpm run test:fast`（约 15s）；owning 仓库内部用各自的 `npm test` / 任务卡指定命令。
5. **不要**新增 `deployability:*` / `selfhost:*` 命令；**不要**在第四仓复制业务源码；**不要**为绕过失败修改验证脚本。
6. 涉及 npm publish、GHCR 包可见性、VPS、域名、secrets 的步骤是 **人工步骤**，任务卡里标了 `[人工]`——agent 只准备到位并输出操作清单，不得自行执行发布类动作。
7. 改完代码必须跑任务卡指定的测试；新增行为补最小测试，不要顺手重构。

## 任务总览

| 卡 | 标题 | 仓库 | 依赖 |
|----|------|------|------|
| T-101 | 发布 `@delexec/ops` 到 npm（含打包修复） | client | — |
| T-102 | 修 ops-console 代理端口写死 8079 | client | — |
| T-103 | 修 `PLATFORM_API_BASE_URL` 残留误判 | client | — |
| T-104 | GHCR 镜像公开可拉取 | platform | — |
| T-201 | 修官网 Responder quick-start 文档错误 | brand-site | — |
| T-202 | 修官网 Caller quick-start 文档错误 | brand-site | — |
| T-203 | 统一 golden path 为 bootstrap-first | brand-site + client | T-101 |
| T-204 | marketplace mock 诚信化 | brand-site | — |
| T-301 | 计费 enforcement 接入调用主路径 | platform | — |
| T-302 | Caller 侧余额查询 API | platform | T-301 |
| T-303 | billing console 接入 `/billing` 路由 | platform | T-301 |
| T-304 | 付费调用端到端联调脚本 | 第四仓 | T-301,T-302 |
| T-401 | public-stack 公网部署清单 | platform + 人工 | Wave1-3 |
| T-402 | brand-site 接真实 marketplace API | brand-site | T-401 |
| T-403 | OPC #0：第一条真实 Hotline 上架演练 | 全部 | T-401,T-402 |
| T-404 | Public docs relay onboarding | brand-site | T-403 |
| T-405 | Public paid-call CLI (`call-hotline`) | client + brand-site | T-404 |
| T-406 | Public-docs CLI rehearsal | brand-site + 人工 | T-405 |
| T-407 | Expired paid hold refund | platform | T-406 |
| T-501 | 生产 `/console/` gateway 路由 | platform + 人工 | T-407 |
| T-502 | Operator Quick Start 公开文档 | brand-site | T-501 |
| T-503 | Operator console 端到端演练 | 全部 + 人工 | T-501,T-502 |

并行建议：T-101～T-104 与 T-201/T-202/T-204 全部可并行（不同仓库不同文件）；T-301 可与 Wave 1/2 并行开工。Wave 5 三张卡必须顺序执行（T-501 → T-502 → T-503）。
