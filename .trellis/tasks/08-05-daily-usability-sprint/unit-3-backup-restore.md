# 单元 3：备份与恢复最小工具链 + 恢复演练（E7 前置）

日期：2026-08-06 · 父任务 `goal.md` · owner 决策见 `../07-17-call-anything-private-capability-network-mvp/decisions.md` D7

owner 当日拍板两条（多选题）：**四卷全覆盖 + 一致性交叉校验**；演练**用生产快照拉回本机恢复**。
后者是对最小外流原则的一次明确放行，处理方式见文末「数据处置」。

## 开工前的真实状态

不是「备份工具链不存在」，而是**存在一个只覆盖四分之一的检查清单打印器**。四仓
`tools/selfhost-kit.mjs` 的 `backup-plan` / `backup-validate` / `restore-plan` 全部 plan-only，
且只认 `.env` + `postgres.sql` + `compose.config.txt`。

public-stack 实际有四个有状态面：

| 卷 | 内容 | 旧清单 |
|---|---|---|
| `postgres-data` | 调用、账本、设备、热线、告警配置（全域状态是 `service_state_snapshots` 里的一个 JSON 快照） | ✅ |
| `artifact-data` | **交付物字节**，按 artifact id 平铺 | ❌ |
| `gateway-data` | console 加密凭据存储（`secrets.enc.json` + `.env.local`） | ❌ |
| `relay-data` | 在途任务信封 sqlite | ❌ |

按旧清单恢复的结果：postgres 里每条 `committed` artifact 描述符都带 checksum 指向**不存在的
字节**。这个项目花了大力气保证「checksum 不符不得标 delivered」（NFR-R03），而备份会在下一层
把同一个谎言重说一遍——描述符校验得过，东西取不到。console 则恢复即锁死（CHG-2026-194 刚踩过）。

## 交付物

**平台仓 `scripts/stack-backup.mjs`**（owning repo = platform，它知道卷布局与库结构）：

- `backup` — 四面齐备：`pg_dump`（绝不复制运行中的数据目录）+ 三个卷的 tar.gz，逐文件 sha256，
  写入 `manifest.json`（镜像 tag、库名、**artifact 索引**、明确的 `not_included` 清单）。
  文件 0600 / 目录 0700。
- `verify` — manifest 与逐文件 checksum，然后是这个工具存在的理由：**数据库里每条 `committed`
  的 artifact 都必须有字节、大小对得上、sha256 对得上**。孤儿字节报 warning 不报 blocker。
- `verify --deep` — 把 dump 灌进一次性 postgres 再从中重新导出 artifact 索引与 manifest 比对。
  **这是唯一能判定 dump 究竟能不能加载的检查**；文件在不在只证明字节完好。
- `restore` — 恢复三卷 + 建库灌 dump；**默认拒绝写入已有数据的卷**并指名是哪个卷挡住的。
- `--docker "ssh <host> sudo -n docker"` — 远程主机上不落任何代码。（参数会过远程 shell，
  第一版就在这里栽了：`{{json .Config.Env}}` 被按空格拆成两个词，改为集中 shell 引用。）

**四仓 `tools/selfhost-kit.mjs`**：public-stack 三条命令改为指向真工具，不再自留一份更小的、
错的程序；其他 profile 保留旧清单但明写「本清单只覆盖 .env 与 postgres」。`backup-validate`
识别 manifest 并按新形态校验，同时明说 **presence is not restorability**。

**文档**：平台仓 `docs/current/guides/backup-and-restore.md`（+ zh-CN），运维指南两语种加链接。

**`.gitignore`**：两仓都加 `backups/`——备份含 API key 与加密凭据存储，绝不能进 commit。

## 演练：生产快照 → 本机全新栈

生产 v0.4.5（callanything.xyz，四容器 Up）。备份经 SSH 只读取得：

```
postgres.sql.gz   19535 B      artifacts.tar.gz  668422 B
gateway.tar.gz      893 B      relay.tar.gz        4371 B
6/6 artifact 为 committed
```

`verify --deep` 全绿：四文件 checksum 一致 · 6/6 committed artifact 字节与大小/sha256 一致 ·
gateway 凭据存储存在 · **dump 成功灌入干净 postgres** · dump 自带的 artifact 索引与 manifest 一致。

恢复到本机全新 project `restore-drill`，配一份**全新生成的 `.env`**（模拟「换台机器重建」这一
最坏也最真实的情形），起 v0.4.5 镜像：

| 检查 | 结果 |
|---|---|
| `/platform/buildz` | `release_id=v0.4.5`、`git_sha=a224c17`，与生产一致 |
| 站点 / console / relay healthz | 200 / 200 / 200 |
| 待办聚合 `/v1/admin/attention` | 渲染出真实生产内容（7 条历史卡住调用） |
| **6 件 artifact 经恢复后的平台取回** | **6/6 字节与 sha256 全部一致**（含两次 MinerU 实跑的输入 336919B/433192B 与四件输出） |
| console 会话态 | `configured:true, setup_required:false, locked:true`——凭据存储回来了，是「锁着待口令」而非「未初始化」 |
| relay sqlite | 36864 B 随卷回到位 |
| 恢复拒绝覆盖 | 对已有数据的 project 再跑一次 restore，逐个点名四个卷并拒绝执行 |

演练后已 `down -v` 拆栈，生产数据不留在本机运行态。

## 演练挖出的真缺陷（已修）

**`PLATFORM_ADMIN_API_KEY` 在任何已有持久化状态的栈上被静默忽略。**

`hydratePlatformState` 会整体清空并用快照重填 `apiKeys`，而 env 里的 admin key 是在
`createPlatformState` 阶段种进去的——于是只有「数据库第一次为空那天烧进去的那把」还能认证。
两个后果：

1. 恢复出来的栈**没法用运营者手上真正持有的 `.env` 管理**（演练现场：新 key 401）；
2. **轮换 admin key 是个看起来生效、实际什么也没发生的空操作**，旧 key 永远有效。

第 2 条是安全性的：轮换的语义就是吊销，而它一次也没吊销过。

修法：hydration 之后，**显式配置**的 key 胜过快照并吊销上一把 `platform_admin` 条目；**未配置**
则一切照旧——回退值每次启动随机生成，若也当配置处理，等于每次重启都吊销还在用的 key。
5 例单测（含一例走 HTTP 真实认证：新 key 200、快照里的旧 key 401）。

带修复的镜像重跑演练后，`/v1/admin/attention` 用运营者自己的 key 返回 200。

## 用全新密钥恢复的已知代价（写进运维指南）

- console 里存的 operator API key 是旧的（上一套部署加密存入），解锁后需重录；
- 已签发的 relay receiver token 全部失效（`RELAY_TOKEN_SECRET` 做 HMAC 签名），设备需重新取；
- 已签发的任务 token 同理失效（`TOKEN_SECRET`），只影响在途调用。

带上原始 `.env` 可避免全部三条。**`.env` 刻意不进备份**：它含五个密钥，塞进每份备份等于成倍
增加密钥的存在位置，而备份是会被到处拷贝的。

## 测试

- platform：**59 单测**（+9 stack-backup 校验 +5 hydration） / **123 集成**，全绿；
- workspace：`test:selfhost-kit` 新增 public-stack 计划与 stack-backup 产物校验用例，含负面控制
  （缺 `artifacts.tar.gz` 必须 blocker）。

## 数据处置

生产备份留在本机 `~/backups/delexec/`（仓外，0700/0600），已加 `backups/` 忽略规则防止误入版本控制。
本文件只记数量、大小、checksum 与步骤，不含任何调用内容、密钥或 artifact 正文。

## 仍未做

- **异地/定时**：目前是「跑一条命令」，不是「自动每天跑并送到另一个地方」。单主机上的备份挡不住
  主机整体丢失。
- **E7 的另外两次演练**：Responder 与 Research 侧的受控恢复回滚仍未做（Research 私仓尚未创建）。
- **relay sqlite 的一致性断言**：按崩溃一致性复制，靠 sqlite 重放 WAL，未做「恢复后信封条数与
  备份时一致」这类校验。
