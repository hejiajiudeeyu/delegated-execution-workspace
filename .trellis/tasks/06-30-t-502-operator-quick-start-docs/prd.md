# T-502 Operator Quick Start Docs

## Goal

Add public Operator Quick Start documentation to the brand site so an operator can use the production console/gateway flow validated by T-501 without falling back to SSH or direct admin API calls. The task closes T-502 by implementing the owning-repo frontend/docs changes, verifying them locally, updating the fourth-repo compatibility ledger, and recording the validated submodule combination.

## Requirements

* Implement Chinese and English Operator Quick Start pages in `repos/brand-site`.
* Public routes:
  * `/docs/quick-start-operator/`
  * `/en/docs/quick-start-operator/`
* Cover:
  * audience: platform owner/operator, not marketplace users
  * entrypoint: `https://callanything.xyz/console/`
  * gateway session setup using deployment-provided bootstrap secret and passphrase
  * admin credential storage using deployment-provided `PLATFORM_ADMIN_API_KEY`
  * reviews workflow: pending reviews, approve responder, approve hotline, enable, marketplace visibility
  * billing workflow: create tenant for Caller `user_id`, manual recharge, balance, ledger
  * validation checklist tied to Marketplace and Caller balance evidence
* Do not include secret values or example `sk_admin_`/bootstrap-secret strings in public docs.
* Thinly update Chinese and English Caller/Responder quick starts to link to Operator Quick Start for review/recharge steps rather than duplicating console instructions.
* Add docs navigation entry for Operator Quick Start.
* Add Operator Quick Start to `llms.txt`.
* Extend `scripts/first-real-call-content-smoke.mjs` to lock the new content and secret-safety markers.

## Acceptance Criteria

* [ ] Chinese Operator Quick Start route renders and contains required console/reviews/billing/session/admin markers.
* [ ] English Operator Quick Start route renders and contains required console/reviews/billing/session/admin markers.
* [ ] Operator docs do not contain example `sk_admin_` or fake bootstrap secret values.
* [ ] Chinese/English Caller and Responder quick starts link to Operator Quick Start.
* [ ] Docs navigation and `llms.txt` include Operator Quick Start.
* [ ] `npm run smoke:first-real-call-content` passes in `repos/brand-site`.
* [ ] Targeted eslint passes for touched quick-start pages and smoke script.
* [ ] `npm run build` passes in `repos/brand-site`.
* [ ] Brand-site change is committed in the owning submodule.
* [ ] Fourth repo submodule SHA and change bundle are updated.
* [ ] Fourth repo validation passes:
  * `corepack pnpm run check:submodules`
  * `corepack pnpm run check:boundaries`
  * `corepack pnpm run check:bundles`
  * `corepack pnpm run test:contracts`
  * `corepack pnpm run test:integration`

## Out of Scope

* Do not implement new console product behavior beyond documented T-501 capabilities.
* Do not deploy to Aliyun in this coding task.
* Do not run T-503 rehearsal in this task.
* Do not restore or mix the unrelated brand-site homepage/mobile-nav stash.
* Do not mix existing fourth-repo staged first-real-call/deployability WIP into T-502 commits.

## Technical Approach

Follow existing brand-site quick-start page patterns, route registration, docs navigation, and content smoke checks. Implement the pages in the brand-site owning repo first, commit there, then update the fourth repo with the new brand-site SHA and a new change bundle.

## Technical Notes

* Source task card: `docs/planning/first-real-call/50-wave5-operator/T-502-operator-quick-start-docs.md`.
* T-501 dependency is satisfied by `CHG-2026-168`, whose fourth-repo validation passed on 2026-06-30.
* Current brand-site WIP unrelated to T-502 is preserved in `repos/brand-site` stash `codex-closeout-preserve-brand-site-wip-20260630`.
