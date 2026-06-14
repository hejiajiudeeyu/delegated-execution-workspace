# T-404 Public Docs Onboarding

## Goal

Make the public production onboarding path self-service enough that a new Responder and Caller can follow callanything.xyz documentation to register a fixed-price Hotline, keep it online on the public relay, invoke it with a paid task token, and reconcile signed result plus billing evidence without reading source or private runbooks.

## What I Already Know

* T-403 completed the first real production paid call, but it required private knowledge for public relay transport, relay dispatch shape, and operator admin API usage.
* Existing public Responder quick starts already cover `@delexec/ops`, fixed-price `pricing_hint`, submit-review, operator handoff, and Marketplace checks.
* Existing public Caller quick starts already cover public Platform registration, recharge handoff, task-token request with billing consent, balance, ledger, and request events.
* The missing public-docs-only pieces are:
  * `TRANSPORT_TYPE=relay_http` and `TRANSPORT_BASE_URL=https://callanything.xyz/relay` for production Responder runtime.
  * A concrete Caller command chain for `/v1/requests/{id}/delivery-meta`, relay envelope send, result polling, events, balance, and ledger.
  * Clear long-running lifecycle guidance for `delexec-ops start` in production rehearsal.
* The current smallest owning repo is `repos/brand-site`, with content smoke tests in `repos/brand-site/scripts/first-real-call-content-smoke.mjs`.

## Assumptions

* This task should first remove the major public-docs-only violations from T-403 with docs and smoke coverage.
* A new CLI wrapper for paid relay invocation is useful but not required for the first T-404 slice unless docs cannot express the flow safely.
* Operator console implementation remains a separate platform follow-up unless the docs need to stop overclaiming what `/console/` can currently do.

## Requirements

* Update Chinese and English Responder quick starts with public relay runtime environment and long-running process guidance.
* Update Chinese and English Caller quick starts with a complete paid relay dispatch recipe:
  * request task token and save the returned token,
  * fetch delivery metadata,
  * construct the relay envelope,
  * send it to the public relay,
  * poll result/events,
  * reconcile balance and ledger.
* Make public docs honest about operator handoff if the public console cannot yet complete review/recharge end to end.
* Add content smoke assertions so the missing public relay markers cannot regress.
* Keep changes in owning repositories. If only brand-site changes, do not invent client/platform behavior in the fourth repo.

## Acceptance Criteria

* [ ] Chinese Responder docs include `TRANSPORT_TYPE=relay_http`, `TRANSPORT_BASE_URL=https://callanything.xyz/relay`, and a `nohup` or foreground long-running runtime command.
* [ ] English Responder docs include the same production relay runtime guidance.
* [ ] Chinese Caller docs include `/v1/requests/$REQUEST_ID/delivery-meta`, `/v1/messages/send`, `receiver`, task token extraction, result polling, events, balance, and ledger checks.
* [ ] English Caller docs include the same paid relay dispatch guidance.
* [ ] `npm run smoke:first-real-call-content` passes in `repos/brand-site`.
* [ ] Targeted lint/build checks pass for edited brand-site files.
* [ ] If the brand-site submodule SHA changes, root has a matching `changes/CHG-*.yaml` and the five AGENTS gates pass before completion is claimed.

## Definition of Done

* Tests added or updated where behavior is locked by content checks.
* Lint/build checks pass for the owning repo.
* Root cross-repo checks pass if submodule SHA changes.
* Planning docs/roadmap reflect T-404 status.
* No unrelated dirty files are staged or reverted.

## Out of Scope

* Building a real operator console/gateway billing UI.
* Adding or changing protocol fields.
* Adding platform admin APIs.
* Re-running a full production paid-call rehearsal unless the documentation changes reveal a blocker that requires it.

## Technical Notes

* Read root `README.md`, orchestration process docs, and `AGENTS.md`; business changes must land in owning submodules.
* Relevant source files:
  * `repos/brand-site/src/app/pages/Docs/QuickStartResponder.tsx`
  * `repos/brand-site/src/app/pages/Docs/QuickStartCaller.tsx`
  * `repos/brand-site/src/app/pages/en/Docs/QuickStartResponder.tsx`
  * `repos/brand-site/src/app/pages/en/Docs/QuickStartCaller.tsx`
  * `repos/brand-site/scripts/first-real-call-content-smoke.mjs`
* T-403 evidence source: `docs/planning/first-real-call/40-wave4-public-exposure/T-403-findings.md`.
