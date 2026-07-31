# Current Console v0.2.0 Parity and Constraints

## Scope inspected

* `repos/platform/apps/platform-console/src/App.tsx`
* `repos/platform/apps/platform-console/src/state/console.tsx`
* `repos/platform/apps/platform-console/src/lib/api.ts`
* `repos/platform/apps/platform-console/src/components/layout/AppShell.tsx`
* `repos/platform/apps/platform-console/src/components/shared/index.tsx`
* all files under `repos/platform/apps/platform-console/src/pages/`
* platform Console unit, integration, and public-stack smoke tests
* public `https://callanything.xyz/console/` visible locked/unreachable state on 2026-07-15

## Runtime and deployment boundary

* The Console is a React 18 + Vite SPA owned by `repos/platform` and built into `apps/platform-console/dist`.
* `platform-console-gateway` serves the static bundle and owns session setup/login/recovery plus encrypted admin-credential storage.
* All protected Platform API calls go through the gateway `/proxy` surface. The browser does not directly hold the Platform Admin API key.
* Production serves the SPA under `/console/` and gateway APIs under `/gateway/`; the current app uses hash routes to avoid edge rewrite assumptions.
* The public-stack smoke test validates the built entry, fingerprinted asset path/MIME type, session setup, credential save, and a proxied admin read.
* The gateway integration test validates static serving, cache behavior, setup/login/credential proxy, and destructive recovery semantics.

## Current route and capability inventory

| Route | Current job | Data/actions | Rewrite default |
|---|---|---|---|
| `/overview` | Readiness and next step | gateway health, session phase, admin credential verification | Preserve behavior; redesign composition |
| `/session` | Establish/maintain gateway session | setup, login, lost-passphrase recovery, change passphrase, logout | Preserve security contract; redesign workflow |
| `/credentials` | Configure Platform Admin API key | save encrypted key and verify through admin probe | Preserve security contract; likely merge into global readiness/settings experience |
| `/reviews` | Process responder/hotline lifecycle | pending and approved-disabled lists; approve, reject, enable | Preserve; make this a primary workbench |
| `/requests` | Inspect admin request records | paginated request list | Preserve data access; redesign as operational activity/detail view |
| `/responders` | Inspect responder directory | paginated responder list with lifecycle/status summaries | Preserve; redesign list/detail/actions based on real API surface |
| `/hotlines` | Inspect hotline directory | paginated hotline list with lifecycle/status summaries | Preserve; redesign list/detail/actions based on real API surface |
| `/marketplace` | Inspect public enabled hotlines | public catalog read | Preserve as verification lens or merge into Hotlines visibility view |
| `/billing` | Operate a tenant balance | lookup balance/ledger, create tenant, manual recharge | Preserve; redesign as tenant workbench with explicit financial confirmation/evidence |
| `/audit` | Inspect management/billing events | paginated audit event list | Preserve; redesign as activity/evidence view |

## Global state and behavior that must not be accidentally lost

* Session phases are explicit: `unreachable`, `setup`, `locked`, `unlocked`.
* A stored admin key is not considered valid until a real admin endpoint probe succeeds.
* The browser stores only the temporary gateway session token in `sessionStorage`.
* Lost-passphrase recovery requires the deployment bootstrap secret and explicit destructive confirmation; it replaces the encrypted store and requires admin-key re-entry.
* `auth`, `gateway_down`, and other HTTP failures are classified separately.
* Loading, API failure, empty success, and populated success are distinct render states.
* Raw JSON is present only as collapsed technical detail.
* Secrets are not echoed after save.

## What can be discarded

* Current route grouping and page boundaries.
* Current left-sidebar labels, ordering, and conventional white/gray shell.
* Current card/list composition and narrow `max-w-6xl` page assumptions.
* Current page component boundaries and generic list renderer.
* Current visual tokens inside `platform-console/src/styles/theme.css` where they drift from the canonical design system.
* Hash routing may be reconsidered only if the edge/gateway fallback contract is deliberately updated and tested; it is not merely a visual concern.

## Test baseline and gaps

### Existing useful coverage

* `platform-console.api-classify.test.js`: response classification and session-phase derivation.
* `platform-console.gateway-url.test.js`: `/console/` to `/gateway/` production URL resolution.
* `platform-console-gateway.integration.test.js`: static bundle, session, credentials, proxy, and recovery behavior.
* `public-stack-smoke.mjs`: deployed static entry/assets plus a minimal gateway/proxy path.

### Rewrite gaps

* There are no meaningful component tests for page state rendering or operator actions.
* There is no browser journey proving setup/unlock -> credential readiness -> review -> billing -> audit.
* The smoke tests identify the bundle through implementation-specific markers such as title/mount element; those assertions will need intentional updates, not deletion.
* No route/capability parity test currently prevents a rewrite from silently dropping a workflow.

## Live-site observation

On 2026-07-15 the public Console loaded the v0.2.0 shell and routed to `#/overview`, but the visible state was `网关不可达`. The layout exposed all navigation groups while protected links redirected to Session. This is only a point-in-time observation, not a diagnosis or a new product requirement.

## Constraint summary

The rewrite is free to replace frontend architecture and information design, but it must preserve the gateway security boundary and classify every current capability before removal. The safest acceptance model is behavior parity plus a new UI, not DOM or screenshot parity with v0.2.0.
