# Selfhost Audit Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-host audit export helper that lets operators capture platform audit events into a local JSON artifact without printing admin secrets.

**Architecture:** The fourth repository remains orchestration-only. `tools/selfhost-kit.mjs` will read the selected profile `.env`, call the existing platform admin audit endpoint, and write the response to `exports/audit/<profile>/...json` or a caller-provided `--output` path. Protocol, client, and platform runtime truth remain unchanged.

**Tech Stack:** Node.js ESM CLI, existing `selfhost-kit` helpers, built-in `fetch`, `node:http` for tests, existing `node:assert` test harness, Markdown PRD/runbook docs, brand-site deployability docs.

---

### Task 1: RED Audit Export Test

**Files:**
- Modify: `tools/selfhost-kit.test.mjs`

- [x] **Step 1: Write the failing test**

Add a temporary HTTP server that expects the generated `PLATFORM_ADMIN_API_KEY` in the `Authorization` header and responds to `/v1/admin/audit-events?limit=5` with:

```js
{
  items: [{ id: "audit_test_1", action: "security.reviewed" }],
  pagination: { limit: 5, offset: 0, total: 1, has_more: false }
}
```

Then run:

```js
const exportPath = path.join(tmpRoot, "exports/audit/platform/test-audit.json");
const auditExport = run(tmpRoot, [
  "audit-export",
  "--audit-base-url",
  auditBaseUrl,
  "--limit",
  "5",
  "--output",
  exportPath
]);
```

Assert:

```js
assert.equal(auditExport.status, 0, auditExport.stderr || auditExport.stdout);
assert.match(auditExport.stdout, /selfhost:audit-export/);
assert.match(auditExport.stdout, /items=1/);
assert.ok(!auditExport.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));
const exported = JSON.parse(fs.readFileSync(exportPath, "utf8"));
assert.equal(exported.profile, "platform");
assert.equal(exported.body.items[0].action, "security.reviewed");
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm run test:selfhost-kit
```

Expected: FAIL because `audit-export` is not a recognized selfhost-kit command.

### Task 2: Implement Audit Export Command

**Files:**
- Modify: `tools/selfhost-kit.mjs`
- Modify: `package.json`

- [x] **Step 1: Add arguments**

Extend `parseArgs` with:

- `--limit <n>` default `100`
- `--output <path>` optional
- `--audit-base-url <url>` optional, for tests and custom deployments

- [x] **Step 2: Add command implementation**

Implement `auditExportProfile(profileName, args)`:

- read selected profile `.env`
- require `PLATFORM_ADMIN_API_KEY`
- resolve base URL:
  - `--audit-base-url` when provided
  - `http://127.0.0.1:8080` for `platform` and `all-in-one`
  - `<PUBLIC_SITE_ADDRESS>/platform` for `public-stack`
- call `/v1/admin/audit-events?limit=<limit>` with bearer auth
- write JSON with `{ exported_at, profile, source_url, body }`
- print only output path, item count, profile, and source URL, never the admin key

- [x] **Step 3: Add package script**

Add:

```json
"selfhost:audit-export": "node tools/selfhost-kit.mjs audit-export"
```

- [x] **Step 4: Run focused test**

Run:

```bash
corepack pnpm run test:selfhost-kit
```

Expected: PASS.

### Task 3: Docs and Brand-Site Alignment

**Files:**
- Modify: `README.md`
- Modify: `docs/runbooks/local-dev-setup.md`
- Modify: `docs/runbooks/local-dev-setup.zh-CN.md`
- Modify: `docs/product/deployability-ecosystem-prd.md`
- Modify: `docs/product/deployability-ecosystem-prd.zh-CN.md`
- Modify: `docs/product/deployability-pipelines-prd.md`
- Modify: `docs/product/deployability-pipelines-prd.zh-CN.md`
- Modify: `repos/brand-site/src/app/pages/Docs/DeployabilityProfiles.tsx`
- Modify: `repos/brand-site/src/app/pages/en/Docs/DeployabilityProfiles.tsx`
- Modify: `repos/brand-site/scripts/deployability-content-smoke.mjs`

- [x] **Step 1: Document command**

Mention `selfhost:audit-export` as the M4 audit artifact command after status/smoke/security-review.

- [x] **Step 2: Verify brand-site**

Run in `repos/brand-site`:

```bash
npm run smoke:deployability-content
npm run build
```

Expected: PASS. If build regenerates public assets, keep only intentional source changes.

### Task 4: Fourth-Repo Certification

**Files:**
- Create: `changes/CHG-2026-044.yaml`
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`

- [x] **Step 1: Commit brand-site submodule change**

Commit and push the brand-site deployability docs change.

- [x] **Step 2: Add bundle**

Create `CHG-2026-044.yaml` with unchanged protocol/client/platform SHAs and the new brand-site SHA.

- [x] **Step 3: Run required gates**

Run:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

Expected: all pass before setting `contracts_check` and `integration_check` to `passed`.
