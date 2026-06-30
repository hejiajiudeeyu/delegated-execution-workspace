# T-502 Operator Quick Start Docs

- 仓库：`repos/brand-site`（主）；Caller/Responder quick start 仅做 **薄交叉引用**
- 依赖：**T-501 完成**（生产 `/console/` 必须已是 gateway UI，否则文档会再次 doc drift）
- 完成标志：中英文 `quick-start-operator` 上线；content smoke 锁定关键 marker；Responder/Caller production rehearsal 附录指向该页

## 背景

Grilling 共识（Wave 5）：

- Operator 是 **callanything.xyz 平台部署者**，不是 Marketplace 普通用户。
- 公开文档写 **console 操作流程**，**不写** `PLATFORM_CONSOLE_BOOTSTRAP_SECRET` / `PLATFORM_ADMIN_API_KEY` 的值。
- 部署凭据从私有 env 获取 **不算** public-docs violation；SSH 与直连 `/v1/admin/*` **算** violation。

T-403/T-404 已在 Caller/Responder quick start 加入 production rehearsal 与 operator handoff，但缺少可执行的 console 逐步指南。本卡新增 **独立 Operator Quick Start**，避免在四个页面重复同一流程。

## 文档范围

### 必须覆盖（中英文）

新页面建议路由：

- `/docs/quick-start-operator/`
- `/en/docs/quick-start-operator/`（或与现有 en 路由约定一致）

章节骨架：

1. **受众**：platform owner / operator；Caller 与 Responder 读者可跳过。
2. **入口**：`https://callanything.xyz/console/`（T-501 验证通过后写死）。
3. **Gateway session**：在 console UI 初始化 local secret store；说明需要 deployment 管理员提供的 bootstrap secret 与 console passphrase；**禁止**在页面填示例 secret。
4. **Admin credential**：通过 gateway 保存 `PLATFORM_ADMIN_API_KEY`（同样只描述字段，不给值）。
5. **Reviews 工作流**：列出 pending review → approve responder → approve hotline → enable；Marketplace 可见性检查点。
6. **Billing 工作流**：create tenant（Caller 的 `user_id`）→ manual recharge → 查看 balance/ledger；与 Caller quick start 充值 handoff 对齐。
7. **验证清单**：Marketplace 出现 Hotline；Caller `/v1/tenants/me/balance` 有余额（可在 Operator 页指向 Caller 文档，不展开 curl 链）。

### 必须引用 platform-console 真实分区名

与 `repos/platform/apps/platform-console` 一致：`reviews`、`billing`（及 session 初始化 UI 字段）。写文档前读 gateway/console 源码核对按钮/分区 id，不要臆造。

### 交叉引用（薄改）

在 **中英文 Caller/Responder** quick start 的 production rehearsal 块：

- 将 operator 详细步骤替换为链接：「Operator 审核/充值见 [Operator Quick Start](...) §Reviews / §Billing」
- 保留「提交 review 后等待 operator」叙事，不复制 console 点击步骤

### 站点入口

- Docs 导航增加 Operator Quick Start（标注 platform owner）
- `llms.txt` 增加对应 URL

## 执行步骤

1. 在 `repos/brand-site` 新增中英文 Operator quick start 页面组件（参照现有 `QuickStartCaller` / `QuickStartResponder` 结构）。
2. 更新 Caller/Responder 四个页面的 production rehearsal operator handoff 为链接式交叉引用。
3. 扩展 `scripts/first-real-call-content-smoke.mjs`，至少断言：
   - 中英文 Operator 页：`/console/`、`reviews`、`billing`、`bootstrap`（或等价 session 初始化 copy）、「deployment administrator」类凭据说明
   - Operator 页 **不含** 示例 `sk_admin_` / 示例 bootstrap secret 字符串
   - Caller/Responder 页仍含指向 Operator quick start 的链接 marker
4. 跑 brand-site 验证：
   ```bash
   npm run smoke:first-real-call-content
   npx eslint <touched files>
   npm run build
   ```
5. `[人工]` 部署到 Aliyun `/var/www/html`（备份 + 保留 `/boids*`）。
6. 公开探测（写 `deploycheck=` stamp）：
   - 中英文 Operator quick start 200 + marker
   - `/healthz`、`/platform/healthz`、`/relay/healthz`、`/gateway/healthz`
   - `/console/` 仍为 gateway UI（T-501 回归）
7. 若 submodule SHA 变更，第四仓五 gate。

## 验收标准

1. 中英文 Operator quick start 可公开访问，逐步描述 T-501 已可用的 console 流程。
2. 页面明确：secret 由 deployment 管理员私下提供；页面本身无 secret 值。
3. `npm run smoke:first-real-call-content` 通过且新增断言绿。
4. Caller/Responder production rehearsal 通过链接引用 Operator 页，无四份重复 console 步骤。
5. Docs 导航与 `llms.txt` 含 Operator 入口。
6. 部署后公开 URL 检查通过（含 `deploycheck` stamp）。

## 防跑偏

- **不要**在本卡重写 self-host 部署手册（Docker compose、`.env` 生成仍属 `repos/platform` / 第四仓 runbook）。
- **不要**声称 console 能力超出 T-501 已验证范围（例如 UI 不存在的功能）。
- T-502 完成后仍 **不** 标记 Wave 5 完成——T-503 演练才是终验收。
