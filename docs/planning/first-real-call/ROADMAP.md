# first-real-call development roadmap

Date: 2026-06-11

Goal: make the first real path possible for an unknown Responder to come online and an unknown Caller to make a paid call.

This roadmap tracks execution against `docs/planning/first-real-call/README.md`. It does not replace the task cards or any owning repository source of truth.

## Current execution slice

Status: brand-site honesty slice locally verified

Scope for this slice:

- T-201 Responder Quick Start correctness and Platform-honesty wording.
- T-202 Caller Quick Start correctness for session setup and caller registration payloads.
- T-204 Marketplace fallback/demo honesty and empty-catalog behavior.

Why this slice first:

- These tasks are owning-repo brand-site changes and do not require npm publish, GHCR, VPS, DNS, or production secrets.
- They prevent the public first-call docs from sending users down stale CLI/API paths.
- They keep demo Marketplace content clearly labeled until real public hotlines exist.

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
| T-301 billing enforcement | `repos/platform` | pending | Requires protocol/RFC check and a design note before code. |
| T-302 caller balance API | `repos/platform` | blocked | Depends on T-301. |
| T-303 billing console route | `repos/platform` | blocked | Depends on T-301. |
| T-304 paid-call e2e | fourth repo | blocked | Depends on T-301 and T-302. |
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
