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
corepack pnpm run dev:local:up
corepack pnpm run dev:local:status

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
```

查看托管进程日志：

```bash
corepack pnpm run dev:local:logs -- --service relay --tail 80
corepack pnpm run dev:local:logs -- --service supervisor --tail 80
```

检查日常本地栈健康状态：

```bash
corepack pnpm run dev:doctor
corepack pnpm run test:agent-e2e
corepack pnpm run mcp:golden-four
corepack pnpm run test:local-stack
corepack pnpm run test:selfhost-kit
```

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
corepack pnpm run selfhost:summary
corepack pnpm --silent run selfhost:summary -- --json
corepack pnpm run selfhost:plan
corepack pnpm run selfhost:urls
corepack pnpm --silent run selfhost:urls -- --json
corepack pnpm run selfhost:ports
corepack pnpm --silent run selfhost:ports -- --json
corepack pnpm run selfhost:preflight
corepack pnpm --silent run selfhost:preflight -- --json
corepack pnpm run selfhost:status
corepack pnpm run selfhost:smoke
corepack pnpm run selfhost:security-review
corepack pnpm --silent run selfhost:security-review -- --json
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
corepack pnpm run selfhost:summary -- --profile public-stack
corepack pnpm --silent run selfhost:summary -- --profile public-stack --json
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm --silent run selfhost:urls -- --profile public-stack --json
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm --silent run selfhost:ports -- --profile public-stack --json
corepack pnpm run selfhost:preflight -- --profile public-stack
corepack pnpm --silent run selfhost:preflight -- --profile public-stack --json
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json
corepack pnpm run selfhost:status -- --profile public-stack
corepack pnpm run selfhost:smoke -- --profile public-stack
```

`selfhost:up` 会自动先运行同一组 preflight gate。若 public origin 或 secret
hygiene 未通过，默认不会继续启动；只有显式传入 `--force` 才会绕过该阻断。
`selfhost:preflight -- --json` 保持同一套 gate 和 exit-code 语义，同时输出机器可读
的 secret hygiene、compose config、routes、blockers 和 notes，供 dashboard 或部署脚本消费。

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
corepack pnpm run published-image:smoke -- --image-registry ghcr.io/hejiajiudeeyu --image-tag latest
corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>
corepack pnpm run test:published-image-smoke
```

`published-image:smoke` 默认会设置 `COMPOSE_NO_BUILD=true` 和
`STRICT_COMPOSE_SMOKE=true`，并委托 `repos/platform` 的 public-stack smoke。
如果只是本地查看命令形状，可以使用 `--dry-run`；如果显式允许无 Docker 环境跳过，
才传 `--allow-skip`。

检查 operator 首次使用契约：

```bash
corepack pnpm run operator:onboarding:plan
corepack pnpm --silent run operator:onboarding:plan -- --json
corepack pnpm run operator:onboarding:check
corepack pnpm run test:operator-onboarding
```

当 console、CI job 或部署脚本需要 public-stack 首次使用阶段、命令、安全说明和下一步验证命令，
但不想解析终端文本时，使用 `--json` 形式。

运维辅助命令：

```bash
corepack pnpm run selfhost:logs -- --service platform-api --tail 80
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm --silent run selfhost:urls -- --profile public-stack --json
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm --silent run selfhost:ports -- --profile public-stack --json
corepack pnpm run selfhost:ops-report -- --profile public-stack
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm run selfhost:audit-export -- --profile public-stack
corepack pnpm run selfhost:backup-plan -- --profile public-stack
corepack pnpm --silent run selfhost:backup-plan -- --profile public-stack --json
corepack pnpm run selfhost:backup-validate -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm --silent run selfhost:backup-validate -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp> --json
corepack pnpm run selfhost:restore-plan -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm --silent run selfhost:restore-plan -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp> --json
corepack pnpm run selfhost:rotate-plan
corepack pnpm run selfhost:rotate -- --confirm
```

`selfhost:audit-export` 会读取选定 profile 的 `.env`，调用 platform admin audit
endpoint，并把 JSON 证据写入 `exports/audit/<profile>/`；也可以用 `--output`
指定路径。它会使用 admin key 发起请求，但不会把 key 打印到终端。

`selfhost:ops-report` 会把 Markdown 交接报告写入 `exports/selfhost/<profile>/`；
也可以用 `--output` 指定路径。报告包含 URLs、host ports、secret hygiene 状态和
后续命令，但不会写入 raw secret 值。

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
