# T-202 修官网 Caller quick-start 文档错误

- 仓库：`repos/brand-site`
- 依赖：无（与 T-201 并行，不同文件）
- 修复断点：B6（session 初始化错误）、M4 的注册字段部分
- 完成标志：照页面逐条复制 curl/命令可在本地源码环境走通

## 背景

`repos/brand-site/src/app/pages/Docs/QuickStartCaller.tsx` 的已知错误（对照 `repos/client/apps/ops/src/supervisor.js`）：

1. session setup：用空 body `{}` 调 `/auth/session/setup`，但服务端要求 passphrase ≥ 8 字符（`supervisor.js:2312-2314`）；且响应字段是 `token`（`supervisor.js:2346`），页面却 `jq -r '.session'`。
2. HTTP 注册：curl body 用 `{ "email": "..." }`，服务端读 `body.contact_email`（`supervisor.js:2551`）。
3. 正确写法可参照 client 仓库 `docs/current/guides/local-mode-onboarding.md:139-141`。

## 执行步骤

1. 读 `QuickStartCaller.tsx` 全文；读 `repos/client/docs/current/guides/local-mode-onboarding.md` 的 session/注册段；读 `supervisor.js` 2300-2360、2540-2560 行确认字段。
2. 修正：
   - setup/session curl 改为带合法 passphrase 的 body，`jq -r '.token'`。
   - 注册 curl 字段改为 `contact_email`（或直接改用 CLI `auth register --local --email ...`，与页面其他步骤风格一致即可）。
3. 双语版本同步改（如存在）。
4. 实测验证：在 `repos/client` 下起 supervisor（隔离 `DELEXEC_HOME`、`unset PLATFORM_API_BASE_URL`），把页面修正后的命令从上到下逐条执行一遍，记录每条输出摘要。这是本卡的核心验收。
5. `cd repos/brand-site && npm run build` 成功。
6. brand-site 提交；第四仓 submodule SHA + change bundle + 验证链；`[人工]` 提示重新部署 dist。

## 验收标准

1. 页面全部命令实测走通的逐条记录（命令 + 关键输出）。
2. build 成功；第四仓验证链全绿。

## 防跑偏

- 只修此页面（含双语），不重排页面结构。
