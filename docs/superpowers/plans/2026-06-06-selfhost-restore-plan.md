# Selfhost Restore Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-destructive restore planning command so operators can rehearse recovery from a self-host backup artifact before touching live data.

**Architecture:** The fourth repository keeps this as orchestration guidance only. `tools/selfhost-kit.mjs` will print a restore checklist using the selected profile and a caller-provided `--backup-dir`; it will not copy `.env`, import SQL, start/stop containers, or read/print secret values.

**Tech Stack:** Node.js ESM CLI, existing `selfhost-kit` command parser and tests, fourth-repo package scripts, Markdown PRD/runbook docs, brand-site deployability docs.

---

### Task 1: RED Restore Plan Test

**Files:**
- Modify: `tools/selfhost-kit.test.mjs`

- [x] **Step 1: Write the failing test**

After `backupPlan` assertions, run:

```js
const restorePlan = run(tmpRoot, ["restore-plan", "--backup-dir", "backups/selfhost/platform/sample"]);
assert.equal(restorePlan.status, 0, restorePlan.stderr || restorePlan.stdout);
assert.match(restorePlan.stdout, /selfhost:restore-plan/);
assert.match(restorePlan.stdout, /backups\/selfhost\/platform\/sample/);
assert.match(restorePlan.stdout, /postgres\.sql/);
assert.match(restorePlan.stdout, /selfhost:down/);
assert.match(restorePlan.stdout, /selfhost:up/);
assert.match(restorePlan.stdout, /selfhost:smoke/);
assert.ok(!restorePlan.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm run test:selfhost-kit
```

Expected: FAIL because `restore-plan` is not a recognized selfhost-kit command.

### Task 2: Implement Restore Plan Command

**Files:**
- Modify: `tools/selfhost-kit.mjs`
- Modify: `package.json`

- [x] **Step 1: Add argument parsing**

Extend `parseArgs` with `--backup-dir <path>`.

- [x] **Step 2: Add command implementation**

Implement `printRestorePlan(profileName, backupDir)`:

- require `backupDir`
- print `[selfhost:restore-plan] profile=<profile>`
- print that the command is plan-only and does not modify data
- print restore order:
  - run `selfhost:down`
  - copy `<backupDir>/.env` to the selected profile `.env` only after private review
  - import `<backupDir>/postgres.sql` through `docker compose --env-file .env exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"`
  - run `selfhost:up`
  - run `selfhost:smoke`
  - keep original data volumes until validation succeeds
- never print `.env` values

- [x] **Step 3: Add package script**

Add:

```json
"selfhost:restore-plan": "node tools/selfhost-kit.mjs restore-plan"
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

Mention `selfhost:restore-plan` next to `backup-plan`, `rotate-plan`, and `audit-export`.

- [x] **Step 2: Verify brand-site**

Run in `repos/brand-site`:

```bash
npm run smoke:deployability-content
npm run build
```

Expected: PASS. If build regenerates public assets, keep only intentional source changes.

### Task 4: Fourth-Repo Certification

**Files:**
- Create: `changes/CHG-2026-045.yaml`
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`

- [x] **Step 1: Commit brand-site submodule change**

Commit and push the brand-site deployability docs change.

- [x] **Step 2: Add bundle**

Create `CHG-2026-045.yaml` with unchanged protocol/client/platform SHAs and the new brand-site SHA.

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
