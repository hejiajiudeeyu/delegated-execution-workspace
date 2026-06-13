# T-203 统一 golden path 为 bootstrap-first

- 仓库：`repos/brand-site` + `repos/client`
- 依赖：**T-101 已完成且 npm 包已实际发布**（人工步骤完成后才能执行本卡；之前执行会写出新的虚假承诺）
- 修复断点：M8（文档入口三分裂）、差距 1/7（npm 承诺）
- 完成标志：官网与两份 README 给陌生人的第一条路径完全一致

## 当前状态

前置已满足（2026-06-13）：`npm view @delexec/ops version` 返回 `0.1.0`，且干净 npm install smoke 已跑通 `bootstrap`、`status`、`mcp spec`。本卡可以进入实现，但仍需按步骤同步官网与 client README 的 golden path。

2026-06-13 更新：本卡已完成实现、验证与公开站部署。

- `repos/client` commit `56b4032b60fca2966b3a25508555351ef17b2b4a`：`README.md` / `README.zh-CN.md` 均改为 package-first golden path，源码安装降级为贡献者路径；`scripts/check-onboarding-docs.mjs` 增加 README exact golden path 与顺序检查。
- `repos/brand-site` commit `93c9688d9d70cc1001ba2d1da9b1c6b11bc9e22b`：中英文 Caller/Responder quick start、Docs hero、`public/llms.txt` 均首推同一组 npm bootstrap 命令；`git clone --recursive` 只保留在源码贡献者路径。
- RED：brand-site content smoke 曾失败于缺少 golden path 和 clone-first 顺序；client onboarding docs check 曾失败于英文 README 顺序与中文 README 缺失 exact golden path。
- GREEN：`repos/brand-site` 已通过 `npm run smoke:first-real-call-content`、targeted eslint、`npm run build` 和本地 Browser 内容检查；`repos/client` 已通过 `npm test`。
- 干净 npm 实测：`/tmp/delexec-t203-golden-RkA4qG` 中安装 `@delexec/ops@0.1.0`，使用隔离 `DELEXEC_HOME` 与显式空闲端口跑公开四条命令；`bootstrap` 返回 `status: SUCCEEDED`，`status` 显示 1 个 succeeded request，`run-example` 返回 `status: SUCCEEDED`。
- 第四仓：`CHG-2026-150.yaml` 记录 client + brand-site SHA 组合，root `check:submodules`、`check:boundaries`、`check:bundles`、`test:contracts`、`test:integration` 均已通过；bundle 已标为 `passed` 并复跑 `check:bundles`。
- 公开站部署：当前 brand-site dist 已同步到 Aliyun `/var/www/html`，备份为 `/home/admin/site-backups/html.20260613T043956Z.tgz`，并保留 `/boids*`；公网 `/docs/`、中英文 Caller/Responder quick start、`/llms.txt` 均已验证四条命令存在且 clone/source 路径排在 package 路径之后。

## 背景

当前三处入口互相矛盾：

- 官网 quick-start 教 `git clone --recursive` 第四仓 + `corepack pnpm install`
- `repos/client/README.md` 主推 `npm install -g @delexec/ops`（T-101 完成前是 404）
- `repos/client/README.zh-CN.md` 不提 bootstrap 一键链，只有分步 `start`

T-101 发布后，统一的 golden path 应为：

```bash
npm install -g @delexec/ops
delexec-ops bootstrap --email you@example.com --text "Summarize this bootstrap request."
delexec-ops status
delexec-ops run-example --text "Summarize this follow-up request."
```

源码安装与第四仓 clone 降级为「贡献者路径」附录。

## 执行步骤

1. 前置核验（失败即停）：`npm view @delexec/ops version` 必须返回版本号。
2. 改 `repos/client/README.zh-CN.md`：与英文 README 对齐，bootstrap 一键链放最前，分步 `start` 流程移为进阶段落。不要机器翻译整篇，只动安装/quick start 段。
3. 改官网 `QuickStartCaller.tsx` / `QuickStartResponder.tsx`（在 T-201/T-202 修正的基础上）：第一段改为全局 npm 安装 + bootstrap 路径；把「clone 第四仓」整段改为可折叠/靠后的「从源码运行（贡献者）」。
4. 检查 `repos/brand-site/src/app/Docs.tsx`（约 352 行的英雄区命令）与 `public/llms.txt`（约 64 行）：确认命令与 golden path 一致。
5. 全局搜索残留断言：在 brand-site 和 client 两仓库 `rg "install -g @delexec/ops"` 与 `rg "croc-ops"`，逐处确认上下文正确。
6. 实测：在干净目录 `npm install -g @delexec/ops`（或 npx 等价），跑 golden path 四条命令到 SUCCEEDED。
7. 两仓库分别提交；第四仓两个 submodule SHA + 一个 change bundle（一次组合更新）+ 验证链；`[人工]` 重新部署 brand-site。

## 验收标准

1. 三处入口（官网 2 页 + 2 份 README）首推路径逐字一致。
2. golden path 实测 SUCCEEDED 记录。
3. 第四仓验证链全绿。

## 防跑偏

- T-101 的 npm 发布未实际完成前，禁止执行本卡。
- 不要删除源码安装路径，只是降级排序。
