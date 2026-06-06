# Selfhost Security Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-destructive self-host security review gate that operators can run before exposing a profile publicly.

**Architecture:** The fourth repository keeps this as orchestration only. `tools/selfhost-kit.mjs` will inspect existing profile files, secret hygiene, compose config, and public route contracts without becoming a runtime truth source or printing secret values.

**Tech Stack:** Node.js ESM CLI, existing `selfhost-kit` helpers, existing `node:assert` test harness, fourth-repo package scripts, Markdown PRD/runbook docs, brand-site deployability docs.

---

### Task 1: RED Security Review Test

**Files:**
- Modify: `tools/selfhost-kit.test.mjs`

- [x] **Step 1: Write the failing test**

Add assertions after the existing public-stack preflight checks:

```js
const unsafeReview = run(tmpRoot, ["security-review", "--profile", "public-stack"]);
assert.equal(unsafeReview.status, 1, unsafeReview.stderr || unsafeReview.stdout);
assert.match(unsafeReview.stdout, /selfhost:security-review/);
assert.match(unsafeReview.stdout, /PUBLIC_SITE_ADDRESS/);
assert.match(unsafeReview.stdout, /backup-plan/);
assert.match(unsafeReview.stdout, /rotate-plan/);
assert.ok(!unsafeReview.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
assert.ok(!unsafeReview.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));
```

Add assertions after `PUBLIC_SITE_ADDRESS` is changed to `https://call.example.com`:

```js
const safeReview = run(tmpRoot, ["security-review", "--profile", "public-stack"]);
assert.equal(safeReview.status, 0, safeReview.stderr || safeReview.stdout);
assert.match(safeReview.stdout, /Public route contract/);
assert.match(safeReview.stdout, /\[ok\] Caddyfile route \/console\/\*/);
assert.match(safeReview.stdout, /ready for public exposure review/);
assert.ok(!safeReview.stdout.includes(publicEnv.get("PLATFORM_ADMIN_API_KEY") || ""));
assert.ok(!safeReview.stdout.includes(publicEnv.get("PLATFORM_CONSOLE_BOOTSTRAP_SECRET") || ""));
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm run test:selfhost-kit
```

Expected: FAIL because `security-review` is not a recognized selfhost-kit command.

### Task 2: Implement Security Review Command

**Files:**
- Modify: `tools/selfhost-kit.mjs`
- Modify: `package.json`

- [x] **Step 1: Add command implementation**

Implement `security-review` in `tools/selfhost-kit.mjs` with:

- heading `[selfhost:security-review] profile=<profile>`
- secret hygiene check using existing `checkSecrets`
- compose config check using existing `composeConfig`
- public route contract check using existing `checkPublicRouteContract`
- printed operational prerequisites:
  - `corepack pnpm run selfhost:backup-plan -- --profile <profile>`
  - `corepack pnpm run selfhost:rotate-plan -- --profile <profile>`
  - `corepack pnpm run selfhost:smoke -- --profile <profile>`
- exit 0 only if secret hygiene, compose config, and route contract pass

- [x] **Step 2: Add package script**

Add:

```json
"selfhost:security-review": "node tools/selfhost-kit.mjs security-review"
```

- [x] **Step 3: Run focused test**

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

- [x] **Step 1: Document command**

Mention `selfhost:security-review` as the public exposure pre-check after `preflight` and before public `up`/smoke.

- [x] **Step 2: Verify brand-site**

Run in `repos/brand-site`:

```bash
npm run smoke:deployability-content
npm run build
```

Expected: PASS. If build regenerates public assets, keep only intentional source changes.

### Task 4: Fourth-Repo Certification

**Files:**
- Create: `changes/CHG-2026-043.yaml`
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`

- [x] **Step 1: Commit brand-site submodule change**

Commit and push the brand-site deployability docs change.

- [x] **Step 2: Add bundle**

Create `CHG-2026-043.yaml` with unchanged protocol/client/platform SHAs and the new brand-site SHA.

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
