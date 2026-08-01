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
| FR-032 | 输入 artifact | protocol + platform + client | **done**（代码侧） | 平台通道（platform `0b77672`）+ 客户端接入（client `c920e9b`，7 例集成对真实 platform-api）；字节离开信封，只传描述符。已随 `@delexec/ops@0.1.7` 发布到 npm，外部设备可安装（client `b15c2bc`，CHG-2026-190，洁净房验证）。**跨设备实跑待 M1 单元 6** |
| FR-033 | 输出 artifact | protocol + client | partial | responder 输出走 artifact 通道并携描述符（client `c920e9b`）；仍缺证据包/日志摘要形态（M4 相关） |
| FR-034 | Artifact 完整性 | protocol + platform | **done**（平台侧） | checksum 不符即拒绝提交并保持 allocated，失败字节永不成为已交付（platform `0b77672`）；未 committed 的 artifact 绝不出字节。Delivery Integrity 轴与 Call 的绑定待 M3 |
| FR-035 | 可恢复故障 | protocol + client + platform | partial | 协议侧三等级 + `mayAutoRerun`（默认不重跑）+ 对账报告校验已冻结（protocol `d2ad83b`）；客户端 journal 与平台对账未实现 |
| FR-036 | 进度事件 (P1) | protocol + client | todo | |

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
| FR-060 | 运行总览 | platform | partial | 后端待办聚合已就位：`GET /v1/admin/attention` 返回待审热线/责任人、过宽限期无终态的调用、调用结束后仍冻结的资金、不可用设备，`nothing_to_do` 显式（platform `3d9af65`，CHG-2026-189）。**仍缺 UI**——console v0.2.0 的总览只有三盏健康灯，不接业务信号；告警维度见 FR-066 |
| FR-061 | 元数据查看 | platform | partial | `GET /v1/admin/requests/:id` 服务端 join 时间线/artifact/计费/责任人容量与版本/热线/审计（platform `3d9af65`，CHG-2026-189）；未跟踪的轴报 `tracked:false` 而非编造。**仍缺 UI**：console 无 detail 路由 |
| FR-062 | 内容审查授权（选理由） | platform | todo | |
| FR-063 | 内容访问审计 | platform | todo | 通用审计存在，缺内容访问专项且不可静默删除 |
| FR-064 | 争议处理 | platform | todo | |
| FR-065 | 版本可见 | platform + workspace | partial | `/buildz` 已实现；调用详情聚合已带责任人版本（platform `3d9af65`）。console 呈现仍未接（M0/M3 跨界，PRD 未分配，本台账归 M3） |
| FR-066 | 告警 (P1) | platform | todo | **当前零告警**：2026-07-04 宕机 5.5h 靠撞见发现（PRD 未分配，本台账归 P1 运维） |

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
| NFR-R02 | 重启后状态与账本幂等恢复 | platform + client | partial | 快照 hydrate 存在；孤儿 hold 无对账（审计 D3.4） |
| NFR-R03 | checksum 失败不得标 delivered | protocol + platform | **done** | 协议侧硬约束 + 平台侧 `CONTRACT_ARTIFACT_CHECKSUM_MISMATCH` 拒绝提交（platform `0b77672`）；两侧一致 |
| NFR-R04 | hold/settle/refund exactly-once | protocol + platform | partial | 协议侧 settled/refunded 为终态、自迁移幂等（protocol `d2ad83b`）；平台跨分录单事务与崩溃测试仍缺 |
| NFR-R05 | 设备离线检测 ≤ 2 分钟 | platform | partial | 阈值存在，未按此数值校准 |
| NFR-R06 | 无人值守完成率 ≥ 90% | 全体 | todo | M5 dogfood 度量 |

## 阶段退出证据 E0–E7

| ID | 标准 | 状态 | 当前事实（2026-07-31） |
|---|---|---|---|
| E0 | 事实一致 | **done** | 仓库/bundle/manifest/npm/镜像/**生产运行时** 六者一致：生产 2026-08-01 滚到 v0.3.0，漂移校验器对生产实测 **runtime matches release v0.3.0**（relay 因公网 403 走内网探测）。首次真实校验暴露并修正了 manifest 命名约束（见 ADR-002） |
| E1 | MinerU ≥10 次真实任务、≥90% 无人值守、checksum 100% | todo | 0 次 |
| E2 | 三条真实 Workflow 连续使用 | todo | 0 条 |
| E3 | 接受/修订/自动接受/争议/结算/退款端到端证据 | todo | 仅有 hold→settle→refund 的旧路径证据 |
| E4 | Operator 内容访问全部有理由与记录 | todo | 内容访问授权机制不存在 |
| E5 | ≥3 个真实技术路线决策、≥2 个推动动作、≥1 次重复使用 | todo | 0 |
| E6 | 正常流程无 SSH/远程桌面/admin curl/手工搬运 | partial | 2026-07-04 自动化彩排违规表为空（旧 UI）；新阶段标准未重测 |
| E7 | Platform/Responder/Research 各一次受控恢复回滚演练 | todo | **备份工具链不存在**，恢复演练无从做起 |

## 台账维护规则

1. 状态只能由**证据**推动，不得由"感觉做完了"推动；证据列为空即状态不得高于 `todo`。
2. 每个交付单元完成后更新对应行，与 change bundle 同批提交。
3. `partial` 必须写清"缺什么"，否则等同于 `todo`。
4. 新发现的需求缺口追加到对应里程碑表，不得静默扩范围。
