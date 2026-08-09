# FR → Owner → Test 追溯台账

Created: 2026-07-31（Wave 0 产出）· 单一事实源 = `.trellis/tasks/07-17-call-anything-private-capability-network-mvp/prd.md`
决策记录：同目录 `decisions.md` · ADR：协议仓 `docs/planned/design/mvp-architecture-decisions.zh-CN.md`、平台仓 `docs/planned/design/mvp-policy-decisions.zh-CN.md`、四仓 `docs/decisions/002`/`003`

## 图例

- **状态**：`done` 已有证据 · `partial` 部分能力存在但不满足需求 · `todo` 未开始 · `n/a` 本阶段不适用
- **owner**：`protocol` / `client` / `platform` / `research`（独立私仓）/ `brand` / `workspace`
- 证据列填 commit、CI run、测试文件或彩排记录；**空白即表示无证据**，不得据此声称完成

---

## M0 事实一致性与 release 收口

| FR | 需求 | Owner | 状态 | 证据 |
|---|---|---|---|---|
| FR-080 | 统一 release manifest | workspace | **done** | `releases/manifests/2026-07-31-selfhost-baseline.yaml` + `tools/release-manifest.mjs`（ADR-002） |
| FR-081 | 组合认证：只有过 gate 的组合可标 current | workspace | **done** | `releases/current.yaml` 指针 + `test:release-gate` 链含 `release:manifest:verify` |
| FR-082 | 生产版本探测 | platform | **done** | 生产已滚 v0.3.0，`/platform/buildz` 与 `/gateway/buildz` 实测上报 `release_id=v0.3.0`、`git_sha=9b8abda`、console 资产指纹 `index-DoU8e5Gd.js`；`release-manifest check` 对生产报 **runtime matches release v0.3.0** |
| FR-083 | 状态漂移阻断 | workspace | **done** | `release-manifest check` 阻断漂移；"服务无法自陈"报 undetermined 而非通过（`tools/release-manifest.test.mjs` 16 例） |
| FR-084 | 回滚记录 | workspace | **partial** | manifest 不可变 ⇒ 回滚必产生新 release_id；专门的回滚记录字段待 M5 |

## M1 公网跨设备 Runtime

> **硬前置已解除（2026-07-31）**：relay 六条业务路由此前无鉴权（审计 S1）。现已落地 admin token + receiver-scoped token 鉴权、可见性租约与租约保护的幂等 ACK（platform `f26a08b`，client `0867e1b`）；e2e 全流程 7/7 在鉴权开启下通过。私有证据可以进入该通道。

| FR | 需求 | Owner | 状态 | 证据 |
|---|---|---|---|---|
| FR-001 | 创建单 Operator 信任域 | platform | partial | public-stack compose + console v0.2.0 可初始化；缺"网络"对象 |
| FR-002 | 受控凭据注册 Responder 设备 | platform + client | **done** | 匿名注册路径已移除，enrollment 必须携带凭据并绑定注册者身份（platform `9f2aa49`，client `5bdbda9`，9 例集成） |
| FR-003 | heartbeat 与在线状态 | platform + client | **done** | 心跳带 version + capacity 并在运营视图呈现；maintenance 粘性、陈旧心跳压过自报（platform `9f2aa49`）。客户端主动上报容量待接入运行时（记为 FR-036 邻项） |
| FR-004 | Provider-managed execution | client | done | Platform 不持有 Provider 代码/模型/secrets（现架构即如此） |
| FR-005 | 最小权限：只执行已注册 Hotline | client | partial | 无通用 shell 入口；缺文件/网络访问范围可配置（NFR-S02） |
| FR-006 | 设备维护窗口 (P1) | platform | todo | 相邻能力已落：`POST /v2/admin/responders/:id/retire` 让已消失的设备停止永远上报为问题（platform `73f3dc9`，CHG-2026-203）|
| FR-020 | 一次性结构化 Brief | protocol + client | partial | input schema 校验存在；缺档位与预算上限字段 |
| FR-021 | 执行前 ACCEPTED/REJECTED | protocol + platform | partial | 协议侧 `rejected` 语义与"拒绝不得持有资金"校验已冻结（protocol `d2ad83b`）；平台路由未实现 |
| FR-022 | 预算硬上限 | platform | partial | `max_charge_cents` hold 存在；缺档位绑定与超支阻断语义 |
| FR-023 | 幂等提交 | platform | **done** | request_id 幂等 + hold 状态双重幂等（审计 D2.5 确认） |
| FR-024 | 取消 | protocol + platform | partial | 协议侧 `canceled` 迁移已定义（已交付不可取消）；**运营者收口已实现**：`POST /v1/admin/requests/:id/close` 必须写理由、有冻结资金则退款、**结构上永不结算**、已结算的明说而不悄悄冲正（platform `73f3dc9`，v0.4.9，11 例集成，CHG-2026-203）。**仍缺**：Caller 侧主动取消（本条 FR 的正题）|
| FR-025 | 任务排队 (P1) | protocol + platform | partial | 协议侧 `queued`/`executing` 已区分（protocol `d2ad83b`）；平台未实现 |
| FR-030 | 长任务状态 | protocol + platform | partial | **协议侧完成**：四轴 + 合法迁移 + 跨轴校验（protocol `d2ad83b`，34 例）；platform 侧实现未开始 |
| FR-031 | 状态持久化 | platform | partial | 快照持久化存在；`postgres-persistence` 集成测试已恢复入套件（platform `9584fdf`） |
| FR-032 | 输入 artifact | protocol + platform + client | **done** | ~~2026-08-01 曾据 `c920e9b` 记为 done（代码侧），系**记录错误**：那笔只做了输出方向，caller 不上传输入、responder 不下载输入，真实 PDF 只能内联~~。2026-08-02 补齐两头（client `86d1ac9`，6 例集成）：caller 以 `role=input` 上传、只传描述符；responder 执行前取回并校验，取不到即拒绝执行。**跨设备实跑已完成**：336919 字节 PDF 经 1498 字节信封跨设备，设备侧 sha256 与源一致（CHG-2026-192） |
| FR-033 | 输出 artifact | protocol + client | partial | responder 输出走 artifact 通道并携描述符（client `c920e9b`）；跨设备实跑验证多件输出（markdown + 2 张抽取图）checksum 全部一致（CHG-2026-192）。仍缺证据包/日志摘要形态（M4 相关）。**2026-08-09 修掉一条真 bug（CHG-2026-216）**：`enforceArtifactSizeLimit` 在 `finalizeTask` 里**无条件**执行、且用 `EMAIL_MAX_ATTACHMENT_BYTES`（5MB），于是本该走 artifact 通道的成功执行被就地改写成 `RESULT_ARTIFACT_TOO_LARGE` 并附一句「email limit」——而这次调用从未靠近 email。活已经干完，输出在最后一步被一条不适用的规则丢掉；生产走 relay 且有平台绑定，通道一直可用，这条上限在那里根本没有管辖权；而 email 自 CHG-2026-205 起已冻结，等于**一条废弃传输的限制在摧毁正在使用的那条传输上的结果**。owner 用 MinerU 解析真论文必然撞上。现上限只在「内联是唯一出路」时生效，判定放在结果签名之前但按真正承载它的传输来做；改名 `RESPONDER_MAX_INLINE_ARTIFACT_BYTES` 并保留旧变量作回退。3 例集成（对真实 platform-api），9MB 输出经通道送达并 committed |
| FR-034 | Artifact 完整性 | protocol + platform | **done**（平台侧） | checksum 不符即拒绝提交并保持 allocated，失败字节永不成为已交付（platform `0b77672`）；未 committed 的 artifact 绝不出字节。Delivery Integrity 轴与 Call 的绑定待 M3 |
| FR-035 | 可恢复故障 | protocol + client + platform | **done**（代码侧） | 协议侧三等级 + `mayAutoRerun` + 对账报告校验（protocol `d2ad83b`）；客户端 append-only journal（触发器强制，`synchronous=FULL`）+ boot_id/attempt_id + 按等级收口（client `f9a8c86`，8 单测 + 7 集成）；平台 `POST /v1/requests/:id/reconcile` 验签收口且**结构上无法结算**（platform `2fada76`，10 集成）。CHG-2026-191。**跨设备实跑待 M1 单元 6** |
| FR-036 | 进度事件 (P1) | protocol + client + platform | **done** | 观测事件对（PROGRESS/SOFT_TIMEOUT）刻意置于 CALL_EVENT 之外——观测不是第五根轴（protocol `d01ffeb`，contracts 0.1.5 已发 npm）；responder 三锚点叙述 + `hooks.reportProgress`，尽力而为、失败不影响任务（client `c3e68b0`，3 集成）；平台收下并在 `/calls/:id` 时间线渲染，不碰计费/不动投影/终态后 409/按 seq 幂等/仅修剪 PROGRESS（platform `ae55883`，7 集成）；**进度刷新卡住检测**，长任务不再被误报（测试固定）。顺带关闭现存静默缺陷：SOFT_TIMEOUT 此前一直被平台 400 拒且两侧无声。浏览器实证两次（本地 seeded 栈，13%→100% 实时推进）；生产 v0.4.4 已滚（CHG-2026-196） |

## M2 最小 Hotline 服务契约

| FR | 需求 | Owner | 状态 | 证据 |
|---|---|---|---|---|
| FR-010 | 声明 Hotline | protocol + platform | **done**（发布门） | 2026-08-06 生产审计发现真实缺口比记录的更尖锐：**一个热线可以完全不声明契约就被批准并调用**——唯一干过真活的 `local.mineru.pdf.parse.v1` 无 input/output schema、无示例、无限制说明。现落地发布门（platform `a2e32e9` + protocol `97bd4ad`，contracts 0.1.8）：审批时必须有两个 schema、每向至少一个可用示例、且必须声明「不适合做什么」，否则 `CONTRACT_HOTLINE_INCOMPLETE` 附逐项清单。已批准的不重新校验（否则会无声下线生产热线）。生产已滚 **v0.4.7**。2026-08-06 续：契约事实源改为**跟着 worker 走**——worker 以 `--contract` 自陈，客户端两条注册路径都携带（此前生产用的 `/controller/register` 连示例字段都没有）；平台**停止用模板默认值编造**未声明的 schema（生产曾把 PDF 解析器公开描述成 `{text}→{summary}` 文本摘要器），改以 `contract_declared` 直说（client `f4a3b3a` / ops 0.1.9，platform `7531e20`，生产 v0.4.8，CHG-2026-202）。**仍缺**：执行绑定（responder 按契约校验输出）归 M3。~~生产 MinerU 重新注册+重新审批待 owner（重提交会使其下线至审批）~~ **2026-08-09 修正（CHG-2026-213）**：「重提交必下线」是**缺陷**不是设计——`submitCatalogHotline` 对任何重提交硬置 `disabled/pending`，内容没变也一样；现改为按内容摘要判断（审批侧本就按摘要幂等），相同即保持 enabled/approved，公钥轮换/投递改向/换设备/**版本化之前批准的热线**仍回 pending。另补 `responder contract-check` 让设备能自己看出平台缺什么。生产 MinerU 仍待在持有该设备的机器上重提交（**不再下线**）+ owner 择机批准一次 |
| FR-011 | 固定服务档位 Quick/Standard/Deep | protocol + platform | **done**（声明 + 快照） | 协议侧 `SERVICE_TIER` 三档 + A-05 验收窗（24h/72h/7d，网络边界 24h–7d）+ `serviceTermsOf`（protocol `49a5d0a`，contracts 0.1.9 已发 npm，18 例单测）；平台侧提交接受、发布门校验、**Call 在钉版本的同一刻从版本自身的契约快照 terms**（platform `74ab106`，8 例集成）。承重的一条：把热线按新档位重新发布，在途 Call 的 terms 不动。显式 `acceptance_window_s` 优先于档位默认值，越界**拒绝而不夹取**——被悄悄改过的窗口就是被悄悄改过的承诺。CHG-2026-206。**仍缺**：验收窗真正生效（起表、自动接受）归 M3 |
| FR-012 | 隐私与履约模式 | protocol | **done** | `privacy_mode` 声明 `sealed` **直接拒绝发布**，不接受后按 supervised 静默执行——那等于告诉发布者数据被隔离了而事实并非如此；且 `sealed`（本部署无法履行的真实模式）与不存在的模式返回**不同**错误，发布者能知道自己犯的是哪种错。`fulfillment_mode: auto \| confirm`（D8.2）入契约与发布门。三个字段全部可选、缺省即默认、**默认值只在读取时解析绝不落盘**：写进既有记录会改变内容摘要，已绑定该版本的 Call 随即报 `digest_mismatch`——两侧都有断言。CHG-2026-206。**仍缺**：`prepare_request` 的 review 位仍硬编码，从 `fulfillment_mode` 推导是单元 9 |
| FR-013 | 示例输入输出 | protocol + platform | **done** | 示例必须能通过**它自己声明的 schema**，失败时点名是哪一条（protocol `97bd4ad`，16 例单测；platform 8 例集成）。顺带修掉两个同形状问题：bootstrap 热线的示例只进模板包不进目录记录（夹具本身过不了自己的规则）；示例此前**根本没有统一信封**（真实提交 `{title, input}`、演示夹具 `{title, description, params}`）——两种形状正是从来无法校验的原因，现统一到真实数据在用的那个，brand-site 渲染留旧键回退（`aca1aa2`）。浏览器实证：批准一个空声明后 console 逐项列出五条缺失 |
| FR-014 | 版本化：每次 Call 固定 version | protocol + platform | **done** | 协议侧冻结版本文档 + 内容摘要 + 规范化 JSON（protocol `f6ec3a4`，contracts 0.1.7，19 例单测）；平台侧审批即发布、按内容幂等、Call 绑定先于计费与派发且不因重发 token 而升级、绑定随签名 token 与 `delivery_meta` 传递、已绑定调用一律读钉住的版本而非目录当前值（platform `7e7952d`，10 例集成）。版本记录被就地改写会报 `digest_mismatch` 而非默许；无 pin 的旧调用报「早于契约版本化」而不借用当前契约。浏览器实证：改契约后调用详情仍显示 v1 并标注「热线已更新到 v2」。生产已滚 **v0.4.6**（CHG-2026-200，`runtime matches release v0.4.6`）。**仍缺**：responder 尚未按钉住的契约校验自己的输出，结果签名也未覆盖版本——归 M3 交付校验 |
| FR-015 | 启停与可用性等级 | platform | **done**（代码侧） | 此前目录有运营者开关（enabled/disabled）、发布门（review）与心跳观测（availability_status），但**说不出「离线意味着什么」**——夜里睡觉的笔记本 responder 和宕掉的常驻服务看起来一模一样：都叫 offline、都不算事故、都照常派发。现落地 `availability_policy: always_on \| scheduled \| best_effort`（提交时声明、静默重提交自动延续；**刻意不进冻结契约**——可用性描述设备的运营生命而非工作承诺，没有争议会按「上周二设备可不可达」来裁，因此无需发协议版本）。计划要求的「合并为一个可用性模型」合并的不是字段而是**答案**：四个状态字段保持正交（console 曾被四态糊在一起坑过——diagnosis 证据 6，计划点名），所有投影新增派生的 `callable`/`callable_reason`，token 签发处一道闸读它——在冻结资金、信封进 relay 队列**之前**。默认 best_effort，承重测试钉住理由：派发从未按可用性设闸，更严的默认会让唯一真生产热线（笔记本，现在就 offline）在无人决策的情况下开始拒发 token。语义：always_on+offline → 503 可重试并报出策略与观测值，设备心跳恢复即自动开闸；scheduled 按**自己时区**评估窗口（上海晚间窗按 UTC 读是显而易见的错读，有测试）、跨夜窗尾段归声明日、零长窗=永不而非全天、无 schedule 的 scheduled 直接拒绝（那是伪装成承诺的 best_effort）；**maintenance 在任何策略下都不派发**——它是唯一「请求而非测量」的可用性状态，sticky 语义本来就是为了不被心跳新鲜度顶掉，但 token 签发此前从未尊重过它。失约产生新告警项 `availability_promise_broken`（沿既有 flattenAttentionToAlerts 进 webhook）；既有 device_unavailable 项**原样不动**——owner 2026-08-09 刚手工清干净的告警基线不得被一个策略默认值悄悄洗牌。console：徽章词汇（承诺常驻/按时段/尽力而为）+ 热线列表按策略过滤 + 红色不派发原因。platform `7b9ab23`（10 例集成，改动前全红，stash 验证）。CHG-2026-210。**未做**：ops 客户端尚未转发该字段（平台两条注册路径已接受）；按窗口抑制告警归 M3+ |
| FR-016 | Stable/Preview (P1) | platform | todo | |
| FR-070 | 导出 Hotline 包 | platform | **done** | ExportBundle **按白名单构造**（冻结契约字段 + 可用性声明），绝不靠从记录上删键——剥离清单每加一个字段就要重审一次，漏掉的那个恰好就是泄漏的那个；白名单失败即关闭。审计测试是同一保证的黑名单半边：对序列化字节逐禁项断言不存在（凭据/设备身份/本地拓扑/联系邮箱/质量历史）。带 `declaration_digest`（与 Call 钉版同一套 canonical JSON 摘要），运营者凭据 + 审计事件。platform `5cbd9ac`（4 例集成，改动前全红）。CHG-2026-211 |
| FR-071 | 排除信誉数据 | platform | **done** | queue_depth / est_exec_p95_s / review_reason / reviewed_by / review_status / submission_version / trust_tier / 心跳全部不出包，理由写进代码：信誉是在**旧网络、旧运营者监督下**挣的，随包携带就是把信任走私过 FR-072 要重建的边界。联系邮箱同剥（目标运营者无持有同意）。逐项字节断言。CHG-2026-211 |
| FR-072 | 新网络重新验证 | platform | **done** | 包**刻意不携带设备**——热线可以旅行，设备不行；导入必须点名目标网络**已注册**的 responder（否则 IMPORT_RESPONDER_REQUIRED），走常规 submitCatalogHotline 路径，**结构性**落在 pending/disabled：重新审批不是 flag 而是唯一出路，批准时发布门按本网络的规则对导入声明全量重验。双网络集成实证：导入后公开面 404，目标运营者批准后才可见且契约完整。被篡改的包按摘要拒收（只警告的摘要是装饰）。已有同名热线不加 overwrite:true 不覆盖。CHG-2026-211 |
| FR-073 | 兼容性检查 (P1) | protocol + platform | todo | |

### agent 可调性单元（2026-08-09 按 decisions.md D8.1 扩入 M2，不对应单条 FR）

| 单元 | 内容 | Owner | 状态 | 证据 |
|---|---|---|---|---|
| 8 | agent 契约读取链路 | client (+platform 投影) | **done**（代码侧） | 此前 `read_hotline` / `prepare_request` 硬依赖本地注册草稿，而草稿由**注册方**在 responder 机器上写——纯 caller 机器上一份都没有，官方链路对所有热线一律 404；能走通的那条分支又恰好丢弃发布门刚强制写全的字段（示例、`not_recommended_for`、`limitations`、`pricing_hint`、附件声明）。现以平台目录为 caller 侧契约事实源（`GET /v2/hotlines/:id`，无鉴权，正是发布门校验过、Call 钉住的那份），草稿降级为离线兜底；两个来源**整份择一，绝不逐字段拼**（拼出来的契约没有任何人发布过——CHG-2026-202 的同形状失败）。返回体改为透传 `HOTLINE_VERSION_CONTRACT_FIELDS` 全量。失败模式刻意分开：平台不可达报 `HOTLINE_CONTRACT_SOURCE_UNAVAILABLE`（502 可重试）而非 404；未声明契约报 `HOTLINE_CONTRACT_NOT_DECLARED`（409）——生产热线今天正是这个状态。检索：纯中文查询此前 token 为空，走"无词"分支返回字典序前 N 条（测试中实测返回 4 条无关热线），现 CJK 按整段 + 二元组保留，承重断言是反向的那条（中文查询无命中即返回空）；匹配面此前只搜 `description`，而平台列表投影发的是 `summary`。平台侧补 `input_attachments`/`output_attachments`/`service_id` 进公开详情投影——提交时存了、投影时丢了，caller 只能靠被拒绝才知道要传 PDF。client `fb9bee5`（5 例集成，**对真实 platform-api**，改动前 5 例全红）+ platform `18f51d6`（1 例集成，同样改动前红）。CHG-2026-204。**未做**：ajv 校验、MCP per-hotline 工具投影、review 位推导（单元 9 / 5）；**未发 npm、未滚生产**（改动在 `@delexec/ops` 已发布字节内，但后续单元改同一批文件，整批结束一次发版） |
| 9 | 填写校验升级（ajv / per-hotline 工具 / review 位） | client | **done**（代码侧） | 三件事都是「发布者声明了、调用侧没人读」。**校验**：`prepare_request` 此前用自研 walker，只看顶层属性的 `type` 与 `enum`——`pattern` / `minimum` / `maxLength` / `format` / 数组项 / 一切嵌套对象全都无人执行，要等 responder 几分钟后拒收才暴露，而那正是 agent 唯一学不到东西的时刻。现改用 ajv 2020，**与发布门放行该 schema 时同一个引擎、同一套 `strict:false`**，两侧不可能对「契约是什么意思」产生分歧；保留逐字段 `{field, code, message}`（一串 ajv 文本不是模型能逐字段修的东西），嵌套报成 `options.language`。本侧编不出来的 schema 报 `HOTLINE_INPUT_SCHEMA_UNUSABLE` 指向**契约**而不是怪调用方——否则 agent 会去重写一个根本没错的请求。**review 位**（D8.2）：此前对全网每一条热线都返回字面量 `{required:false, status:"not_required"}`——那不是未实现功能的占位，而是对一个协议层根本问不出的问题给出的答案；现从 `fulfillment_mode` 推导，`confirm` 热线未确认即 `send_request` 得 409。确认队列落在 `/skills/caller/approvals`——正是 Ops console 代理一直指向的位置，而它指的 `/skills/remote-hotline/approvals` **在任何版本里都不存在**，那个视图从写下来那天起一直返回 404；断头代理接通而非删除（confirm 流本来就需要队列），两个新动作都进 manifest。**MCP 投影**：六个通用工具的 `input` 是 `z.record(z.string(), z.unknown())`，宿主既校验不了参数也提示不了字段；现每条可调热线按其 `input_schema` 生成专属 prepare 工具，并把「不适合做什么」放进 description——最可能阻止一次错误调用的那句话，就该出现在模型挑工具的地方。投影**只取顶层且绝不新增契约没声明的约束**，因此只可能比契约松、不可能更严（宿主永远不会拒掉热线本会接受的输入，深层约束仍由 prepare 的 ajv 指名报错）。注册在 McpServer 上而非仅 raw JSON-RPC，因为两条真实传输都走它——宿主看不见的投影不算投影；目录不可达只损失 per-hotline 工具、绝不损失通用六件。client `6c6b686`，4 例新集成（对真实 platform-api）。CHG-2026-207 |
| 10 | 付费同意语义 | client + platform | **done**（代码侧） | **CLI**：此前无条件 `billing.acknowledged=true`、运营者不填就默认 500——「调用方同意付费，上限这么多」是客户端**替运营者写下的句子**，而那个数字他们从没看见过。现从 `/v2/hotlines/:id`（无需凭据，在承诺任何事之前就能读）读价，付费热线缺 `--max-charge-cents` 即拒绝并报价；显式上限在读价失败时仍然生效（热线可能根本不在公开目录，因查询失败而丢弃一次真实同意是另一个 bug）。**MCP 路径比计划锚点写的更严重**：它表达不了同意，根因是 `send_request` **从来不签发 task token**——它对所有热线都走本地 create/contract-draft/dispatch，平台热线因此没有 token、没有 delivery meta、也没有 billing（付费免费都一样）。这才是「付费热线经 MCP 不可用」的真正原因，也意味着这条路**从未完成过一次平台调用**。现远端热线走 `/controller/remote-requests`，本地热线保持原序列（原本地用例未改动即为证）。**同意在 prepare 阶段落定而非 send**：agent 若到派发失败才知道价格，它在自己的计划里早已把这次调用当成既定事实；而 prepared request 正是 `confirm` 热线下人要审的那份东西。**平台**：三处失真——完全不带 billing（最常见的「没同意」）报成通用 `ERR_BILLING_REQUEST_INVALID` 400，读起来像「你发的东西格式坏了」而不是「你还没同意付费」，现归位为 402；所有拒绝都不带价格，调用方只被告知「你没同意」还得自己去查同意什么，agent 则只能猜一个数字——那是知情同意的反面，现每条计费拒绝都带 `pricing_hint`；同意校验此前排在计费存储检查**之后**，于是没同意的调用方被告知「账本挂了」——没同意是调用方自己能修的问题，存储故障是运营者的，把运营者的问题报给一个自己也有问题的调用方，只会让它去等一个不会有帮助的东西，已调序。client `d237f07`（4 例新集成 + 1 例 CLI）+ platform `57d1a88`（1 例新集成，**无需 Postgres 即可证明调序**：enforced 且无 store 时，没同意得 402 带价，格式正确的同意才走到 503）。CHG-2026-208。**未做**：真正扣款结算的端到端仍需 Postgres 计费存储，本环境没有；此处证明的是同意被构造、传输、校验，不是资金真的动了 |
| 11 | caller 完成通知（webhook，D8.4） | platform + client | **done**（代码侧） | 此前只能轮询，任务一长要么挂着终端要么错过结果。**由 caller 凭据注册，不是运营者面**——这是整个单元的关键决定：只给运营者配的话，这功能对它存在的那个场景（一台没有、也永远不会有运营者凭据的机器上的 agent）就完全无用。轮询原样保留为兜底（无回调时仍能轮到终态，有断言）。四条被测试钉住的决定：①**结果本身刻意不进 payload**——webhook body 是私有文档最不受控的去处，通知只带 request_id、这次调用绑定的契约版本（收方无需再问目录「现在的条款是什么」）、四轴状态与一个走自有鉴权通道去取的 URL，断言原始报文里既没有 `result_package` 也没有 `output`；②**投递不阻塞 responder 上报结果**——调用方的接收端慢，不能拖慢整个网络，更不能让别人的调用失败；③**一次调用只通知一次**，重发或去重后的终态是同一条消息，告诉调用方两次「你的调用完成了」比稍微沉默更糟；④**平台永远不会发的事件名在注册时就拒绝**，接受后静默不投会让调用方等一个根本不会来的通知。投递结果 caller 可读（`/v1/callers/me/callback/deliveries`）——理由与 FR-066 相同：悄悄失效的 webhook 会复现它本要终结的那种沉默。复用 `alerts.js` 的 `deliverAlert`（HMAC 签名 / 5xx 重试 / 4xx 不重试是同一段代码，不是会漂移的第二份实现）。回调与投递历史跨重启保留。事件覆盖 COMPLETED / FAILED / TASK_TOKEN_EXPIRED，最后一条正是从过期路径本身触发——那时调用方按定义不在看，因为什么都没回来。客户端补 `delexec-ops caller callback set|show|clear` 与 `callback-deliveries`，改 URL 时省略 secret 而非置空（沿用告警配置的规则），secret 在任何面都不回显。platform `d51e60a`（6 例集成，**对真实 HTTP 接收端**——stub 会让「什么都没到」直接通过）+ client `724d06c`（1 例 CLI 集成）。CHG-2026-209。**一条自我更正**：复核计划时我曾建议本单元同时覆盖「待确认的 prepared request」——做不到：单元 9 的确认队列在调用方自己的 skill adapter 里，平台从来看不见 prepared request。那条通知属于客户端，本轮未做
| 12 | email 传输冻结（D8.3） | client + platform | **done**（代码侧） | 平台此前给**每一次**「responder 登记过 delivery_email」的派发都写入 `secondary_task_delivery`，指向那个邮箱；而三个仓 grep 下来只有这一处写、**没有任何读**。也就是说它唯一的作用是为一份私有文档多公布一个投递地址，走的还是从未进过认证组合、从未有端到端证据的通路。现平台该字段恒为 null、`SECONDARY_TASK_DELIVERY_CONFIGURED` 事件一并去掉；新测试把「主投递路径没变」和「事件不再产生」放在一起断言，冻结第二条路不能顺手带走真的那条，并断言邮箱地址没有从信封别处漏出。客户端**冻结不等于删除**：配置照旧可存（半路配置的运营者不该被罚，已经跑在这条路上的部署应当被告知而不是被拦停），改变的是每个面都开始**回答**这个问题——`redactTransportConfig` 带 `deprecation` 块（支持的传输返回 null，是答案而不是缺席）、console 标注并说明原因、supervisor 启动时警告一次，运营者事后切过来再警告一次（那时启动警告早已滚过去）。部署文档中英双语标注冻结。client `97b714a`（1 例单测 + 既有 email 保存用例扩断言）+ platform `743758a`（1 例集成，改动前红）。CHG-2026-205。**解冻只需**：删掉 deprecation 块、还原一个对象字面量——传输包与其三套测试均原样保留 |

**agent 可调性链路端到端实证（2026-08-09，owner 授权部署测试热线后）**：`tools/agent-callability-e2e.mjs`（四仓 `test:agent-callability-e2e`）——5 个真实进程（platform-api + 带鉴权 relay + responder-controller 进程适配器 worker + caller-controller + skill-adapter）+ Docker Postgres 计费 enforced，**24/24 断言**：中文发现 → 读全契约 → 逐字段违约点名 → 拒绝携价 → 显式同意 → confirm 409 → 人工确认 → 派发 → 签名 webhook（不含结果、携钉住版本）→ 轮询兜底取结果 → hold+settle 恰好一次价。agent 侧仅 caller 凭据、仅走 skill-adapter 表面；responder 与 agent 独立 DELEXEC_HOME、仅经 relay。**生产已滚 v0.4.10**（2026-08-09，owner 预授权；ops 0.1.10 publish run 31308621769、Images run 31308792480 四作业全绿含 published-image smoke、manifest v0.4.10 冻结并 promote、`test:release-gate` 端到端绿、`release-manifest check https://callanything.xyz` 报 **runtime matches release v0.4.10**）。生产实测承重默认值成立：MinerU 为 `best_effort` + `offline` → `callable:true`，未因新可用性模型被静默拒发；`contract_declared` 仍如实为空。**生产复跑退出链仍待 owner 完成 MinerU 重注册**（它至今未声明契约，`read_hotline` 会如实报 409）。

**四仓 CI 修复（2026-08-09，CHG-2026-214）**：CI 自 2026-06-14 起近 60 次里 59 次失败，每次只报 `timeout`——owner 发现并追问。**那个词是错的**：`@delexec/responder-runtime-core` import 了 `@delexec/runtime-utils` 却从未声明；本仓用 npm workspaces 扁平提升，Node 向上走能找到别人的副本，于是**本地靠布局的巧合解析成功**；四仓用 pnpm，严格布局只给已声明的依赖，responder 开机即 `ERR_MODULE_NOT_FOUND` 死掉。**说谎的是本地的绿，不是远端的红**——同一个未声明 import 也会让洁净房安装的发布包挂掉，所以这从来不是「CI 自己的问题」。而它之所以报成 `timeout`：两个「成功与失败对调用方无法区分」的等待函数——`waitForServiceHealth` 失败返回裸 `null` 且所有调用方都忽略，于是 responder 退出 8 秒后照样发 `managed_services_started`；`waitForRelay` 更严重，**成功与超时都返回 `undefined`**，第一段真去读它的代码把每个健康的 relay 都报成失败。三处已修，并新增 `check:declared-workspace-deps`（不需安装即可判定，进 `npm test`，对修复前的树精确点名该包）。**两个月的红没教会任何人任何事的原因**：集成检查的 ops home（装着全部服务日志）是 `finally` 会删掉的临时目录，任何一次运行都没留下诊断；现在失败时先打印全部服务日志/relay 输出/compose 状态/端口占用。补上之后**一次 CI 运行就定位到了根因**。run 31314203948 六作业全绿。**一条自我更正**：M2 整批我一路报「五件套全绿」，那是本地跑的；我从未打开 CI 页面，那些 bundle 全部是本地验证通过、远端红着的。

**生产实证：真实 PDF 端到端（2026-08-09）**——设备重建后，用 MinerU 自带的 `demo1.pdf`（336,919 字节）对**生产**跑通一次完整调用：agent 中文检索发现 → 读到平台目录上的完整契约（含附件声明）→ prepare 通过契约校验 → PDF 经 **artifact 通道**上传（信封仅 1,938 字节，**PDF 不在里面**）→ 经带鉴权的公网 relay 派发 → 设备上真实 MinerU 解析 → 结果回传。产出 51,648 字节 markdown、131 个 block、20 张抽取图，**22 件 artifact 全部 committed**，共 1,020,441 字节；结果包带 Ed25519 签名；平台侧 execution=delivered、钉住 version 2、`integrity: verified`、service_terms 快照完整。**这是这张网络第一次在生产上把一次真实工作从发现走到交付。** 途中两条如实记录：①第一次调用 `TIMED_OUT`——caller 默认 `hard_timeout_s=300`，而真实 MinerU 解析（含模型加载）需要约 4 分钟；不是协议失败，是默认预算对真实 ML 负载太短，M3 排队/超时语义应当据此重估。②relay token 是 **receiver-scoped**，而 supervisor 只把**一个** `TRANSPORT_AUTH_TOKEN` 发给所有服务，caller 与 responder 因此无法共用——外部设备接鉴权 relay 时会撞上，本次是把 caller 与 responder 当作两个当事方分开跑才通的。

## M3 交付、验收与结算

| FR | 需求 | Owner | 状态 | 证据 |
|---|---|---|---|---|
| FR-040 | 自动交付校验 | protocol + platform | partial | Ed25519 签名 + 输出 checksum 已是最强防线；缺冻结 schema 校验与独立 Delivery Integrity 状态 |
| FR-041 | Caller 接受触发结算 | platform | todo | 当前结算跟随执行完成，无验收门 |
| FR-042 | 一次修订 | protocol + platform | todo | A-06 已定经济规则 |
| FR-043 | 修订范围约束 | platform | todo | |
| FR-044 | 验收窗口与自动接受 | platform | todo | A-05：72h 默认 / 24h–7d / 起点 = verified |
| FR-045 | 争议 | platform | todo | |
| FR-046 | Operator 契约判断 | platform | todo | 只判履约，不裁真理 |
| FR-050 | 预算预扣 | platform | **done** | hold 已实现；`rejected` 不产生 hold 待 FR-021 |
| FR-051 | 成功结算 | platform | partial | settle 存在但无验收门 |
| FR-052 | 失败退款 | platform | **done** | FAILED 自动退款 + 过期 hold 惰性回收（T-503 实证） |
| FR-053 | 争议冻结 | platform | todo | Settlement `blocked` 态未实现 |
| FR-054 | Exactly-once 资金语义 | platform | partial | 计费轨 CAS + 行锁 + 幂等充值（审计 D3.1）；缺跨分录单事务与崩溃测试 |
| FR-055 | 可审计账本 | platform | partial | ULID 流水 + 前后余额快照；缺到 Call/版本/操作人的完整追溯 |
| FR-060 | 运行总览 | platform | **done** | 后端聚合（platform `3d9af65`，CHG-2026-189）+ UI（platform `373ca64`，v0.4.2，CHG-2026-193）：首页即真实待办，每行可点进处理；无事时明说"没有需要你处理的事"而非三盏绿灯；并显式列出**它还看不到什么**（争议、验收到期），避免"未实现的沉默"被读成"健康的沉默"。告警维度见 FR-066 |
| FR-061 | 元数据查看 | platform | **done** | `GET /v1/admin/requests/:id` 服务端 join（platform `3d9af65`）+ `/calls/:id` 详情页（platform `373ca64`）：时间线、artifact（已提交/已分配可辨、带 checksum）、资金、设备与热线聚成一页；四轴画成四条独立的行而非并排四个徽章；未跟踪的轴标注 `tracked:false` 并给出原因。租户 id 由链接带过去，不再要求手抄 |
| FR-062 | 内容审查授权（选理由） | platform | todo | |
| FR-063 | 内容访问审计 | platform | todo | 通用审计存在，缺内容访问专项且不可静默删除 |
| FR-064 | 争议处理 | platform | todo | |
| FR-065 | 版本可见 | platform + workspace | partial | `/buildz` 已实现；调用详情页已呈现设备版本与最近心跳（未上报时显示"未上报"而非 0，platform `373ca64`）。**仍缺**：运行时组合与认证 manifest 的漂移在 console 里没有入口，只能靠 `release-manifest check` |
| FR-066 | 告警 (P1) | platform | **done**（代码侧） | 平台此前**零出站能力**（无 SMTP/webhook/任何依赖），一切靠人主动打开页面。现落地 webhook 投递（HMAC-SHA256 可选签名、5xx/超时重试、4xx 不重试）+ 首次/每 6h 重备/恢复各一次 + 按 (kind,target) 独立跟踪 + 投递失败在 console 可见；告警判定复用 `buildAttentionItems()`，与 console 同一份计算，不另立标准。**死人开关**：平台自身宕机无法自我告警——正是 2026-07-04 那次的形态——故另配 `liveness_url` 周期 GET，由外部监控在 ping 停止时报警；console 与 status 端点均显式声明 `platform_down` 不在 webhook 覆盖内。配置在 console 可改（E6 无需 SSH），密钥不回显。12 例集成全部对真实 HTTP 接收端。**浏览器实证闭环**：设备离线→签名告警自动送达→心跳恢复→「已恢复」自动送达（CHG-2026-197）。生产已滚 v0.4.5（CHG-2026-198，`runtime matches release v0.4.5`）。**仍未真正生效**：webhook URL 与存活 ping URL 由 owner 在 console 填写后才开始告警——在此之前生产从运营者视角看仍是零告警。**2026-08-07 补一条关键事实**：开告警之前，生产待办常年 12 项且 11 项是六七月残留，而当时**没有任何 operator 动作能让它们闭合**——告警一开就会每 6 小时永远重播，「沉默即已解决」这条承诺会对所有条目一并作废。v0.4.9 补上收口动作并清理生产后，**待办 12 → 1 且剩下那项是真的**，告警基线才算干净（CHG-2026-203） |

## M4 第一方 Research Hotline

| 需求 | Owner | 状态 | 备注 |
|---|---|---|---|
| 结构化 Research Brief（PRD 10.4） | research | todo | 私仓未创建（ADR-003） |
| Decision Brief + Evidence Pack（10.6） | research | todo | |
| Quick/Standard/Deep 档位与人工复核（10.5/10.7） | research | todo | Deep 默认人工复核且必须披露 |
| 新路线发现 / abstain 规则（10.7） | research | todo | |
| Stable/Preview + canary + tracing + 回滚 (P1) | research + platform | todo | |
| **只用公开 API，无隐藏路径** | research | todo | ADR-003 硬约束；M5 应作为可检查证据 |

## 非功能需求

| ID | 要求 | Owner | 状态 | 证据 |
|---|---|---|---|---|
| NFR-S01 | 禁止任意远程 shell/通用代码执行 | client + platform | **done** | 仅预声明 Hotline 可执行；全仓无通用 shell 入口 |
| NFR-S02 | 最小权限、文件/网络范围可配置 | client + platform | partial | relay receiver token 按 inbox 授权、设备入网需凭据、artifact grant 按单件+单向授权（`f26a08b`/`9f2aa49`/`0b77672`）；**设备侧文件/网络访问范围仍未做** |
| NFR-S03 | 不打印/导出 secrets，日志脱敏 | platform | partial | 未系统审计；S3 弱默认密钥断言未做。（相关：审计 S6 女巫面因 FR-002 移除匿名注册而显著收窄，但注册限速仍偏松） |
| NFR-S04 | token/签名/关键操作可验证 | protocol | **done** | HMAC task token + Ed25519 结果签名 + 公钥校验；relay 业务路由 bearer 鉴权（platform `f26a08b`）。2026-08-06 修掉一条相邻缺陷：`PLATFORM_ADMIN_API_KEY` 在任何已有持久化状态的栈上被 hydration 静默覆盖，**轮换 admin key 从来没吊销过任何东西**——显式配置的 key 现在胜过快照并吊销上一把（CHG-2026-199，5 例单测） |
| NFR-S05 | 内容查看/资金/版本/争议必审计 | platform | partial | 通用审计存在；内容访问与争议专项待 M3 |
| NFR-R01 | 任何 Call 必达终态 | protocol + platform | partial | 协议侧 `isCallTerminal` 要求四轴齐备（已交付需验收+资金收口，protocol `d2ad83b`）；平台护栏未实现 |
| NFR-R02 | 重启后状态与账本幂等恢复 | platform + client | partial | 快照 hydrate 存在；中断尝试现在能收口——journal 记录未闭合尝试，重启后签名上报，平台按 attempt_id 幂等退款（`f9a8c86`/`2fada76`，CHG-2026-191）。**仍缺**：非中断来源的孤儿 hold（如 responder 永不回来、hold 过期外的边角）仍无主动对账扫描（审计 D3.4） |
| NFR-R03 | checksum 失败不得标 delivered | protocol + platform | **done** | 协议侧硬约束 + 平台侧 `CONTRACT_ARTIFACT_CHECKSUM_MISMATCH` 拒绝提交（platform `0b77672`）；两侧一致 |
| NFR-R04 | hold/settle/refund exactly-once | protocol + platform | partial | 协议侧 settled/refunded 为终态、自迁移幂等（protocol `d2ad83b`）；对账路径按 attempt_id 幂等，且以计费轨 `state === held` 为结构性兜底——重复上报只退一次（platform `2fada76`）。**仍缺**：跨分录单事务与崩溃测试 |
| NFR-R05 | 设备离线检测 ≤ 2 分钟 | platform | **done** | `OFFLINE_THRESHOLD_S` 180s → **120s**（30s 心跳漏 4 拍），180s 无论下游多快都不可能满足 ≤2 分钟（platform `09aafb1`，CHG-2026-197） |
| NFR-R06 | 无人值守完成率 ≥ 90% | 全体 | todo | M5 dogfood 度量 |

## 阶段退出证据 E0–E7

| ID | 标准 | 状态 | 当前事实（2026-07-31） |
|---|---|---|---|
| E0 | 事实一致 | **done** | 仓库/bundle/manifest/npm/镜像/**生产运行时** 六者一致：生产 2026-08-01 滚到 v0.3.0，漂移校验器对生产实测 **runtime matches release v0.3.0**（relay 因公网 403 走内网探测）。首次真实校验暴露并修正了 manifest 命名约束（见 ADR-002） |
| E1 | MinerU ≥10 次真实任务、≥90% 无人值守、checksum 100% | partial | **2 次**真实跨设备任务，均无人值守完成、checksum 100%（CHG-2026-192）。设备=本机 Mac，平台+relay=生产 callanything.xyz。run1 v0.4.0：337KB PDF → 3248B markdown，16.3s；run2 v0.4.1：另一份 PDF → markdown + 2 图，三件 checksum 全过。**还差 8 次** |
| E2 | 三条真实 Workflow 连续使用 | todo | 0 条 |
| E3 | 接受/修订/自动接受/争议/结算/退款端到端证据 | todo | 仅有 hold→settle→refund 的旧路径证据 |
| E4 | Operator 内容访问全部有理由与记录 | todo | 内容访问授权机制不存在 |
| E5 | ≥3 个真实技术路线决策、≥2 个推动动作、≥1 次重复使用 | todo | 0 |
| E6 | 正常流程无 SSH/远程桌面/admin curl/手工搬运 | partial | ~~CHG-2026-192 记为"审批无 UI 可点，必须 admin curl"——**该记录有误**~~：`ReviewQueuePage` 自 v0.2.0 起就实现了批准/驳回/启用，单元 6 用 admin curl 是因为那次是脚本化跑的，不是因为控制台做不到。2026-08-02 已实证：在 UI 点「批准」，`local.mineru.pdf.parse.v1` 由 pending/disabled 变 approved/enabled，该条目随即从待办里消失（CHG-2026-193）。<br>**真实剩余缺口是运维性的**：生产 console 处于锁定态且 `admin_api_key_configured=false`，记录在案的口令已无法认证——存在的审批 UI 当前没人能用。解锁需 bootstrap secret + owner 自定新口令，属 owner 动作。跨设备任务流本身仍然干净（无 SSH / 无远程桌面 / 无手工搬运） |
| E7 | Platform/Responder/Research 各一次受控恢复回滚演练 | partial | ~~备份工具链不存在~~ **Platform 侧已达成（2026-08-06，CHG-2026-199）**：`repos/platform/scripts/stack-backup.mjs` 覆盖四个有状态面（postgres dump / artifact 字节 / gateway 凭据存储 / relay sqlite），`verify` 交叉校验「每条 `committed` artifact 必须有字节且大小与 sha256 一致」，`verify --deep` 把 dump 真的灌进一次性 postgres——文件在不在只证明字节完好，不证明 postgres 会接受它。**演练用真实生产快照**：v0.4.5 备份 → 本机全新栈恢复 → **6/6 artifact 经恢复后的平台取回，字节与 sha256 全部一致**，console 报 `configured/locked` 而非 `setup_required`。演练挖出并修掉一个真缺陷（见下）。<br>**仍缺**：Responder 与 Research 两侧演练（Research 私仓未创建）；异地/定时备份——现在是「跑一条命令」，单主机上的备份挡不住主机整体丢失 |

## 台账维护规则

1. 状态只能由**证据**推动，不得由"感觉做完了"推动；证据列为空即状态不得高于 `todo`。
2. 每个交付单元完成后更新对应行，与 change bundle 同批提交。
3. `partial` 必须写清"缺什么"，否则等同于 `todo`。
4. 新发现的需求缺口追加到对应里程碑表，不得静默扩范围。
