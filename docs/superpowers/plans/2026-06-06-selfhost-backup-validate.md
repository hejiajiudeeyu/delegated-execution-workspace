# Selfhost Backup Validate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-destructive backup artifact validation command so operators can check restore prerequisites before running the manual restore plan.

**Architecture:** The fourth repository keeps this as orchestration-only validation. `tools/selfhost-kit.mjs` will inspect the selected backup directory shape and file sizes without reading or printing `.env` secret values, without invoking Docker, and without modifying data.

**Tech Stack:** Node.js ESM CLI, existing `selfhost-kit` parser/tests, fourth-repo package scripts, Markdown PRD/runbook docs, brand-site deployability docs.

---

### Task 1: RED Backup Validate Test

**Files:**
- Modify: `tools/selfhost-kit.test.mjs`

- [x] **Step 1: Write the failing test**

After the existing `restore-plan` assertions, create a synthetic backup directory:

```js
const backupDir = path.join(tmpRoot, "backups/selfhost/platform/sample");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(path.join(backupDir, ".env"), fs.readFileSync(envPath, "utf8"), "utf8");
fs.writeFileSync(path.join(backupDir, "postgres.sql"), "-- sample dump\n", "utf8");
fs.writeFileSync(path.join(backupDir, "compose.config.txt"), "services: {}\n", "utf8");

const backupValidate = run(tmpRoot, ["backup-validate", "--backup-dir", "backups/selfhost/platform/sample"]);
assert.equal(backupValidate.status, 0, backupValidate.stderr || backupValidate.stdout);
assert.match(backupValidate.stdout, /selfhost:backup-validate/);
assert.match(backupValidate.stdout, /backup_dir=backups\/selfhost\/platform\/sample/);
assert.match(backupValidate.stdout, /\[ok\] \.env present/);
assert.match(backupValidate.stdout, /\[ok\] postgres\.sql present/);
assert.match(backupValidate.stdout, /\[ok\] compose\.config\.txt present/);
assert.match(backupValidate.stdout, /ready for restore-plan review/);
assert.ok(!backupValidate.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm run test:selfhost-kit
```

Expected: FAIL because `backup-validate` is not a recognized selfhost-kit command.

### Task 2: Implement Backup Validate Command

**Files:**
- Modify: `tools/selfhost-kit.mjs`
- Modify: `package.json`

- [x] **Step 1: Add usage entry**

Add:

```text
  backup-validate
            Validate a backup directory without printing secrets
```

- [x] **Step 2: Add command implementation**

Implement `validateBackup(profileName, backupDir)`:

```js
function validateBackup(profileName, backupDir) {
  if (!backupDir) {
    throw new Error("--backup-dir is required for backup-validate");
  }
  const normalizedBackupDir = backupDir.replace(/\/+$/, "");
  const absoluteBackupDir = path.resolve(ROOT, normalizedBackupDir);
  console.log(`[selfhost:backup-validate] profile=${profileName}`);
  console.log("This command is non-destructive; it checks file presence and size only.");
  console.log(`backup_dir=${normalizedBackupDir}`);

  let ok = true;
  const checks = [
    [".env", true],
    ["postgres.sql", true],
    ["compose.config.txt", false]
  ];
  for (const [file, required] of checks) {
    const filePath = path.join(absoluteBackupDir, file);
    if (!fs.existsSync(filePath)) {
      const level = required ? "fail" : "warn";
      console.log(`[${level}] ${file} missing`);
      ok &&= !required;
      continue;
    }
    const stats = fs.statSync(filePath);
    const fileOk = stats.isFile() && stats.size > 0;
    console.log(`[${fileOk ? "ok" : "fail"}] ${file} present (${stats.size} bytes)`);
    ok &&= fileOk || !required;
  }
  console.log(`[${ok ? "ok" : "fail"}] ${ok ? "ready for restore-plan review" : "backup artifact is incomplete"}`);
  return ok;
}
```

Wire it in `main()` with `process.exit(validateBackup(args.profile, args.backupDir) ? 0 : 1);`.

- [x] **Step 3: Add package script**

Add:

```json
"selfhost:backup-validate": "node tools/selfhost-kit.mjs backup-validate"
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

Mention `selfhost:backup-validate` between `backup-plan` and `restore-plan`.

- [x] **Step 2: Verify brand-site**

Run in `repos/brand-site`:

```bash
npm run smoke:deployability-content
npm run build
```

Expected: PASS. If build regenerates public assets, keep only intentional source changes.

### Task 4: Fourth-Repo Certification

**Files:**
- Create: `changes/CHG-2026-046.yaml`
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`

- [x] **Step 1: Commit brand-site submodule change**

Commit and push the brand-site deployability docs change.

- [x] **Step 2: Add bundle**

Create `CHG-2026-046.yaml` with unchanged protocol/client/platform SHAs and the new brand-site SHA.

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
