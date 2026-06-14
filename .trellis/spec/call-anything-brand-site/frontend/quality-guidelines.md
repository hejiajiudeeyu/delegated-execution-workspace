# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

### Public CLI Docs After Publish

When a public workflow has a published `delexec-ops` command that wraps a multi-step API flow, the brand-site quick start must make the CLI command the primary user path.

The lower-level API endpoints may remain visible only as diagnostics or acceptance markers. They should not be presented as the main first-run path once the CLI is published and registry-smoked.

Required public-docs markers for paid Caller rehearsals:

- `delexec-ops call-hotline`
- `--caller-base-url`
- `--max-charge-cents`
- polling controls such as `--poll-interval-ms` and `--timeout-ms`
- evidence fields: `task_token_claims`, `delivery_meta`, `dispatch`, `inbox`, `result`, `events`, `balance`, and `ledger`
- diagnostic endpoint markers: `/v1/tokens/task`, `/v1/requests/$REQUEST_ID/delivery-meta`, `$RELAY/v1/messages/send`, `/controller/inbox/pull`, `/controller/requests/$REQUEST_ID/result`, `/v1/tenants/me/balance`, `/v1/tenants/me/ledger`, and `/v1/requests/$REQUEST_ID/events`

---

## Testing Requirements

For first-real-call public documentation changes:

- Update `scripts/first-real-call-content-smoke.mjs` with content markers that prove the public page matches the intended user path.
- Run `npm run smoke:first-real-call-content`.
- Run targeted eslint for touched quick-start pages and the smoke script.
- Run `npm run build`.
- If the public site is deployed, verify the deployed URLs contain the new primary-path markers and that `/healthz`, `/platform/healthz`, `/relay/healthz`, and `/marketplace/hotlines` still respond correctly.

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)
