# M1 公网跨设备 Runtime — 入口条件与交付单元

父任务：`../07-17-call-anything-private-capability-network-mvp/prd.md`
状态：**已激活**（Wave 0 于 2026-07-31 完成，入口架构决策全部落档）

## 入口门（全部已满足）

| 决策 | 落点 |
|---|---|
| A-01 artifact 数据通道 | 协议仓 `docs/planned/design/mvp-architecture-decisions.zh-CN.md` |
| A-02 Provider 连接模型 | 同上 |
| A-03 重启与对账 | 同上 |
| A-04 共享状态边界 + 四轴状态模型 | 同上（含合法迁移与资金矩阵） |
| A-07 元数据保留 | 平台仓 `docs/planned/design/mvp-policy-decisions.zh-CN.md` |

## 硬前置（✅ 已于 2026-07-31 解除）

原前置：transport-relay 六路由无鉴权，任何人可读/注入/删除任务信封（审计 S1）。2026-07-31 分两步关闭——先在 Caddy 与生产 nginx 双侧撤下公网暴露（止血，CHG-2026-181），再落地 A-02 的 authenticated relay inbox（根治，CHG-2026-183）。

**私有文档与证据现在可以进入该通道。** 后续单元若引入新的数据面（如 artifact 直传），需各自重新评估暴露面，不得默认继承本结论。

## 交付单元顺序（每个独立可评审、独立走五件套）

1. ~~**relay 鉴权 + 可见性租约**~~ ✅ **完成 2026-07-31**（platform `f26a08b` + client `0867e1b`，CHG-2026-183）——admin token + receiver-scoped token、admin-only 签发端点、可见性租约、租约保护的幂等 ACK（stale lease → 409）；memory/sqlite 双 store 同语义，sqlite 就地加列保留既有队列；direct-run 无凭据拒绝启动（捕获并修好三处裸启路径：e2e、打包服务烟测、compose）；e2e 7/7 在鉴权下绿。
2. ~~**最小 M1 协议切片**~~ ✅ **完成 2026-07-31**（protocol `d2ad83b`，CHG-2026-185）——四轴状态 + 合法迁移表 + 跨轴一致性校验、artifact 描述符（主动拒绝 bucket/object_key/presigned_url/local_path）、HotlineVersion 绑定与可恢复性等级、对账报告校验；34 例单测。contracts 0.1.3 → **0.1.4（源码已改，npm 未发布）**。
   > ✅ **前置已解除（2026-08-01）**：owner 授权后 `@delexec/contracts@0.1.4` 已发布（publish run 30645987065），洁净房安装验证 18 个新导出齐全且语义生效。源码与 npm 一致，client/platform 现在可以 import 该切片。
3. ~~**设备 enrollment 与能力上报**~~ ✅ **完成 2026-08-01**（platform `9f2aa49` + client `5bdbda9` + protocol `adbab35`，CHG-2026-186）——匿名注册路径移除（破坏性，已知且有意）、心跳带 version/capacity 并进运营视图、maintenance 粘性、陈旧心跳压过自报。FR-002/FR-003 转 done。
4. 🟡 **artifact 通道** — 平台侧完成 2026-08-01（platform `0b77672`，CHG-2026-187，12 例集成）：受限槽位→直传→checksum 提交→按 grant 授权下载；grant 按单件+单向授权；已提交字节不可覆写；描述符不含任何存储定位符。`@delexec/artifact-store` 作为可换后端的接缝，先落文件系统后端 + compose 持久卷。
   ✅ **客户端接入完成 2026-08-01**（client `c920e9b`，CHG-2026-188）：`@delexec/artifact-client` 落地，responder 上传输出并只传描述符，caller 解析描述符并校验字节；本地模式保持内联路径不变；上传失败回退内联而非交付取不到的 artifact。7 例集成对真实 platform-api。
   > ✅ **分发缺口已补（2026-08-01）**：owner 授权后（decisions.md D5.2）发布 `@delexec/ops@0.1.7`（client `b15c2bc`，CHG-2026-190，publish run 30706250315）。npm 上的 0.1.6 发布于 2026-07-04，缺 relay bearer token、supervisor 凭据修复与 artifact 通道三笔——外部设备装到的客户端在 CHG-2026-183 关掉无鉴权路由后根本连不上 relay。洁净房验证：contracts 0.1.4 从 npm 解析，13 个 workspace 包随 prepack 打包进 `ops/node_modules`，CLI 可运行，已发布字节内含 Bearer 头、opt-in `lease_id` ACK 守卫与 `@delexec/artifact-client`。
   > **仍欠一项**：A-01 目标的 S3/MinIO 后端（`@delexec/artifact-store` 接缝已留，换后端不动协议；今天走文件系统后端）。**是否在 M1 内做尚未决策**——单 Operator 跨设备实跑不依赖它。
5. ~~**重启对账**~~ ✅ **完成 2026-08-02**（client `f9a8c86` + platform `2fada76` + protocol `5b1acd0`，CHG-2026-191）——本地 append-only journal（SQLite 触发器强制不可改写，`synchronous=FULL`）、boot_id/attempt_id、按可恢复性等级收口：仅 `restartable` 自动重跑，其余签名上报终态 `failed`。**未知态无法结算**这条是结构性的而非约定：`delivered` 上报直接 409，且计费调用硬编码走 FAILED 路径，两道独立防线。平台不可达时**故意**保留尝试为未闭合——记为已处理等于在断网时把 Call 从两侧一起抹掉。25 例新测试（8 单测 + 17 集成）。
   > 顺带修掉一个陷阱：platform `test:integration` 里手写的文件清单导致新套件在 `npm test` 下**静默不跑**（CHG-2026-181 已经栽过一次）。改回用 vitest 配置的目录 glob，覆盖面不变，集成从 86 过升到 96 过。
6. 🟡 **真实 MinerU 跨设备跑通** — **任务侧完成 2026-08-02**（CHG-2026-192）。设备 = 本机 Mac 上的真实 MinerU 3.4.4，平台 + relay = 生产 callanything.xyz，两次真实任务无人值守完成、checksum 全过：run1 在 v0.4.0（337KB PDF 经 **1498 字节**信封跨设备，设备侧 sha256 与源一致，3248B markdown / 16.3s），run2 在 v0.4.1（另一份 PDF，markdown + 2 张抽取图，三件全过）。平台自身的调用详情聚合独立复核了时间线与两件 artifact 的 committed 状态。
   > 前置一并解决：**输入 artifact 两头客户端本来都没实现**（台账记错，已订正）；**公网 relay 边缘重新开放**（先验证已部署 relay 四条业务路由无凭据均 401 才开，并把 relay 两个凭据纳入密钥卫生）；生产滚到 **v0.4.1**。
   > ❌ **E6 未达标**：任务流本身无 SSH / 无手工搬运，但**设备与热线审批仍要 admin curl**——console 第三次重做只到后端聚合接口，没有 UI 可点。这是 M1 剩下的唯一缺口。

## 退出条件

一次真实 MinerU 任务跨设备无人值守完成，artifact 校验一致，且失败矩阵（接受前离线、执行中断连、重复提交、重复交付、部分 artifact、重启、超时+宽限、过期版本、重试）各有明确行为与证据。

### 达成情况（2026-08-02）

| 退出项 | 状态 |
|---|---|
| 真实 MinerU 跨设备无人值守完成 | ✅ 2 次（CHG-2026-192） |
| artifact 校验一致 | ✅ 输入/输出双向 checksum 全过，含多件输出 |
| 失败矩阵 9 项各有行为与证据 | ✅ 平台 7 例 + 客户端 2 例集成测试 |
| E6 正常流程无 admin curl | ❌ **审批仍需 admin curl**，缺 console UI |

失败矩阵证据位置：`repos/platform/tests/integration/failure-matrix.integration.test.js`（接受前离线、重复提交、重复交付、部分 artifact、重启、超时+宽限、过期版本）与 `repos/client/tests/integration/failure-matrix.integration.test.js`（执行中断连=重放不重跑、重试=独立 attempt）。

写这份矩阵时挖出一个真缺陷：`isStuckCall` 读的字段生产事件根本不存在，**卡住检测自交付起从未在真实数据上触发过**，其测试靠手工塞字段才通过。v0.4.1 已修。这条值得记住——"没有告警"当时等于"看不见"。

## 台账

进度写入 `docs/planning/private-capability-network/traceability-ledger.md` 的 M1 表，状态只能由证据推动。
