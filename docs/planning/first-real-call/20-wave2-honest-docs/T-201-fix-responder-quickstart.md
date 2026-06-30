# T-201 修官网 Responder quick-start 文档错误

- 仓库：`repos/brand-site`
- 依赖：无
- 修复断点：B5（CLI flag 错误）、M4 的 `$OPS_SESSION` 部分
- 完成标志：照页面逐条复制命令可在本地源码环境走通（submit-review 等需 platform 的步骤除外，须明确标注）

## 背景

`repos/brand-site/src/app/pages/Docs/QuickStartResponder.tsx` 存在会让用户原地报错的内容：

1. 约 127-137 行：`add-hotline` 用了 `--command` 和 `--endpoint`；CLI 实际只认 `--cmd` 和 `--url`（见 `repos/client/apps/ops/src/cli.js:45-46,488-494`）。
2. 约 109-113 行：Step 04 的 curl 带 `X-Ops-Session: $OPS_SESSION`，但页面从未教用户做 session setup（Caller 页 `QuickStartCaller.tsx:97-104` 有，可参照）。
3. Step 07 `bootstrap --platform http://127.0.0.1:8080` 默认跑不通（无 platform），需标注为可选/进阶。

## 执行步骤

1. 读 `QuickStartResponder.tsx` 全文与 `QuickStartCaller.tsx` 的 session setup 段；读 `repos/client/apps/ops/src/cli.js` 的 usage 段（约 40-80 行）核对每条命令的真实 flag。
2. 修正：
   - `--command "..."` → `--cmd "..."`；`--endpoint <url>` → `--url <url>`
   - 在 Step 04 之前插入与 Caller 页一致的 session setup 步骤（curl `/auth/session/setup`，取 `.token`，export `OPS_SESSION`），或者把该步改为等价 CLI 命令（如有），二选一并保持页面叙事连贯。
   - Step 07（`--platform`）与 Step 13（`submit-review`）加显著标注：「需要自托管 platform 在线，本地 quick start 可跳过」。
3. 如页面有中英双语版本（检查同目录或 i18n 资源），两个语言都要改。
4. 本地核验命令真实性：在 `repos/client` 下用 `npm run ops -- add-hotline --help`（或 usage 输出）确认修正后的 flag 拼写。
5. 构建站点确认无错误：`cd repos/brand-site && npm install && npm run build`。
6. 在 brand-site 提交；回第四仓 submodule SHA + change bundle + 验证链。注意 brand-site 是 optional submodule，change bundle 写法可参考 `changes/` 里最近涉及 brand-site 的 bundle。
7. `[人工]` 提示用户：站点需要重新部署 `dist/` 才会对外生效。

## 验收标准

1. 页面中每条 CLI 命令的 flag 与 `cli.js` usage 一致（逐条列出对照结果）。
2. `$OPS_SESSION` 在使用前有获取步骤。
3. 需要 platform 的步骤有显著标注。
4. `npm run build` 成功；第四仓验证链全绿。

## 防跑偏

- 只修这一个页面（及其双语版本），不要顺手重写其他文档页。
- 不要改 client CLI 来兼容错误 flag（如确想加别名，另开任务）。
