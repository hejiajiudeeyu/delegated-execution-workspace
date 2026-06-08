# 本地开发准备

> 英文版：[./local-dev-setup.md](./local-dev-setup.md)
> 说明：中文文档为准。

## 前置要求

- Node.js >= 20
- 已启用 corepack（`corepack enable`）
- pnpm 10.x（通过 corepack 管理）
- Docker（用于 platform 部署）
- 支持 submodule 的 Git

## 安装步骤

1. 克隆并初始化子模块：

```bash
git clone <repo-url>
cd delegated-execution-dev
git submodule update --init --recursive
```

2. 安装工作区依赖：

```bash
corepack pnpm install
```

3. 创建环境文件：

```bash
cp repos/platform/deploy/platform/.env.example repos/platform/deploy/platform/.env
# 按本地配置修改 .env
```

4. 运行第四仓校验：

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

5. 启动本地源码集成：

```bash
# 一键托管本地 loop：
corepack pnpm run dev:local:plan
corepack pnpm --silent run dev:local:plan -- --json
corepack pnpm run dev:local:up
corepack pnpm --silent run dev:local:up -- --json
corepack pnpm run dev:local:status
corepack pnpm --silent run dev:local:status -- --json

# 如果你想拆成多个终端，也可以用底层命令：
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
```

`dev:local:up` 会初始化 `platform` self-host profile，托管启动 standalone relay，
运行一次 client bootstrap，并托管启动 ops supervisor。pid 和日志都写在
`.run/local-stack/`。

停止托管本地 loop：

```bash
corepack pnpm run dev:local:down
corepack pnpm --silent run dev:local:down -- --json
```

查看托管进程日志：

```bash
corepack pnpm run dev:local:logs -- --service relay --tail 80
corepack pnpm run dev:local:logs -- --service supervisor --tail 80
corepack pnpm --silent run dev:local:logs -- --service supervisor --tail 80 --json
```

`dev:local:plan -- --json` 会输出启动顺序和托管 service 文件，但不启动服务、
不读取 secrets。`dev:local:up -- --json` 会输出启动步骤状态，但不打印 child command
stdout。`dev:local:status -- --json` 会输出 relay / supervisor 的托管状态和后续验证命令。
`dev:local:logs -- --json` 只输出日志文件 metadata，不打印 raw log lines，因为本地
agent 和 supervisor 日志可能包含敏感 runtime 输出。`dev:local:down -- --json` 会输出
停止步骤状态，但不打印 child command stdout。

检查日常本地栈健康状态：

```bash
corepack pnpm run deployability:overview
corepack pnpm --silent run deployability:overview -- --json
corepack pnpm run deployability:quickstart
corepack pnpm --silent run deployability:quickstart -- --json
corepack pnpm run deployability:safety
corepack pnpm --silent run deployability:safety -- --json
corepack pnpm run deployability:doctor
corepack pnpm --silent run deployability:doctor -- --json
corepack pnpm run deployability:dashboard
corepack pnpm --silent run deployability:dashboard -- --json
corepack pnpm run deployability:dashboard -- --profile public-stack
corepack pnpm --silent run deployability:dashboard -- --profile public-stack --json
corepack pnpm run deployability:action-plan
corepack pnpm --silent run deployability:action-plan -- --json
corepack pnpm run deployability:action-plan -- --list-profiles
corepack pnpm --silent run deployability:action-plan -- --list-profiles --json
corepack pnpm run deployability:action-plan -- --profile public-stack
corepack pnpm --silent run deployability:action-plan -- --profile public-stack --json
corepack pnpm run deployability:commands
corepack pnpm --silent run deployability:commands -- --json
corepack pnpm run deployability:runbook
corepack pnpm --silent run deployability:runbook -- --json
corepack pnpm run deployability:menu
corepack pnpm --silent run deployability:menu -- --json
corepack pnpm run deployability:commands -- --profile public-stack
corepack pnpm --silent run deployability:commands -- --profile public-stack --json
corepack pnpm run compat:status
corepack pnpm --silent run compat:status -- --json
corepack pnpm run deployability:handoff
corepack pnpm --silent run deployability:handoff -- --json
corepack pnpm run deployability:handoff -- --profile public-stack
corepack pnpm --silent run deployability:handoff -- --profile public-stack --json
corepack pnpm run test:deployability
corepack pnpm run test:deployability-operations
corepack pnpm run dev:doctor
corepack pnpm --silent run dev:doctor -- --json
corepack pnpm run test:agent-e2e
corepack pnpm run mcp:golden-four
corepack pnpm run test:local-stack
corepack pnpm run test:selfhost-kit
```

`deployability:overview` 是 local、self-host、public-stack、onboarding 和
published-image 路径的只读命令地图。JSON 形式会列出管线命令和安全说明，但不读取
`.env`、不调用 Docker、不探测网络，也不打印 secret 值。

`deployability:quickstart` 是 fresh checkout 的只读首次使用指南。它按顺序列出
daily development、self-host platform、public-stack 公开暴露复核和 release-image
复核路径，但不执行这些命令。JSON 形式输出同一组 track 和 step metadata，不读取
`.env`、不调用 Docker、不探测网络、不打印 secret 值。

`deployability:safety` 是只读命令姿态矩阵。它说明哪些 deployability 命令是只读、
会写文件、会启动或停止服务、会调用 Docker、会探测网络，或会输出私有终端文本。
JSON 形式适合 dashboard 消费，且不读取 `.env`、不调用 Docker、不探测网络、不打印
secret 值。

`deployability:doctor` 是只读 deployability 对齐快照。它会在 operator 进入具体
管线诊断前检查 compatibility ledger、顶层 scripts、文档、brand-site file alignment、
brand-site deployability content smoke 和 safety contract。JSON 形式输出 checks、
blockers、warnings、evidence 和下一步命令，但不读取 `.env`、不调用 Docker、
不探测网络、不打印 secret 值。

`deployability:dashboard` 是给 dashboard 和 CI 使用的只读聚合 payload。它会组合
overview、quickstart、safety、doctor、compatibility JSON sections 和 per-pipeline
summaries，但不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secret
值。各 profile 自己的 readiness、preflight、status、smoke 和 audit 命令仍然是权威 gate。
这些 per-pipeline summaries 与 `deployability:overview`、`deployability:handoff`
共用同一个第四仓 metadata builder，让命令数和安全门禁计数在 docs、dashboard JSON
和 handoff 报告之间保持一致。

`deployability:profiles` 是给 operator、dashboard、CI 和管理脚本使用的专用只读
profile catalog。它从 dashboard `profile_summaries` 和共享第四仓 profile registry
派生 profile cards，输出 aliases、labels、所属 pipeline keys、status、counts、
next commands、next JSON commands、safety notes、共享 `attention` metadata 和顶层
`recommended_profile_keys`，同时不读取 `.env`、不调用 Docker、不绑定端口、
不探测网络、不打印 secrets。当管理面只需要一张卡时，可以用
`corepack pnpm run deployability:profiles`、
`corepack pnpm --silent run deployability:profiles -- --json`，或
`--profile public-stack` / 其他 profile key / alias；未知 profile 会返回
blockers，而不是回退成全部 profiles。

`deployability:action-plan` 是给 operator 使用的只读下一步动作选择器。它会把
dashboard 和命令目录合成 profile 级 recommended commands、dashboard-safe
commands、public-exposure gates、service-touching commands、safety notes 和
next JSON commands、profile `attention` metadata 和顶层 `recommended_profile_keys`，
同时不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、不打印 secrets。
dashboard 可以用 `attention.rank`、`attention.level` 和 `attention.reasons`
排序 profile cards，并标出 public-exposure gates，而不需要从命令列表里重新推断风险。
当 operator 或 dashboard 需要先获得支持的 profile keys、aliases、pipeline keys
和 purposes 时，可以先用 `--list-profiles` 或 `--profiles`，该模式不会调用
dashboard 或 command catalog。
同一个 selector 也会出现在 `deployability:quickstart`、`deployability:safety`
和 `deployability:commands -- --track daily_dev` 里，方便管理面在渲染聚焦
action plan 前自动发现 profile 选择器。
当 operator 只需要某一条路径时，可以用 `--profile public-stack` 或其他 profile
key / alias 聚焦输出。JSON 形式会包含 `profile_filter`，未知 profile 会以 blocker
返回。

`deployability:commands` 是给人、dashboard 和 CI 使用的只读命令目录。它会把
overview、quickstart 和 safety metadata 合并成一张列表，并支持按 category、posture、
首次使用 track 或 pipeline 过滤；JSON 形式会包含 `filters.profiles`，输出支持的
profile keys、aliases、所属 pipeline keys 和 purposes，让 dashboard 可以直接从命令
目录渲染 profile selector。它也支持 `--profile <key-or-alias>` 作为 pipeline filter
的 operator-friendly alias 层，所以 `--profile public-stack` 只返回 public-stack
命令目录，未知 profile 会以干净 blocker 返回。带 profile 参数的命令变体会继承基础
命令的安全姿态。它不读取 `.env`、不调用 Docker、不绑定端口、不探测网络、不打印
secret 值。

`deployability:runbook` 是单个 profile 的只读阶段化 runbook 投影。当 operator 或
dashboard 需要在复制命令前看到 inspect、gate、start、verify、operate、evidence
顺序时，可以使用 `corepack pnpm run deployability:runbook`、
`corepack pnpm --silent run deployability:runbook -- --json`，或
`--profile public-stack` / 其他 profile key / alias。它复用
`deployability:profiles` 和 `deployability:commands`，让 public exposure gate 位于
startup 之前，未知 profile 返回 blocker，并且不读取 `.env`、不调用 Docker、
不绑定端口、不探测网络、不打印 secret 值。

`deployability:menu` 是给人和管理 UI 使用的只读第一屏 operator menu。当界面需要在
一个 payload 中展示 profile choices、attention、primary command、runbook、
action-plan、dashboard、handoff 和 command catalog 入口时，可以使用
`corepack pnpm run deployability:menu`、
`corepack pnpm --silent run deployability:menu -- --json`，或
`--profile public-stack` / 其他 profile key / alias。它是现有 deployability metadata
的便利投影，未知 profile 返回干净 blocker，并且不读取 `.env`、不调用 Docker、
不绑定端口、不探测网络、不打印 secret 值。

`deployability:dashboard -- --json` 和 `deployability:handoff -- --json` 也会把
同一份目录作为顶层 `profile_selector` 输出，让 dashboard、交接工具和管理脚本不需要
知道命令目录内部 section 路径，也能渲染 profile 选择器。
两个命令也支持 `--profile <key-or-alias>` 聚焦管理 payload；聚焦模式会通过
`profile_filter` 记录 requested / resolved profile，把命令目录和 pipeline summaries
限制到所属 pipeline，同时让 `ecosystem_readiness` 继续表示全局 daily-deployable
scorecard。focused public-stack 示例可从 `deployability:quickstart` 和
`deployability:commands -- --track daily_dev` 发现。
两个 payload 也包含 `profile_summaries`，这是派生出的 profile-card 数组，会把
profile aliases / purpose 与 pipeline status、counts、next commands、safety notes
和 `deployability:action-plan` 使用的同一套 `attention` metadata 合并在一起。
dashboard 可以用顶层 `recommended_profile_keys` 或每张卡的 `attention.rank` 排序，
不必再单独调用 action-plan 命令。

`compat:status` 是只读兼容台账快照。它会把当前 submodule gitlinks 和最新
`changes/CHG-*.yaml` 对齐检查，把 dirty submodule worktree 报成 warnings，并把
ledger mismatch 保持为 blockers。JSON 形式不读取 `.env`、不调用 Docker、不探测网络、
不打印 secret 值。

`deployability:handoff` 会把不含 secret 的 Markdown 交接报告写入
`exports/deployability/`；也可以通过 `--output` 指定路径。报告聚合当前 bundle、
兼容 warnings、命令地图、shared per-pipeline summaries、安全说明和下一步验证命令。JSON
形式会写同一份报告并输出 metadata，不读取 `.env`、不调用 Docker、不探测网络、不打印
secret 值。

`dev:doctor -- --json` 会用干净 JSON 输出本地前置条件、runtime health、
caller-skill manifest / search 检查、blockers 和下一步命令。它不会打印 raw
service logs 或 secret 值。

初始化并检查 self-host profile：

```bash
corepack pnpm run selfhost:profiles
corepack pnpm --silent run selfhost:profiles -- --json
corepack pnpm run selfhost:quickstart
corepack pnpm --silent run selfhost:quickstart -- --json
corepack pnpm run selfhost:readiness -- --all
corepack pnpm --silent run selfhost:readiness -- --all --json
corepack pnpm run selfhost:readiness
corepack pnpm --silent run selfhost:readiness -- --json
corepack pnpm run selfhost:doctor
corepack pnpm --silent run selfhost:doctor -- --json
corepack pnpm run selfhost:init
corepack pnpm --silent run selfhost:init -- --json
corepack pnpm run selfhost:summary
corepack pnpm --silent run selfhost:summary -- --json
corepack pnpm run selfhost:plan
corepack pnpm --silent run selfhost:plan -- --json
corepack pnpm run selfhost:urls
corepack pnpm --silent run selfhost:urls -- --json
corepack pnpm run selfhost:ports
corepack pnpm --silent run selfhost:ports -- --json
corepack pnpm run selfhost:preflight
corepack pnpm --silent run selfhost:preflight -- --json
corepack pnpm run selfhost:up
corepack pnpm --silent run selfhost:up -- --json
corepack pnpm run selfhost:status
corepack pnpm --silent run selfhost:status -- --json
corepack pnpm run selfhost:logs
corepack pnpm --silent run selfhost:logs -- --json
corepack pnpm run selfhost:down
corepack pnpm --silent run selfhost:down -- --json
corepack pnpm run selfhost:smoke
corepack pnpm --silent run selfhost:smoke -- --json
corepack pnpm run selfhost:security-review
corepack pnpm --silent run selfhost:security-review -- --json
corepack pnpm run selfhost:config
corepack pnpm --silent run selfhost:config -- --json
```

Public operator stack：

```bash
corepack pnpm run selfhost:quickstart -- --profile public-stack
corepack pnpm --silent run selfhost:quickstart -- --profile public-stack --json
corepack pnpm run selfhost:readiness -- --profile public-stack
corepack pnpm --silent run selfhost:readiness -- --profile public-stack --json
corepack pnpm run selfhost:doctor -- --profile public-stack
corepack pnpm --silent run selfhost:doctor -- --profile public-stack --json
corepack pnpm run selfhost:init -- --profile public-stack
corepack pnpm --silent run selfhost:init -- --profile public-stack --json
corepack pnpm run selfhost:summary -- --profile public-stack
corepack pnpm --silent run selfhost:summary -- --profile public-stack --json
corepack pnpm run selfhost:plan -- --profile public-stack
corepack pnpm --silent run selfhost:plan -- --profile public-stack --json
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm --silent run selfhost:urls -- --profile public-stack --json
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm --silent run selfhost:ports -- --profile public-stack --json
corepack pnpm run selfhost:preflight -- --profile public-stack
corepack pnpm --silent run selfhost:preflight -- --profile public-stack --json
corepack pnpm run selfhost:up -- --profile public-stack
corepack pnpm --silent run selfhost:up -- --profile public-stack --json
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json
corepack pnpm run selfhost:status -- --profile public-stack
corepack pnpm --silent run selfhost:status -- --profile public-stack --json
corepack pnpm run selfhost:logs -- --profile public-stack
corepack pnpm --silent run selfhost:logs -- --profile public-stack --json
corepack pnpm run selfhost:down -- --profile public-stack
corepack pnpm --silent run selfhost:down -- --profile public-stack --json
corepack pnpm run selfhost:smoke -- --profile public-stack
corepack pnpm --silent run selfhost:smoke -- --profile public-stack --json
corepack pnpm run selfhost:config -- --profile public-stack
corepack pnpm --silent run selfhost:config -- --profile public-stack --json
```

`selfhost:up` 会自动先运行同一组 preflight gate。若 public origin 或 secret
hygiene 未通过，默认不会继续启动；只有显式传入 `--force` 才会绕过该阻断。
`selfhost:preflight -- --json` 保持同一套 gate 和 exit-code 语义，同时输出机器可读
的 secret hygiene、compose config、routes、blockers 和 notes，供 dashboard 或部署脚本消费。

`selfhost:up -- --json` 保持相同的 init、preflight 和 Docker compose 启动序列，
同时输出机器可读的 init、preflight、compose-up、blockers 和 notes。JSON 形式会刻意
省略 init、preflight 和 Docker compose up stdout，因为命令输出可能包含敏感值。

`selfhost:init -- --json` 会创建或 harden 选定 profile 的 `.env`，并输出干净的机器可读
metadata：action、changed files、secret hygiene 状态、warnings 和下一步命令。
它不会打印生成后的 secret 值，也不会混入 Platform API / Console 这类 URL 文本行。

`selfhost:status` 是 profile 启动后的 runtime 管理快照。它会调用 Docker compose
`ps`、检查 secret hygiene 状态，并探测配置的 health endpoints，但不会打印 secret 值。
当 dashboard 或管理脚本需要 compose service state、health checks、blockers 和
safety notes 且不想解析终端文本时，使用
`corepack pnpm --silent run selfhost:status ... --json`。

`selfhost:smoke` 是启动后的验收检查，会覆盖 secret hygiene、Docker compose
config、public route contract 和配置的 health endpoints。当 CI、dashboard 或管理脚本需要
smoke pass/fail、blockers、route contract 和 health metadata，且不想嵌入展开后的
compose stdout 时，使用 `corepack pnpm --silent run selfhost:smoke ... --json`。

`selfhost:logs` 保留为私有 operator 终端里的 raw logs 视图，并支持 `--service`
和 `--tail` 过滤。当 dashboard 或管理脚本只需要 command metadata、exit code、
stderr lines、service filter 和 tail size 时，使用
`corepack pnpm --silent run selfhost:logs ... --json`；JSON 形式会刻意省略 Docker
compose logs stdout，因为应用日志可能包含敏感值。

`selfhost:down` 会通过 Docker compose 停止选定 profile。当 dashboard、管理脚本或
runbook 需要 stop command metadata、exit code、stderr lines 和 blockers 时，使用
`corepack pnpm --silent run selfhost:down ... --json`；JSON 形式会刻意省略 Docker
compose down stdout，因为 compose 输出可能包含敏感值。

`selfhost:config` 会校验选定 profile 的 Docker compose config。文本形式会给私有
operator 终端打印 compose 输出；JSON 形式会刻意省略 compose stdout，因为展开后的
compose 输出可能包含环境值。当 dashboard 或 CI 需要 compose config pass/fail、
blocker 和 stderr metadata，且不想暴露带 secret 风险的 stdout 时，使用
`corepack pnpm --silent run selfhost:config ... --json`。

`selfhost:profiles` 是只读部署地图。它列出内置 profiles、用途、deploy 目录、
service 数量、声明 host ports 和对应的 `selfhost:doctor` 命令，但不读取 `.env`
或触碰 Docker。当 console、dashboard 或脚本需要同一组 profile selector 数据且不想解析终端文本时，
使用 `corepack pnpm --silent run selfhost:profiles -- --json`。

`selfhost:quickstart` 会打印选定 profile 的推荐命令序列，但不执行它们。适用于想从
profile 发现一路复制到 doctor、init、summary、preflight、up、smoke 和交接证据的场景。
当 console 或脚本需要同一组有序命令序列且不想解析终端文本时，使用
`corepack pnpm --silent run selfhost:quickstart ... --json`。

`selfhost:readiness -- --all` 会打印所有内置 profile 的只读 readiness 矩阵；
`selfhost:readiness` 会打印选定 profile 的只读部署就绪总览。两者都会合并 profile
文件、`.env` 状态、secret hygiene、public-stack origin / route 阻断项、URLs、声明
host ports 和下一步命令；不会调用 Docker、绑定端口、探测网络、修改文件或打印
secret 值。CI、dashboard 或管理脚本需要机器可读 `ok` / `blockers` / `next` 时，
使用 `corepack pnpm --silent run selfhost:readiness ... --json`，并保持相同
exit-code 语义。

`selfhost:doctor` 是最早运行的只读部署诊断命令。它会检查本地工具可见性、
profile 文件、`.env` 是否存在，以及 secret / public-origin hygiene，然后打印下一步命令；
但不会调用 `docker compose`、启动服务、探测网络或打印 secret 值。当 dashboard 或脚本需要同一组检查、
阻断状态和下一步命令且要保持相同 exit-code 语义时，使用
`corepack pnpm --silent run selfhost:doctor ... --json`。

`selfhost:summary` 是选定 profile 的只读一屏概要。它会输出 deploy 路径、URLs、
声明的 host ports、secret hygiene 状态和下一步命令，但不会调用 Docker、绑定
socket、探测网络或打印 secret 值。当 dashboard 或脚本需要同一组概要卡片数据且不想解析
终端文本时，使用 `corepack pnpm --silent run selfhost:summary ... --json`。

`selfhost:plan` 是选定 profile 的只读部署地图。它会输出 profile purpose、services、
URLs 和 safety checks，但不会调用 Docker 或打印 secret 值。当生成文档、dashboard 或脚本
需要同一组 profile 解释数据时，使用
`corepack pnpm --silent run selfhost:plan ... --json`。

`selfhost:urls` 会打印选定 profile 声明的 URLs，但不会调用 Docker、绑定 socket、
探测网络或打印 secret 值。当 dashboard 或部署脚本需要同一组 URL inventory 且不想解析
终端文本时，使用 `corepack pnpm --silent run selfhost:urls ... --json`。

`selfhost:ports` 会打印选定 profile 声明的 host ports，但不会绑定 socket、调用 Docker
或探测端口是否空闲。当 dashboard 或部署脚本需要同一组声明端口 inventory 且不想解析
终端文本时，使用 `corepack pnpm --silent run selfhost:ports ... --json`。

`selfhost:security-review` 是非破坏性的公开暴露前安全复核。它复用 secret
hygiene、compose config 和 public route contract 检查，并打印 backup、rotation
和 smoke 命令，帮助 operator 在把 public stack 视为 exposure-ready 前完成收口。
该命令不打印 secret 值。当 dashboard 或部署控制器需要机器可读的 secret hygiene、
compose config、public route contract、operational prerequisites、blockers 和
safety notes，且不想解析终端文本时，使用
`corepack pnpm --silent run selfhost:security-review ... --json`。

验证已发布 public-stack 镜像：

```bash
corepack pnpm run published-image:plan
corepack pnpm --silent run published-image:plan -- --json
corepack pnpm run published-image:smoke -- --image-registry ghcr.io/hejiajiudeeyu --image-tag latest
corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>
corepack pnpm --silent run published-image:smoke -- --dry-run --image-tag <candidate-tag> --json
corepack pnpm run test:published-image-smoke
```

`published-image:plan -- --json` 会输出解析后的 release image refs、委托给平台仓的
smoke 命令、smoke env metadata 和 safety notes，但不打印 secret env 值。
`published-image:smoke -- --dry-run --json` 会输出同一组 smoke command metadata 和
dry-run result status，但不运行 Docker，也不打印 delegated smoke stdout。
`published-image:smoke` 默认会设置 `COMPOSE_NO_BUILD=true` 和
`STRICT_COMPOSE_SMOKE=true`，并委托 `repos/platform` 的 public-stack smoke。如果只是
本地查看命令形状，可以使用 `--dry-run`；如果显式允许无 Docker 环境跳过，才传
`--allow-skip`。

检查 operator 首次使用契约：

```bash
corepack pnpm run operator:onboarding:plan
corepack pnpm --silent run operator:onboarding:plan -- --json
corepack pnpm run operator:onboarding:check
corepack pnpm --silent run operator:onboarding:check -- --json
corepack pnpm run test:operator-onboarding
```

当 console、CI job 或部署脚本需要 public-stack 首次使用阶段、命令、安全说明、检查结果、
blockers 和下一步验证命令，但不想解析终端文本时，使用 `--json` 形式。

运维辅助命令：

```bash
corepack pnpm run selfhost:logs -- --service platform-api --tail 80
corepack pnpm --silent run selfhost:logs -- --service platform-api --tail 80 --json
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm --silent run selfhost:urls -- --profile public-stack --json
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm --silent run selfhost:ports -- --profile public-stack --json
corepack pnpm run selfhost:ops-report -- --profile public-stack
corepack pnpm --silent run selfhost:ops-report -- --profile public-stack --json
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm run selfhost:audit-export -- --profile public-stack
corepack pnpm --silent run selfhost:audit-export -- --profile public-stack --json
corepack pnpm run selfhost:backup-plan -- --profile public-stack
corepack pnpm --silent run selfhost:backup-plan -- --profile public-stack --json
corepack pnpm run selfhost:backup-validate -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm --silent run selfhost:backup-validate -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp> --json
corepack pnpm run selfhost:restore-plan -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm --silent run selfhost:restore-plan -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp> --json
corepack pnpm run selfhost:rotate-plan -- --profile public-stack
corepack pnpm --silent run selfhost:rotate-plan -- --profile public-stack --json
corepack pnpm --silent run selfhost:rotate -- --profile public-stack --json
corepack pnpm --silent run selfhost:rotate -- --profile public-stack --confirm --json
corepack pnpm run selfhost:rotate -- --confirm
```

`selfhost:audit-export` 会读取选定 profile 的 `.env`，调用 platform admin audit
endpoint，并把 JSON 证据写入 `exports/audit/<profile>/`；也可以用 `--output`
指定路径。它会使用 admin key 发起请求，但不会把 key 打印到终端。当 dashboard、
CI 或管理脚本需要 source URL、output path、limit、item count 和 safety notes，
但不想打印 admin key 或导出的 audit body 时，使用
`corepack pnpm --silent run selfhost:audit-export ... --json`。

`selfhost:ops-report` 会把 Markdown 交接报告写入 `exports/selfhost/<profile>/`；
也可以用 `--output` 指定路径。报告包含 URLs、host ports、secret hygiene 状态和
后续命令，但不会写入 raw secret 值。当 dashboard、CI 或管理脚本需要同一组不含
secret 的 handoff 数据，且不想创建 Markdown 文件或解析终端文本时，使用
`corepack pnpm --silent run selfhost:ops-report ... --json`。

`selfhost:urls` 会打印选定 profile 声明的 URLs，但不会调用 Docker 或探测网络。
检查 profile 期望暴露哪些 local/public routes 时，应在 `selfhost:up` 前运行它；
当 dashboard 或脚本需要同一组 URL inventory 时，使用 `--json` 形式。

`selfhost:ports` 会打印选定 profile 声明的 host ports，但不会绑定 socket 或调用
Docker。检查本地端口冲突时，应在 `selfhost:up` 前运行它；当 dashboard 或脚本需要同一组声明端口
inventory 时，使用 `--json` 形式。

`selfhost:backup-plan` 只输出计划。它会打印 backup directory、`.env` 复制步骤、
PostgreSQL dump 命令和 compose config 记录命令；不会复制文件、dump 数据库或读取
secret 值。当 dashboard、CI 或恢复演练脚本需要同一组有序计划和下一步
backup-validate 命令，且不想解析终端文本时，使用
`corepack pnpm --silent run selfhost:backup-plan ... --json`。

`selfhost:backup-validate` 会在恢复演练前检查 backup directory 里 `.env`、
`postgres.sql` 和 `compose.config.txt` 的存在与大小。它不会读取或打印 `.env`
里的 secret 值。当 dashboard、CI 或恢复演练脚本需要机器可读的文件状态、blockers
和对应 restore-plan 命令时，使用
`corepack pnpm --silent run selfhost:backup-validate ... --json`。

`selfhost:restore-plan` 同样只输出计划。它会基于一个 backup directory 打印停机、
`.env` 私下复核、`postgres.sql` 导入、重启和 smoke 验证顺序；不会复制文件、
导入 SQL 或停止服务。当 dashboard、CI 或恢复演练脚本需要同一组有序恢复步骤且不想
解析终端文本时，使用 `corepack pnpm --silent run selfhost:restore-plan ... --json`。

`selfhost:rotate-plan` 也只输出计划。它会打印 backup-first、停机窗口、dry-run、
confirmed rotation、restart 和 smoke 验证 checklist；不会读取或修改 `.env`。
当 dashboard、CI 或 operator runbook 需要同一组 rotation 顺序和 safety notes，
且不想解析终端文本时，使用
`corepack pnpm --silent run selfhost:rotate-plan ... --json`。

`selfhost:rotate -- --json` 是选定 profile 的机器可读 dry-run。它会输出 `.env`
路径、将被轮换的 key、下一步命令和 safety notes，但不修改文件，也不打印 secret 值。
`selfhost:rotate -- --confirm --json` 会执行与文本模式相同的 confirmed rotation，
在选定 profile 的 `.env` 旁写出 `.env.rotate-backup-*`，并返回 changed-file
metadata、restart / smoke 下一步命令和 safety notes，但不打印任何新生成的 secret 值。
