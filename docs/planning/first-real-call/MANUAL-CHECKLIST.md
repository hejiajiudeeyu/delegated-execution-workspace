# 人工执行清单（Wave 1–4 全部 `[人工]` 步骤合并版）

> 生成日期：2026-06-12。来源：T-101 / T-104 / T-401 / T-402 / T-403 任务卡 + `T-401-deploy-runbook.md` + 各子仓库 git 实况核查。
> 规则：按阶段顺序执行；每个阶段末尾的「验证」全过才进下一阶段。凡涉及 secrets 的值不要贴进聊天/截图/日志。

## 阶段 0：把代码推上去（一切的前置，今天就能做）

当前实况（2026-06-12 核查）：

| 仓库 | 分支状态 | 要做的事 |
|------|---------|---------|
| client | `main` ahead 1 | `git push` |
| platform | 停在 feature 分支 `codex/billing-p1-m1-1-schema`，未跟踪远端 | **先 merge 回 main 再 push**（见下方警告） |
| brand-site | 停在 `codex/brand-site-strict-args` ahead 1 | merge 回 main 并 push |
| protocol | `main` ahead 3 | `git push` |

- [ ] **⚠️ 最大隐患**：platform 的 Wave 3 计费提交（billing enforcement、余额 API、console 接线）全在 feature 分支上。`images.yml` 按 main 上的 tag 构建——如果不先 merge 就打 `v0.1.x` tag，**发布出去的镜像里没有计费功能**，T-403 的付费调用必然失败。先 merge，再进阶段 2。
- [ ] 四个仓库全部 push 后，回第四仓更新 submodule SHA，跑验证链（这次**不带** `SKIP_ORIGIN_REACHABILITY`）：
  ```bash
  corepack pnpm run check:submodules && corepack pnpm run check:boundaries && \
  corepack pnpm run check:bundles && corepack pnpm run test:contracts && \
  corepack pnpm run test:integration
  ```

## 阶段 1：npm 发布 `@delexec/ops`（T-101，← 最可能失败的阶段）

- [ ] **更新 npm 密钥（你问的问题，答案是：要）**。`publish.yml` 第 26 行用 `secrets.NPM_TOKEN`，token 失效则发布必败。去 npmjs.com → Access Tokens 新建 **Granular Access Token**：
  - Permissions: Packages → **Read and write**，scope 选 `@delexec`（或允许在该 scope 下新建包——`@delexec/ops` 是首次发布）
  - 注意 granular token 有有效期上限，到期前要轮换；记到日历
  - 写入 GitHub `repos/client` 仓库 Settings → Secrets → Actions → `NPM_TOKEN`
  - 长期更优解（可选）：npm Trusted Publishing（OIDC），免 token，但需要小改 workflow——首发不必现在做
- [ ] GitHub → client 仓库 → Actions → "Publish Client Package" → Run workflow，`workspace` 填 `@delexec/ops`
- [ ] **失败风险点**：workflow 在 publish 前先跑 `npm ci && npm test && npm run test:packages`，Ubuntu 上 `better-sqlite3` 原生编译可能失败（断点分析 Minor 项）。若 CI 卡死且短期修不动，T-101 卡允许兜底：本地 `npm publish --workspace @delexec/ops`（需本地 `npm login`）
- [ ] 验证：
  ```bash
  npm view @delexec/ops version
  # 干净目录全局装一遍，复跑 T-101 卡第 4 步的 bootstrap 冒烟
  ```

## 阶段 2：GHCR 镜像公开（T-104）

前置：阶段 0 platform 已 merge + push。

- [ ] 在 platform 仓库打 tag 并 push，触发 `images.yml`：
  ```bash
  git tag v0.1.0 && git push origin v0.1.0
  ```
- [ ] 等 workflow 跑完，GitHub 个人页 → Packages → 对 `rsp-platform`、`rsp-relay`、`rsp-gateway`（以及 compose 引用到的 caller/responder，如 CI 构建了）逐个：Package settings → Danger Zone → **Change visibility → Public**
  - 注：包不存在就改不了可见性——必须先等 tag 构建完成
- [ ] 验证（匿名拉取）：
  ```bash
  docker logout ghcr.io
  docker pull ghcr.io/hejiajiudeeyu/rsp-platform:v0.1.0
  docker pull ghcr.io/hejiajiudeeyu/rsp-relay:v0.1.0
  docker pull ghcr.io/hejiajiudeeyu/rsp-gateway:v0.1.0
  ```

## 阶段 3：VPS 公网部署（T-401，照 `T-401-deploy-runbook.md` 执行）

前置：阶段 2 镜像可匿名拉取；Wave 3 已在镜像内（阶段 0 的 merge）。

- [ ] 准备 VPS：Docker + Compose、开放 80/443、磁盘够用（Postgres/SQLite/Caddy）
- [ ] DNS：域名 A/AAAA 记录指向 VPS
- [ ] 本地 `corepack pnpm run selfhost:init -- --profile public-stack` 生成 4 个强 secrets（TOKEN_SECRET / PLATFORM_ADMIN_API_KEY / PLATFORM_CONSOLE_BOOTSTRAP_SECRET / POSTGRES_PASSWORD），填进 VPS 上的 `.env`
- [ ] `.env` 里 `IMAGE_TAG=v0.1.0`（**不要 latest**）、`BILLING_ENFORCEMENT=enforced`
- [ ] 设公网地址（先 plan 后 confirm）：`selfhost:public-origin -- --profile public-stack --origin https://<域名> --confirm`
- [ ] 启动序列（runbook 第 83-119 行，security-review 有 blocker 即停）：readiness → ports → preflight → security-review → up → 5 个 healthz curl → smoke → onboarding:check → exposure
- [ ] Console 首次 bootstrap；用完处置 bootstrap secret；admin key 走 gateway 凭据流，不留在浏览器
- [ ] `selfhost:backup-plan -- --profile public-stack`
- [ ] 验证：`deployability:exposure` blocker 清零；`test:paid-call-e2e` 绿

## 阶段 4：marketplace 接真实 API（T-402）

前置：阶段 3 公网 platform 在线。

- [ ] 先让 agent 执行 T-402 卡的代码部分（接线方案选型、CORS、空态），这部分**不是**人工步骤
- [ ] `[人工]` 部署 brand-site dist 到 callanything.xyz，生产页截图确认：真实数据或诚实空态，无 DEMO 角标

## 阶段 5：OPC #0 演练（T-403，终点验收）

前置：阶段 1–4 全部完成。

- [ ] 机器 A（Responder=你）：从官网 `npm install -g @delexec/ops` 开始，包装一个真实小能力，submit-review
- [ ] 生产 console（Operator=你）：双审批 + enable，确认 marketplace 出现条目
- [ ] admin 手工给 Caller tenant 充值
- [ ] 机器 B（陌生 Caller，干净环境）：照官网 quick-start-caller 安装 → marketplace 找到 Hotline → 付费调用 → 收到签名结果
- [ ] 对账：caller 余额/ledger 与单价一致；console `/billing` 可见流水
- [ ] **铁律**：全程只看 callanything.xyz 公开文档；每次违规看源码都记录下来。发现缺陷不现场修，记进 `T-403-findings.md` 开新卡

## 各阶段失败概率排序（个人判断）

1. **阶段 1 CI 发布**（token 配置 + better-sqlite3 原生编译 + 首发 scope 权限，三个独立故障源）
2. **阶段 3 VPS**（人工步骤最多，但 gate 工具链完善，失败会被拦住而不是带病上线）
3. **阶段 0 platform merge**（merge 本身简单，但漏做的后果最隐蔽——镜像缺计费）
4. 阶段 2、4、5（机械操作或有 runbook 兜底）
