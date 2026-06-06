# Selfhost Ports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-destructive `selfhost:ports` command so operators can inspect host port usage for each self-host profile before starting services.

**Architecture:** The fourth repository will keep port information as orchestration metadata in `tools/selfhost-kit.mjs`, aligned with the existing profile list. The command prints declared host ports and service roles only; it does not bind sockets, inspect the local network, or call Docker.

**Tech Stack:** Node.js ESM CLI, existing selfhost-kit parser/tests, package scripts, Markdown PRD/runbook docs, brand-site deployability docs.

---

### Task 1: RED Ports Test

**Files:**
- Modify: `tools/selfhost-kit.test.mjs`

- [x] **Step 1: Write the failing test**

After the existing `ops-report` assertions, add:

```js
const ports = run(tmpRoot, ["ports"]);
assert.equal(ports.status, 0, ports.stderr || ports.stdout);
assert.match(ports.stdout, /selfhost:ports/);
assert.match(ports.stdout, /profile=platform/);
assert.match(ports.stdout, /8080/);
assert.match(ports.stdout, /platform-api/);
assert.match(ports.stdout, /5432/);
assert.match(ports.stdout, /postgres/);
assert.ok(!ports.stdout.includes(env.get("PLATFORM_ADMIN_API_KEY") || ""));

const publicPorts = run(tmpRoot, ["ports", "--profile", "public-stack"]);
assert.equal(publicPorts.status, 0, publicPorts.stderr || publicPorts.stdout);
assert.match(publicPorts.stdout, /profile=public-stack/);
assert.match(publicPorts.stdout, /80/);
assert.match(publicPorts.stdout, /443/);
assert.match(publicPorts.stdout, /edge/);
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm run test:selfhost-kit
```

Expected: FAIL because `ports` is not a recognized selfhost-kit command.

### Task 2: Implement Ports Command

**Files:**
- Modify: `tools/selfhost-kit.mjs`
- Modify: `package.json`

- [x] **Step 1: Add profile port metadata**

Add a `ports` array to each `PROFILES` entry:

- `platform`: `5432 postgres`, `8080 platform-api`
- `public-stack`: `80 edge`, `443 edge`, `5432 postgres`
- `all-in-one`: `5432 postgres`, `8080 platform-api`, `8081 caller-controller`, `8082 responder-controller`, `8090 relay`

- [x] **Step 2: Add usage entry**

Add:

```text
  ports     Show declared host ports for the selected profile
```

- [x] **Step 3: Add command implementation**

Implement `printPorts(profileName)`:

```js
function printPorts(profileName) {
  const { profile } = profilePaths(profileName);
  console.log(`[selfhost:ports] profile=${profileName}`);
  console.log("Declared host ports; this command does not check whether ports are currently free.");
  for (const [port, service, role] of profile.ports || []) {
    console.log(`- ${port}: ${service} - ${role}`);
  }
}
```

Wire it in `main()`:

```js
if (args.command === "ports") {
  printPorts(args.profile);
  return;
}
```

- [x] **Step 4: Add package script**

Add:

```json
"selfhost:ports": "node tools/selfhost-kit.mjs ports"
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

Mention `selfhost:ports` near `selfhost:urls`, `selfhost:ops-report`, and public-stack safety commands.

- [x] **Step 2: Verify brand-site**

Run in `repos/brand-site`:

```bash
npm run smoke:deployability-content
npm run build
```

Expected: PASS. Restore generated public image assets if build rewrites them.

### Task 4: Fourth-Repo Certification

**Files:**
- Create: `changes/CHG-2026-048.yaml`
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`

- [x] **Step 1: Commit brand-site submodule change**

Commit and push the brand-site deployability docs change.

- [x] **Step 2: Add bundle**

Create `CHG-2026-048.yaml` with unchanged protocol/client/platform SHAs and the new brand-site SHA.

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
