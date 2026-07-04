# T-503 零违规重演 Runbook(M2 / backlog 2.1)

> 生成于 2026-07-04(loop 轮 8)。目标 = 违规表为空的一次完整彩排;模板与判据沿用 `T-503-findings.md`。
> **本轮 loop 停在此处待决策**:2.1 要求"真实浏览器人工走查",且恢复演练具破坏性,须 owner 决定执行方式与时机。

## 与 T-503 相比,根因已移除的违规

| T-503 违规 | 根因修复 | 证据 |
| --- | --- | --- |
| Responder/Caller 用本地 tgz 而非 npm | `@delexec/ops@0.1.6` 已发布,清洁房安装+CLI 验证通过(2026-07-04) | publish run 28688824620;本机 cleanroom `npm install @delexec/ops@0.1.6` ✓ |
| Operator 用 SSH 重置网关卷 | 生产 gateway 已上 v0.1.6:浏览器 `/console/` 丢口令恢复流程(输 `RESET` + bootstrap secret),secret 已确认在生产 .env | CHG-2026-178;公网 `session-view.js` 指纹 ✓;`/session/recover` 空body 403 ✓ |
| Operator 走网关 HTTP API 而非浏览器 UI | 待本次彩排用真实浏览器消除(唯一遗留) | —— |

## 预检状态(2026-07-04 08:5x,全部通过)

- [x] `@delexec/ops@0.1.6` npm 可装可跑(cleanroom)
- [x] 公网四页 200:quick-start-responder / operator / caller、`/console/`
- [x] 生产栈 4 容器 Up(gateway v0.1.6),公网 healthz/platform-healthz 200
- [x] `PLATFORM_CONSOLE_BOOTSTRAP_SECRET` 在生产 .env(位置见 `docs/planning/operations/aliyun-public-stack-handover.md`)
- [x] restart 策略已修(unless-stopped),彩排中途宕机风险降低

## Rule of the Run(不变)

- Responder:只用 `quick-start-responder` 公网文档 + npm 正式包
- Caller:只用 `quick-start-caller` 公网文档 + npm 正式包
- Operator:只用 `quick-start-operator` + 浏览器 `/console/`;部署持有的 bootstrap/admin 凭据在 UI 里输入不算违规
- 违规 = SSH、直连 `/v1/admin/*` curl、绕过浏览器 UI
- 彩排中不修问题,只记录;结束后逐项立卡

## 建议流程(恢复演练前置为 Operator 第 0 步)

> 理由:现网 console 加密 store 的口令本就无人知晓(T-401 遗留)。与其先想办法登录,不如把"丢口令恢复"演练放在最前——它既是 2.1 的必做项,又是当前状态下 operator 的唯一正当入口,一举两得。

### Operator(全程浏览器,建议每步截图)

0. **恢复演练**:浏览器开 `https://callanything.xyz/console/` → 应显示 locked 会话面板 → "Lost passphrase?" → 按 UI 指引输入确认词 `RESET` + `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`(从交接文档指到的生产 .env 取)→ 设新口令 → **把新口令按交接惯例记录**(host `.env` 同目录或既定托管处,不入 git)
1. 用新口令登录;按 UI 提示重录 admin key(恢复后必需,UI 有引导)
2. Review Queue:等 Responder 提交后,浏览器里 approve + enable
3. Billing:浏览器里 create tenant(tenant_id = caller 的 user_id)+ recharge(建议 20000 PTS)
4. 结算后在 Billing/ledger 里核对 `BILLING_SETTLED`

### Responder(全新身份,只看公网文档)

1. 新目录、新 email;照 `quick-start-responder` 走:`npm install @delexec/ops`(应解析 0.1.6)→ `auth register` → `enable-responder` → `add-hotline`(echo 型;注意 stdin/stdout 契约 `input.input.text` / `output.summary`——文档附录是 3.2 的活,若文档还没写,此处可能再次记摩擦)→ `submit-review` → `start`(`TRANSPORT_TYPE=relay_http`,保持运行)

### Caller(全新身份,只看公网文档)

1. 新目录、新 email;照 `quick-start-caller`:install → register(拿 user_id 给 Operator 建 tenant)→ 等 recharge → `call-hotline --platform https://callanything.xyz/platform --hotline-id <新id> --responder-id <新id> --text "..." --max-charge-cents <热线价>`(3.1 未做前默认 500 会超额冻结,显式传价)
2. 确认返回签名结果 `SUCCEEDED`,余额扣减与热线价一致

## 证据采集清单

- Operator:每个 console 步骤截图(locked 面板、RESET 流程、登录、审核、计费、ledger)
- Responder/Caller:终端全量日志、`npm ls @delexec/ops` 输出(证明 registry 0.1.6)、request_id、签名结果 JSON
- 汇总:新 findings 文档沿用 T-503 结构(元数据表 / step log / 违规表 / findings / checklist)

## 待 owner 决策(loop 因此停车)

1. **人工走查执行方式**:(a) 你亲自跑 Operator 浏览器侧(最符合"人工走查"本意;Responder/Caller 终端侧可由我代跑或你跑);(b) 授权我用真实浏览器自动化(Playwright/Chromium + 全程截图)代行,但这与 2.1 文字要求有出入,需你确认接受;(c) 混合:首轮你人工,退出标准要求的后续 2 轮连续成功再谈自动化。
2. **恢复演练时机确认**:是否同意上述"前置为第 0 步"方案(它会重置生产 console store——当前 store 反正无人能解锁,风险仅为清空现有 gateway 会话)。
3. 彩排排期:栈已就绪,随时可跑。
