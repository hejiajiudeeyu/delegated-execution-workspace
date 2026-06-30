# T-204 marketplace mock 诚信化

- 仓库：`repos/brand-site`
- 依赖：无（与 T-201/T-202 并行）
- 修复断点：M5 / 差距 2（虚构条目伪装真实目录）
- 完成标志：访客无法把 mock 条目误认为可调用的真实 Hotline

## 背景

`repos/brand-site/src/app/marketplace-data.ts`（118-299 行）内置 3 条虚构 Hotline（Starlight/Atlas/Pixel），带 `healthy`、`hotline_reviewed` 徽章和假 SLA。`Marketplace.tsx`（828-843 行）在 API 失败或为空时回退展示它们，仅有一行「mock 预览数据」提示。预渲染的 `dist/marketplace/index.html` 也嵌入了这些条目，SEO 层面同样在传播虚构内容。首页 registry（`homepage.ts:434-440`）写「首批 Hotline 即将上线”，与 mock 的 healthy 徽章互相矛盾。

本卡不要求接真实 API（那是 T-402），只要求**诚实**。

## 执行步骤

1. 读 `marketplace-data.ts`、`Marketplace.tsx` 的加载/回退逻辑、`design-system/patterns/homepage-marketplace.tsx`、`registry/homepage.ts` 相关段。
2. 改 fallback 展示策略（推荐方案，如与现有设计系统冲突可调整但须说明）：
   - 每张 mock 卡片加显著的「示例预览 / DEMO」角标，去掉或替换 `healthy` 实时状态徽章为「示例数据」。
   - 页面顶部的 fallback 横幅升级为不可忽略的样式：明确写「当前为协议早期阶段，以下为演示用示例条目，尚不可真实调用；首批真实 Hotline 上线后此页将自动切换」。
   - mock 条目的「dial / 调用」类操作按钮指向 quick-start 文档而不是伪装可调用。
3. 同步首页 marketplace 区块的文案，使其与「示例预览」状态一致。
4. 双语文案同步。
5. `npm run build`，检查 `dist/marketplace/index.html` 预渲染产物中已包含 DEMO 标识。
6. brand-site 提交；第四仓 submodule SHA + change bundle + 验证链；`[人工]` 重新部署 dist。

## 验收标准

1. fallback 状态下每张卡有 DEMO 标识、无 healthy 假徽章。
2. 顶部横幅明确「不可真实调用」。
3. `dist/marketplace/index.html` 中可 grep 到 DEMO 标识文案。
4. 真实 API 返回数据时（可用本地 platform 起 `/marketplace/hotlines` 验证，或单测模拟）不显示 DEMO 标识。
5. build 成功；第四仓验证链全绿。

## 防跑偏

- 不要删掉 mock 数据（空页面比诚实的示例更糟），只改其呈现。
- 不要在本卡接真实后端。
