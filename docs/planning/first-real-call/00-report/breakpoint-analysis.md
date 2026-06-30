# 断点分析汇报：陌生 Responder 上线 + 陌生 Caller 付费调用

> 生成日期：2026-06-11
> 分析方法：三路只读探查（client / platform / brand-site）+ 外部事实验证（npm registry、GHCR、callanything.xyz）+ 提交历史审计
> 核心问题：**一个陌生人按公开文档，今天会在第几步卡死？**

## 一、结论速览

| 路径 | 今天能否走通 | 卡死位置 |
|------|-------------|---------|
| 官网/README 承诺的 `npm install -g @delexec/ops` | **不能** | 第 1 步：npm 404，包未发布 |
| 克隆 client 源码 + `npm run ops -- bootstrap` 本地闭环 | **能**（有集成测试背书） | — |
| 官网 quick-start 分步 curl 手册 | **不能可靠走通** | 多处命令/字段/flag 与实现不符 |
| Responder 把 Hotline 发布到自托管 platform 目录 | **pilot 级可行** | 需 operator 双审批，需自跑 platform |
| 陌生 Caller 对该 Hotline 完成**付费**调用 | **不能** | 计费 enforcement 未接入调用主路径 |
| 陌生人 `docker compose pull` 自托管 platform | **不能** | GHCR 五个镜像匿名拉取全部 403 |
| 公网 marketplace 看到真实可调用 Hotline | **不能** | 默认展示 3 条虚构 mock 条目 |

**一句话**：本地源码闭环已经真实可用、质量不低；但「陌生人路径」的第 1 步（安装）和最后 1 步（付费）都是断的，中间的官网手册还有 6 处会让人原地报错的文档错误。

## 二、已验证的外部事实

1. `@delexec/contracts@0.1.1` 已发布到 npm ✅
2. `@delexec/ops` 在 npm 上 **404** ❌（README/官网主推安装命令）
3. `ghcr.io/hejiajiudeeyu/rsp-{platform,relay,caller,responder,gateway}` 匿名拉取全部 **HTTP 403** ❌（镜像私有或不存在，compose 默认引用它们）
4. callanything.xyz 及 /docs/quick-start-*、/marketplace/ 均 **200 在线** ✅
5. brand-site marketplace 无后端时回退到 **3 条虚构 Hotline**（带 healthy 徽章）

## 三、断点总表（按致命程度）

### Blocker（不修复则目标不可能达成）

| # | 断点 | 证据 | 修复仓库 |
|---|------|------|---------|
| B1 | `@delexec/ops` 未发布 npm，所有「一条命令安装」承诺落空 | `repos/client/apps/ops/package.json`、`.github/workflows/publish.yml` 存在但未跑通发布 | client |
| B2 | 调用链路无计费 enforcement：token 签发/delivery 不查余额、不调 `applyBalanceDelta` | `repos/platform/apps/platform-api/src/server.js`（token 路径 2258–2396 行无 billing）；`packages/billing-store/src/index.js` 已实现但未被调用 | platform |
| B3 | 无终端用户充值通道：仅 admin 手工 `POST /v1/admin/billing/.../recharges` | `server.js` 2772–2807 | platform（+client UX） |
| B4 | GHCR 镜像不可匿名拉取，自托管第一步 `compose pull` 即失败 | 本机验证 5 镜像全 403；`deploy/public-stack/docker-compose.yml` 为 registry-only | platform（CI/包可见性） |
| B5 | 官网 Responder 手册 CLI flag 错误（`--command`/`--endpoint`，实际 `--cmd`/`--url`），照抄必报错 | `brand-site/src/app/pages/Docs/QuickStartResponder.tsx:127-137` vs `client/apps/ops/src/cli.js:45-46,488-494` | brand-site |
| B6 | 官网 Caller 手册 session 初始化错误（空 body 调 setup、取 `.session` 应为 `.token`） | `QuickStartCaller.tsx` vs `client/apps/ops/src/supervisor.js:2312-2346` | brand-site |

### Major（可演示，但产品级体验/商业化受阻）

| # | 断点 | 证据 | 修复仓库 |
|---|------|------|---------|
| M1 | 全局安装后 `ui start` / MCP adapter 依赖源码树：`CLIENT_ROOT` 路径错误、`caller-skill-mcp-adapter` 未进 bundleDependencies | `cli.js:26-27,271-303`；`apps/ops/package.json` | client |
| M2 | ops-console Vite 代理端口写死 8079，文档却教用户用 8179/8189 | `apps/ops-console/vite.config.ts:14-35` | client |
| M3 | 环境变量 `PLATFORM_API_BASE_URL` 残留导致 bootstrap 误入 platform 模式卡死 | `cli.js:1148-1150,1272-1317` | client |
| M4 | 官网 Responder 手册用未定义的 `$OPS_SESSION`、HTTP 注册字段名 `email` 应为 `contact_email` | `QuickStartResponder.tsx:109-113`；`supervisor.js:2551` | brand-site |
| M5 | marketplace 默认展示 3 条虚构 mock Hotline 且带 healthy 徽章，伪装成真实目录 | `brand-site/src/app/marketplace-data.ts:118-299` | brand-site + platform |
| M6 | Caller 侧余额/报价 API（RFC 规划的 `/v1/tenants/*`）未实现 | `server.js` 路由表 | platform |
| M7 | Billing console 读模型已有，但 `main.js` 未接 `/billing` 路由 | `apps/platform-console/src/view-model.js:22-34` | platform |
| M8 | 文档入口三分裂：官网教克隆第四仓、README 教 npm 全局、中文 README 不提 bootstrap | 三处对照 | brand-site + client |
| M9 | marketplace 无联邦同步：自托管 catalog 与 callanything.xyz 互不相通 | `server.js:2147-2213` 无 sync 代码 | platform + brand-site |

### Minor（不阻断，记录在案）

- `responder register` 别名语义误导（实际是 submit-review）— client
- `better-sqlite3` native 编译可能失败 — client
- caller-skill-adapter 硬编码本机可读路径 `/Users/hejiajiudeeyu/...` — client
- 文档中心二十余篇仅 6 篇有正文 — brand-site
- 密钥轮换、目录搜索、`delivery_observation_window_s` 等 pilot 缺口 — platform

## 四、投入比例审计（你问题的后半句）

第四仓最近 40 个提交中，**约 36 个（90%）是 deployability 元工具**（命令、gate、menu、PRD 投影、profile 过滤等），它们全是只读投影，不修复上表任何一个 Blocker。

- client 近 30 提交：约 60% 是真实产品面（ops-console UI、bootstrap 闭环）✅ 方向正确
- platform 近 25 提交：billing 地基（schema/store/admin 读模型）+ console，**方向正确但停在了"接线前一步"**
- brand-site：站点先于产品成熟，是当前最大的诚信风险源

**判断**：你不缺基础设施、不缺验证链、不缺规划文档。缺的是把已经建好的零件**接到陌生人路径上**的最后几根线。接下来若继续在第四仓加 deployability 命令，边际价值约等于零。

## 五、修复战役顺序（详见各 wave 文件夹）

```
Wave 1  安装路径修通（client + platform CI）
        npm 发布 @delexec/ops；GHCR 镜像公开；修全局安装的 3 个 client bug
        → 陌生人能"一条命令"装上并跑通本地闭环

Wave 2  官网诚信对齐（brand-site）
        修 6 处文档错误；mock marketplace 明示；统一 golden path 为 bootstrap-first
        → 陌生人照官网手册不会原地报错、不会被虚构条目误导

Wave 3  第一笔付费调用（platform 为主）
        计费 enforcement 接入 token 主路径；Caller 余额 API；billing console 接线
        充值先用 admin 手工通道（不做 Stripe）
        → 一笔真实调用能扣到钱、能看到账

Wave 4  公网首发（运维 + 全仓库）
        VPS 部署 public-stack（真实域名+secrets）；brand-site 挂真实 marketplace API；
        你自己作为 OPC #0 上架第一条真实 Hotline
        → "陌生 Caller 付费调用陌生 Responder" 第一次真实发生
```

依赖关系：Wave 1 与 Wave 2 可并行；Wave 3 依赖 Wave 1（验证用）；Wave 4 依赖前三个全部完成。

## 六、明确不做的事（防跑偏）

1. **不再新增** `deployability:*` / `selfhost:*` 命令，除非某个 Wave 任务明确需要。
2. **不做 Stripe/支付宝**。第一笔付费调用用 admin 手工充值通道完成即可证明闭环。
3. **不做 marketplace 联邦同步**（M9）。公网先只有一个 platform 实例，brand-site 直连它。
4. **不补全文档中心**二十余篇占位文章。只修会让人报错的那几页。
5. **不动 protocol 仓库**，除非 Wave 3 计费需要新增协议字段（任务卡里有判断步骤）。
