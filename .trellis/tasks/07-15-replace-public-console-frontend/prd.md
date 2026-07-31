# brainstorm: Replace the Public Console Frontend

## Goal

Completely redesign and rewrite the public Console at `/console/` as one coherent, role-aware product for Caller, Responder, and Operator. The Console should reuse the proven role grouping, page patterns, and visual language of the local `delexec-ops` interface, learn operational-density patterns from Sub2API-like admin consoles, and continue to follow the project's existing CALL ANYTHING design tokens and content-truth principles. The current `platform-console` v0.2.0 UI is a behavior and rollback baseline only; its page composition, navigation model, component structure, and interaction design are not constraints for the replacement.

## What I Already Know

* The user explicitly wants a complete frontend rewrite and does not want incremental evolution of the current Console UI.
* The user selected a unified multi-role Console rather than an operator-only product or separate public surfaces.
* Caller and Responder should reuse the existing `delexec-ops` interface design wherever the public platform semantics match; reuse means design contracts, role structure, and suitable component patterns, not an assumption that changing credentials makes the current local application deployable as-is.
* The visual style and design criteria should still derive from the original project design system rather than copying Sub2API's branding.
* `repos/platform` owns public platform APIs, public identity/session behavior, and the deployed public Console; `repos/client` owns the local `delexec-ops` runtime and its UI. The fourth repository only orchestrates compatible submodule SHAs and cross-repo validation.
* The existing `repos/platform/apps/platform-console` is a React/Vite SPA released in platform v0.2.0 with Overview, Session, Credentials, Reviews, Requests, Responders, Hotlines, Marketplace, Billing, and Audit routes.
* T-504 already added the browser session recovery flow, admin credential setup, review actions, billing actions, and a first full IA/UI redesign. Those working capabilities and API contracts should be treated as parity requirements unless this brainstorm explicitly removes them.
* The current v0.2.0 shell organizes pages by endpoint/domain groups and uses a conventional left sidebar with a narrow content canvas; this is the old UI model being reconsidered.
* Existing design truth lives primarily in `repos/brand-site/docs/console-content-spec.md`, `repos/brand-site/src/styles/delexec-console-tokens.css`, `repos/brand-site/src/styles/console-mode.css`, and the Console shell/pattern library.
* The current `delexec-ops` frontend already expresses a useful General / Caller / Responder role model, but it authenticates against a local supervisor with an `X-Ops-Session` token and calls local control-plane endpoints.
* The current platform API authenticates requests with long-lived Caller, Responder, or Operator API keys. It does not yet provide a verified human web-account login, browser session, or self-service account recovery flow for Caller/Responder.
* Several desired public portal journeys are incomplete below the UI layer: new Caller billing activation, user-owned key recovery, Responder-owned asset visibility and lifecycle actions, and Responder earnings all have known gaps.
* The content spec requires every visible region to justify why it exists, which real operation or observation it serves, its real data source, and its loading/empty/error behavior.
* Comparable-product research is required before choosing the new navigation, dashboard, table/detail, and workflow patterns.

## Assumptions (Temporary)

* “完全弃用原方案” means the existing UI architecture and presentation may be replaced, but verified gateway/API behavior and security boundaries are not discarded by default.
* “类似 Sub2API” means learning from its management-console product shape and operational density, not cloning its code, brand, or screens pixel-for-pixel.
* One human account may carry Caller and Responder roles; Operator is an elevated role in the same public shell rather than a separate brand or login surface.
* API keys remain machine credentials for CLI, agents, and runtime integrations; a browser-facing human session should not expose or persist a long-lived API key unless the user explicitly chooses that as an interim MVP compromise.
* The local Runtime / Transport / Logs / service-control pages remain local-only unless a separately secured device-agent bridge is designed; a public credential change alone cannot make them safe remote controls.
* The replacement should support desktop-first operations and remain usable on smaller screens, but mobile parity is not automatically the primary design driver.
* A rewrite should be delivered behind a reversible cutover or otherwise retain a known-good rollback path until parity is proven.

## Open Questions

* Which human authentication method should be the MVP: verified email code/magic link, password-based account, or an explicitly temporary API-key login?
* Should the public Console omit local Runtime / Transport / Logs entirely in MVP, or present a read-only device status that requires a later secure bridge?
* Which management-console structural model should anchor the new information architecture after comparable-product research?
* Which capabilities are required in the first MVP versus intentionally deferred?
* What evidence will prove the new frontend is ready to replace v0.2.0?

## Requirements (Evolving)

* Replace the current Console frontend rather than cosmetically restyling or incrementally refactoring it.
* Provide one public entry and one coherent shell with role-aware Caller, Responder, and Operator workspaces.
* Support a single user identity holding multiple roles without conflating role visibility with authorization; every server request must still enforce ownership and scope.
* Reuse the local Ops interface's suitable role switcher, navigation grouping, cards, tables, badges, workflow composition, and state patterns while adapting them to public platform semantics and the original design-system constraints.
* Treat local Ops source reuse as a separate package/ownership decision. Do not duplicate cross-repo UI source or create a forbidden `platform -> client` product dependency merely to obtain visual consistency.
* Replace local-supervisor data adapters with platform-scoped web adapters for public Caller/Responder pages; changing only the credential header is insufficient.
* Define a verified human account and short-lived browser-session contract separately from machine API-key issuance and rotation.
* Explicitly classify each existing local Ops page as public-platform reusable, public-platform redesign, local-only, deferred, or removed.
* Preserve the original CALL ANYTHING design language, semantic color system, density principles, content truth, and explicit loading/empty/error-state requirements.
* Use Sub2API and other relevant management consoles only as interaction and information-architecture references.
* Keep public platform behavior in `repos/platform` and local runtime behavior in `repos/client`; do not create a fourth-repo runtime truth source.
* Inventory current routes, API capabilities, security-sensitive flows, and existing tests before defining parity and deletion boundaries.
* Explicitly distinguish UI implementation to discard from platform behaviors/contracts that must survive the rewrite.
* Produce a testable information architecture, page/workflow inventory, state model, migration strategy, and acceptance criteria before implementation begins.

## Acceptance Criteria (Evolving)

* [x] The target personas are Caller, Responder, and Operator in one unified public Console; Caller/Responder self-service is included.
* [ ] The chosen human-login flow proves email/account ownership, issues a short-lived browser session, supports logout and recovery, and does not treat a displayed API key as the user's durable browser session.
* [ ] Role switching and direct URLs expose only authorized navigation and data; server-side authorization rejects cross-user, cross-responder, and non-admin access regardless of hidden UI.
* [ ] Every local Ops page is classified as reusable, redesigned for platform data, local-only, deferred, or removed.
* [ ] A route/capability parity matrix classifies every current v0.2.0 capability as preserve, redesign, merge, defer, or remove.
* [ ] The selected IA is justified against comparable management-console patterns and project-specific constraints.
* [ ] Each MVP page or workflow identifies its user job, source data/API, primary action, and loading/empty/error/permission states.
* [ ] The design approach uses project design tokens and principles without retaining the old v0.2.0 page composition by inertia.
* [ ] The implementation plan provides a safe replacement/cutover and rollback strategy.
* [ ] The replacement can be validated without weakening session, credential, bootstrap-secret, or admin API security boundaries.
* [ ] Owning-repo validation and fourth-repo compatibility checks are defined for the implementation phase.

## Definition of Done (Team Quality Bar)

* Requirements and scope are explicitly confirmed by the user.
* Technical decisions and trade-offs are recorded in ADR-lite form.
* Tests are added or updated at the unit, integration, and browser/smoke layers appropriate to the rewrite.
* Lint, typecheck, build, owning-repo tests, and required fourth-repo checks pass before completion is claimed.
* Docs and operator runbooks are updated if routes or workflows change.
* Rollout, cutover, and rollback are explicitly considered.

## Out of Scope (Explicit, Temporary)

* Implementing the rewrite during this brainstorm phase.
* Remotely restarting or reconfiguring a user's local `delexec-ops` processes without a separately designed and threat-modeled device-agent bridge.
* Changing protocol schemas or inventing new platform business fields merely to fit a visual concept.
* Copying Sub2API source code, assets, or branding.
* Rewriting gateway/server behavior that is unrelated to the selected frontend workflow.
* Treating prototype placeholder data as business truth.

## Research References

* [`research/comparable-admin-consoles.md`](research/comparable-admin-consoles.md) — use an operator cockpit plus resource workbenches; do not clone unsupported metric cards or Sub2API branding.
* [`research/current-console-parity-and-constraints.md`](research/current-console-parity-and-constraints.md) — frontend composition may be discarded, but the gateway security boundary and every current capability require an explicit disposition.
* [`research/ops-console-reuse-and-auth-gap.md`](research/ops-console-reuse-and-auth-gap.md) — reuse the local Ops role/UI patterns, but replace local sessions and data adapters; a credential-header swap is not a public portal architecture.
* [`research/original-design-system-contract.md`](research/original-design-system-contract.md) — retain content truth, state honesty, density, semantic tokens, and human-first summaries; shell and page composition are replaceable.

## Research Notes

### What comparable tools suggest

* Sub2API validates a role-gated user/admin route split and consistent resource workbenches, but its breadth and metrics depend on backend capabilities this project does not currently expose.
* Grafana demonstrates a strong triage-to-investigation path with grouped navigation, breadcrumbs, and linkable filter context.
* Stripe demonstrates resource-oriented navigation, cross-resource search, and deep links; this project should adopt linkable resource context now and defer global search until a real aggregate API exists.

### Selected direction

* **Unified role-aware Console:** Caller + Responder + Operator use one shell and route tree. This absorbs the previously planned T-505 user-portal boundary and makes identity, authorization, user-scoped platform APIs, and cross-repo design reuse first-class scope rather than future extension points.
* Within each role workspace, use a task-oriented overview plus resource workbenches; do not force every role into the old operator endpoint/domain navigation.

## ADR-lite: Unified Console and Ops UI Reuse

### Context

The user selected the unified multi-role product and identified the existing local Ops interface as the desired Caller/Responder design basis. Repository inspection shows that the visual and workflow concepts transfer well, but the current application is a local-machine control plane authenticated by a local passphrase session and backed by supervisor endpoints.

### Decision

Build one public, role-aware Console and reuse the local Ops design contract and suitable interaction/component patterns. Do not treat the existing Ops frontend as deployable through a credential swap. Public pages will use a human web-account session and role/owner-scoped platform APIs; machine API keys remain separate credentials. Local process-control features stay in local Ops unless a secure remote-device bridge is separately approved.

### Consequences

* Scope expands from a `repos/platform` operator-frontend rewrite into coordinated public identity/API work in `repos/platform` plus intentional design-pattern alignment with `repos/client`.
* Caller/Responder UI composition can converge quickly because the role model and many page patterns already exist, but data contracts and authorization must be reworked or added.
* Direct source sharing requires a legitimate release boundary such as a published shared package; otherwise both owning repositories implement against shared design contracts without copying business code.
* MVP scope must be based on real public workflows and APIs rather than the number of existing Ops screens.

## Technical Notes

* Parent task: `.trellis/tasks/07-04-t-504-public-operator-console-zero-violation-ui`.
* New brainstorm task: `.trellis/tasks/07-15-replace-public-console-frontend`.
* Owning public application: `repos/platform/apps/platform-console`.
* Local design/workflow reference: `repos/client/apps/ops-console` and its local supervisor in `repos/client/apps/ops/src/supervisor.js`.
* Gateway/API adapter: `repos/platform/apps/platform-console-gateway` and `repos/platform/apps/platform-console/src/lib/api.ts`.
* Current release baseline: platform `v0.2.0` (`60311d9`), including `feat(console): rebuild operator console as a React SPA` (`9091ea8`).
* Design truth references:
  * `repos/brand-site/docs/console-content-spec.md`
  * `repos/brand-site/src/styles/delexec-console-tokens.css`
  * `repos/brand-site/src/styles/console-mode.css`
  * `repos/brand-site/src/design-system/shells/console-shell.tsx`
  * `repos/brand-site/src/design-system/patterns/console-page-*.tsx`
* Repository constraints were reviewed from root `README.md`, orchestration workflow docs, root `AGENTS.md`, and `repos/platform/AGENTS.md`.
* Complexity classification: complex; this requires full brainstorm, comparable-product research, expansion sweep, and explicit convergence before implementation.
