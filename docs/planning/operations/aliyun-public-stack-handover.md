# Aliyun public-stack 部署交接(callanything.xyz)

> 建立于 2026-07-04(loop 轮 7,backlog 1.4)。此前主机侧 `ALIYUN-OPS-README.md` 完全未记录本栈,是 T-503 交接缺口的组成部分;现两侧对齐,本文件为四仓侧事实源。

## 拓扑

```
浏览器 → Cloudflare(callanything.xyz)→ 主机 nginx(80/443)
  ├─ /platform/、/marketplace/hotlines → 127.0.0.1:28080(platform-api)
  └─ /console/ 等 → 127.0.0.1:28085(platform-console-gateway)
```

- 主机:Aliyun ECS `116.62.4.213`(SSH 别名 `aliyun-ecs`,用户 `admin`,docker 需 `sudo -n`)
- 部署目录:`/home/admin/apps/delegated-execution-public-stack`
- compose 调用(必须两个 -f):
  `sudo docker compose -f docker-compose.yml -f docker-compose.aliyun-nginx.override.yml --env-file .env up -d`
- 基础 compose 与 platform 仓 `deploy/public-stack/docker-compose.yml` 保持一致(2026-07-04 校验 diff 为空后同步);aliyun override 负责:钉每服务镜像 tag、服务只绑 localhost 端口(28080/28085/28090/25432)、禁用 caddy edge(host nginx 持有 80/443)
- caddy edge 通过 profile `caddy-edge-disabled-on-aliyun` 禁用,不要在此主机启用

## 当前版本(2026-08-10 起:v0.4.14)

| 服务 | 镜像 | 说明 |
|------|------|------|
| platform-console-gateway | `rsp-gateway:v0.4.14` | |
| platform-api | `rsp-platform:v0.4.14` | |
| relay | `rsp-relay:v0.4.14` | 启动日志应显示 `auth=required`;**已带鉴权重开公网**(D6.1),`/relay/buildz` 公网可直测 |
| postgres | `postgres:16-alpine` | 数据卷 `public-stack-postgres-data` |

> **2026-08-10(v0.4.13)**:同一个 ghcr `httpReadSeeker ... EOF` 又出现了一次,重跑 pull 即通,与下条记录一致——它是瞬时的,不是本次镜像的问题。滚版前的 `.env` 备份已按惯例留下。

滚版方式不变(`.env` 的 `IMAGE_TAG` + 两个 -f 的 compose 调用);回滚 = 把 `IMAGE_TAG` 改回并重跑,`.env` 备份见部署目录 `.env.bak.*`(v0.4.10 滚版前的那份是 `.env.bak.20260809T105216`;v0.4.11 滚版前另有一份同日更晚的时间戳)。

> **2026-08-09 实测的一个坑**:`docker compose pull` 可能以 `httpReadSeeker: failed open ... EOF` 从 ghcr 失败(平台仓 release-process 归类为 `image_pull_failed`,属网络/registry 瞬时故障)。此时**容器未被重建、生产未受影响**,重跑 pull 即可;但注意 `.env` 的 `IMAGE_TAG` 此时已改,若就此放手,下次重启会拉一个本机没有的镜像——要么把 pull+up 做完,要么把 `.env` 改回去。

### 镜像保留策略(2026-08-10 因磁盘告警补)

**每次滚版都会在主机上留下约 1GB 镜像,而此前没有任何东西清理过。** 2026-08-09 21:20 阿里云云监控报 `/dev/vda3` 使用率 90.5%(`SystemDefault_acs_swas_diskusage_utilization`,连续 3 次 ≥90%)。查下来是 v0.1.1 以来**每一个版本的三个镜像都还在**——82 个镜像、11.3GB,其中只有 7 个在用。

保留口径:**当前版本 + 回滚一档**。滚版后执行:

```bash
KEEP="v0.4.12|v0.4.11"   # 换成当前与上一个版本
sudo docker images --format "{{.Repository}}:{{.Tag}}" | grep "rsp-" | grep -Ev ":($KEEP)$" | xargs -r sudo docker rmi
sudo docker image prune -f
sudo journalctl --vacuum-size=200M
```

2026-08-10 首次执行:清掉 50 个镜像 + 611M journal,**92% → 75%**,可用从 3.3G 回到 9.4G;三容器与 postgres 未重启,`release-manifest check` 复验通过。

**绝不要**动 volume(`docker system prune --volumes` / `docker volume rm`)——postgres 数据在里面。也不要碰 `/home/admin/sub2api-deploy` 与 `cpa-*-backups`,那是另一套系统的数据。

> **这条告警不是本平台发的,是阿里云云监控发的。** 本平台的告警(FR-066)看的是调用与设备状态,**不看宿主机磁盘**;真正对应「平台自己死了」的是 `liveness_url` 那条死人开关——而它至今没有配收件人。宿主机资源监控继续依赖阿里云侧,这是有意的边界,不是遗漏。

验证口径:`node tools/release-manifest.mjs check https://callanything.xyz`(**不需要** `--component transport-relay=...` override,relay 公网可直测),应报 `runtime matches release v0.4.11`。

### 历史版本表(2026-08-01 起)

| 服务 | 镜像 | 说明 |
|------|------|------|
| platform-console-gateway | `rsp-gateway:v0.3.0` | |
| platform-api | `rsp-platform:v0.3.0` | |
| relay | `rsp-relay:v0.3.0` | 启动日志应显示 `auth=required` |
| postgres | `postgres:16-alpine` | 数据卷 `public-stack-postgres-data` |

**v0.3.0 起三服务必须同版滚动**(relay 鉴权与 platform-api 是同一契约),不再做 gateway-only 混合版本。此前 v0.1.2/v0.2.0 的混合状态见 platform 仓 `docs/archive/releases/compatibility-matrix.md`。

### v0.3.0 破坏性变更与必需变量

- `RELAY_ADMIN_TOKEN`、`RELAY_TOKEN_SECRET`:**缺失则 relay 拒绝启动**(有意的 fail-safe)。已于 2026-08-01 在主机生成并写入 `.env`。
- relay 六条业务路由现需 bearer 凭据;匿名 responder 注册已移除。
- 新增 artifact 持久卷 `public-stack_public-stack-artifact-data` → `/data/artifacts`。
- 备份:`.env.bak.20260801T011645` 等三个同时间戳文件;回滚 = 恢复三文件后重跑 compose 调用。

## Secrets(只记位置,不记值)

- 全部在部署目录 `.env`(mode 600):`TOKEN_SECRET`、`PLATFORM_ADMIN_API_KEY`、`PLATFORM_CONSOLE_BOOTSTRAP_SECRET`
- `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`:守卫 gateway `POST /session/recover`(丢口令恢复);2026-07-04 确认已设置且非空
- **console 口令本身不在任何交接介质中**(T-401 时代的加密 store 遗留,值未知)。丢失口令的正规路径 = 浏览器 `/console/` 恢复流程(输入 `RESET` 确认 + bootstrap secret;破坏性:重置 secret store、清空会话、需重录 admin key)。M2 彩排将演练此路径并重新设置口令;届时把新口令按彩排协议托管
- npm/GHCR 发布凭据在 GitHub Actions secrets(`NPM_TOKEN`/`GITHUB_TOKEN`),不在主机

## 运维要点

- 2026-07-04 起全部服务 `restart: unless-stopped`(platform 仓 `707b480`)。**事故记录**:2026-07-04 03:08 主机重启,旧策略 `no` 导致全栈宕机约 5.5 小时,08:44 随 1.4 滚动一并恢复
- 回滚:部署目录内有时间戳 `.bak.*` 的 compose/override 备份;回滚 gateway 只需把 override 里的镜像 tag 改回并重跑 compose 调用
- 健康检查:本地 `curl 127.0.0.1:28080/healthz`、`127.0.0.1:28085/`;公网 `https://callanything.xyz/healthz`、`/platform/healthz`、`/console/`
- **版本自陈(v0.3.0 起)**:`/platform/buildz`、`/gateway/buildz` 直接上报 `release_id`/`git_sha`/console 资产指纹;四仓 `node tools/release-manifest.mjs check https://callanything.xyz --component transport-relay=http://127.0.0.1:28090/buildz` 可一次性判定生产是否与认证组合一致(relay 公网 403,需内网或 SSH 隧道)
- 版本指纹:v0.2.0 起 console 为构建产物 SPA——`/console/` 的 index.html 引用 `assets/index-<hash>.js`(该资产 200 且 `cache-control: immutable`)⇔ gateway ≥ v0.2.0;旧指纹 `/console/src/session-view.js` 自 v0.2.0 起应 404
- **2026-07-31 安全收口(CHG-2026-181)**:host nginx 停止公网代理 `/relay/` 业务路由(无鉴权,audit S1),仅保留 `location = /relay/healthz`;`/platform/metrics` 边缘 403(audit S5)。备份 `callanything.xyz.bak.20260731T201329` 在 `/etc/nginx/sites-enabled/`,主机侧 ALIYUN-OPS-README 已同步记录。公网验证:relay/v1/* 403、platform/metrics 403、healthz/platform/healthz/console/marketplace 均 200。外部 responder 未来走公网 relay 需先落 A-02 鉴权再重新暴露

## 2026-07-04 滚动验证记录

- 主机:4 容器 Up、restart 策略 unless-stopped ×4、api healthz 200、gateway 200、`POST /session/recover` 空 body → 403(端点在线且拒绝未授权,未触发破坏动作)
- 公网:healthz / platform/healthz / console 均 200;session-view.js 200 且含 `RECOVERY_CONFIRMATION_PHRASE = "RESET"`
