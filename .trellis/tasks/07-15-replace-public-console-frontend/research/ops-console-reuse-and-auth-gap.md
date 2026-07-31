# Research: Reusing the Local Ops Console for a Unified Public Console

## Question

Can the existing Caller/Responder interface in `delexec-ops` be reused for the public Console by changing only the login credential?

## Finding

No—not as an application architecture. The interface design, role model, and many presentation patterns are strong reuse candidates, but the current Ops Console is a browser UI for a **local machine supervisor**. A public multi-user Console needs a different identity/session boundary, role- and owner-scoped platform APIs, and several missing end-user workflows.

## Evidence from the Local Ops Console

* `repos/client/apps/ops-console/src/App.tsx` already groups routes into General, Caller, and Responder workspaces. Caller routes cover registration, catalog, calls, approvals, preferences, and lists; Responder routes cover activation, hotlines, and review.
* `repos/client/apps/ops-console/src/components/layout/Sidebar.tsx` provides reusable role grouping, status presentation, badges, and navigation hierarchy.
* `repos/client/apps/ops-console/src/lib/api.ts` stores `rsp.ops.session` in browser `sessionStorage`, adds `X-Ops-Session`, and sends relative same-origin requests.
* `repos/client/apps/ops-console/src/hooks/useAuth.tsx` and `pages/auth/AuthPages.tsx` unlock or set up a **local passphrase session**, not a platform user account.
* Caller setup calls local `/auth/register-caller` with `mode: "local_only"`.
* `repos/client/apps/ops/src/supervisor.js` implements `/auth/session/*`, `/status`, process restart/log/runtime/transport operations, and the Caller/Responder adapter endpoints. It can read local configuration, secrets, and processes that the public platform cannot reach.

Therefore changing `X-Ops-Session` to `Authorization` would still leave most pages calling the wrong server, with the wrong resource scope and local-only semantics.

## Evidence from the Platform API

* `POST /v1/users/register` creates a Caller identity and long-lived `sk_caller_*` API key from an email string, but there is no email verification.
* `POST /v2/responders/register` can create or attach a Responder identity and issue a Responder API key.
* `resolveAuth`, `requireCaller`, `requireResponder`, and `requireOperator` authenticate bearer API keys and enforce machine-facing scopes. There is no general human password, email-code/magic-link, passkey, OAuth, or user browser-session contract.
* Caller self-balance and ledger reads exist, but API-key rotation/revocation is operator-only.
* The product audit records additional portal gaps: Caller activation/billing is not fully self-service, key loss has no verified recovery, Responder-owned review/lifecycle visibility is incomplete, and Responder earnings are not currently credited.

## Reuse Matrix

| Area | Reuse posture | Reason |
| --- | --- | --- |
| Role switcher and role-grouped navigation | Reuse/adapt | Matches the selected Caller + Responder + Operator product model. |
| Design tokens, badges, cards, tables, forms, page rhythm | Reuse/adapt | Strong visual continuity; must still obey public Console content-truth and restrained-decoration rules. |
| Caller Catalog / Calls / Approvals page concepts | Reuse interaction model | Public versions need platform APIs and account-scoped data instead of local supervisor adapters. |
| Responder Hotlines / Review page concepts | Reuse interaction model | Public owner visibility and lifecycle endpoints are incomplete and must be designed. |
| General Runtime / Transport / Logs / process restart | Keep local | These operate a local installation and cannot be made public with a login-header change. |
| `X-Ops-Session` local passphrase auth | Replace for public use | It protects one local installation, not a multi-user platform account. |
| Long-lived Caller/Responder API key as browser session | Avoid as target architecture | API keys are machine credentials, have weak recovery ergonomics, and unnecessarily expose durable secrets to the browser. |
| Existing relative API calls | Replace/adapt | Public Console requires platform web-session endpoints and role/owner-scoped adapters. |
| Direct cross-repo source import | Do not assume | Formal repositories have ownership and release-boundary rules; shared source needs a legitimate published package or another explicit contract. |

## Recommended Architecture

1. One human platform account maps to a stable `user_id` and a set of roles such as Caller, Responder, and optionally Admin/Operator.
2. A public auth module verifies the human identity and issues a short-lived, secure, HttpOnly browser session. API keys remain separately managed credentials for CLI, agents, and runtimes.
3. The unified shell switches role workspaces, while each page calls a role-scoped platform web adapter. Server-side authorization remains authoritative even when UI navigation is hidden.
4. Local Ops continues to own machine runtime, transport, logs, and service controls. A future remote status/control surface requires a separately authenticated device-agent bridge and threat model.
5. Reuse design contracts and suitable presentation primitives first. Decide separately whether shared source merits a published UI package; do not duplicate business implementations across repositories.

## Product Implication

The user's choice effectively brings the T-505 Caller/Responder portal into this rewrite. The frontend can borrow substantial design work, but the critical path is now human identity plus platform-scoped APIs and authorization—not JSX reconstruction alone.
