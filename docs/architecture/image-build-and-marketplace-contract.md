# Image Build Ownership and Marketplace API Contract

**Status:** Accepted  
**Date:** 2026-03-25  
**Scope:** Cross-repo boundary between `delegated-execution-client` and `delegated-execution-platform`

---

## 1. Background

The `delegated-execution-platform` submodule previously contained `build:` directives in its Docker Compose files for the `caller-controller` and `responder-controller` services. These services are defined and owned by `delegated-execution-client`. This created an incorrect build context that caused failures when the platform sub-compose was used in isolation.

This document establishes the authoritative ownership boundary for container image builds and the API contract that allows the brand site and ops-console to consume Marketplace data.

---

## 2. Image Build Ownership

### Decision

Container image **builds** belong to the repository that owns the source code.

| Image | Owning repo | Who builds |
|---|---|---|
| `caller-controller` | `delegated-execution-client` | `client` CI / release pipeline |
| `responder-controller` | `delegated-execution-client` | `client` CI / release pipeline |
| `platform-api` | `delegated-execution-platform` | `platform` CI / release pipeline |
| `platform-console-gateway` | `delegated-execution-platform` | `platform` CI / release pipeline |
| `transport-relay` | `delegated-execution-platform` | `platform` CI / release pipeline |

### Consequences

1. `repos/platform/docker-compose.yml` and all `repos/platform/deploy/*/docker-compose.yml` files **must not** contain `build:` entries for `caller-controller` or `responder-controller`. They reference images by tag only.
2. For local development, the fourth-repo source-integration flow (`corepack pnpm run test:integration`) manages bringing both repos' images up together.
3. The `all-in-one` profile uses pre-built images. Developers who need to test local client changes against the platform must use the fourth-repo's integration docker-compose layer.

### Example (platform-side, correct)

```yaml
caller-controller:
  image: ghcr.io/delegated-execution/caller-controller:${CLIENT_VERSION:-latest}
  # NO build: section
  environment:
    PLATFORM_API_URL: http://platform-api:4000
```

---

## 3. Marketplace API Contract

The Marketplace is served by `delegated-execution-platform`'s `platform-api` service. Callers (including the brand site and `ops-console`) consume it via HTTP.

### 3.1 Endpoints in Use

| Endpoint | Purpose | Consumer |
|---|---|---|
| `GET /marketplace/hotlines` | Paginated hotline catalog summary | brand site list view, ops-console |
| `GET /marketplace/hotlines/:id` | Full hotline detail (3-layer content) | brand site detail view |
| `GET /marketplace/hotlines/:id/template-bundle` | Schema + attachment + example bundle | brand site template panel, AI agent tooling |

### 3.2 Content Model Contract

All three endpoints are governed by the three-layer content model defined in `repos/protocol/docs/current/spec/architecture.md §4.5`.

**Discovery layer** (returned in list + detail):

```json
{
  "hotline_id": "acme.doc.summarizer.v1",
  "summary": "一句话说明 Hotline 能做什么",
  "tags": ["document", "pdf"],
  "responder_id": "acme-platform"
}
```

**Evaluation layer** (returned in detail only):

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

**Usage layer** (returned in template-bundle):

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

### 3.3 Versioning Policy

- The `platform-api` exposes `v0.1` semantics. Breaking field changes require a minor version bump in the URL prefix (`/v2/`, `/v2/hotlines`).
- `template_ref` is a stable pointer into `repos/protocol/docs/templates/`. Consumers must treat `template_ref` as opaque; only platform resolves it.
- Clients (brand site, ops-console) must handle **absent optional fields gracefully** — `recommended_for`, `limitations`, `input_attachments`, `output_attachments`, `input_examples`, `output_examples` may all be omitted when a Hotline was registered before the v0.2 schema extension.

### 3.4 Brand Site Integration Pattern

The brand site (`call-anything-brand-site`) fetches Marketplace data at runtime:

1. On list view mount → `GET /marketplace/hotlines?page=1&page_size=20`
2. On detail view open → `GET /marketplace/hotlines/:id`
3. On "查看 Template Bundle" click → `GET /marketplace/hotlines/:id/template-bundle`

When `VITE_PLATFORM_API_URL` is not set (e.g. in static hosting preview), the brand site falls back to the `FALLBACK_HOTLINES` and `FALLBACK_TEMPLATE_BUNDLES` constants defined in `src/app/marketplace-data.ts`. These mock constants must be kept in sync with the real API schema.

### 3.5 Ops-Console Integration Pattern

The `ops-console` (`repos/client/apps/ops-console`) fetches from `window.__DELEXEC_PLATFORM_URL__` (injected at runtime) or falls back to `http://localhost:4000`. The view-model layer (`view-model.js`) should call the same three endpoints and map responses to the `MarketplaceHotline` shape for consistency.

---

## 4. Smoke Test Responsibility Split

| Test level | Owned by | Tooling |
|---|---|---|
| Platform API contract tests | `repos/platform` | `tests/integration/platform-api.integration.test.js` |
| Client integration against platform | `repos/client` | `tests/integration/*.integration.test.js` |
| Cross-repo Marketplace end-to-end | fourth-repo | `repos/platform/tests/e2e/success.e2e.test.js` (extended) |

Brand site smoke tests are **not** in scope for the third-party submodules. They are owned by the `call-anything-brand-site` repo and run against a live or mock platform endpoint.

---

## 5. Change Process

Any change to the Marketplace API contract (new fields, removed fields, changed semantics) requires:

1. Protocol spec update in `repos/protocol/docs/current/spec/platform-api-v0.1.md`
2. Platform implementation in `repos/platform/apps/platform-api/src/server.js`
3. Client/brand-site consumer update
4. Fourth-repo change bundle under `changes/`
5. Passing fourth-repo validation (`check:bundles`, `test:contracts`, `test:integration`)

See `docs/orchestration/cross-repo-change-process.md` for the full required sequence.
