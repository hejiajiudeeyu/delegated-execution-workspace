# T-401 public-stack 公网部署清单

- 仓库：`repos/platform`（文档/模板微调）+ 大量 `[人工]`（VPS、域名、secrets）
- 依赖：Wave 1（T-104 镜像可拉取）、Wave 3（T-304 付费回归绿）建议全部完成
- 完成标志：公网域名上 platform-api / relay / console 可达，security-review 无 blocker

## 背景

`deploy/public-stack` 是 registry-only 的公网 operator bundle（caddy + gateway + platform + relay + postgres）。当前默认 env 全是 blocker：`PUBLIC_SITE_ADDRESS=http://localhost`、`TOKEN_SECRET=change-me-*`、`PLATFORM_ADMIN_API_KEY=sk_admin_change_me`。第四仓已有完整 gate 工具，本卡主要是把它们真正用一遍。

## 执行步骤（agent 部分）

1. 跑读-only 预检并整理输出给用户：
   ```bash
   corepack pnpm --silent run deployability:exposure -- --json
   corepack pnpm --silent run deployability:recipe -- --profile public-stack --json
   corepack pnpm run operator:onboarding:check
   ```
   把 `exposure_blockers` 与 `pre_exposure_remediation_plan` 翻译成一页人话清单。
2. 核对 `repos/platform/deploy/public-stack/.env.example` 注释是否足以让人正确填写每个变量；不足则补注释（这是 platform 仓库文档改动，走 SHA+bundle 流程）。
3. 生成 `[人工]` 部署手册（写到本卡同目录 `T-401-deploy-runbook.md`），至少包含：
   - VPS 要求（Docker、开放 80/443）与域名 DNS 指向
   - `.env` 逐项填写说明（用 `selfhost:init -- --profile public-stack` 生成强 secrets）
   - `selfhost:public-origin -- --profile public-stack --origin https://<域名> --confirm` 设置公网地址
   - `IMAGE_TAG` 固定到 T-104 发布的具体版本 tag（不要 latest）
   - 启动：`selfhost:preflight` → `selfhost:up` → `selfhost:smoke` → `selfhost:security-review`（全部带 `--profile public-stack`）
   - 首次 gateway bootstrap（`PLATFORM_CONSOLE_BOOTSTRAP_SECRET`）与 admin key 保管
   - 备份：`selfhost:backup-plan -- --profile public-stack`
4. `[人工]` 用户按手册在 VPS 执行；agent 远程协助排错（用户贴回输出）。

## 验收标准

1. 公网 `https://<域名>/platform/...` 健康检查、`/console/` 登录页可达。
2. `selfhost:security-review -- --profile public-stack` 无 blocker。
3. `deployability:exposure` 的 `exposure_blockers` 为空。
4. `BILLING_ENFORCEMENT=enforced` 在生产 env 中开启（Wave 3 完成的前提下）。

## 防跑偏

- agent 不得接触真实 secrets 值；手册里只写生成方法。
- 不要为通过 gate 修改第四仓 gate 工具的判定逻辑。
