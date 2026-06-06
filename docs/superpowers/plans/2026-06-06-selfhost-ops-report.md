# Selfhost Ops Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-secret self-host operations handoff report so an operator can understand profile URLs, safety posture, and next commands from one local Markdown artifact.

**Architecture:** The fourth repository will generate an orchestration report only. `tools/selfhost-kit.mjs` will read profile metadata and secret hygiene findings, write a Markdown report to `exports/selfhost/<profile>/...md` or `--output`, and avoid printing or writing raw secret values.

**Tech Stack:** Node.js ESM CLI, existing selfhost-kit parser/tests, package scripts, Markdown PRD/runbook docs, brand-site deployability docs.

---

### Task 1: RED Ops Report Test

**Files:**
- Modify: `tools/selfhost-kit.test.mjs`

- [x] **Step 1: Write the failing test**

After the `backup-validate` assertions, add:

```js
const opsReportPath = path.join(tmpRoot, "exports/selfhost/platform/ops-report.md");
const opsReport = run(tmpRoot, ["ops-report", "--output", opsReportPath]);
assert.equal(opsReport.status, 0, opsReport.stderr || opsReport.stdout);
assert.match(opsReport.stdout, /selfhost:ops-report/);
assert.match(opsReport.stdout, /exports\/selfhost\/platform\/ops-report\.md/);
assert.ok(fs.existsSync(opsReportPath), "ops report should be written");
const opsReportText = fs.readFileSync(opsReportPath, "utf8");
assert.match(opsReportText, /# Selfhost Ops Report/);
assert.match(opsReportText, /profile: platform/);
assert.match(opsReportText, /Platform API/);
assert.match(opsReportText, /selfhost:security-review/);
assert.match(opsReportText, /selfhost:backup-validate/);
assert.match(opsReportText, /selfhost:restore-plan/);
assert.match(opsReportText, /TOKEN_SECRET: set/);
assert.ok(!opsReport.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));
assert.ok(!opsReportText.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm run test:selfhost-kit
```

Expected: FAIL because `ops-report` is not a recognized selfhost-kit command.

### Task 2: Implement Ops Report Command

**Files:**
- Modify: `tools/selfhost-kit.mjs`
- Modify: `package.json`

- [x] **Step 1: Add usage entry**

Add:

```text
  ops-report
            Write a non-secret Markdown operations handoff report
```

- [x] **Step 2: Add report helpers**

Add `defaultOpsReportPath(profileName)`, `backupStampPlaceholder(profileName)`, and `writeOpsReport(profileName, { output })`.

The report must include:

- `# Selfhost Ops Report`
- generated timestamp
- selected profile
- deploy directory
- `.env` path only, not values
- profile URLs from `profileUrls(profileName)`
- secret hygiene findings as `KEY: set` or `KEY: <message>`
- operator commands for `selfhost:preflight`, `selfhost:security-review`, `selfhost:audit-export`, `selfhost:backup-plan`, `selfhost:backup-validate`, `selfhost:restore-plan`, `selfhost:smoke`, and `selfhost:status`

- [x] **Step 3: Wire command**

In `main()`, add:

```js
if (args.command === "ops-report") {
  writeOpsReport(args.profile, { output: args.output });
  return;
}
```

- [x] **Step 4: Add package script**

Add:

```json
"selfhost:ops-report": "node tools/selfhost-kit.mjs ops-report"
```

- [x] **Step 5: Run focused test**

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

Mention `selfhost:ops-report` near `selfhost:plan`, `selfhost:urls`, and public-stack safety commands.

- [x] **Step 2: Verify brand-site**

Run in `repos/brand-site`:

```bash
npm run smoke:deployability-content
npm run build
```

Expected: PASS. Restore generated public image assets if build rewrites them.

### Task 4: Fourth-Repo Certification

**Files:**
- Create: `changes/CHG-2026-047.yaml`
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`

- [x] **Step 1: Commit brand-site submodule change**

Commit and push the brand-site deployability docs change.

- [x] **Step 2: Add bundle**

Create `CHG-2026-047.yaml` with unchanged protocol/client/platform SHAs and the new brand-site SHA.

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
