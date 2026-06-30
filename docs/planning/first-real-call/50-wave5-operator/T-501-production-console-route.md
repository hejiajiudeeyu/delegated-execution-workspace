# T-501 Production Console Route

- 仓库：`repos/platform`（文档/注释微调，若发现 compose 或 smoke 缺口）+ 大量 `[人工]`（Aliyun nginx、public-stack）
- 依赖：T-401、T-407 已完成；生产 public-stack 当前运行 `v0.1.2` 或更新
- 完成标志：`https://callanything.xyz/console/` 返回 **platform-console-gateway** 静态 UI，而非 brand-site HTML；gateway session + admin proxy smoke 通过

## 背景

T-403 的 operator rule violation 根因是：公开文档指向 `/console/`，但生产路由仍返回 brand-site 静态页，operator 被迫 SSH + admin API。

Wave 5 选定 **接通现有 gateway console**（不重做 UI）。T-401 nginx 计划已定义 `/console/` 与 `/gateway/` 应代理到 `127.0.0.1:28085`；本卡验证生产是否真正生效，并补齐缺口。

参考：`40-wave4-public-exposure/T-401-aliyun-nginx-plan.md`、`repos/platform/docs/current/guides/public-stack-operator-guide.md`。

## 执行步骤

### Agent 部分

1. 读-only 核对第四仓 operator 契约与 exposure 状态（不打印 secrets）：
   ```bash
   corepack pnpm run operator:onboarding:check
   corepack pnpm --silent run deployability:exposure -- --json
   ```
2. 整理 **生产路由诊断清单**（写入本卡回复或同目录 `T-501-route-evidence.md`），至少包含：
   - 公开 URL 内容探测：`/console/`、`/gateway/healthz` 的 **响应体特征**（不能只看 HTTP 200）
   - 与 brand-site 静态页的差异判据（例如应含 `platform-console`、`reviews`、`billing` 等 gateway 控制台 marker，而不是 marketing site 的 root bundle）
   - 本地 upstream 探测命令模板（供 `[人工]` 在服务器执行）：
     ```bash
     curl -fsS http://127.0.0.1:28085/console/ | head -n 20
     curl -fsS http://127.0.0.1:28085/gateway/healthz
     curl -fsS https://callanything.xyz/console/ | head -n 20
     curl -fsS https://callanything.xyz/gateway/healthz
     ```
3. 若 nginx 配置与 T-401 计划不一致，输出 **最小 diff 建议**（location 块、`proxy_pass` 目标、是否被 brand-site `try_files` 抢先匹配）；**不在本卡改 nginx**，交给 `[人工]`。
4. 若 `platform-console-gateway` 未运行或 public-stack compose 缺服务，核对 `repos/platform/deploy/public-stack/docker-compose.yml` 与 Aliyun override；必要时在 `repos/platform` 补注释或 smoke 断言（走 owning-repo → SHA → bundle 流程）。

### `[人工]` 部分

1. SSH 到 Aliyun ECS，确认 public-stack 服务健康：
   ```bash
   cd /home/admin/apps/delegated-execution-public-stack
   docker compose ps
   curl -fsS http://127.0.0.1:28085/gateway/healthz
   curl -fsS http://127.0.0.1:28080/platform/healthz
   ```
2. 若 `28085` 不健康，按 T-401 runbook 重启 `platform-console-gateway`（及依赖），**不要**改 secrets 值除非 rotate 流程要求。
3. 核对 `/etc/nginx/sites-available/callanything.xyz` 中 `location ^~ /console/` 与 `location ^~ /gateway/` 指向 `127.0.0.1:28085`（见 T-401 nginx 计划）；备份后 `nginx -t` → `reload`。
4. 执行 **无 secret 输出** 的 gateway bootstrap smoke（secret 从服务器 `.env` 读取，勿贴进任务卡）：
   ```bash
   BASE="https://callanything.xyz"
   # PLATFORM_CONSOLE_BOOTSTRAP_SECRET 与 PLATFORM_ADMIN_API_KEY 从部署 .env 读取
   TOKEN=$(curl -fsS -X POST "$BASE/gateway/session/setup" \
     -H 'content-type: application/json' \
     -d "{\"passphrase\":\"<console-passphrase>\",\"bootstrap_secret\":\"$PLATFORM_CONSOLE_BOOTSTRAP_SECRET\"}" | jq -r '.token')
   curl -fsS -X PUT "$BASE/gateway/credentials/platform-admin" \
     -H 'content-type: application/json' \
     -H "x-platform-console-session: $TOKEN" \
     -d "{\"api_key\":\"$PLATFORM_ADMIN_API_KEY\"}"
   curl -fsS "$BASE/gateway/proxy/v2/admin/hotlines" \
     -H "x-platform-console-session: $TOKEN" | head -c 500
   ```
5. 在浏览器打开 `https://callanything.xyz/console/`，确认 **Reviews** 与 **Billing** 分区可加载（不要求在本卡完成真实 approve/recharge）。

## 验收标准

1. `https://callanything.xyz/gateway/healthz` 返回 gateway JSON（`service: platform-console-gateway`），不是 brand-site HTML。
2. `https://callanything.xyz/console/` 返回 platform-console 静态 UI（含 reviews/billing 控制台结构），不是 brand-site marketing HTML。
3. Gateway session setup + admin credential persist + 至少一条 proxied admin API（如 `/gateway/proxy/v2/admin/hotlines`）成功；证据写入 `T-501-route-evidence.md`，**不含 secret 明文**。
4. `https://callanything.xyz/platform/healthz`、`/relay/healthz` 仍健康（回归）。
5. 若改了 `repos/platform`，跑 platform 验证：`npm test`、`npm run test:service:packages`、`npm run test:deploy:config`、`npm run test:public-stack-smoke`；若推 submodule SHA，跑第四仓五 gate。

## 防跑偏

- 本卡 **不** 写 Operator 公开文档（T-502）也不跑端到端演练（T-503）。
- 不要在演练中发现问题时现场改生产逻辑来「凑绿」——记录 blocker，开 owning-repo 新卡。
- agent 不得接触或回贴生产 secret； smoke 输出只记录 HTTP status 与 JSON 字段名。
