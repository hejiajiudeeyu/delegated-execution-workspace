# T-503 重演 · 自动化跑通记录(2026-07-04)

Status: **automated full-loop success** — 待 owner 人工浏览器复跑以满足 2.1 的"真实浏览器人工走查"字面要求。

## 与 T-503 的规则对照(本次自动化运行)

| T-503 违规 | 本次 |
| --- | --- |
| Responder/Caller 用本地 tgz | ✅ 消除:registry 安装 `@delexec/ops@0.1.6`(`npm ls` 留档) |
| Operator SSH 重置网关卷 | ✅ 消除:浏览器 `/console/` 恢复流程(RESET + bootstrap secret),破坏性重置在 UI 内完成 |
| Operator 走网关 HTTP API 非浏览器 | ✅ 本次全程真实 Chromium 浏览器(自动化驱动,11 张全页截图);"人工"走查待 owner 复跑 |

**本次运行违规表:空。**(SSH 仅用于:取部署持有的 bootstrap/admin 凭据值与记录口令——与 T-503 判例一致,"部署凭据在 UI 中使用不算违规";凭据值未进入任何日志/git)

## 运行元数据

| 字段 | 值 |
| --- | --- |
| 开始/结束 | 2026-07-04 09:41 → 11:52(+0800,含中途发现并修复 blocker) |
| Responder 身份 | `responder_4c71505389e6` / hejiajiudeeyu+t503r2-responder@gmail.com(全新) |
| Hotline | `t503rerun.workspace.echo-summary.v1`(50 PTS 固定价) |
| Caller 身份 | `user_5c51d1f08cb8454cb38e6eabb4e2cef3` / +t503r2-caller(全新) |
| Request | `req_cb9c8a87-f984-45f6-8bad-80359e6f9c3c` |
| 结果 | `SUCCEEDED`,`schema_valid: true`,摘要正确回传 |
| 计费 | recharge +20000(浏览器操作)→ hold −50 → **`BILLING_SETTLED`**(ledger `01KWNKQXEQWDM98A6VJ1M3QBFT`),终态余额 19950 |
| 证据目录 | `/tmp/delexec-t503-rerun-20260704T014101Z/`(docs 快照、terminal 日志、`evidence/browser/*.png` 11 张截图) |

## 🔴 Blocker 发现与修复(本次最大成果)

**Console 网关 API 在任何边缘反代下都不可用**——owner 真实浏览器打开 `/console/` 一分钟即命中 "Gateway Unreachable/OFFLINE":
- 前端 `new URL("/session/…", base)` 前导斜杠丢弃 `/gateway` 前缀 → API 打到边缘根路径落空;静态资源正常,潜伏三个版本(v0.1.3 只修了静态子路径)
- 单测/网关集成/T-503 的 API 冒烟全部直连 :8085 origin,永远测不到子路径场景——**"必须真实浏览器人工走查"的要求被一次命中完全证成**
- 修复:platform `49b4273`(`gateway-url.js` 纯函数 + 8 个单测)→ **v0.1.7** 发布(Images run 28692687385 全绿)→ 生产 gateway 已滚动,浏览器验证恢复→解锁→审批→计费全流程可用

## 摩擦清单(非 blocker)

| severity | 环节 | 描述 | 归属 |
| --- | --- | --- | --- |
| minor | 安装 | 新版 npm 的 allow-scripts 门槛对 better-sqlite3 出警告(实际 prebuild 可用,不阻断);公网文档未提 | `repos/brand-site` 文档 |
| major(已知,重复) | add-hotline | process 型热线 stdin/stdout 契约(`input.input.text`/`output.summary` 包裹)公网文档仍缺——即 backlog 3.2,非新增 | `repos/brand-site` + `repos/client` |
| note | call-hotline | 默认 `--max-charge-cents` 仍 500,本次显式传 50 规避——即 backlog 3.1,非新增 | `repos/client` |

## 状态与后续

- 生产:gateway v0.1.7;console 新口令已按清单第 5 步记录于主机 `CONSOLE-PASSPHRASE.txt`(mode 600,不入 git)
- Responder 运行时仍在本机运行(rehearsal 目录内,可随时终止)
- **下一步 = owner 手动浏览器复跑**(满足 2.1 字面要求 + 作为退出标准"连续 3 次"的第 1 次正式计数;本自动化运行为跑通验证,是否计数由 owner 定)
