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
| FR-082 | 生产版本探测 | platform | **partial** | `GET /buildz` 三服务已实现（platform `6c21ca5`，单测 6 + 集成 3）；**尚未发布镜像，生产仍 404** |
| FR-083 | 状态漂移阻断 | workspace | **done** | `release-manifest check` 阻断漂移；"服务无法自陈"报 undetermined 而非通过（`tools/release-manifest.test.mjs` 16 例） |
| FR-084 | 回滚记录 | workspace | **partial** | manifest 不可变 ⇒ 回滚必产生新 release_id；专门的回滚记录字段待 M5 |

## M1 公网跨设备 Runtime

> **硬前置已解除（2026-07-31）**：relay 六条业务路由此前无鉴权（审计 S1）。现已落地 admin token + receiver-scoped token 鉴权、可见性租约与租约保护的幂等 ACK（platform `f26a08b`，client `0867e1b`）；e2e 全流程 7/7 在鉴权开启下通过。私有证据可以进入该通道。

| FR | 需求 | Owner | 状态 | 证据 |
|---|---|---|---|---|
| FR-001 | 创建单 Operator 信任域 | platform | partial | public-stack compose + console v0.2.0 可初始化；缺"网络"对象 |
| FR-002 | 受控凭据注册 Responder 设备 | platform + client | partial | 现有 responder 注册 + API key scope；缺安全 enrollment（可匿名注册） |
| FR-003 | heartbeat 与在线状态 | platform + client | partial | 心跳与 healthy/degraded/offline 存在；缺容量与版本上报 |
| FR-004 | Provider-managed execution | client | done | Platform 不持有 Provider 代码/模型/secrets（现架构即如此） |
| FR-005 | 最小权限：只执行已注册 Hotline | client | partial | 无通用 shell 入口；缺文件/网络访问范围可配置（NFR-S02） |
| FR-006 | 设备维护窗口 (P1) | platform | todo | |
| FR-020 | 一次性结构化 Brief | protocol + client | partial | input schema 校验存在；缺档位与预算上限字段 |
| FR-021 | 执行前 ACCEPTED/REJECTED | protocol + platform | todo | 当前无执行前拒绝语义（A-04 已定义 `rejected`） |
| FR-022 | 预算硬上限 | platform | partial | `max_charge_cents` hold 存在；缺档位绑定与超支阻断语义 |
| FR-023 | 幂等提交 | platform | **done** | request_id 幂等 + hold 状态双重幂等（审计 D2.5 确认） |
| FR-024 | 取消 | protocol + platform | todo | |
| FR-025 | 任务排队 (P1) | platform | todo | 当前无 queued 与 executing 区分 |
| FR-030 | 长任务状态 | protocol + platform | todo | 四轴模型已冻结（A-04），实现未开始 |
| FR-031 | 状态持久化 | platform | partial | 快照持久化存在；`postgres-persistence` 集成测试已恢复入套件（platform `9584fdf`） |
| FR-032 | 输入 artifact | protocol + platform + client | todo | A-01 已定通道；跨设备输入上传未实现 |
| FR-033 | 输出 artifact | protocol + client | partial | 输出 artifact hash 与附件绑定存在；缺证据包/日志摘要形态 |
| FR-034 | Artifact 完整性 | protocol + platform | partial | 输出 checksum 校验存在；缺"校验失败绝不 delivered"的独立状态位 |
| FR-035 | 可恢复故障 | client + platform | todo | A-03 已定三等级；实现未开始 |
| FR-036 | 进度事件 (P1) | protocol + client | todo | |

## M2 最小 Hotline 服务契约

| FR | 需求 | Owner | 状态 | 证据 |
|---|---|---|---|---|
| FR-010 | 声明 Hotline | protocol | partial | 现有 schema/attachment/示例/pricing；缺适用/不适用范围与执行绑定 |
| FR-011 | 固定服务档位 Quick/Standard/Deep | protocol + platform | todo | A-05 已定各档验收窗口 |
| FR-012 | 隐私与履约模式 | protocol | todo | 本阶段仅 supervised 可用 |
| FR-013 | 示例输入输出 | protocol | partial | 模板 bundle 含示例；缺边界说明要求 |
| FR-014 | 版本化：每次 Call 固定 version | protocol + platform | todo | 当前热线无版本历史，改价即重审（审计 D3.6） |
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
| FR-060 | 运行总览 | platform | partial | console v0.2.0 有总览；缺设备/版本/告警维度 |
| FR-061 | 元数据查看 | platform | partial | |
| FR-062 | 内容审查授权（选理由） | platform | todo | |
| FR-063 | 内容访问审计 | platform | todo | 通用审计存在，缺内容访问专项且不可静默删除 |
| FR-064 | 争议处理 | platform | todo | |
| FR-065 | 版本可见 | platform + workspace | partial | `/buildz` 已实现；console 呈现待接（M0/M3 跨界，PRD 未分配，本台账归 M3） |
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
| NFR-S02 | 最小权限、文件/网络范围可配置 | client | partial | relay receiver token 已按 inbox 最小授权（platform `f26a08b`）；设备侧文件/网络范围仍未做 |
| NFR-S03 | 不打印/导出 secrets，日志脱敏 | platform | partial | 未系统审计；S3 弱默认密钥断言未做 |
| NFR-S04 | token/签名/关键操作可验证 | protocol | **done** | HMAC task token + Ed25519 结果签名 + 公钥校验；relay 业务路由 bearer 鉴权（platform `f26a08b`） |
| NFR-S05 | 内容查看/资金/版本/争议必审计 | platform | partial | 通用审计存在；内容访问与争议专项待 M3 |
| NFR-R01 | 任何 Call 必达终态 | protocol + platform | todo | A-04 已定终态；实现与护栏指标待 M1/M3 |
| NFR-R02 | 重启后状态与账本幂等恢复 | platform + client | partial | 快照 hydrate 存在；孤儿 hold 无对账（审计 D3.4） |
| NFR-R03 | checksum 失败不得标 delivered | protocol + platform | partial | 校验存在，缺独立状态位 |
| NFR-R04 | hold/settle/refund exactly-once | platform | partial | 同 FR-054 |
| NFR-R05 | 设备离线检测 ≤ 2 分钟 | platform | partial | 阈值存在，未按此数值校准 |
| NFR-R06 | 无人值守完成率 ≥ 90% | 全体 | todo | M5 dogfood 度量 |

## 阶段退出证据 E0–E7

| ID | 标准 | 状态 | 当前事实（2026-07-31） |
|---|---|---|---|
| E0 | 事实一致 | **partial** | 仓库/bundle/manifest 三者已一致（CHG-2026-181 + baseline manifest）；**生产未跑带 `/buildz` 的镜像，运行时一致性仍"未判定"** |
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
