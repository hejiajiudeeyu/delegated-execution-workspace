# T-303 billing console 接入 `/billing` 路由

- 仓库：`repos/platform`
- 依赖：T-301 已合并（展示的数据才有意义）；可与 T-302 并行
- 修复断点：M7（view-model 有 billing 读模型，main.js 未接路由）
- 完成标志：operator 在 platform console 里能看到租户余额/账本页面

## 背景

`repos/platform/apps/platform-console/src/view-model.js`（22-34 行起）已有 Billing 读模型渲染（含「not end-user ready」提示），但 `main.js` 没有注册 `/billing` 路由，operator 从导航进不去。

## 执行步骤

1. 读 `apps/platform-console/src/main.js` 的路由注册方式与现有页面（如 responder/hotline 监控页）的接线模式；读 `view-model.js` billing 部分确认其期望的数据输入。
2. 在 `main.js` 注册 `/billing` 路由并加入导航；数据源走 admin billing API（console 已有的 gateway/API 调用通道）。
3. 页面最小内容：tenant 列表 + 余额 + 点入查 ledger 分页。保持与 view-model 既有渲染约定一致，不引入新 UI 框架。
4. 测试：platform-console 已有单测（`9715eb1` 提交加过 test:unit），按现有风格补路由/渲染断言。
5. 手工验证：本地起 console（按 platform 仓库 README/console 文档），截图或文字记录 `/billing` 页面可见。
6. platform 测试全绿；提交；第四仓 SHA + change bundle + 验证链。

## 验收标准

1. console 导航含 Billing 入口，`/billing` 渲染余额与账本。
2. 单测覆盖路由注册；全部测试绿。
3. 第四仓验证链全绿。

## 防跑偏

- 这是 operator 内部页面，不做美化、不做权限体系扩展。
- 不实现充值表单之外的写操作；手工充值如 admin API 已支持且 view-model 已设计，则按设计接，否则只读。
