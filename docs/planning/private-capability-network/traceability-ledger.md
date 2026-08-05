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
| FR-006 | 设备维护窗口 (P1) | platform | todo | |
| FR-020 | 一次性结构化 Brief | protocol + client | partial | input schema 校验存在；缺档位与预算上限字段 |
| FR-021 | 执行前 ACCEPTED/REJECTED | protocol + platform | partial | 协议侧 `rejected` 语义与"拒绝不得持有资金"校验已冻结（protocol `d2ad83b`）；平台路由未实现 |
| FR-022 | 预算硬上限 | platform | partial | `max_charge_cents` hold 存在；缺档位绑定与超支阻断语义 |
| FR-023 | 幂等提交 | platform | **done** | request_id 幂等 + hold 状态双重幂等（审计 D2.5 确认） |
| FR-024 | 取消 | protocol + platform | partial | 协议侧 `canceled` 迁移已定义（已交付不可取消）；平台路由未实现 |
| FR-025 | 任务排队 (P1) | protocol + platform | partial | 协议侧 `queued`/`executing` 已区分（protocol `d2ad83b`）；平台未实现 |
| FR-030 | 长任务状态 | protocol + platform | partial | **协议侧完成**：四轴 + 合法迁移 + 跨轴校验（protocol `d2ad83b`，34 例）；platform 侧实现未开始 |
| FR-031 | 状态持久化 | platform | partial | 快照持久化存在；`postgres-persistence` 集成测试已恢复入套件（platform `9584fdf`） |
| FR-032 | 输入 artifact | protocol + platform + client | **done** | ~~2026-08-01 曾据 `c920e9b` 记为 done（代码侧），系**记录错误**：那笔只做了输出方向，caller 不上传输入、responder 不下载输入，真实 PDF 只能内联~~。2026-08-02 补齐两头（client `86d1ac9`，6 例集成）：caller 以 `role=input` 上传、只传描述符；responder 执行前取回并校验，取不到即拒绝执行。**跨设备实跑已完成**：336919 字节 PDF 经 1498 字节信封跨设备，设备侧 sha256 与源一致（CHG-2026-192） |
| FR-033 | 输出 artifact | protocol + client | partial | responder 输出走 artifact 通道并携描述符（client `c920e9b`）；跨设备实跑验证多件输出（markdown + 2 张抽取图）checksum 全部一致（CHG-2026-192）。仍缺证据包/日志摘要形态（M4 相关） |
| FR-034 | Artifact 完整性 | protocol + platform | **done**（平台侧） | checksum 不符即拒绝提交并保持 allocated，失败字节永不成为已交付（platform `0b77672`）；未 committed 的 artifact 绝不出字节。Delivery Integrity 轴与 Call 的绑定待 M3 |
| FR-035 | 可恢复故障 | protocol + client + platform | **done**（代码侧） | 协议侧三等级 + `mayAutoRerun` + 对账报告校验（protocol `d2ad83b`）；客户端 append-only journal（触发器强制，`synchronous=FULL`）+ boot_id/attempt_id + 按等级收口（client `f9a8c86`，8 单测 + 7 集成）；平台 `POST /v1/requests/:id/reconcile` 验签收口且**结构上无法结算**（platform `2fada76`，10 集成）。CHG-2026-191。**跨设备实跑待 M1 单元 6** |
| FR-036 | 进度事件 (P1) | protocol + client + platform | **done** | 观测事件对（PROGRESS/SOFT_TIMEOUT）刻意置于 CALL_EVENT 之外——观测不是第五根轴（protocol `d01ffeb`，contracts 0.1.5 已发 npm）；responder 三锚点叙述 + `hooks.reportProgress`，尽力而为、失败不影响任务（client `c3e68b0`，3 集成）；平台收下并在 `/calls/:id` 时间线渲染，不碰计费/不动投影/终态后 409/按 seq 幂等/仅修剪 PROGRESS（platform `ae55883`，7 集成）；**进度刷新卡住检测**，长任务不再被误报（测试固定）。顺带关闭现存静默缺陷：SOFT_TIMEOUT 此前一直被平台 400 拒且两侧无声。浏览器实证两次（本地 seeded 栈，13%→100% 实时推进）；生产 v0.4.4 已滚（CHG-2026-196） |

## M2 最小 Hotline 服务契约

| FR | 需求 | Owner | 状态 | 证据 |
|---|---|---|---|---|
| FR-010 | 声明 Hotline | protocol | partial | 现有 schema/attachment/示例/pricing；缺适用/不适用范围与执行绑定 |
| FR-011 | 固定服务档位 Quick/Standard/Deep | protocol + platform | todo | A-05 已定各档验收窗口 |
| FR-012 | 隐私与履约模式 | protocol | todo | 本阶段仅 supervised 可用 |
| FR-013 | 示例输入输出 | protocol | partial | 模板 bundle 含示例；缺边界说明要求 |
| FR-014 | 版本化：每次 Call 固定 version | protocol + platform | partial | 协议侧 `validateHotlineVersionRef` 已冻结（protocol `d2ad83b`）；平台无版本历史表 |
| FR-015 | 启停与可用性等级 | platform | partial | admin enable/disable 存在；缺 always-on/scheduled/best-effort |
| FR-016 | Stable/Preview (P1) | platform | todo | |
| FR-070 | 导出 Hotline 包 | platform | todo | |
| FR-071 | 排除信誉数据 | platform | todo | 导出前必须显式剥离 secrets/私有 artifact/本地路径/质量历史 |
| FR-072 | 新网络重新验证 | platform | todo | |
| FR-073 | 兼容性检查 (P1) | protocol + platform | todo | |

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
| FR-066 | 告警 (P1) | platform | todo | **当前零告警**：2026-07-04 宕机 5.5h 靠撞见发现（PRD 未分配，本台账归 P1 运维）。相关教训：`/v1/admin/attention` 的卡住检测自交付起从未在真实数据上触发过（读了生产事件不存在的字段），v0.4.1 修复——"没有告警"曾等于"看不见"，不等于"没事"（platform `539e0e7`） |

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
| NFR-S04 | token/签名/关键操作可验证 | protocol | **done** | HMAC task token + Ed25519 结果签名 + 公钥校验；relay 业务路由 bearer 鉴权（platform `f26a08b`） |
| NFR-S05 | 内容查看/资金/版本/争议必审计 | platform | partial | 通用审计存在；内容访问与争议专项待 M3 |
| NFR-R01 | 任何 Call 必达终态 | protocol + platform | partial | 协议侧 `isCallTerminal` 要求四轴齐备（已交付需验收+资金收口，protocol `d2ad83b`）；平台护栏未实现 |
| NFR-R02 | 重启后状态与账本幂等恢复 | platform + client | partial | 快照 hydrate 存在；中断尝试现在能收口——journal 记录未闭合尝试，重启后签名上报，平台按 attempt_id 幂等退款（`f9a8c86`/`2fada76`，CHG-2026-191）。**仍缺**：非中断来源的孤儿 hold（如 responder 永不回来、hold 过期外的边角）仍无主动对账扫描（审计 D3.4） |
| NFR-R03 | checksum 失败不得标 delivered | protocol + platform | **done** | 协议侧硬约束 + 平台侧 `CONTRACT_ARTIFACT_CHECKSUM_MISMATCH` 拒绝提交（platform `0b77672`）；两侧一致 |
| NFR-R04 | hold/settle/refund exactly-once | protocol + platform | partial | 协议侧 settled/refunded 为终态、自迁移幂等（protocol `d2ad83b`）；对账路径按 attempt_id 幂等，且以计费轨 `state === held` 为结构性兜底——重复上报只退一次（platform `2fada76`）。**仍缺**：跨分录单事务与崩溃测试 |
| NFR-R05 | 设备离线检测 ≤ 2 分钟 | platform | partial | 阈值存在，未按此数值校准 |
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
| E7 | Platform/Responder/Research 各一次受控恢复回滚演练 | todo | **备份工具链不存在**，恢复演练无从做起 |

## 台账维护规则

1. 状态只能由**证据**推动，不得由"感觉做完了"推动；证据列为空即状态不得高于 `todo`。
2. 每个交付单元完成后更新对应行，与 change bundle 同批提交。
3. `partial` 必须写清"缺什么"，否则等同于 `todo`。
4. 新发现的需求缺口追加到对应里程碑表，不得静默扩范围。
