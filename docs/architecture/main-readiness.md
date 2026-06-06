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
- `repos/platform`: `5961309c6b0ca4e8df22dbb5be92ac0845bf8d25`
- `repos/brand-site`: `379ddca8ce16f45436dda793882f7fa9a67551fa`

The current bundle is `changes/CHG-2026-047.yaml`.

## Readiness Verdict

The pinned combination is ready for daily fourth-repo development after
CHG-2026-047:

- submodule SHA integrity is verified
- boundary governance covers the new platform billing data package
- change bundle validation passes
- protocol/client/platform package and deploy-contract checks pass
- the source integration path succeeds end to end
- ops-console now has deployability-management explanation, adapter health
  visibility, approval-policy posture, and explicit billing readiness surfaces
- public-stack smoke now checks the public route contract beyond generic
  health endpoint reachability
- `selfhost:security-review` is available as a non-destructive public exposure
  review gate for secret hygiene, compose config, route contracts, and
  backup/rotation/smoke prerequisites
- `selfhost:audit-export` is available as a local JSON audit evidence export
  helper for the existing platform admin audit endpoint without printing admin
  keys
- `selfhost:ops-report` is available as a non-secret Markdown operations
  handoff report with URLs, secret hygiene status, and next commands
- `selfhost:backup-validate` is available as a non-destructive backup artifact
  shape check before restore rehearsal
- `selfhost:restore-plan` is available as a non-destructive recovery rehearsal
  command for backup directories before any restore action touches live data
- MCP host golden-four validation is available as an executable fourth-repo
  smoke and a deterministic unit-style harness
- brand-site now has bilingual Deployability Profiles docs that explain the
  deployment profiles, ready/planned boundaries, secret-safety defaults, and
  the operator-only Billing console slice, plus the new security-review and
  audit-export/ops-report/backup-validate/restore-plan gates
- one-command local stack bootstrap is available through managed
  `dev:local:*` commands
- published-image smoke now has a fourth-repo entry point that reviews
  public-stack release images and delegates to platform smoke with
  `COMPOSE_NO_BUILD=true`
- platform-first/operator-first onboarding now has a fourth-repo contract check
  that keeps public-stack `/console/`, gateway session flow, platform docs,
  brand-site narrative, and the source fallback runbook aligned
- Billing P-1 now has an admin-only API/read-model slice for tenant creation,
  balance lookup, manual recharge capture, and ledger browsing
- Platform Console now exposes that billing read model through an operator-only
  `/billing` management page behind the gateway proxy

This verdict is intentionally scoped. Billing P-1 M1.2 adds an admin-only
platform API/read model and an operator-only console surface on top of
persistence and schema groundwork, but it does not make billing a complete
client-facing or end-user default path yet.

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
- `check:bundles`: passed with `CHG-2026-045`
- `test:contracts`: passed, including `@delexec/billing-store` in platform
  package validation and the `@delexec/platform-api` dependency graph
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
- `test:selfhost-kit`: passed with temp-profile coverage for env generation,
  secret rotation dry-run/confirm behavior, public-stack preflight safety,
  non-destructive security review, admin audit export without secret leakage,
  restore planning, and public route-contract smoke output
- `test:mcp-golden-four`: passed with a fake MCP streamable HTTP host and
  secret-leak guard for the executable golden-four smoke
- `test:local-stack`: passed for one-command local stack command sequencing,
  managed process status/log behavior, and secret-leak guard
- `published-image:plan` / `published-image:smoke -- --dry-run`: passed for
  public-stack release image registry/tag visibility, the `COMPOSE_NO_BUILD=true`
  delegated command, and strict smoke defaults
- `published-image:smoke -- --image-tag latest`: passed with `repos/platform`
  public-stack smoke running in `mode=published_image`, completing the gateway
  proxy scenario, and cleaning up compose
- `test:published-image-smoke`: passed with a fake platform repo covering
  compose image-template validation, dry-run delegation, and secret-leak guard
- `operator:onboarding:check`: passed for the public-stack `/console/` and
  `/gateway/*` route contract, `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`, platform
  operator guide, brand-site Deployability Profiles, and fourth-repo source
  fallback runbook narrative
- `test:operator-onboarding`: passed with a fake repo covering the operator
  onboarding plan, stale platform-guide detection, brand-site planned-copy
  detection, and secret-leak guard
- `repos/brand-site` `npm run smoke:deployability-content`: passed for the
  bilingual Deployability Profiles route/content contract, including the
  admin-only Billing console narrative plus `selfhost:security-review` and
  `selfhost:audit-export` / `selfhost:ops-report` /
  `selfhost:backup-validate` / `selfhost:restore-plan` commands
- `repos/brand-site` `npm run build`: passed, including client build, SSR
  build, and prerender output for the new deployability docs routes
- `repos/platform` platform-console view-model unit test: passed for Billing
  readiness, balance, and ledger summaries
- `repos/platform/apps/platform-console` `npm run build`: passed for the
  bundled Billing page route and sidebar entry
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

### Billing P-1 M1.2 admin read model

The platform submodule now includes the first concrete billing implementation
milestones:

- `@delexec/billing-store`
- `002_p1_tenant_balance.sql`
- unit and integration tests for billing persistence
- platform package validation wiring
- admin-only `/v1/admin/billing/*` routes for tenant creation, balance lookup,
  manual recharge capture, and ledger browsing
- platform API integration coverage for admin auth, tenant-miss error mapping,
  recharge capture, and ledger filtering
- Platform Console `/billing` route for tenant setup, balance refresh, manual
  recharge capture, and ledger review through the gateway `/proxy/*` path

The fourth-repo boundary map treats this package as `platform/data`.

### Agent-facing caller-skill smoke

`corepack pnpm run test:agent-e2e` now validates the current
`/skills/caller/*` progressive-disclosure surface without requiring an
external LLM key. It covers manifest discovery, hotline search, hotline read,
request preparation, request send, and response reporting against the bundled
workspace-summary hotline.

`corepack pnpm run dev:doctor` checks the local prerequisites and runtime
health endpoints used by that daily path.

`corepack pnpm run dev:local:up` is the managed one-command local bootstrap for
the daily agent loop. It initializes and starts the platform profile, starts
relay as a managed background process, runs client bootstrap, then starts the
ops supervisor as a managed background process. `dev:local:status`,
`dev:local:logs`, and `dev:local:down` provide the matching management surface.

`corepack pnpm run mcp:golden-four` validates the MCP host-facing path as an
executable smoke: six-tool discovery, workspace-summary hotline search, request
preparation, signed result delivery via `send_request`, and byte-stable
`report_response` recovery.

`corepack pnpm run selfhost:preflight` now combines secret hygiene, compose
config validation, and route output before services are started;
`corepack pnpm run selfhost:security-review` adds a non-destructive public
exposure review that repeats the secret, compose, and public route-contract
checks and prints the backup, rotation, and smoke commands an operator should
run before treating a public stack as exposure-ready;
`corepack pnpm run selfhost:audit-export` reads the selected profile `.env`,
calls the existing platform admin audit endpoint, and writes the response as a
local JSON artifact under `exports/audit/<profile>/` without printing the admin
key;
`corepack pnpm run selfhost:ops-report` writes a Markdown handoff report under
`exports/selfhost/<profile>/` with URLs, secret hygiene status, and operator
commands while omitting raw secret values;
`corepack pnpm run selfhost:backup-validate` checks a backup directory for
`.env`, `postgres.sql`, and `compose.config.txt` presence and size without
reading or printing `.env` secret values;
`corepack pnpm run selfhost:restore-plan` prints the downtime, private `.env`
review, `postgres.sql` import, restart, and smoke-validation sequence for a
backup directory without stopping services or importing SQL;
`corepack pnpm run selfhost:smoke` remains the post-start health endpoint check
and, for `public-stack`, also validates the edge route contract for `/healthz`,
`/platform/healthz`, `/relay/healthz`, `/gateway/healthz`, and `/console/`.
For public profiles, unsafe public origin settings are warnings/failures instead
of being hidden behind a green status. `selfhost:up` reuses the preflight gate by
default and will not continue when it fails unless `--force` is passed
explicitly.

`corepack pnpm run published-image:plan` reviews the three public-stack release
images, `rsp-platform`, `rsp-relay`, and `rsp-gateway`, and confirms the compose
image templates are still parameterized by `IMAGE_REGISTRY` / `IMAGE_TAG`.
`corepack pnpm run published-image:smoke` delegates to `repos/platform`
`test:public-stack-smoke` in strict Docker mode with `COMPOSE_NO_BUILD=true`, so
platform smoke pulls published images instead of building locally. The fourth
repo owns only this orchestration entry point; image build, publish, and release
gates remain owned by `repos/platform`.

### Console deployability management slice

The ops-console Runtime page now shows a deployability readiness panel for the
`platform`, `public-stack`, and `all-in-one` profiles, the recommended
`selfhost:*` check sequence, the safety boundary that status/smoke/logs do not
print secret values, and an explicit Billing readiness state. Billing is marked
as P-1 M1.2 admin-read-model foundation only, not production-default ready until
client-facing surfaces, enforcement, and end-user consent flows are complete.
Runtime also renders supervisor
status cards for `skill_adapter` and `mcp_adapter` while keeping log tabs scoped
to caller/responder/relay.

The Preferences page now includes an approval-policy deployability summary that
shows the active approval mode, whitelist and blocklist counts, local-mode
guidance, and the warning that `allow_all` should not be the default for public
or team deployments.

The Help page now has a dedicated Deployability chapter connecting profile
choice, health, logs, secret hygiene, and the Runtime/Transport entry points.
This is the first M3 explanation and runtime visibility surface.

Platform Console now adds a concrete Billing management page for operators. It
uses the existing console gateway proxy, so the browser calls `/proxy/*` while
the gateway injects the stored admin key server-side. The page is intentionally
marked admin-only and not production-default billing.

### Brand-site deployability narrative

The brand-site docs now expose `/docs/deployability-profiles` and
`/en/docs/deployability-profiles` as bilingual public entry points for Local
Agent Loop, Selfhost Platform, Public Stack, and Management Console. The pages
keep self-host messaging honest by labeling current paths as ready now:
local loop, selfhost, public-stack safety checks, published-image smoke, and
Operator Onboarding. Management Console copy now also describes the admin-only
Billing page as an operator surface, not as client-facing billing readiness, and
the public-stack command examples include `selfhost:security-review`,
`selfhost:audit-export`, `selfhost:ops-report`, `selfhost:backup-validate`, and
`selfhost:restore-plan` as pre-exposure safety, evidence, handoff-report,
backup-artifact validation, and recovery-rehearsal commands. Capabilities that
are not ready remain outside the green path, and secrets, public origins, and
billing readiness must not be hidden behind green status.

## Still Not Ready As A Default Daily Path

These areas still need their own closeout before they should be treated as
default day-to-day workflows:

- billing P-1 beyond the admin-only read model, including client-facing
  surfaces, enforcement, and end-user consent flows
- email transport as an end-user default path

Also, the published-image wrapper becomes evidence for a specific
`IMAGE_REGISTRY` / `IMAGE_TAG` only after a real `published-image:smoke` run
against that tag. Dry-run validates the orchestration contract only.

## Current Caveat

The readiness verdict covers the pinned SHA combination and the fourth-repo
gate results. It does not certify unrelated uncommitted edits inside a
submodule working tree.

Before promoting a final clean daily baseline, ensure `git status --short` is
clean except for the intended fourth-repo changes and any explicitly owned
submodule work.
