# M2 最小 Hotline 服务契约 — 入口条件与交付单元

父任务：`../07-17-call-anything-private-capability-network-mvp/prd.md`（Wave 2）
状态：**已激活**（2026-08-06，可用性冲刺三单元完成后按 decisions.md D7 进入）

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
2. **契约完整性：适用范围与示例的契约地位**（FR-010 / FR-013，protocol + platform）
   `recommended_for` / `not_recommended_for` / `limitations` 由自由文本升为受校验的契约字段；示例必须能通过自己声明的 schema 校验——一个过不了自己 schema 的示例是错误文档，不是文档缺失。
3. **服务档位 Quick / Standard / Deep**（FR-011，protocol + platform）
   按 A-05：档位绑定验收窗（72h 默认 / 24h–7d 边界；Quick 24h、Standard 72h、Deep 7d），M2 只负责声明与快照进 Call，验收窗真正生效在 M3。
4. **隐私与履约模式**（FR-012，protocol）
   本阶段仅 `supervised` 可用；声明其他模式即拒绝，而不是接受后无声地按 supervised 执行。
5. **启停与可用性等级**（FR-015，platform）
   `always-on` / `scheduled` / `best-effort`，与现有 admin enable/disable 合并为一个可用性模型。
6. **导出 / 导入**（FR-070 / FR-071 / FR-072，platform）
   ExportBundle 显式剥离 secrets、私有 artifact、本地路径、access token 与质量历史（PRD 第 8 条规范化要求，须在导入工作开始前落定）；目标网络必须重新审批而非继承来源信任。

**P1，本轮不做**：FR-016 Stable/Preview、FR-073 兼容性检查。二者都要先有稳定的版本对象（单元 1）才谈得上。

## 退出条件

三条真实 workflow——MinerU 解析、私有证据检索、技术路线决策——**都能用同一份契约表达并通过校验，不依赖任何隐藏字段或专用 API**（PRD Wave 2 exit）。「可表达」指契约能声明它们，不要求 M4 的 Research Hotline 已实现。

## 台账

进度写入 `docs/planning/private-capability-network/traceability-ledger.md` 的 M2 表，状态只能由证据推动，证据列为空即不得高于 `todo`。
