# M2 最小 Hotline 服务契约 — 入口条件与交付单元

父任务：`../07-17-call-anything-private-capability-network-mvp/prd.md`（Wave 2）
状态：**已激活**（2026-08-06，可用性冲刺三单元完成后按 decisions.md D7 进入；2026-08-09 按 D8.1 扩入 agent 可调性单元 8–12）
执行计划：**`plan-2026-08-09.md`**（执行顺序、文件锚点、验收口径、授权点——执行会话从它开工）

## 入口条件

- [x] M1 退出门主体已达（真实 MinerU 跨设备 ×2，失败矩阵九项有证据）
- [x] 2026-08-05 可用性冲刺三单元完成（进度事件 / 告警 / 备份恢复），生产 v0.4.5
- [x] 协议侧 M1 切片已冻结并发 npm：四轴状态、artifact 描述符、`validateHotlineVersionRef`、可恢复性等级（contracts 0.1.6）

## 开工前核实的真实状态（2026-08-06，读代码得出，非台账转述）

| 事实 | 位置 |
|---|---|
| `state.catalog` 每个 hotline **只有一条可变记录**，重新提交原地覆盖 | `platform-api/src/server.js:2837` |
| Call **只记 `hotline_id`，从不记版本**——task token claims 与 `delivery_meta` 均无 | 同上 `2536`/`2277` |
| `submission_version` 只是提交计数器，既不冻结内容也不进 Call | 同上 `2235` |
| 协议侧 `validateHotlineVersionRef` 已冻结，**但没有任何东西产生这样的引用** | `contracts/src/call-state.js:331` |
| 适用/不适用范围字段（`recommended_for`/`not_recommended_for`/`limitations`）**已存在但无契约地位**，不校验、不进 Call | `server.js:2818` |

⇒ **一次调用说不出自己是按哪份契约成立的**，而 Provider 在调用执行期间重新提交，就能就地改掉它的 schema、限制与定价。M3 的验收、修订与争议全都要判「有没有履约」，而「哪份契约」现在无法回答。

## 交付单元顺序（每个独立可评审、独立走五件套）

1. ~~**不可变 HotlineVersion + 每次 Call 固定版本**~~ ✅ **完成 2026-08-06**（CHG-2026-200；protocol `f6ec3a4` + platform `7e7952d`，contracts 0.1.7 已发 npm，生产 **v0.4.6**）
   审批即发布并按内容幂等（重复审批不铸新号）；Call 在计费与派发**之前**绑定且不因重发 token 而升级；绑定随签名 token 与 `delivery_meta` 传递；已绑定调用一律读钉住的版本。版本记录被就地改写报 `digest_mismatch`；无 pin 的旧调用报「早于契约版本化」而不借用当前契约。19 例协议单测 + 10 例平台集成，承重的一条是「改契约不移动已绑定调用」。浏览器实证：改契约后详情页显示「契约版本 v1（热线已更新到 v2，本次调用不受影响）」。
   > **仍缺（归 M3）**：responder 尚未按钉住的契约校验输出，结果签名也未覆盖版本——那道检查要有地方可失败才有意义。
2. ~~**契约完整性：适用范围与示例的契约地位**~~ ✅ **完成 2026-08-06**（CHG-2026-201；protocol `97bd4ad` + platform `a2e32e9` + brand-site `aca1aa2`，contracts 0.1.8 已发 npm，生产 **v0.4.7**）
   生产审计发现真实缺口比预想尖锐：**热线可以完全不声明契约就被批准并调用**。落地发布门——审批（而非提交，设备仍须能注册）时校验两个 schema、每向至少一个可用示例、必须声明「不适合做什么」，且示例必须通过它自己的 schema；拒绝时返回逐项清单，console 渲染成列表而非分号长句。已批准的不重新校验。
   > 顺带修掉两个同形状问题：bootstrap 夹具的示例只进模板包不进目录记录；示例此前有两种信封（`{title, input}` vs `{title, description, params}`）——这正是从来无法校验的原因。
   > **本轮的直接后果**：`local.mineru.pdf.parse.v1` 继续跑，但**下次再批准会被拒**，直到它声明真契约。
3. 🟡 **让真实热线声明真契约**（client + platform，2026-08-06 owner 加入并拍板事实源）——**代码侧完成，生产收尾待 owner**（CHG-2026-202；client `f4a3b3a`、ops 0.1.9 已发 npm；platform `7531e20`，生产 **v0.4.8**）
   owner 拍板两条：**契约跟着 worker 走**；**平台停止编造**。落地：worker 在实现旁边声明契约并以 `--contract` 作答（任何 process adapter 可实现，非 MinerU 专属），客户端问它、且声明胜过按 id 子串的猜测；`/controller/register`（生产实际用的那条路径，此前连示例字段都没有）改为携带完整契约；平台目录读取不再用模板默认值填补，并以 `contract_declared` 直说。生产实证：marketplace 不再把 PDF 解析器描述成文本摘要器。
   > 设计上被自己测试抓到的一条：不实现 `--contract` 的 worker 也会打印可解析 JSON，会被误当契约——用 `contract_version` 作正向信号，**沉默必须与回答可区分**。
   > **待 owner 的最后一步**：重新提交会无条件把热线置为 `disabled/pending`，而重新审批需要 operator 凭据（在 owner 的 console 会话里）。我不单方面做半步，否则 MinerU 会下线到不确定的时刻。设备将发送的载荷已按 `validateHotlineContract` 校验通过（4234 字节）。步骤：设备升到 ops 0.1.9 → 重新注册 → console 点批准，**一次坐下来做完**。
4. ~~**服务档位 Quick / Standard / Deep**~~ ✅ **完成 2026-08-09**（CHG-2026-206，与单元 5 合为一个协议批次）
   三档 + A-05 验收窗（24h/72h/7d，边界 24h–7d），M2 只声明与快照进 Call；验收窗真正生效在 M3。承重断言：热线按新档位重新发布，在途 Call 的 terms 不动。
5. ~~**隐私与履约模式**~~ ✅ **完成 2026-08-09**（CHG-2026-206；protocol `49a5d0a` + contracts 0.1.9 已发 npm + platform `74ab106`）
   `sealed` **拒绝而非降级**，且与「不存在的模式」返回不同错误；`fulfillment_mode: auto | confirm`（D8.2）入契约与发布门。三字段全可选、默认值只在读取时解析绝不落盘（写进既有记录会移动内容摘要，已绑定的 Call 立刻 `digest_mismatch`）。
   > **未做**：`prepare_request` 的 review 位仍硬编码，`/caller/approvals` 断头代理仍在——都归单元 9。
6. **启停与可用性等级**（FR-015，platform）
   `always-on` / `scheduled` / `best-effort`，与现有 admin enable/disable 合并为一个可用性模型。
7. **导出 / 导入**（FR-070 / FR-071 / FR-072，platform）
   ExportBundle 显式剥离 secrets、私有 artifact、本地路径、access token 与质量历史（PRD 第 8 条规范化要求，须在导入工作开始前落定）；目标网络必须重新审批而非继承来源信任。

### agent 可调性单元（2026-08-09 按 decisions.md D8.1 扩入）

背景：契约本体经单元 1–3 已强（发布门 + 冻结版本 + 调用钉版），但 2026-08-09 八路勘察确认「AI agent 读契约并调用」的官方链路断在中间：MCP `read_hotline` 无本地草稿即 404（读不到远端契约）、返回体恰好丢弃发布门强制写全的字段、input 校验只有客户端浅层自研一层、付费调用 MCP 路径不可用而 CLI 路径把同意硬置 true。M4 的 Research Hotline 就是要被 agent 调的，这条链路是它的前置。

8. ~~**agent 契约读取链路**~~ ✅ **完成 2026-08-09**（CHG-2026-204；client `fb9bee5` + platform `18f51d6`，未发 npm、未滚生产）
   平台目录成为 caller 侧契约事实源，草稿降级为离线兜底；两个来源**整份择一，绝不逐字段拼**。返回体透传 `HOTLINE_VERSION_CONTRACT_FIELDS` 全量。平台不可达（502 可重试）与未声明契约（409）分开报，绝不伪装成 404。CJK 检索按整段 + 二元组保留，承重断言是「中文查询无命中即返回空」——改动前它返回 4 条无关热线。平台侧补上提交时存了、投影时丢了的附件声明。5 例 client 集成（对真实 platform-api）+ 1 例 platform 集成，改动前全红。
   > 顺带发现：匹配面此前只搜 `description`，而平台列表投影发的是 `summary`——平台热线除 id 与标题外不可检索。
   原范围描述：`read_hotline` / `prepare_request` 在无本地注册草稿时回落平台目录（`/v2/hotlines/:id` 详情已无鉴权含全量契约），把平台目录当契约事实源；`buildReadHotlineResponse` 透传 `HOTLINE_VERSION_CONTRACT_FIELDS` 全量（input/output examples、`not_recommended_for`、`limitations`、`pricing_hint`、附件声明——对 LLM 正确填写价值最高的字段恰是现在被丢弃的字段）；目录检索 tokenizer 修复纯中文查询被静默丢弃、退化为字典序前 N 条的缺陷。
9. ~~**填写校验升级**~~ ✅ **完成 2026-08-09**（CHG-2026-207；client `6c6b686`）
   ajv 2020 取代自研浅层校验器（与发布门同一引擎同一配置）；review 位从 `fulfillment_mode` 推导，`confirm` 未确认即 409；`/caller/approvals` 断头代理**接通**——它此前指向的路由在任何版本里都不存在，console 那个视图一直返回 404；MCP 按契约投影 per-hotline prepare 工具，只取顶层且绝不新增契约没声明的约束。
   原范围描述：
   `prepare_request` 弃自研浅层校验器改用 ajv（契约 schema 即 2020-12 方言，contracts 包已依赖 ajv），嵌套/pattern/min-max 约束在 prepare 阶段就指名字段报错；MCP `tools/list` 按目录投影 per-hotline 工具定义（契约 `input_schema` 直接作 inputSchema），让 LLM host 原生参数校验生效；review 位从 `fulfillment_mode` 推导（单元 5 / D8.2）。
10. ~~**付费同意语义**~~ ✅ **完成 2026-08-09**（CHG-2026-208；client `d237f07` + platform `57d1a88`；顺序上提到单元 6 之前，理由：它在退出证据链上，6 不在）
    CLI 不再替运营者签字（读价、缺 `--max-charge-cents` 即拒并报价）；MCP 路径的真正根因是 `send_request` **从不签发 task token**，远端热线改走 `/controller/remote-requests`；同意在 prepare 落定；平台三处失真修正（无 billing 归位 402、拒绝带价、同意校验排到存储检查之前）。
    原范围描述：
    MCP 路径补显式 billing 参数（含 `max_charge_cents` 上限）并传入 token 签发；CLI 路径去掉无条件 `billing.acknowledged = true`。「同意付费」是 agent 自动调用里最该显式设计的一环，现状一条路缺失、一条路失真。
11. **caller 完成通知**（platform + client，D8.4）
    webhook 形态，复用 `alerts.js` 投递骨架（HMAC 签名 + 5xx 重试）；caller 注册完成回调 URL，轮询保留为兜底。解决「分钟级以上任务要么挂终端要么错过结果」。
12. ~~**email 传输冻结**~~ ✅ **完成 2026-08-09**（CHG-2026-205；client `97b714a` + platform `743758a`）
    配置面标 deprecated（`deprecation` 块，支持的传输返回 null）；平台停发 `secondary_task_delivery(kind=email)`；代码保留不删，配置照旧可存，supervisor 启动与事后切换各警告一次。
    > 动工才发现的事实：那个字段三个仓里**只有写、没有读**——它唯一的作用是为私有文档多公布一个邮箱地址。

随行小项（不占单元，穿插做）：responder 侧 `EMAIL_MAX_ATTACHMENT_BYTES` 5MB 上限横切所有传输（含 artifact 通道，MinerU 大输出会被误判 `RESULT_ARTIFACT_TOO_LARGE`）的修复；console 审批页渲染契约（现为盲批，服务端字段已齐、零新增 API）；Marketplace 假分页与列表总数字段；文档漂移（aliyun 交接文档、npm @delexec/ops README）；备份定时化 + 异地。

**P1，本轮不做**：FR-016 Stable/Preview、FR-073 兼容性检查。二者都要先有稳定的版本对象（单元 1）才谈得上。

## 退出条件

三条真实 workflow——MinerU 解析、私有证据检索、技术路线决策——**都能用同一份契约表达并通过校验，不依赖任何隐藏字段或专用 API**（PRD Wave 2 exit）。「可表达」指契约能声明它们，不要求 M4 的 Research Hotline 已实现。

## 台账

进度写入 `docs/planning/private-capability-network/traceability-ledger.md` 的 M2 表，状态只能由证据推动，证据列为空即不得高于 `todo`。
