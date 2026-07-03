# T-504 Rollout Notes And Follow-Ups

Status: **code + local/source validation complete** (2026-07-04). Production rollout and the public T-503 zero-violation rerun are intentionally outside this coding task (see PRD "Delivery Boundary").

## What Landed

Platform commits (pushed to `origin/main` of `delegated-execution-platform-selfhost`):

- `928af80` feat(gateway): bootstrap-secret recovery for lost console passphrase — `POST /session/recover` guarded by `PLATFORM_CONSOLE_BOOTSTRAP_SECRET` + explicit confirmation; destructive store replacement; sessions cleared; admin key must be re-entered.
- `4ea820c` feat(console): state-driven session panel with browser recovery flow — setup/locked/unlocked/unreachable phases, browser recovery (type `RESET`), admin-credential next-step guidance, network-failure + loading states, gateway health card, review lifecycle + billing `tenant_id = caller user_id` explainability, review queue nav prioritized.

Bundles: `CHG-2026-171` (T-504), `CHG-2026-170` advanced to the same platform SHA. Both passed/passed on 2026-07-04.

## Plan Correction Recorded

The T-504 PRD anchored the UI redesign on the React app (`App.tsx`, `AppShell.tsx`, `AuthPages.tsx`). That app is **not served**: the gateway serves `apps/platform-console/index.html -> src/main.js` (vanilla ES modules), and its static route only exposes `/`, `/index.html`, `/src/*`. The redesign was therefore executed on the served vanilla console, which already carried the sidebar IA, human-readable panels, and console-mode tokens from gateway v0.1.4/v0.1.5 work, plus unit tests.

Follow-up decision needed (not urgent): retire or clearly quarantine the unserved React prototype under `apps/platform-console/src/*.tsx` so future tasks do not target the wrong surface again. The `.trellis/spec/platform-console/frontend/index.md` "Current Examples" section still points at the React files.

## Production Rollout Checklist (follow-up release activity)

1. Tag and publish a new `platform-console-gateway` image (current prod: v0.1.5) including `/session/recover` and the new console UI; add release notes under `docs/archive/releases/`.
2. Roll Aliyun `public-stack` to the new gateway image (platform-api/relay unchanged).
3. Confirm `PLATFORM_CONSOLE_BOOTSTRAP_SECRET` is set in the production gateway env and recorded in the deployment handoff.
4. Verify from a clean browser: `/console/` renders the locked session panel; "Lost passphrase?" recovery works end to end; admin key re-entry flow completes; Review Queue and Billing panels function.
5. Record the console passphrase in the deployment handoff so recovery remains an exception path.

## T-503 Zero-Violation Rerun Preconditions

- New gateway image deployed (above).
- `@delexec/ops@0.1.6` published to npm (client-owned blocker: CI integration 500 / unit localStorage flakes; GH run 28583183537).
- Working browser automation or a human operator for the `/console/`-only rule (previous run's browser MCP failed on `about:blank`).

## Environment Notes (dev machine)

- `corepack` is absent from PATH (Node 26 no longer bundles it). Fourth-repo `test:integration` was run with a shim that maps `corepack pnpm ...` to `/opt/homebrew/bin/pnpm` (10.11.0 — exactly the pinned `packageManager`). Installing corepack globally (`npm i -g corepack`) makes the stock command work.
- `better-sqlite3` in the superproject pnpm store was built against Node 22 (ABI 127) and fails to dlopen under Node 26 (ABI 147); `pnpm install --frozen-lockfile` keeps restoring the stale binary from the store side-effects cache. Fixed by `node-gyp rebuild` inside `node_modules/.pnpm/better-sqlite3@12.8.0/node_modules/better-sqlite3` (hardlink updates the store copy too). If the store is pruned, this may need repeating.
