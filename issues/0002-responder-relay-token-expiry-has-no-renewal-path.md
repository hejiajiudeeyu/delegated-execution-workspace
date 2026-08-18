---
id: 0002
title: responder 的 relay receiver token 过期后无续期路径，且设备"在线"仍然为真
status: in-progress
created: 2026-08-18
origin: 2026-08-18 会话「从零跑通全流程走查」——尝试执行免费热线实调时发现；生产实测
actor: agent
severity: high
---
# 设备聋了，而平台说它在线

## 现象（2026-08-18 生产实测）

启动 `~/.delexec-mineru`（`mineru_mac_rebuilt`，直连 `https://callanything.xyz`）后：

- responder controller 起来了，**心跳正常**——平台 `last_heartbeat_at` 立刻刷新，`status=enabled`，运营者 attention 里的 `device_unavailable` 随即消失；
- 但 relay 收件箱**每一次 poll 都 401**：

  ```
  [responder-inbox] pull failed: relay_http_poll_failed:401
  ```

直接对生产 relay 复现，拿到确切原因：

```
POST https://callanything.xyz/relay/v1/messages/poll
→ 401 {"code":"RELAY_UNAUTHORIZED","message":"receiver token has expired","reason":"expired"}
```

解开 `ops.config.json` 里存的那枚 `rrt_` token（claims 是 base64url，不需要密钥即可读）：

| 字段 | 值 |
|---|---|
| receiver | `mineru_mac_rebuilt` |
| issued | 2026-08-09T15:31:36Z |
| expires | **2026-08-16T15:31:36Z** |

即 7 天 TTL，**已于两天前静默失效**。

## 为什么这条比"token 过期了"严重

### 1. 心跳与派发是两条通道，健康信号只有一条

心跳走 platform-api，任务派发走 relay。token 过期只打断后者，于是：

- 公开目录 `local.mineru.pdf.parse.v1` / `local.echo.priced.v1` 仍报 `callable: true`；
- 运营者控制台看设备是好的；
- 任何派过去的调用都会躺在收件箱里没人取。

**平台会朝一台收不到任何东西的设备持续派单**，而三个面（目录、控制台、attention）没有一个能说出真相。

### 2. responder 没有续期路径，caller 有

平台侧确实开了自助续期口，但**只给 caller**：

`repos/platform/apps/platform-api/src/server.js` — `POST /v1/callers/me/relay-inbox`，
receiver 由已鉴权身份推导（不接受请求指定），默认 TTL `RELAY_CALLER_TOKEN_TTL_S=604800`。
该处注释自陈是 "the narrow, caller-shaped hole through it"。

**responder 没有对应路由**（全仓无 `responders/me/relay-inbox`）。客户端也明确拒绝自铸：

`repos/client/apps/ops/src/supervisor.js:1355`
> Only mint a credential for the relay we manage ourselves. Against an
> external relay an invented token is worse than none … absence must stay absence.

于是唯一的续期办法是拿 relay 的 **admin token** 调 `POST /v1/receivers/:receiver/tokens`。
而 `RELAY_ADMIN_TOKEN` 只在生产主机的部署 env 里——本地 `repos/platform/deploy/public-stack/.env`
里那枚**对生产返回 401**（已实测；该文件已 gitignore 且未跟踪，无泄漏）。

**结论：一台设备的 relay 凭据过期后，恢复它必须 SSH 上生产机。这与 E6「正常流程无 SSH/远程桌面/admin curl/手工搬运」直接冲突。**
E6 目前记为 `partial`，但记录的理由是审批 UI，不是这条。

### 3. 失效是静默的，且重试没有退避

- 没有任何告警——过期前无预警，过期后无通知。attention 里也没有 `relay_token_expiring` 这类项。
  （相关：告警收件人本来也还没配，D9 挂账⑥。）
- 401 是 `retryable: false`，但 responder inbox **以约 2.6 次/秒 无限重试**：3 分钟打了 432 次。
  对生产 relay 是纯无效负载，对日志是纯噪音，而且掩盖了唯一那条有信息量的行。

## 要做什么

按性价比排序，前两条才是止血。**1–3 已于 2026-08-18 修完（CHG-2026-250），4–5 未做**；
另见文末「修复状态」——代码已进两个 owning repo 的 main，但**未发版，生产尚未生效**。

1. ~~**让"在线"说真话**~~：设备可用性必须同时反映 relay 可达性，而不只是心跳。至少——收件箱鉴权失败要能翻到 attention 和目录 `callable` 上。
2. ~~**给 responder 一条续期路由**~~（对称于 caller 那条，receiver 由已鉴权 responder 身份推导，不接受请求指定），并让 `delexec-ops` 在启动时和临近过期时自动续。
3. ~~401/403 改为不可重试语义：停止轮询、报一次清楚的错、进 attention。~~
4. 过期前预警（比如剩余 24h 进 attention）。
5. 顺带：`delexec-ops doctor` 应当能一眼看出这个状态——它现在看不出来。

## 验收

- 一台 receiver token 已过期的设备：目录 `callable` 为假 **或** attention 有对应项，二者至少其一；
- 不 SSH 生产机即可让该设备恢复收件；
- 401 不再高频重试（有断言）；
- 回归测试覆盖"心跳正常但 relay 401"这个组合——它是本条的承重场景。

## 现场备注

- 另有 4 个 `execution=submitted` 的滞留调用（`req_probe_1786611449` 等，创建于 **2026-08-13**），
  **早于**本次 token 过期，属既有问题，对应 NFR-R01「平台护栏未实现」，不是本条的后果。

## 已用的临时绕过（2026-08-18，owner 当场放行）

**这段绕过本身就是本条 issue 的证据**，记在这里是为了让下一个人知道代价是什么：

1. SSH 上 `aliyun-ecs`；
2. 从 `public-stack-relay-1` 容器 env 取 `RELAY_ADMIN_TOKEN`；
3. **在服务器上就地**调 `POST http://127.0.0.1:28090/v1/receivers/mineru_mac_rebuilt/tokens`
   （admin token 因此没有离开生产机）；
4. 把新 receiver token 写回设备 `ops.config.json`（旧配置已备份为 `.bak.<ts>`）。

TTL 取 **30 天**（到期 2026-09-17T04:18:25Z），不是原来的 7 天——沿用 7 天等于一周后原样复发。
这只是把复发推迟，不是修复；真正的修复是上面待办第 2 条（responder 自助续期 + 自动续）。
`RELAY_TOKEN_SECRET` 轮换会一次性作废所有已签发 token，仍是既定的吊销手段。

绕过之后，**调用段当场跑通**（见下），说明除这条凭据外链路本身是好的——
这也正是本条危险的地方：一枚过期的 token 就让整张网络对外静默失效，而没有任何一个面报警。

## 换 token 之后的生产实调（2026-08-18，可作为台账证据）

`req_4ad48350-f20b-48ec-9108-a20890377fc6` · `local.mineru.pdf.parse.v1` · 全程走 agent 界面（skill-adapter），无 admin 介入：

| 环节 | 结果 |
|---|---|
| 契约来源 | `contract_source: platform_catalog`（读的是网络发布的那份，不是本地草稿） |
| prepare | `status: ready`，errors 空；PDF 336,919 字节 sha256 `f3b3be34…` |
| 派发 | 经带鉴权公网 relay；41 秒后 `queued`，85 秒内到 `delivered` |
| 钉住版本 | version **2**，digest `sha256:4162646547ab…`，`integrity: verified`，service_terms 快照完整 |
| 平台判定 | **`delivery_integrity: verified`**（checked_at 04:22:39Z） |
| 产出 | **22 件 artifact，共 1,020,441 字节**（markdown 51,648 + 20 张抽取图 + 输入 PDF） |
| 验收 | 经 agent 界面 `accept_delivery` → `acceptance: accepted`，`decided_by: caller` |
| 结算 | `none`（免费热线，`tracked: false`，如实不计费） |

四轴终态：`delivered` / `verified` / `accepted` / `none`。

产出字节数与 E1 台账里 2026-08-09 那次同一份 demo1.pdf 的记录（22 件、1,020,441 字节）完全一致，
说明这条链路在 v0.4.18 上是可复现的。

## 修复状态（2026-08-18，CHG-2026-250）

**已做（代码侧，两个 owning repo 的 main 上）**：

| # | 内容 | 落点 |
|---|---|---|
| 1 | 已过期凭据压过新鲜心跳；`availability_reason` 固定词表；attention 分列计数并写明到期时间 | platform `22aab85` |
| 2 | `POST /v1/responders/me/relay-inbox`（receiver 由凭据推导）；supervisor 开机与临期自动续并落盘；controller 在飞续期不落盘 | platform `22aab85` + client `e09d669` |
| 3 | 401/403 抛 `RelayAuthError`，退避 60s；新凭据生效即跳过退避；瞬时 5xx 保持原节奏 | client `e09d669` |

平台 13 例集成（改动前 13/13 红）+ 客户端 14 例单测（改动前 13 红，第 14 条是对照组，前后都绿）。
四仓五件套在 origin 可达性**开启**下全绿。

**仍未做**：

- 第 4 条（到期前 24h 进 attention 预警）与第 5 条（`delexec-ops doctor` 能一眼看出）。
- **发版**：`@delexec/ops` 未发、平台镜像未构建，`releases/current.yaml` 仍指 v0.4.18-ops.0.1.24，
  不含这两个 SHA。**生产设备至今仍靠 2026-08-18 那次手工 SSH 铸出的 token 运行**（到期 2026-09-17），
  在发版之前这条修复对生产没有任何效果。
- 一个刻意保留的行为：`best_effort` 可用性下，凭据过期**仍然**让热线保持 `callable`——relay 会排队、
  设备回来再取，这是该策略本来的约定。因此对生产那两条热线，承载这件事的是**运营者面的 attention**，
  不是目录。改这一点等于改可用性策略语义，属协议邻接决定，不在本条范围。

## 生产实证：修复已生效（2026-08-18，CHG-2026-252）

生产滚到 v0.4.19-ops.0.1.25 后，**把 2026-08-16 真正过期的那枚 token 放回设备**
（从 `ops.config.json.bak.20260810T151824` 取回，就是当初肇事的那一枚），然后开机：

```
[ops-supervisor] renewed the responder relay inbox credential (expires 2026-08-25T09:38:08.000Z)
```

- **401 次数：0**——它根本没走到失败路径。开机检查提前 24h 续期，不必等被拒绝。
- 全程没有 SSH，正是本条「验收」第 2 项的口径。
- 平台侧现在记住了 `relay_credential_expires_at: 2026-08-25T09:38:08.000Z`，
  即：**从此它自己签发的到期，它自己看得见**。
- 随后实调 `req_7b9f7ed0-fa61-4012-9c2d-dfc4b7ddd4e1` 确认真能收活：30 秒内
  `delivered` + `delivery_integrity: verified`，验收后四轴 `delivered / verified / accepted / none`。

**本条 1–3 至此在生产上闭环。** 剩 4、5 两项（到期预警、`doctor` 可见）仍开着——
7 天默认 TTL 现在是安全的，因为续期自动且提前 24h 跑；但**关机超过凭据寿命**的设备回来时
仍会走在飞 401 那条路（慢一些，但正确）。
