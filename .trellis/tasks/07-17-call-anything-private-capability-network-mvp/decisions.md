# Owner 决策记录（2026-07-31）

> 本文件记录 owner 于 2026-07-31 会话中拍板的方向与授权，作为 `prd.md` 待批事项的批准落点。owning-repo ADR 在 Wave 0 执行时按 A-01–A-09 逐条落档，引用本记录。

## D1 方向：先自己用起来（selfhost 私有网络）

- 本阶段唯一真相源 = 本任务 `prd.md`（2026-07-16 战略冻结版）。
- 根目录 `LOOP.md`（公网 marketplace 闭环 loop）**归档封存**：其 M2 彩排计数（2.1/2.2）与 M3 退出标准不再推进；双真相源冲突就此消除。未尽事项（e2e 入 CI、CLI 摩擦项等）不自动作废，按新程序里程碑择要吸收。
- `docs/planning/roadmap-2026H2.md` 的 P1–P4 阶段表随本决策失效待修订（修订时机 = Wave 0 出 traceability ledger 之后）。
- 07-15 console 重写任务维持 **paused**（按 prd.md 建议：等 M1–M3 API 与授权契约成立后复用其 Operator 侧研究）。

## D2 技术决策授权：按推荐默认执行

- prd.md「Recommended MVP Architecture Baseline (Provisional)」表中的 **A-01 至 A-09 推荐方案获批**为 MVP 基线，含 A-05 验收窗与 A-07 保留期的临时数字默认值。
- 事后任何一条均可由 owner 修改；Wave 0 spike 若发现推荐方案不成立，如实报告并回到 owner 重批，不得静默偏离。
- 执行方式：agent 按推荐默认推进，仅在**花钱、删数据、对外发布**三类动作前回询 owner。

## D3 派生决定（随 D1 自动落定）

- **PTS 语义**：Operator 发放的内部配额（守恒记账）。不做对外自助充值/购买；audit 的 P0.5 经济闭环蓝图（`docs/planning/product-audit/P0.5-economic-closure-implementation.md`）**不按原样执行**（prd.md 明令）；`responder_earn` 入账形态推迟到 M3 结算语义设计时一并定。
- **旧 loop 彩排违规判定问题**（operator 手工建租户+充值算不算违规）：随 loop 归档作废，不再需要答案。

## D4 止血批（2026-07-31 已执行）

- S1：public-stack Caddy 边缘停止代理 relay 业务路由（仅保留 `/relay/healthz`）——platform `1c8f206`。
- S2：`ENABLE_BOOTSTRAP_RESPONDERS` 代码默认改 `false`（fail-safe）——platform `1c8f206`。
- 集成套件复活：`test:integration` 补回漏跑的 2 文件并修复其过时断言——platform `9584fdf`，套件 37 过 / 2 跳。
- 随附四仓组合更新：`changes/CHG-2026-181.yaml`。
- **生产收口（owner 授权后 2026-07-31 当日执行完毕）**：Aliyun host nginx 撤下 `/relay/` 公网代理（仅留 `= /relay/healthz`）、`/platform/metrics` 边缘 403；备份 `callanything.xyz.bak.20260731T201329`；公网验证 relay 业务路由 403 / metrics 403 / 其余端点 200 无损；主机 ALIYUN-OPS-README 与四仓 handover 双侧已记录。生产 env 已显式 `ENABLE_BOOTSTRAP_RESPONDERS=false`，S2 无需滚动生产。

## D5 里程碑排序与 console 方向（2026-08-01）

- **D5.1 下一步顺序**：M1 单元 4 收尾 + 单元 5 重启对账优先，console 界面与备份工具链往后排。理由：单元 6（真实 MinerU 跨设备）是 M1 退出门，而它被单元 4 的分发缺口堵住。
- **D5.2 `@delexec/ops` 发布授权**：批准发布新版本到 npm（D2「对外发布」类动作的一次具体授权）。npm 上的 0.1.6 发布于 2026-07-04，不含 relay bearer token（`0867e1b`）、supervisor 凭据修复（`f0706cf`）、artifact 通道（`c920e9b`）——外部设备装到的客户端连不上鉴权后的 relay。
- **D5.3 console 三条主线获批**：`.trellis/tasks/07-15-replace-public-console-frontend/diagnosis-v0.2.0.md` 的诊断与三条主线（A 首页=真实待办 / B `/calls/:id` 详情页=系统脊柱 / C 任务向导取代散落按钮）全部认可，按此推进。这是该诊断「建议的下一步」第 1 步所要求的 owner 确认，此前被跳过，现补上。

## D6 单元 6 的三项授权（2026-08-02）

执行单元 6 前发现三个硬阻塞，owner 当场拍板：

- **D6.1 重新开放公网 relay 业务路由**。CHG-2026-181 撤下边缘是因为当时无鉴权；CHG-2026-183 已根治但边缘一直没开，而这正是跨设备 Provider 跑不起来的原因。执行前先验证了**已部署**的 relay 确实拒绝无凭据请求（四条业务路由无 bearer 均 401，伪造 bearer 也 401），确认不是在重开旧洞。补偿控制：`RELAY_ADMIN_TOKEN`/`RELAY_TOKEN_SECRET` 纳入 workspace 密钥卫生集，占位符即 blocker。
- **D6.2 输入 artifact 当作单元 6 的一部分补完**。台账把 FR-032 记成 done，实为**两头客户端都没实现**：`uploadArtifact` 只被输出路径调用，caller 不上传输入、responder 不下载输入。真实 PDF 因此只能内联进信封。平台侧本来就支持（`canAccessRequestArtifacts` 双方放行、`role=input` 已接受），所以是纯客户端补齐。
- **D6.3 切新版本并滚生产**。v0.4.0（对账端点 + console 聚合 + 边缘开放），随后 v0.4.1（stuck-call 守卫修复）。

## D7 下一轮排序：先补「好用」，M2 顺延（2026-08-05）

- owner 以多选题拍板：下一轮为**可用性冲刺**——进度事件（FR-036）、最小告警（FR-066）、备份与恢复最小工具链（E7 前置）；M2 最小 Hotline 服务契约顺延至该轮完成后。任务落点 `.trellis/tasks/08-05-daily-usability-sprint/goal.md`。
- 生产 console 解锁仍是 owner 动作（deployment key 走重置流程；CHG-2026-194 已非破坏性验证 key 有效并修顺报错，生产 v0.4.3），列为该轮入口条件。
- S3/MinIO 对象存储后端（A-01 目标形态，勿与安全审计编号 S3 混淆）：按 D2 授权的推荐默认记为**推迟出 M1**——单 Operator 自用不依赖，`@delexec/artifact-store` 接缝已留，换后端不动协议；owner 可随时改回。
- ~~FR-066 的通知通道尚未定~~ **已定（2026-08-06 多选题）**：**webhook**（零新依赖、无凭据存储风险，可接飞书/企微机器人、Bark、ntfy、自写脚本），重备节奏 **6 小时**。实现见 CHG-2026-197。

**D7 追加（2026-08-05，单元 1 执行中 owner 逐项授权）**：

- **contracts@0.1.5 发 npm**：批准（多选题「发布 npm + 验收后滚生产」）。publish run 31013054782，洁净房验证新导出与语义齐全。
- **验收后滚生产 v0.4.4**：同上批准。本地 seeded 栈浏览器实证通过后执行；镜像 run 31016488978（三镜像 + published-image 烟测全绿），生产 `/buildz` 报 v0.4.4，`release-manifest check` 报 runtime matches。
- **ops@0.1.8 发 npm**：单独多选题批准（不发则 npm 装的设备在 v0.4.4 生产上无进度拍）。publish run 31016666317（第一次因两仓 lockfile 仍钉 contracts 0.1.4 在 CI 被拦，修复后重发），发布字节含叙述代码，CI 洁净房端到端过。

## D8 下一轮拍板：M2 收尾 + agent 可调性（2026-08-09）

背景：下阶段规划讨论。证据 = 规划文档复核 + 八路只读代码勘察（console / 首次调用动线 / 首次发布动线 / 契约机器可读性 / 传输层 / 检索规模 / 部署姿态 / 调用生命周期）。owner 以多选题拍板四项，均取推荐项：

- **D8.1 下一轮主线 = M2 收尾 + agent 可调性**。M2 剩余单元（4–7）继续，并扩入「AI agent 能发现契约、读全契约、正确填写、显式同意付费、按契约判断是否需人工确认」的链路闭环（M2 goal.md 2026-08-09 增补的单元 8–12）。排序随之落定：M3 顺延至本轮后（勘察确认其缺口对单人自用可容忍、对开放他人全是硬伤，性质是"M3 未开工"而非"设计错了"）；onboarding 自助化（发布指南 / --contract 脚手架 / 发布者本地预检 / 引导性报错）显式排期在 M6 partner pilot 之前，而非继续沉默；检索规模问题挂起至热线达百条级（现网公开热线 1 条，公开目录端点无分页等缺口如实记录不动工）。
- **D8.2 契约新增 `fulfillment_mode`（auto / confirm）**：一条热线可否机器直调、还是需调用方人工确认，由契约声明；`prepare_request` 的 review 位（现为硬编码 `not_required`）从契约推导。随 M2 单元 5（FR-012）一并落地；supervisor 现存 `/caller/approvals` → 不存在路由的断头代理接通或删除。此前该语义在协议层完全无法表达，属新决策而非补实现。
- **D8.3 email 传输适配器（emailengine/gmail）冻结**：配置面标 deprecated，平台停发 `secondary_task_delivery(kind=email)`（消除半死路径被意外触发的风险）；代码保留不删。该传输面从未进认证组合与任何 e2e 证据。
- **D8.4 caller 侧任务完成通知批准**：webhook 形态，复用 FR-066 告警投递骨架（HMAC 签名 + 重试）；caller 可注册完成回调，轮询保留为兜底。

随行小项（不占交付单元，按 D2 默认推进）：responder 侧 `EMAIL_MAX_ATTACHMENT_BYTES` 5MB 上限横切所有传输（含 artifact 通道）的修复；console 审批页渲染契约（现为盲批，服务端字段已齐、零新增 API）、Marketplace 假分页、列表总数字段读错；MCP 目录检索 tokenizer 丢弃纯中文查询的静默退化；文档漂移（本仓 CLAUDE.md relay 行已修、aliyun 交接文档版本表停在 v0.3.0、npm @delexec/ops README 无 caller 内容）；备份定时化 + 异地。

勘察随带的两条事实修正：①「relay 公网 403 需内网/隧道」已过时——实测 `/relay/buildz` 公网 200，`release-manifest check` 不带 override 全绿（relay 于 D6.1 授权后带鉴权重开，文档未随更）；②生产 console 探测到 `locked:true` 是「无活动会话」的常态语义，并非锁死（owner 口令在手，2026-08-05 已解锁使用过）。

仍待 owner 的两个动作（本轮并行项，不阻塞开工）：生产 console【设置/告警】填 webhook URL 与存活 ping URL（在此之前告警代码在跑但没有收件人）；MinerU 设备升 ops 0.1.9 → 重注册 → 重审批（M2 单元 3 最后一步，一次坐下来做完）。

**D8 追加（2026-08-09，执行会话中 owner 逐项授权）**：

- **contracts@0.1.9 发 npm**：批准（多选题）。单元 4+5 合并的协议批次——服务档位 / 隐私模式 / 履约模式。publish run 31299739306，npm `latest` 已是 0.1.9。
- **本批（单元 4–11）结束时的 ops 发版与生产滚 v0.4.10+**：**预授权**（多选题，选「现在一并预授权」）。执行方按流程自行完成，并把 `release-manifest check` 结果报回。此授权仅限本批次收尾这两个动作。
  - **已执行完毕（2026-08-09）**：`@delexec/ops` 0.1.10 发 npm（run 31308621769）；生产滚 **v0.4.10**（Images run 31308792480 四作业全绿含 published-image smoke；manifest v0.4.10 冻结并 promote；`test:release-gate` 端到端绿）。**回报的 check 结果：`runtime matches release v0.4.10`**。预授权至此用尽。
- **D8.5 测试资源授权（2026-08-09）**：允许部署测试 hotline / 测试 responder / 测试 caller。据此建成 `tools/agent-callability-e2e.mjs`，把 plan §5 的退出口径从「论证」变成「实证」（24/24，五个真实进程 + Docker Postgres 计费 enforced）。

## 遗留待办指针（不在本轮范围）

- Wave 0（架构基线 + M0 release manifest）按 `goal.md` 契约另行启动。
- 安全长尾：S3 弱密钥断言、S4 admin 单点、S5 metrics 默认拒绝、S6 注册限速收紧（见 `docs/planning/product-audit/security-review.md`）。
- 质量长尾：e2e 纳入 CI、published-image smoke 进 release gate（见 `architecture-review.md` D6）。
