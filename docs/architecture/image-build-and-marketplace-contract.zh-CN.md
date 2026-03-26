# 镜像构建归属与 Marketplace API 对接契约

**状态：** 已接受  
**日期：** 2026-03-25  
**范围：** `delegated-execution-client` 与 `delegated-execution-platform` 之间的跨仓边界

---

## 1. 背景

`delegated-execution-platform` 子仓的 Docker Compose 文件中此前包含 `caller-controller` 和 `responder-controller` 服务的 `build:` 指令。这两个服务的源码归属于 `delegated-execution-client`，导致单独使用平台 compose 文件时构建上下文不正确。

本文档确立容器镜像构建的权威归属边界，以及品牌站和 ops-console 使用 Marketplace 数据的 API 契约。

---

## 2. 镜像构建归属

### 决策

容器镜像的**构建工作**归属于拥有源码的仓库。

| 镜像 | 归属仓库 | 构建方 |
|---|---|---|
| `caller-controller` | `delegated-execution-client` | `client` CI / 发布流水线 |
| `responder-controller` | `delegated-execution-client` | `client` CI / 发布流水线 |
| `platform-api` | `delegated-execution-platform` | `platform` CI / 发布流水线 |
| `platform-console-gateway` | `delegated-execution-platform` | `platform` CI / 发布流水线 |
| `transport-relay` | `delegated-execution-platform` | `platform` CI / 发布流水线 |

### 后果

1. `repos/platform/docker-compose.yml` 及所有 `repos/platform/deploy/*/docker-compose.yml` 文件**不得**包含 `caller-controller` 或 `responder-controller` 的 `build:` 条目，只通过镜像标签引用。
2. 本地开发时，第四仓 source-integration 流程（`corepack pnpm run test:integration`）负责同时启动两个子仓的镜像。
3. `all-in-one` profile 使用预构建镜像。需要在本地测试 client 变更与平台集成的开发者必须使用第四仓的 integration docker-compose 层。

### 示例（平台侧，正确）

```yaml
caller-controller:
  image: ghcr.io/delegated-execution/caller-controller:${CLIENT_VERSION:-latest}
  # 不应有 build: 节
  environment:
    PLATFORM_API_URL: http://platform-api:4000
```

---

## 3. Marketplace API 对接契约

Marketplace 由 `delegated-execution-platform` 的 `platform-api` 服务提供。Caller 方（包括品牌站和 `ops-console`）通过 HTTP 消费。

### 3.1 使用的接口

| 接口 | 用途 | 消费方 |
|---|---|---|
| `GET /marketplace/hotlines` | 分页 Hotline 目录摘要 | 品牌站列表视图、ops-console |
| `GET /marketplace/hotlines/:id` | 完整 Hotline 详情（三层内容） | 品牌站详情视图 |
| `GET /marketplace/hotlines/:id/template-bundle` | Schema + 附件 + 示例包 | 品牌站 Template 面板、AI 智能体工具调用 |

### 3.2 内容模型契约

三个接口均遵循 `repos/protocol/docs/current/spec/architecture.md §4.5` 定义的三层内容模型。

**发现层**（列表 + 详情均返回）：

```json
{
  "hotline_id": "acme.doc.summarizer.v1",
  "summary": "一句话说明 Hotline 能做什么",
  "tags": ["document", "pdf"],
  "responder_id": "acme-platform"
}
```

**评估层**（仅详情返回）：

```json
{
  "description": "完整功能说明",
  "recommended_for": ["适用场景1", "适用场景2"],
  "not_recommended_for": ["不适用场景"],
  "limitations": ["当前限制"],
  "input_summary": "输入格式概述",
  "output_summary": "输出格式概述"
}
```

**使用层**（仅 template-bundle 返回）：

```json
{
  "template_ref": "acme.doc.summarizer.v1@1.0.0",
  "input_schema": { /* JSON Schema */ },
  "output_schema": { /* JSON Schema */ },
  "input_attachments": {
    "accepts_files": true,
    "max_files": 1,
    "accepted_mime_types": ["application/pdf"],
    "file_roles": [
      { "role": "primary_document", "description": "主文档", "required": true }
    ]
  },
  "output_attachments": {
    "includes_files": true,
    "possible_mime_types": ["application/pdf"],
    "file_roles": [
      { "role": "result_report", "description": "结果报告", "guaranteed": false }
    ]
  },
  "input_examples": [ /* ... */ ],
  "output_examples": [ /* ... */ ]
}
```

### 3.3 版本策略

- `platform-api` 目前遵循 `v0.1` 语义。破坏性字段变更需在 URL 前缀中升级次版本（`/v2/`）。
- `template_ref` 是指向 `repos/protocol/docs/templates/` 的稳定指针。消费方应将其视为不透明字符串，只由 platform 负责解析。
- 客户端（品牌站、ops-console）必须**容忍可选字段缺失**——`recommended_for`、`limitations`、`input_attachments`、`output_attachments`、`input_examples`、`output_examples` 在 v0.2 schema 扩展之前注册的 Hotline 中均可能缺失。

### 3.4 品牌站集成模式

品牌站（`call-anything-brand-site`）在运行时按需拉取 Marketplace 数据：

1. 列表视图挂载时 → `GET /marketplace/hotlines?page=1&page_size=20`
2. 详情视图打开时 → `GET /marketplace/hotlines/:id`
3. 点击"查看 Template Bundle"时 → `GET /marketplace/hotlines/:id/template-bundle`

当 `VITE_PLATFORM_API_URL` 未设置（例如静态托管预览），品牌站使用 `src/app/marketplace-data.ts` 中定义的 `FALLBACK_HOTLINES` 和 `FALLBACK_TEMPLATE_BUNDLES` 常量作为后备数据。这些 mock 常量必须与真实 API schema 保持同步。

### 3.5 Ops-Console 集成模式

`ops-console`（`repos/client/apps/ops-console`）从运行时注入的 `window.__DELEXEC_PLATFORM_URL__` 或默认 `http://localhost:4000` 拉取数据。视图模型层（`view-model.js`）调用同一套三个接口，并将响应映射到与品牌站一致的 `MarketplaceHotline` 形态。

---

## 4. 冒烟测试责任分工

| 测试层级 | 归属 | 工具 |
|---|---|---|
| Platform API 契约测试 | `repos/platform` | `tests/integration/platform-api.integration.test.js` |
| Client 集成于 Platform | `repos/client` | `tests/integration/*.integration.test.js` |
| 跨仓 Marketplace 端到端 | 第四仓 | `repos/platform/tests/e2e/success.e2e.test.js`（扩展） |

品牌站冒烟测试不在三个子仓的职责范围内，由 `call-anything-brand-site` 仓库自行管理，运行目标为真实或 mock 的 platform 端点。

---

## 5. 变更流程

任何 Marketplace API 契约变更（新增字段、删除字段、语义变更）都需要：

1. 更新 `repos/protocol/docs/current/spec/platform-api-v0.1.md` 中的协议规范
2. 在 `repos/platform/apps/platform-api/src/server.js` 中实现
3. 更新 Client / 品牌站消费侧
4. 在 `changes/` 下创建第四仓变更包
5. 通过第四仓验证（`check:bundles`、`test:contracts`、`test:integration`）

完整必要序列请参阅 `docs/orchestration/cross-repo-change-process.md`。
