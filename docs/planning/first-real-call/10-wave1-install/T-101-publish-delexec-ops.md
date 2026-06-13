# T-101 发布 `@delexec/ops` 到 npm（含打包修复）

- 仓库：`repos/client`
- 依赖：无
- 修复断点：B1（npm 404）、M1（全局安装后 MCP/UI 依赖源码树）
- 完成标志：`npm view @delexec/ops version` 返回版本号，且全局安装后 `delexec-ops bootstrap` 本地闭环可跑通

## 当前状态

已完成（2026-06-13）。`@delexec/ops@0.1.0` 已通过 GitHub Actions publish run `27455900100` 发布到 npm。发布前失败根因是 bundled Ops Console UI 在 client formal repo CI 中用 `corepack pnpm` 启动，而该 workflow 使用 `npm ci`；最终 client commit `c7c7243d4080eb30b4384b91a5f15dd4d5cfc18a` 改为 npm workspace 启动，并保留冷启动 timeout 余量。干净 npm 安装 smoke 已验证 `bootstrap` 到 `SUCCEEDED`、`status` 正常、`mcp spec` 能解析 packaged adapter。

## 背景

`repos/client/apps/ops/package.json` 已配置 `publishConfig.access=public`、bin `delexec-ops`、`bundleDependencies` 与 `prepack` 打包脚本（`scripts/bundle-workspace-deps.mjs`），CI 有 `.github/workflows/publish.yml`，但包从未成功发布。直接发布还有两个已知缺陷：

1. `@delexec/caller-skill-mcp-adapter` 不在 `bundleDependencies` 中，tarball 装好后 supervisor 启动 MCP adapter 会找不到模块（见 `apps/ops/src/supervisor.js` 约 1316 行对 adapter 路径的解析）。
2. `apps/ops/src/cli.js` 顶部的 `CLIENT_ROOT`（约 26-27 行）按源码树相对路径推导，全局安装后指向 node_modules 内错误位置，`ui start`（约 271-303 行）会失败。

## 执行步骤

1. 读 `repos/client/apps/ops/package.json`、`repos/client/scripts/bundle-workspace-deps.mjs`、`repos/client/apps/ops/src/cli.js` 的 1-60 行与 260-310 行、`repos/client/apps/ops/src/supervisor.js` 的 1300-1360 行，确认上述两个缺陷的当前形态。
2. 把 `@delexec/caller-skill-mcp-adapter` 加进 `apps/ops/package.json` 的 `dependencies`（版本 `0.1.0`，与其他内部包一致）和 `bundleDependencies` 列表。确认 `bundle-workspace-deps.mjs` 会把它复制进 tarball（如该脚本按 bundleDependencies 列表驱动则无需改）。
3. 修 `cli.js` 的全局安装兼容：
   - `ui start`：当检测到不在源码 workspace（例如 `CLIENT_ROOT/apps/ops-console` 不存在）时，给出明确报错信息，提示「ops-console UI 需要源码安装，参见 README 的 source install 一节」，而不是抛出难以理解的路径错误。本卡不要求把 UI 打包进 npm 包。
   - MCP adapter 路径解析：优先用 `require.resolve('@delexec/caller-skill-mcp-adapter/...')`（或等价的基于包名的解析）替代源码树相对路径，使 bundle 安装后可用。
4. 本地验证 tarball：
   ```bash
   cd repos/client/apps/ops && npm pack
   mkdir -p /tmp/delexec-global-test && cd /tmp/delexec-global-test
   npm init -y && npm install <刚才的 .tgz 绝对路径>
   export DELEXEC_HOME=/tmp/delexec-home-test
   npx delexec-ops bootstrap --email t@example.com --text "Summarize this bootstrap request."
   npx delexec-ops status
   npx delexec-ops mcp spec
   ```
   bootstrap 须到 `SUCCEEDED`，`mcp spec` 须返回 spec 而非模块缺失错误。注意先 `unset PLATFORM_API_BASE_URL`。
5. 跑 client 仓库测试：`cd repos/client && npm test`（或按其 package.json 的测试脚本）。
6. 在 `repos/client` 提交（提交信息说明修复了 bundle 与全局安装路径）。
7. `[人工]` 输出发布操作清单给用户，不要自行执行：
   - 把 `repos/client` 提交 push 到 GitHub
   - 触发 `.github/workflows/publish.yml`（确认 NPM_TOKEN secret 已配置）或本地 `npm publish --workspace @delexec/ops`
   - 发布后验证 `npm view @delexec/ops version`
8. 回到第四仓：更新 `repos/client` submodule SHA，在 `changes/` 新增 change bundle（编号顺延，描述本次变更与验证方式），跑验证链（未 push 前用 `SKIP_ORIGIN_REACHABILITY=1`）。

## 验收标准

1. `/tmp` tarball 安装后 `npx delexec-ops bootstrap` 输出含 `SUCCEEDED`。
2. `npx delexec-ops mcp spec` 不报模块找不到。
3. `npx delexec-ops ui start` 在非源码环境给出人类可读的指引性报错。
4. client 仓库测试全绿。
5. 第四仓五命令验证链全绿（或注明 SKIP_ORIGIN_REACHABILITY 本地验证）。
6. npm 发布完成并已记录 registry + clean-install smoke 证据。

## 防跑偏

- 不要把 ops-console UI 打包进 npm（那是后续卡的事，本卡只要求报错友好）。
- 不要改 supervisor 的业务逻辑，只改模块路径解析。
- 不要升级依赖版本、不要顺手重构 cli.js。
