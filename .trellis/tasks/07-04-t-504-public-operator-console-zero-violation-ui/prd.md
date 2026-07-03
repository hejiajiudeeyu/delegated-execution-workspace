# T-504 Public Operator Console Zero-Violation Flow and UI Redesign

## Goal

Make the public operator console usable enough that a platform operator can open `https://callanything.xyz/console/`, unlock or initialize the gateway session, manage review and billing workflows through the browser UI, and rerun the T-503 production rehearsal with zero operator rule violations. The UI may be redesigned against the existing console-mode design standards because the current platform console is readable only as a thin engineering panel, not as a reliable public operations surface.

## What I Already Know

* T-503 produced functional success: a new Hotline, operator approve/enable/billing actions, and a paid call with `BILLING_SETTLED` all worked.
* T-503 did not strictly pass because operator prep required SSH/reset of the gateway encrypted store, operator steps used gateway HTTP API rather than browser UI, and `@delexec/ops@0.1.6` was not published.
* T-501 already proved `/console/` and `/gateway/healthz` route to `platform-console-gateway`, but browser unlock and Reviews/Billing data panels remained a manual/passphrase-dependent gap.
* The current `platform-console` React app has real pages: setup/unlock, overview, responders, hotlines, requests, audit, reviews, billing, and relay.
* The current UI has weak readability/usability/explainability: high-noise branded backdrops, thin summary hierarchy, raw IDs/JSON surfaced too early, fragmented review/billing flows, and insufficient next-step guidance.
* Existing design standards exist in the brand-site design system and console-mode content spec:
  * `repos/brand-site/src/design-system/shells/console-shell.tsx`
  * `repos/brand-site/src/styles/console-mode.css`
  * `repos/brand-site/docs/console-content-spec.md`
* Project guidelines say console screens should be dense, operational, scannable, and should render explicit loading/error/empty states.

## Assumptions (Temporary)

* T-504 should focus on the operator/admin console only. Ordinary Caller/Responder self-service portal is a separate product surface and should become T-505/T-506/T-507 after this card.
* Reusing design standards means adopting the console-mode information architecture, density, tokens, and interaction principles, not blindly copying brand-site component source into `repos/platform`.
* The browser UI must cover the same capabilities currently proven through gateway HTTP API: session setup/login, admin credential persistence, review queue approve/reject/enable, billing tenant create/recharge/ledger, and observable health/proxy errors.
* If the design prototype lacks a workflow that real platform functionality needs, the implementation should adjust the prototype-level design rather than hide the workflow.

## Open Questions

* None.

## Requirements (Evolving)

* Redesign `repos/platform/apps/platform-console` as a public operator console with readable, scannable, low-noise console UI.
* Keep T-504 operator-only. Ordinary Caller/Responder public registration/login/use belongs to later Public User Portal tasks, not this implementation.
* Perform a full operator information architecture and workflow redesign, not a conservative visual polish.
* Redesign the shell/navigation around operator jobs:
  * setup/unlock and credential readiness
  * platform health and route diagnostics
  * review queue and lifecycle actions
  * responder/hotline management and Marketplace visibility
  * billing tenant/recharge/ledger evidence
  * request/audit/relay monitoring as secondary operational observability
* Preserve and improve existing operator workflows:
  * gateway session setup/login/logout/change passphrase where available
  * Platform Admin API key setup/status
  * Overview health and platform API reachability
  * Review Queue for pending responders/hotlines with approve/reject actions
  * Responders and Hotlines management with approve/reject/enable/disable as applicable
  * Billing tenant lookup/create, manual recharge, balance, and ledger review
  * Requests/Audit/Relay monitoring with human-first summaries and raw JSON as a secondary detail
* Add explainability where the operator is likely to be blocked:
  * why setup vs unlock appears
  * what credential is needed and where it comes from without printing secrets
  * what pending/approved/enabled means
  * how review decisions affect Marketplace visibility
  * how tenant id relates to Caller `user_id`
* Make T-503 replayable through browser UI without SSH and without direct `/v1/admin/*` curl.
* Add a browser-accessible gateway recovery/reset flow guarded by deployment-held `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`.
  * If the encrypted secret store exists but the operator passphrase is lost, the operator can reset the store from `/console/` without SSH.
  * Recovery creates a new encrypted store with a new passphrase; it cannot preserve old encrypted secrets because the old passphrase is unavailable.
  * After reset, the UI must guide the operator to re-enter `PLATFORM_ADMIN_API_KEY` before admin data/actions work.
  * The gateway must not print, return, or persist plaintext secrets outside the encrypted store.
* Keep business changes in owning submodules; platform UI/gateway work belongs in `repos/platform`; brand-site docs updates belong in `repos/brand-site`; client publish/default-charge fixes belong in `repos/client`.
* Stop this coding task at code plus local/source validation. Production rollout and public T-503 rerun are follow-up manual/release activities, documented as rollout checklist or follow-up notes.

## Acceptance Criteria (Evolving)

* [ ] A platform operator can complete gateway setup or unlock from `/console/` with clear state-specific UI and errors.
* [ ] A platform operator can recover from lost console passphrase through `/console/` using bootstrap-secret authorization, without SSH or direct file/volume mutation.
* [ ] A platform operator can store or verify `PLATFORM_ADMIN_API_KEY` through the UI without exposing the secret after save.
* [ ] Review Queue clearly shows pending responder/hotline items and supports approve/reject from browser UI.
* [ ] Responders/Hotlines management clearly distinguishes `review_status`, enabled/disabled state, visibility, availability, and next valid action.
* [ ] Billing UI supports create/lookup tenant by Caller `user_id`, manual recharge, balance, and ledger evidence with clear empty/error states.
* [ ] The console uses a redesigned information architecture and visual system aligned with console-mode standards: restrained background, dense layout, stable navigation, human-first summaries, raw JSON folded away.
* [ ] Operator navigation groups and page hierarchy match real jobs-to-be-done rather than exposing raw endpoint groupings.
* [ ] Review and Billing workflows have explicit guided states, next actions, and blocked-state explanations.
* [ ] T-503 can be rerun with operator actions through browser `/console/` only and operator violations empty.
* [ ] Platform validation passes for the owning repo, including relevant unit/integration/smoke checks.
* [ ] If submodule SHAs move, a fourth-repo change bundle is added/updated and required fourth-repo checks are run.
* [ ] Production rollout checklist or follow-up notes identify that public deployment and T-503 rerun are outside this coding task.

## Definition of Done

* Requirements confirmed with the user.
* Implementation context loaded with `trellis-before-dev` before coding.
* Tests added or updated for UI state/action logic and gateway behavior touched by this task.
* Platform build/test checks pass or blockers are documented.
* Operator docs/runbook notes are updated only if behavior or operator steps change.
* Cross-repo bundle and validation are completed before claiming integration completion.

## Out of Scope (Explicit)

* Ordinary user SaaS-style registration/login portal for Caller/Responder. Follow-up task family should start with `T-505 Public User Portal Scope PRD`.
* Marketplace consumer UI redesign.
* New protocol fields or business schemas.
* Full production-grade multi-operator identity/RBAC unless required to close the existing passphrase/session blocker.
* Replacing the `delexec-ops` CLI/runtime public Caller/Responder path in this task.
* Fixing `@delexec/ops@0.1.6` publish blockers. That is a client-owned follow-up; T-504 may mention it as a prerequisite for full T-503 all-role zero-violation completion.
* Deploying to Aliyun/callanything.xyz or running the final public T-503 production rehearsal.

## Decision (ADR-lite)

**Context**: T-503 exposed two different problems: the operator console cannot yet support a zero-violation public rehearsal, and ordinary users still lack a browser self-service portal. Combining both would span operator/admin gateway auth, public user auth, Caller/Responder onboarding, and marketplace usage in one oversized cross-repo change.

**Decision**: T-504 is operator-only. It will close the public operator console flow and redesign the operator UI. Ordinary user portal scope moves to a later T-505/T-506/T-507 task family.

**Consequences**: T-504 can stay anchored in `repos/platform` and the existing T-503 rehearsal. It will not solve Caller/Responder browser self-service, but it should leave IA and visual patterns that a later user portal can reuse conceptually without copying platform admin behavior.

## Decision (ADR-lite): UI Redesign Depth

**Context**: The current console contains real capabilities, but its readability, usability, and explainability are not sufficient for a public operator flow. T-503 showed that successful API calls are not enough; the browser UI must make the operator path understandable and repeatable.

**Decision**: Use a full operator IA/workflow redesign. This task may restructure shell, navigation, page hierarchy, workflow copy, status summaries, empty/error states, and action placement. It should still preserve existing API contracts and avoid adding ordinary-user portal scope.

**Consequences**: More files will change in `repos/platform/apps/platform-console`, and tests should focus on behavior/state rendering rather than snapshots of the old layout. This increases implementation scope, but it directly addresses the product gap instead of producing a cosmetic refresh.

## Decision (ADR-lite): Gateway Recovery

**Context**: T-503 was blocked by an existing encrypted gateway store whose passphrase was not in the deployment handoff. The only working recovery path was SSH/volume reset, which violates the operator-only public console rule. The runtime-utils package already has `replaceSecretStore`, but platform-console-gateway does not expose a public recovery route.

**Decision**: T-504 will add a browser-accessible reset/recovery flow guarded by `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`. Resetting the store will create a fresh encrypted store with a new passphrase and require the operator to re-enter `PLATFORM_ADMIN_API_KEY`.

**Consequences**: This closes the SSH recovery blocker, but it is intentionally destructive for encrypted gateway secrets because the old passphrase is unavailable. The UI and API responses must make that explicit and require deliberate confirmation.

## Decision (ADR-lite): Delivery Boundary

**Context**: T-504 implementation can be validated locally/source-side, but public rollout depends on production secrets, remote Aliyun state, browser availability, and the separate `@delexec/ops@0.1.6` publish blocker.

**Decision**: T-504 stops at code plus local/source validation. It should include rollout notes or a checklist, but it will not claim public production deployment or full T-503 rerun as completed.

**Consequences**: The task can proceed without production secret access. The final public zero-violation proof remains a follow-up release/rehearsal step after deployment and client publish blockers are resolved.

## Technical Approach

* Gateway:
  * Add a bootstrap-secret guarded recovery/reset endpoint to `platform-console-gateway`.
  * Use existing `replaceSecretStore` from `@delexec/runtime-utils`.
  * Reset runtime session state after replacement and return a fresh session token for the new passphrase.
  * Require explicit confirmation in the request body so recovery is not an accidental one-click destructive action.
* Platform Console UI:
  * Replace the current high-noise AppShell/auth shell with a restrained operator console shell aligned with console-mode design standards.
  * Reframe navigation by operator jobs: Command Center, Review Queue, Directory, Billing, Activity, Relay/Health, Session.
  * Build human-first status summaries with raw JSON only in detail panels or collapsible blocks.
  * Add explicit locked/setup/recovery/admin-credential blocked states with clear next action.
  * Rework Review/Billing pages around guided flows and evidence requirements for T-503.
* Tests:
  * Extend `platform-console-gateway.integration.test.js` for bootstrap-secret reset/recovery behavior.
  * Add or update platform-console unit tests for auth state rendering, operator navigation model, and human-readable view helpers where practical.
  * Run platform unit/integration/build checks as available in this environment.

## Implementation Plan

1. Gateway recovery API and integration tests.
2. Console auth/session UX for setup, unlock, recovery, and admin credential readiness.
3. Operator shell and navigation IA redesign.
4. Review/Billing workflow redesign with blocked/empty/error states.
5. Monitoring pages polish and human-readable detail consistency.
6. Validation, rollout notes, and fourth-repo bundle if submodule SHAs move.

## Technical Notes

* Active task: `.trellis/tasks/07-04-t-504-public-operator-console-zero-violation-ui`.
* Current platform console files inspected:
  * `repos/platform/apps/platform-console/src/App.tsx`
  * `repos/platform/apps/platform-console/src/components/layout/AppShell.tsx`
  * `repos/platform/apps/platform-console/src/pages/auth/AuthPages.tsx`
  * `repos/platform/apps/platform-console/src/pages/OverviewPage.tsx`
  * `repos/platform/apps/platform-console/src/pages/AdminListPage.tsx`
  * `repos/platform/apps/platform-console/src/pages/MonitorPages.tsx`
  * `repos/platform/apps/platform-console/src/pages/BillingPage.tsx`
  * `repos/platform/apps/platform-console/src/lib/api.ts`
  * `repos/platform/apps/platform-console-gateway/src/server.js`
* Existing evidence/planning references:
  * `docs/planning/first-real-call/50-wave5-operator/T-501-route-evidence.md`
  * `docs/planning/first-real-call/50-wave5-operator/T-503-findings.md`
  * `docs/planning/first-real-call/50-wave5-operator/T-503-operator-console-rehearsal.md`
* Design references:
  * `repos/brand-site/docs/console-content-spec.md`
  * `repos/brand-site/src/design-system/shells/console-shell.tsx`
  * `repos/brand-site/src/styles/console-mode.css`
* Relevant spec indexes:
  * `.trellis/spec/delegated-execution-platform-selfhost/frontend/index.md`
  * `.trellis/spec/platform-console/frontend/index.md`
  * `.trellis/spec/platform-console-gateway/frontend/index.md`
* Known environment caveat from prior verification: this desktop environment lacks `corepack`, so strict fourth-repo commands may need a corrected toolchain or documented blocker.
* Secret store implementation notes:
  * `repos/client/packages/runtime-utils/src/index.js` exports `replaceSecretStore(filePath, passphrase, secrets)`.
  * `initializeSecretStore` rejects existing stores; recovery should use `replaceSecretStore`, not delete files manually.
  * Existing gateway tests cover setup/login/admin credential proxy and bootstrap-secret requirement for non-local setup; T-504 should add reset/recovery coverage.
