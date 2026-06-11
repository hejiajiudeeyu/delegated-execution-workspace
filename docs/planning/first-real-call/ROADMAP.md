# first-real-call development roadmap

Date: 2026-06-11

Goal: make the first real path possible for an unknown Responder to come online and an unknown Caller to make a paid call.

This roadmap tracks execution against `docs/planning/first-real-call/README.md`. It does not replace the task cards or any owning repository source of truth.

## Current execution slice

Status: Wave 3 T-303 billing console route locally verified

Scope for this slice:

- T-303 platform-owned billing console route and legacy console access.
- Keep Billing explicitly admin-only/operator-facing.
- Reuse existing admin billing APIs through the platform console gateway proxy.
- Provide tenant selection/history, tenant creation, manual recharge, balance, and ledger inspection without adding a new platform API.

Why this slice first:

- T-303 removes the operator visibility gap before paid-call e2e: an operator can create/load a tenant, inspect balance, record a manual recharge, and browse ledger rows.
- The React console already had `/billing`; this slice keeps the legacy/static console path from becoming a stale blind spot.
- T-304 can now exercise paid-call billing against an operator-visible balance/ledger surface.

## Progress tracker

| Task | Owner repo | Status | Notes |
| --- | --- | --- | --- |
| T-101 publish `@delexec/ops` prep | `repos/client` | local verified; manual publish pending | Package now bundles MCP adapter and declares its external runtime deps. Clean-room tarball smoke reached `SUCCEEDED`, `mcp spec` resolved a packaged adapter entry, and non-source `ui start` returned a friendly source-checkout message. Actual npm publish is manual. |
| T-102 ops-console proxy port | `repos/client` | local verified | Vite proxy follows `OPS_PORT_SUPERVISOR`, defaulting to 8079; integration test verifies `/status` through a non-default supervisor port. |
| T-103 bootstrap env pollution | `repos/client` | local verified | Bootstrap only enters platform mode with explicit `--platform`; leftover `PLATFORM_API_BASE_URL` warns and stays local-only. |
| T-104 GHCR images public | `repos/platform` | local verified; manual GHCR/tag steps pending | Images workflow already covers public-stack images: `rsp-platform`, `rsp-relay`, `rsp-gateway`. Platform docs now require a concrete release tag for first public pulls and state the GHCR public-visibility requirement. |
| T-201 responder quick-start honesty | `repos/brand-site` | local verified | Responder docs now obtain `OPS_SESSION` before HTTP calls, use `--cmd` / `--url`, and mark Marketplace review as an optional advanced step requiring a hosted or self-hosted Platform. |
| T-202 caller quick-start honesty | `repos/brand-site` | local verified | Caller docs now create a passphrase-backed session, read `.token`, and use `contact_email` for HTTP caller registration. |
| T-203 golden path unification | `repos/brand-site` + `repos/client` | blocked | Depends on T-101 npm package actually being published. |
| T-204 marketplace mock honesty | `repos/brand-site` | local verified | Fallback Marketplace entries are DEMO previews, no longer claim healthy/reviewed status, point users to Caller Quick Start, and successful empty API catalogs render an honest empty state. |
| T-301 billing enforcement | `repos/platform` + `repos/protocol` | local verified | `T-301-design-notes.md` maps the call path and billing timing. Protocol commit `889dd94bb4a0447b68bd84f43f57b0adcaf67273` adds `pricing_hint`, token `billing`, billing-aware result `usage` validators, billing constants, template pricing hints, and package-smoke coverage. Platform commit `373c183778f5cd0eb2bae98c820bef6f1e97c6d3` adds disabled-by-default enforcement, prepaid hold/refund/settlement wiring, integration coverage, and local package/image checks that consume sibling protocol contracts while unpublished. |
| T-302 caller balance API | `repos/platform` | local verified | Platform commit `ef444c420bbfeb1aee10b976ed40252f9c0a4b6a` adds caller-authenticated `/v1/tenants/me/balance` and `/v1/tenants/me/ledger`, scopes reads to `auth.user_id`, maps missing tenants to `ERR_BILLING_NOT_ENABLED`, and covers self-read, isolation, and missing-tenant cases. |
| T-303 billing console route | `repos/platform` | local verified | Platform commit `25cafc477cd71aa0c67e12b13303c38ae35c19e4` registers Billing in the legacy console section list, renders admin-only balance/ledger/tenant/recharge mount points, wires them through the gateway proxy to existing admin billing APIs, and keeps the React `/billing` route untouched. |
| T-304 paid-call e2e | fourth repo | next | Now unblocked by T-301 enforcement, T-302 caller reads, and T-303 operator-visible billing console. |
| T-401 public-stack deploy | `repos/platform` + manual | blocked | Depends on public images and paid-call regression. |
| T-402 marketplace live API | `repos/brand-site` | blocked | Depends on public platform and T-204. |
| T-403 OPC #0 dry run | manual + findings doc | blocked | Final production rehearsal after T-401/T-402. |

## Verification boundary

Latest local verification for the current slice:

- `repos/client`: `npm test` passed; `npm run test:packages` passed.
- `repos/client` tarball smoke: clean-room install, `bootstrap` reached `SUCCEEDED`, `status` reported running, `mcp spec` resolved a packaged adapter entry, and non-source `ui start` returned the friendly source-checkout error.
- Fourth repo local-only validation: `SKIP_ORIGIN_REACHABILITY=1 corepack pnpm run check:submodules`, `check:boundaries`, `check:bundles`, `test:contracts`, and `test:integration` passed.
- `repos/platform` T-104 docs prep: `npm test`, `npm run test:service:packages`, `npm run test:deploy:config`, and `npm run test:public-stack-smoke` passed.
- `repos/brand-site` T-201/T-202/T-204 docs prep: `npm run smoke:first-real-call-content`, targeted `npx eslint` on touched files, `npm run build`, and prerendered HTML grep for DEMO/correct command markers passed. Full `npm run lint` remains blocked by pre-existing shared UI lint errors in `carousel.tsx` and `use-mobile.ts`.
- `repos/protocol` T-301 protocol unblock: RED `npm run test:unit -- tests/unit/billing-contracts.test.js` failed on missing billing exports as expected; after implementation, `npm test` passed, including unit tests, contracts package integration, and `check-contracts-package` with packaged `pricing_hint` validation. Extra `npx vitest run --config tests/config/vitest.unit.config.mjs tests/unit/error-registry-coverage.test.js` passed after making the old monorepo coverage harness tolerate the split protocol repo shape.
- `repos/platform` T-301 enforcement: RED `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/platform-api-billing.integration.test.js` initially showed enforced mode was ignored; after implementation, the targeted billing integration test passed. Final platform verification passed `npm test`, `npm run test:service:packages`, `npm run test:deploy:config`, and `npm run test:public-stack-smoke`. The package and image checks stage the local sibling `@delexec/contracts` tarball because the protocol billing contract commit is local-only/unpublished; formal release still requires publishing the contracts package first.
- `repos/platform` T-302 caller billing read API: RED `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/platform-api-billing.integration.test.js` failed on missing `/v1/tenants/me/*` routes as expected; after implementation, the targeted billing integration test passed with 9 tests. Final platform verification passed `npm test`, `npm run test:service:packages`, `npm run test:deploy:config`, and `npm run test:public-stack-smoke`.
- `repos/platform` T-303 billing console route: RED `npx vitest run --config tests/config/vitest.unit.config.mjs tests/unit/platform-console-view-models.test.js` failed on missing `LEGACY_CONSOLE_SECTIONS`/Billing legacy mount exports as expected; after implementation, the targeted unit test passed with 3 tests. Extra `node --check apps/platform-console/src/main.js` and `node --check apps/platform-console/src/view-model.js` passed. Final platform verification passed `npm test`, `npm run test:service:packages`, `npm run test:deploy:config`, and `npm run test:public-stack-smoke`; the smoke fetched `/console/`, set up the gateway session, stored admin credentials, and verified gateway proxy access.

Before claiming cross-repo completion, run:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

If owning-repo commits have not been pushed, run the same gate with `SKIP_ORIGIN_REACHABILITY=1` and record that it was local-only validation.

## Manual gates

The following cannot be completed by the agent alone:

- Publish `@delexec/ops` to npm and verify `npm view @delexec/ops version`.
- Change GHCR package visibility and push a release tag for public images.
- Deploy public-stack to a VPS with real DNS and secrets.
- Redeploy brand-site production assets.
- Perform the OPC #0 production dry run using only public documentation.
