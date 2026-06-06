# Ops Report Ports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add declared host ports to `selfhost:ops-report` so one Markdown handoff artifact includes URLs, ports, secret status, and operator commands.

**Architecture:** Reuse the existing `PROFILES[].ports` metadata added for `selfhost:ports`. `writeOpsReport()` will render a `## Ports` section without probing the local network, binding sockets, calling Docker, or printing secret values.

**Tech Stack:** Node.js ESM CLI, existing selfhost-kit tests, Markdown PRD/runbook docs, brand-site deployability docs.

---

### Task 1: RED Ops Report Ports Test

**Files:**
- Modify: `tools/selfhost-kit.test.mjs`

- [x] **Step 1: Write the failing test**

In the existing `opsReportText` assertions, add:

```js
assert.match(opsReportText, /## Ports/);
assert.match(opsReportText, /8080: platform-api/);
assert.match(opsReportText, /5432: postgres/);
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm run test:selfhost-kit
```

Expected: FAIL because `selfhost:ops-report` does not yet include a `## Ports` section.

### Task 2: Implement Ports Section

**Files:**
- Modify: `tools/selfhost-kit.mjs`

- [x] **Step 1: Add report section**

In `writeOpsReport()`, after the `## URLs` section and before `## Secret Hygiene`, add:

```js
"## Ports",
"",
...(profile.ports || []).map(([port, service, role]) => `- ${port}: ${service} - ${role}`),
"",
```

Use `const { profile, dir, envPath } = profilePaths(profileName);` so the report can access `profile.ports`.

- [x] **Step 2: Run focused test**

Run:

```bash
corepack pnpm run test:selfhost-kit
```

Expected: PASS.

### Task 3: Docs and Brand-Site Alignment

**Files:**
- Modify: `docs/runbooks/local-dev-setup.md`
- Modify: `docs/runbooks/local-dev-setup.zh-CN.md`
- Modify: `docs/product/deployability-ecosystem-prd.md`
- Modify: `docs/product/deployability-ecosystem-prd.zh-CN.md`
- Modify: `docs/product/deployability-pipelines-prd.md`
- Modify: `docs/product/deployability-pipelines-prd.zh-CN.md`
- Modify: `repos/brand-site/src/app/pages/Docs/DeployabilityProfiles.tsx`
- Modify: `repos/brand-site/src/app/pages/en/Docs/DeployabilityProfiles.tsx`
- Modify: `repos/brand-site/scripts/deployability-content-smoke.mjs`

- [x] **Step 1: Document report contents**

Update `selfhost:ops-report` descriptions to say the report includes URLs, host ports, secret hygiene status, and next commands.

- [x] **Step 2: Verify brand-site**

Run in `repos/brand-site`:

```bash
npm run smoke:deployability-content
npm run build
```

Expected: PASS. Restore generated public image assets if build rewrites them.

### Task 4: Fourth-Repo Certification

**Files:**
- Create: `changes/CHG-2026-049.yaml`
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`

- [x] **Step 1: Commit brand-site submodule change**

Commit and push the brand-site deployability docs change.

- [x] **Step 2: Add bundle**

Create `CHG-2026-049.yaml` with unchanged protocol/client/platform SHAs and the new brand-site SHA.

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
