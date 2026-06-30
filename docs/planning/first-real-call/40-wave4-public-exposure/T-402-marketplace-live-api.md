# T-402 brand-site 接真实 marketplace API

- 仓库：`repos/brand-site`
- 依赖：T-401（公网 platform 在线）、T-204（mock 已诚信化）
- 完成标志：callanything.xyz/marketplace 展示来自生产 platform 的真实目录；目录为空时显示诚实空态

## 背景

`Marketplace.tsx` 已支持运行时 `fetch` 同源 `/marketplace/hotlines`，可经 `VITE_MARKETPLACE_API_BASE_URL` 指向其他源（见 `repos/brand-site/src/app/marketplace-data.ts` 加载逻辑与 `docs/architecture/image-build-and-marketplace-contract.zh-CN.md:124-130`）。platform 侧 `/marketplace/*` 只读端点已实现（`repos/platform/apps/platform-api/src/server.js:2147-2213`）。缺的只是把两者在生产连起来。

## 执行步骤

1. 确认生产 platform 的 marketplace 端点形状：`curl https://<域名>/platform/marketplace/hotlines`（路径前缀以 T-401 的 Caddyfile 路由为准），对照 `marketplace-data.ts` 期望的字段做差异清单。
2. 配置接线（两种方案按部署形态二选一，回复中说明）：
   - 方案 A：brand-site 构建时设 `VITE_MARKETPLACE_API_BASE_URL=https://<域名>/platform`
   - 方案 B：brand-site 的 Nginx 反代 `/marketplace/*` 到 platform，前端保持同源请求
3. 处理 CORS：方案 A 需确认 platform `/marketplace/*` 响应头允许 brand-site 域名；不允许则回 platform 仓库加只读端点的 CORS 配置（走 SHA+bundle）。
4. 空目录状态：生产初期目录大概率为空。确认 T-204 的逻辑——API 成功返回空列表时应显示「目录尚空，成为第一个 Responder」引导（链 quick-start-responder），而不是回退 mock。如 T-204 实现的是「空列表也回退 mock」，在本卡改为上述行为。
5. 本地验证：起本地 platform（有 1 条已审批 hotline）+ brand-site dev server，确认真实条目渲染、无 DEMO 角标。
6. `npm run build`；提交；第四仓 SHA + change bundle + 验证链；`[人工]` 部署 dist 并在生产页面截图确认。

## 验收标准

1. 生产 marketplace 页展示真实 platform 数据（或诚实空态），fallback mock 仅在 API 故障时出现。
2. 字段差异清单为空或已全部解决。
3. build 成功；第四仓验证链全绿。

## 防跑偏

- 不做目录搜索/排序增强。
- 不做多 platform 联邦；只连这一个生产实例。
