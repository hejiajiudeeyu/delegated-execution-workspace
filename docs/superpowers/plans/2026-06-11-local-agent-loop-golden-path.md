# Local Agent Loop Golden Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the first P0 local-first agent loop: a fresh user can run the client on their own machine, add/use the built-in local Hotline, inspect the result, and debug locally before platform/selfhost.

**Architecture:** Keep behavior in `repos/client`; the fourth repo remains orchestration only. Route first-run users to local Hotline setup and debugging, and verify the real CLI path with an isolated `DELEXEC_HOME`.

**Tech Stack:** React, Vitest, happy-dom, existing ops-console components.

---

### Task 1: Local-First NextUp And Empty Catalog

**Files:**
- Modify: `repos/client/apps/ops-console/src/components/dashboard/NextUpCard.tsx`
- Modify: `repos/client/apps/ops-console/src/pages/caller/CatalogPage.tsx`
- Test: `repos/client/tests/unit/ops-console.nextup-card.test.tsx`
- Test: `repos/client/tests/unit/ops-console.catalog.test.tsx`

- [x] Update tests so no-Hotline states expect local example / Hotline management CTAs instead of platform-first CTAs.
- [x] Run the targeted tests and verify they fail.
- [x] Update `NextUpCard` and `CatalogPage` copy/routes.
- [x] Run the targeted tests and verify they pass.

### Task 2: Local Debugging Runtime Guidance

**Files:**
- Modify: `repos/client/apps/ops-console/src/pages/general/RuntimePage.tsx`
- Test: `repos/client/tests/unit/ops-console.runtime-deployability.test.tsx`

- [x] Update tests to expect local debug commands before selfhost commands.
- [x] Run the targeted test and verify it fails.
- [x] Update the Runtime page guidance panel.
- [x] Run the targeted test and verify it passes.

### Task 3: Deep Links And UI Acceptance Fixes

**Files:**
- Modify: `repos/client/apps/ops-console/src/pages/caller/CallsPage.tsx`
- Modify: `repos/client/apps/ops-console/src/pages/general/RuntimePage.tsx`
- Modify: `repos/client/apps/ops-console/src/pages/responder/ResponderHotlinesPage.tsx`
- Test: `repos/client/tests/unit/ops-console.calls.test.tsx`
- Test: `repos/client/tests/unit/ops-console.runtime-deployability.test.tsx`
- Test: `repos/client/tests/unit/ops-console.responder-hotlines.test.tsx`

- [x] Open `CallsPage` detail from `/caller/calls?selected=<request_id>`.
- [x] Initialize Runtime from `/general/runtime?service=responder&filter=<request_id>`.
- [x] Highlight matching log filter text in Runtime log lines.
- [x] Make `/responder/hotlines?action=add-example` create the example Hotline.
- [x] Guard the example auto-add flow against stale initial list loads overwriting the post-add list.
- [x] Cover the above with focused unit tests.

### Task 4: CLI Golden Path Fixes

**Files:**
- Modify: `repos/client/apps/ops/src/cli.js`
- Modify: `repos/client/apps/ops/src/supervisor.js`
- Test: `repos/client/tests/integration/ops-cli.integration.test.js`

- [x] Sync a running supervisor with disk state during `bootstrap` before starting the example call.
- [x] Restart already-running local services after supervisor `/setup` reloads disk config.
- [x] Make `delexec-ops run-example` wait for terminal request status and return `result_package`.
- [x] Cover the running-supervisor + `run-example` final-status path with an integration test.

### Task 5: Verification

**Files:**
- No required source edits.

- [x] Run real clean local CLI proof with `DELEXEC_HOME=$HOME/.delexec-client-localtest-p0` and platform env vars unset:
  - `npm run ops -- bootstrap --email localtest@example.com --text "Summarize this request."` -> `ok: true`, `status: "SUCCEEDED"`, `mode: "local_only"`.
  - `npm run ops -- status` -> Caller and Responder registered/enabled, one local-only Hotline, local services healthy.
  - `npm run ops -- run-example --text "Summarize this second request."` -> `ok: true`, `status: "SUCCEEDED"`, `result_package.status: "ok"`.
  - `npm run ops -- debug-snapshot` -> `ok: true`, two succeeded requests in the local snapshot.
- [x] Review subagent audit results and fix the two P2 findings.
- [x] Run focused unit and integration tests.
  - `corepack pnpm --dir repos/client run test:unit -- ops-console.nextup-card.test.tsx ops-console.catalog.test.tsx ops-console.runtime-deployability.test.tsx ops-console.calls.test.tsx ops-console.auth-local-first.test.tsx ops-console.dashboard-local-first.test.tsx ops-console.responder-hotlines.test.tsx` -> 18 files / 131 tests passed.
  - `corepack pnpm --dir repos/client exec vitest run --config tests/config/vitest.integration.config.mjs tests/integration/ops-cli.integration.test.js -t "runs the local example through the cli and reports the final request status"` -> 1 focused integration test passed.
- [x] Run ops-console typecheck and runtime surface checker.
  - `corepack pnpm --dir repos/client exec tsc -p apps/ops-console/tsconfig.app.json --noEmit` -> passed.
  - `corepack pnpm --dir repos/client run check:ops-console-runtime-surface` -> passed.
- [x] Run `corepack pnpm run test:fast` -> passed, 17 files failed=0.
- [x] Run the fourth-repo AGENTS validation chain, recording known origin-reachability blockers separately from local functional status.
  - `corepack pnpm run check:boundaries` -> passed.
  - `corepack pnpm run test:contracts` -> passed.
  - `corepack pnpm run test:integration` -> passed.
  - `corepack pnpm run check:submodules` -> failed on pre-existing origin reachability for `repos/brand-site` SHA `c39953c4fdb523ab4de511f9e60c408f6c1f8918`.
  - `corepack pnpm run check:bundles` -> failed on pre-existing origin reachability for `CHG-2026-133.yaml client_sha 135546f7510167d99a31475515708553106c0545`.
  - `SKIP_ORIGIN_REACHABILITY=1 corepack pnpm run check:submodules && SKIP_ORIGIN_REACHABILITY=1 corepack pnpm run check:bundles` -> passed.
