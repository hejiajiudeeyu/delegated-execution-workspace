# M3 交付、验收与结算 — 入口条件与交付单元

父任务：`../07-17-call-anything-private-capability-network-mvp/prd.md`（Wave 3）
状态：**已激活**（2026-08-10，M2 十二单元全部交付并认证后按 owner 放行进入）

## 入口条件

- [x] M2 全部交付单元完成并认证（CHG-2026-204…219，生产 v0.4.12 + ops 0.1.13）
- [x] 契约本体成立：发布门 + 冻结版本 + Call 钉版 + 服务条款快照（`service_terms` 已随 Call 冻结，含 `acceptance_window_s`）
- [x] agent 可调性链路生产实证：真实 PDF 从发现走到交付（2026-08-09）
- [x] 四仓 CI 绿（2026-08-09 修复，红了两个月）

## 开工前核实的真实状态（2026-08-10，读代码得出，非台账转述）

| 事实 | 位置 |
|---|---|
| `schema_valid` 是 **worker 自报**，没有任何一侧按钉住的 `output_schema` 校验过输出 | `responder-runtime-core/src/index.js:241`、`258`（`execution.schema_valid !== false`）|
| 结果签名**不覆盖 `hotline_version`** | `contracts/src/index.js:530` 的 canonical 字段表里没有它 |
| 平台只在**审核测试**里看 `schema_valid`，正常调用路径不看 | `platform-api/src/server.js:2918` 是唯一一处 |
| **责任方一说 COMPLETED，钱立刻结算** | `applyTerminalBillingIfNeeded` 由 `/v1/requests/:id/events` 调用，而那条路由是 responder 在调 |
| `delivery_integrity` 与 `acceptance` 两根轴 `tracked:false`，如实标注「M3」 | `buildCallStateAxes`，`server.js:3826` |
| Caller 侧没有 accept / reject / revision / dispute / cancel 任何一条路由 | 全仓 grep 无匹配 |

⇒ **拿钱的那一方，是唯一决定活干没干完的那一方。**
责任方自己声明 `schema_valid: true`、自己上报 `COMPLETED`，平台据此立刻扣款；调用方在整条链路上**没有任何一个位置可以说「不对」**。A-06 的修订经济、A-05 的验收窗、FR-045 的争议全都要判「有没有履约」，而现在**连一个客观的、可失败的检查点都不存在**。

> CHG-2026-200 当时就写下了这句：「那道检查要有地方可失败才有意义」。M3 的第一件事就是给它一个地方。

## 交付单元顺序（每个独立可评审、独立走五件套）

1. ~~**交付完整性：按钉住的契约校验输出**~~ ✅ **完成 2026-08-10**（CHG-2026-220 + 221；contracts 0.1.10 已发 npm、生产 **v0.4.13**、ops 0.1.15）
   两侧各按 Call 钉住的那份 `output_schema` 跑同一个协议校验；结果签名覆盖 `hotline_version`（追加式，旧签名逐字节仍验得过，有钉字节的断言）。**四个等级而非两个**：verified / failed / unchecked / unverified——把后两者报成 verified 就是把同一个自我断言往里挪一层。刻意不设闸：判 failed 照旧结算，有测试按名断言这一现状。
   > **开工才发现的结构性事实**：正常路径上平台**从未收到结果包**（结果经 relay 直达 caller，平台只收裸终态事件），所以"平台复核"是传输改动而非加一次校验调用。
   > **两个在发布前抓到的 bug**：ajv 判失败但错误为空时静默判通过；必需 artifact 检查读的 `artifact.role` 在结果里根本不存在，原样发布会把生产 MinerU 每次正确交付判成失败。
   > **顺带**：协议仓 `npm test` 是显式清单不是 glob，三个已存在的测试文件从未跑过（含台账引用为 FR-011/FR-012 证据的 17 例），套件 131→165。

2. ~~**验收门：结算等验收**~~ ✅ **完成 2026-08-10**（CHG-2026-223 + 224，生产 **v0.4.14**）

3. ~~**调用方说不**（一次修订 + 争议）~~ ✅ **完成 2026-08-10**（CHG-2026-225）
   A-06 的「一次范围内修订不加价」**由不产生第二次 hold 自然落出**，不是某处强制的规则；重交付重开验收窗而非再加一个。第二次修订被拒——越界的活是一次新 Call，免费的第二轮等于对固定价买到的东西做无声的无偿扩张。争议把结算置 `blocked`：钱在 hold 时已离开余额，争议冻的是**出口**（settle 与本会走到 settle 的自动接受）。
   > **两处先修不可的东西**，否则修订会静默地不工作而不是显眼地失败：终态事件去重此前按 (event_type, responder, hotline) 记，修订后的第二个 COMPLETED 会被当重复吞掉、从不抵达判定与结算（现改 attempt 级）；`buildCallStateAxes` 把认不出的 billing 状态映成 `none`，争议中的调用会报成**根本没有计费**。
   > **责任方侧的范围增量**（owner 开工前批准）：inbox 对重复 request_id 一律重放旧签名结果，不改它修订永远只会收到原输出的复印件。

4. ~~**Caller 主动取消**~~ ✅ **完成 2026-08-10**（CHG-2026-227，生产 v0.4.16）
   运营者自 v0.4.9 起就能结束一次调用，而**发起并为之付钱的那一方**只能去求一个持运营者凭据的人。已交付的调用按名拒绝并给出该走的路（修订或争议）。顺带修掉：终态之后迟到的 COMPLETED 会把已取消已退款的调用投影成 `delivered`——钱是安全的，状态在撒谎。

5. ~~**执行前 ACCEPTED / REJECTED**~~ ✅ **完成 2026-08-11**（CHG-2026-232 + 236，生产 **v0.4.17**）
   协议自 M1 起就规定 rejected 调用**不得持有也不得移动**资金——不是「要退款」，是从未冻结过。这让「先 hold 再退」不可表示，故 owner 授权把冻结从签发 token 移到接单时刻。发 token 仍校验同意与余额，但只是告知性的。ACKED 与显式决定同等，已部署责任方因此不受影响。路径刻意不是 `/accept`：调用方接受的是**交付**，责任方接受的是**工作**。

6. ~~**排队与超时预算**~~ ✅ **完成 2026-08-11**（CHG-2026-226 / 233 / 237 / 238）
   三个互不知情的 300s 时钟是杀死第一次真实生产解析的东西。热线现在声明 `execution_budget_s`（冻结契约字段、随 Call 快照、越界拒绝而非夹取），平台与调用方**读同一个数**。QUEUED / EXECUTION_STARTED 成为真实生命周期事件：`ACKED` 读作 `accepted`，`executing` 必须由设备说出口，且不得用 PROGRESS 拍冒充（协议禁止观测喂给执行投影）。
   > **仍缺**：capacity 入流（心跳不发 `max_concurrent`/`in_flight`，平台存储面无消费者）。

### 六个单元之外（M3 退出条件本身）

- ~~**FR-062/063 内容访问授权与审计**~~ ✅ **完成 2026-08-11**（CHG-2026-235 + 236，生产 v0.4.17）
- ~~**退出证据 harness**~~ ✅ `tools/settlement-lifecycle-e2e.mjs`（23/23，真 Postgres + 计费 enforced，含重放阶段断言无调用会 hold/debit/refund 两次）
- **仍缺**：钱那一半的**生产**证据——`local.mineru.pdf.parse.v1` 未声明 `pricing_hint`，是免费热线；需要一条计费的真实热线（owner 动作）。E1 还差 6 次真实调用。

### 原始范围描述（存档）
   FAILED 照旧立即退款；COMPLETED 只开验收窗；能结算的只有显式 accept 与到期自动接受。时钟起点 = verified delivery。窗口长度只读 Call 的 terms 快照。自动接受沿用懒评估（本服务无调度器）。caller-skill-adapter 增 `accept_delivery`——只有拿运营者 shell 才能做的接受不算调用方拥有接受权。
   > **本单元自行拍的决定（待 owner 追认）**：判为 `failed` 的交付**到期不自动接受**，保持冻结并浮到运营者面前（v0.4.9 起有 close+退款的路子）。沉默可以是对满足契约的工作说"行"，不可以是对平台自己认定没满足契约的工作付钱。
   > **无需协议发版**：验收轴与转移表 M1 已冻结，平台事件名是本地词汇——计划里假设的协议批次并不需要。
   > M2 退出 harness 同批更新，24 → 27 条断言。

### 已完成单元的原始范围描述

1. **交付完整性**（FR-040，protocol + client + platform）
   responder 按 Call 钉住的那份 `output_schema` 校验自己的输出，`schema_valid` 从自报变成**被验证过的事实**；结果签名覆盖 `hotline_version`，使一份签名结果说得出它声称满足的是哪份契约（否则 v1 的结果可以拿去顶 v2）。平台按同一份钉住的契约复核，`delivery_integrity` 轴从 `tracked:false` 变成真实值。
   > **为什么排第一**：验收、修订、争议全都要有一个客观的失败点才谈得上；没有它，"接受"只是口味问题。签名扩展必须**向后兼容**——旧责任方签的结果不带版本，仍须能验证通过，只是完整性等级更低。

2. **验收门：结算等验收**（FR-041 / FR-044，platform）
   结算不再跟随执行完成。交付通过校验后进入验收窗（`service_terms.acceptance_window_s` 已在 Call 里冻结好），调用方显式接受即结算，窗口到期自动接受。**A-05 的时钟起点是 verified delivery，不是 COMPLETED。**

3. **调用方说不**（FR-042 一次修订 / FR-045 争议，protocol + platform）
   一次范围内修订不额外计费、原 hold 保持；越界须另起新 Call（A-06）。争议冻结结算（Settlement `blocked`）。

4. **Caller 主动取消**（FR-024，protocol + platform）
   协议侧 `canceled` 迁移已定义（已交付不可取消），平台侧与 caller 入口未实现。

5. **执行前 ACCEPTED / REJECTED**（FR-021，protocol + platform）
   协议侧语义与「拒绝不得持有资金」校验已冻结，平台路由未实现。

6. **排队**（FR-025，protocol + platform）
   协议侧 `queued`/`executing` 已区分，平台未实现。

## 本轮不做（防止范围漂移）

- FR-046 Operator 契约判断、FR-062/063 内容审查授权与访问审计：等 3 落地后再排。
- 公开 Console 的 M3 界面：按 PRD 第 5 条，API 与授权成立之后才做。

## 一条来自生产的输入

2026-08-09 的真实 MinerU 解析（含模型加载）**约 4 分钟**，而 caller 默认 `hard_timeout_s` 是 **300 秒**——第一次真实调用因此 `TIMED_OUT`。单元 6 的排队语义与超时预算**按真实 ML 负载的量级来定**，不要沿用这个默认值。

## 退出条件

accept、revision、auto-accept、dispute、settle、refund **全部有端到端证据**，且**零重复资金事件**、**零无理由内容访问**（PRD Wave 3 exit）。

**2026-08-11 状态**：六条流程与两条性质**机制上全部成立**——`tools/settlement-lifecycle-e2e.mjs` 23/23（真 Postgres、计费 enforced、含主动重放阶段），内容访问有闸有专项审计。**唯一缺口是「钱那一半的生产证据」**：网络上唯一的真热线不计费，所以 hold→accept→settle 在生产上从未真的动过钱。这需要一条计费的真实热线，属 owner 动作。

## 台账

进度写入 `docs/planning/private-capability-network/traceability-ledger.md` 的 M3 表，状态只能由证据推动，证据列为空即不得高于 `todo`。
