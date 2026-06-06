# Main Readiness

Updated: 2026-06-06

## Purpose

This document records the current readiness judgment for the fourth-repo `main`
branch and its pinned submodule combination.

The fourth repository is a compatibility ledger and orchestration workspace. A
green readiness verdict here means the current protocol/client/platform SHA
combination is usable for local cross-repo development and the certified source
integration path. It does not replace the release gates owned by the formal
repositories.

## Current Pinned Combination

- `repos/protocol`: `da3027100cfe9391f7f8d03be18a108ee2804cf6`
- `repos/client`: `f1d6a2d8c9b83517cdf6ca9803b223847f880e9a`
- `repos/platform`: `dc7c654964707badbdda8d02d57a6b56b8cf11a5`

The current bundle is `changes/CHG-2026-035.yaml`.

## Readiness Verdict

The pinned combination is ready for daily fourth-repo development after
CHG-2026-035:

- submodule SHA integrity is verified
- boundary governance covers the new platform billing data package
- change bundle validation passes
- protocol/client/platform package and deploy-contract checks pass
- the source integration path succeeds end to end
- ops-console now has deployability-management explanation, adapter health
  visibility, approval-policy posture, and explicit billing readiness surfaces
- public-stack smoke now checks the public route contract beyond generic
  health endpoint reachability

This verdict is intentionally scoped. Billing P-1 M1.1 adds platform
persistence and schema groundwork, but it does not make billing a complete
end-user default path yet.

## Verified On 2026-06-06

The required fourth-repo gates pass on the current pinned combination:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

Observed results:

- `check:submodules`: passed
- `check:boundaries`: passed after adding `@delexec/billing-store` to
  `platform/data`
- `check:bundles`: passed with `CHG-2026-028`
- `test:contracts`: passed, including `@delexec/billing-store` in platform
  package validation
- `test:integration`: passed with a successful request/response path
- `test:agent-e2e`: passed after retargeting the script to the current
  `/skills/caller/*` surface
- `dev:doctor`: passed for the local daily agent/caller-skill stack
- `selfhost:init` / `selfhost:urls` / `selfhost:preflight`: added as the first
  self-host management spine for generated env, profile discovery, and pre-`up`
  route, compose config, and secret hygiene checks
- `selfhost:smoke`: passed for the local `platform` profile; the
  `public-stack` profile now also prints and validates the edge route contract,
  and intentionally fails while the public origin remains localhost or the stack
  is not running
- `test:selfhost-kit`: passed with temp-profile coverage for env generation
  secret rotation dry-run/confirm behavior, public-stack preflight safety, and
  public route-contract smoke output
- `repos/client` `npm run test:unit`: passed with 14 test files and 125 tests,
  including new Runtime deployability panel and Help deployability chapter
  coverage, Skill/MCP adapter runtime status coverage, and Preferences approval
  policy deployability coverage, plus explicit billing readiness coverage

## What Is Usable Now

### Fourth-repo certification chain

The workspace can certify a protocol/client/platform SHA combination, record it
as a change bundle, and verify it through the required local gates.

### Source integration baseline

`corepack pnpm run test:integration` validates the baseline source integration
path defined in [Integration Path](integration-path.md):

- platform API from `repos/platform`
- standalone relay from `repos/platform`
- source `delexec-ops` from `repos/client`
- approval plus a full request/response success path

### Billing P-1 M1.1 groundwork

The platform submodule now includes the first concrete billing implementation
milestone:

- `@delexec/billing-store`
- `002_p1_tenant_balance.sql`
- unit and integration tests for billing persistence
- platform package validation wiring

The fourth-repo boundary map treats this package as `platform/data`.

### Agent-facing caller-skill smoke

`corepack pnpm run test:agent-e2e` now validates the current
`/skills/caller/*` progressive-disclosure surface without requiring an
external LLM key. It covers manifest discovery, hotline search, hotline read,
request preparation, request send, and response reporting against the bundled
workspace-summary hotline.

`corepack pnpm run dev:doctor` checks the local prerequisites and runtime
health endpoints used by that daily path.

`corepack pnpm run selfhost:preflight` now combines secret hygiene, compose
config validation, and route output before services are started;
`corepack pnpm run selfhost:smoke` remains the post-start health endpoint check
and, for `public-stack`, also validates the edge route contract for `/healthz`,
`/platform/healthz`, `/relay/healthz`, `/gateway/healthz`, and `/console/`.
For public profiles, unsafe public origin settings are warnings/failures instead
of being hidden behind a green status. `selfhost:up` reuses the preflight gate by
default and will not continue when it fails unless `--force` is passed
explicitly.

### Console deployability management slice

The ops-console Runtime page now shows a deployability readiness panel for the
`platform`, `public-stack`, and `all-in-one` profiles, the recommended
`selfhost:*` check sequence, the safety boundary that status/smoke/logs do not
print secret values, and an explicit Billing readiness state. Billing is marked
as P-1 M1.1 foundation only, not production-default ready until the API, read
model, and client-facing surfaces are complete. Runtime also renders supervisor
status cards for `skill_adapter` and `mcp_adapter` while keeping log tabs scoped
to caller/responder/relay.

The Preferences page now includes an approval-policy deployability summary that
shows the active approval mode, whitelist and blocklist counts, local-mode
guidance, and the warning that `allow_all` should not be the default for public
or team deployments.

The Help page now has a dedicated Deployability chapter connecting profile
choice, health, logs, secret hygiene, and the Runtime/Transport entry points.
This is the first M3 explanation and runtime visibility surface.

## Still Not Ready As A Default Daily Path

These areas still need their own closeout before they should be treated as
default day-to-day workflows:

- one-command local stack bootstrap
- MCP host golden-four validation as an executable script
- billing P-1 beyond M1.1, including API/read model/client-facing surfaces
- email transport as an end-user default path
- published-image smoke and deployment validation
- platform-first/operator-first onboarding as the primary first-use path

## Current Caveat

The readiness verdict covers the pinned SHA combination and the fourth-repo
gate results. It does not certify unrelated uncommitted edits inside a
submodule working tree.

Before promoting a final clean daily baseline, ensure `git status --short` is
clean except for the intended fourth-repo changes and any explicitly owned
submodule work.
