# Main Readiness

Updated: 2026-06-07

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
- `repos/brand-site`: `8cfc87b59f1529bd80847baeccee3fe564303f57`

The current bundle is `changes/CHG-2026-094.yaml`.

## Readiness Verdict

The pinned combination is ready for daily fourth-repo development after
CHG-2026-094:

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
  keys, and supports `--json` for export metadata without printing the exported
  audit body
- `selfhost:ops-report` is available as a non-secret Markdown operations
  handoff report with URLs, host ports, secret hygiene status, and next commands,
  and supports `--json` for dashboards and management scripts
- `selfhost:status` is available as the runtime management snapshot after
  startup, and supports `--json` for Docker compose service state, secret
  hygiene status, health endpoint checks, blockers, and safety notes without
  printing secret values
- `selfhost:up` is available as the guarded selected-profile startup command,
  and supports `--json` for init, preflight, compose-up, blocker, and note
  metadata while omitting command stdout because it may contain sensitive values
- `selfhost:logs` is available as the private-operator raw log view, and
  supports `--json` for command metadata, service/tail filters, exit code, and
  stderr metadata while omitting raw log stdout because application logs may
  contain sensitive values
- `selfhost:down` is available as the selected-profile stop command, and
  supports `--json` for command metadata, exit code, blockers, and stderr
  metadata while omitting compose down stdout because compose output may contain
  sensitive values
- `selfhost:config` is available as the compose config validation command, and
  supports `--json` for pass/fail, blocker, and stderr metadata while omitting
  expanded compose stdout because it can contain environment values
- `selfhost:ports` is available as a non-destructive declared host-port list
  before an operator starts a self-host profile
- `selfhost:summary` is available as a read-only one-screen profile overview
  with deploy paths, URLs, declared host ports, secret hygiene status, and next
  commands before an operator starts Docker or writes a handoff report
- `selfhost:doctor` is available as the earliest read-only deployment
  diagnostic for local tools, profile files, `.env` presence, and
  secret/public-origin hygiene
- `selfhost:profiles` is available as a read-only deployment map for built-in
  profiles, deploy directories, services, declared host ports, and matching
  doctor commands
- `selfhost:plan` is available as a selected-profile deployment map with
  purpose, deploy paths, services, URLs, safety checks, and notes, and supports
  `--json` for generated docs, dashboards, and management scripts
- `selfhost:quickstart` is available as a read-only copy-paste command sequence
  for a selected profile, including public-stack safety review and handoff
  evidence steps
- `selfhost:readiness -- --all` is available as a read-only multi-profile
  readiness matrix, and `selfhost:readiness` remains available as the selected
  profile readiness overview; both support `--json` under `corepack pnpm --silent run`
  for machine-readable automation with the same exit-code semantics
- `selfhost:backup-plan` is available as a non-destructive backup checklist, and
  supports `--json` for machine-readable backup directory, ordered steps, next
  validation command, and safety notes
- `selfhost:backup-validate` is available as a non-destructive backup artifact
  shape check before restore rehearsal
- `selfhost:restore-plan` is available as a non-destructive recovery rehearsal
  command for backup directories before any restore action touches live data
- `selfhost:rotate-plan` is available as a non-destructive secret rotation
  checklist, and supports `--json` for machine-readable backup-first, dry-run,
  confirm, restart, smoke-validation steps, and safety notes
- `selfhost:rotate` supports machine-readable dry-run and confirmed rotation
  metadata through `--json`, reporting rotated-key names, changed files, backup
  path, restart/smoke next commands, and safety notes without printing secret
  values
- MCP host golden-four validation is available as an executable fourth-repo
  smoke and a deterministic unit-style harness
- brand-site now has bilingual Deployability Profiles docs that explain the
  deployment profiles, ready/planned boundaries, secret-safety defaults, and
  the operator-only Billing console slice, plus the new profiles/doctor/summary/security-review
  and quickstart/readiness/audit-export/ports/ops-report/backup-validate/restore-plan/rotate-plan/rotate-json gates
- one-command local stack bootstrap is available through managed
  `dev:local:*` commands, with `--json` metadata for plan/up/status/logs/down
  so dashboards and scripts can inspect and control the local loop without
  parsing terminal prose, printing raw log lines, or embedding child command
  stdout
- `dev:doctor -- --json` is available as machine-readable daily local
  agent/caller-skill diagnostics for prerequisites, runtime health,
  caller-skill manifest/search checks, blockers, and next commands without raw
  logs or secret values
- `deployability:overview` is available as the read-only first command map for
  Local Agent Loop, Selfhost Platform, Public Stack, Operator Onboarding, and
  Published Image paths, and supports `--json` without reading `.env`, calling
  Docker, binding ports, probing networks, or printing secrets
- `deployability:quickstart` is available as the read-only first-use guide for
  a fresh checkout, listing Daily Development, Selfhost Platform, Public Stack,
  and Release Review tracks with ordered commands and JSON entry points without
  reading `.env`, calling Docker, binding ports, probing networks, or printing
  secrets
- `deployability:safety` is available as a read-only safety posture matrix for
  deployability, selfhost, dev, and release commands, describing whether each
  command writes files, starts or stops services, calls Docker, probes networks,
  may print private terminal text, or gates public exposure, and supports
  `--json` without reading `.env`, calling Docker, binding ports, probing
  networks, or printing secrets
- `deployability:doctor` is available as a read-only deployability readiness
  snapshot for compatibility ledger, top-level scripts, documentation,
  brand-site, and safety-contract alignment, and supports
  `corepack pnpm --silent run deployability:doctor -- --json` without reading
  `.env`, calling Docker, binding ports, probing networks, or printing secrets
- `compat:status` is available as a read-only compatibility-ledger snapshot
  that compares latest-bundle SHAs to current submodule gitlinks, reports dirty
  submodule worktrees as warnings, and keeps ledger mismatches or dirty gitlink
  markers as blockers without reading `.env`, calling Docker, probing networks,
  or printing secrets
- `deployability:handoff` is available as a non-secret ecosystem handoff report
  under `exports/deployability/`, combining current bundle metadata,
  compatibility warnings, command map, safety notes, and next validation
  commands, and supports `--json` without reading `.env`, calling Docker,
  binding ports, probing networks, or printing secrets
- published-image smoke now has a fourth-repo entry point that reviews
  public-stack release images and delegates to platform smoke with
  `COMPOSE_NO_BUILD=true`
- platform-first/operator-first onboarding now has a fourth-repo contract check
  that keeps public-stack `/console/`, gateway session flow, platform docs,
  brand-site narrative, the source fallback runbook, readiness overview,
  declared host-port inventory, and the non-secret ops handoff report aligned
- Billing P-1 now has an admin-only API/read-model slice for tenant creation,
  balance lookup, manual recharge capture, and ledger browsing
- Platform Console now exposes that billing read model through an operator-only
  `/billing` management page behind the gateway proxy

This verdict is intentionally scoped. Billing P-1 M1.2 adds an admin-only
platform API/read model and an operator-only console surface on top of
persistence and schema groundwork, but it does not make billing a complete
client-facing or end-user default path yet.

## Verified On 2026-06-07

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
- `check:bundles`: passed with `CHG-2026-094`
- `test:contracts`: passed, including `@delexec/billing-store` in platform
  package validation and the `@delexec/platform-api` dependency graph
- `test:integration`: passed with a successful request/response path
- `test:agent-e2e`: passed after retargeting the script to the current
  `/skills/caller/*` surface
- `dev:doctor`: passed for the local daily agent/caller-skill stack, and
  `dev:doctor -- --json` now emits clean machine-readable diagnostics without
  `[ok]` / `[fail]` terminal prose or secret values
- `deployability:overview -- --json`: passed, reporting five deployability
  paths, human commands, JSON entry points, safety defaults, and next commands
  without terminal `[ok]` / `[fail]` prose or secret values
- `deployability:quickstart -- --json`: passed, reporting four first-use
  tracks, ordered commands, JSON entry points, safety defaults, and next
  commands without terminal prose or secret values
- `deployability:safety -- --json`: passed, reporting read/write/startup,
  Docker, network, private-terminal-text, public-exposure-gate, CI-safe, and
  dashboard-safe posture for deployability, selfhost, dev, and release commands
  without terminal prose or secret values
- `deployability:doctor -- --json`: passed, reporting compatibility ledger,
  top-level scripts, documentation, brand-site, and safety-contract checks,
  warnings, blockers, evidence, safety defaults, and next commands without
  terminal prose or secret values
- `compat:status -- --json`: passed, reporting the current bundle as matching
  the current protocol/client/platform/brand-site gitlinks; it also surfaced
  existing dirty submodule worktrees as warnings without treating them as ledger
  blockers
- `deployability:handoff -- --json`: passed, writing a Markdown handoff report
  under `exports/deployability/` while returning current bundle, compatibility,
  command-map, safety-note, and next-validation metadata without terminal prose
  or secret values
- `selfhost:profiles` / `selfhost:quickstart` / `selfhost:readiness -- --all` /
  `selfhost:readiness` / `selfhost:doctor` / `selfhost:init` / `selfhost:init -- --json` /
  `selfhost:plan` / `selfhost:summary` / `selfhost:urls` / `selfhost:preflight`: added as the
  first self-host management spine for profile discovery, copy-paste startup
  sequencing, read-only readiness matrix and selected-profile overview,
  deployment diagnostics, generated env plus machine-readable created/hardened
  `.env` metadata, selected-profile deployment maps,
  one-screen profile overview, URL
  discovery, and pre-`up` route, compose config, and secret hygiene checks
- `selfhost:smoke`: passed for the local `platform` profile; the
  `public-stack` profile now also prints and validates the edge route contract,
  and intentionally fails while the public origin remains localhost or the stack
  is not running
- `test:selfhost-kit`: passed with temp-profile coverage for env generation,
  init JSON metadata without secret values or URL prose,
  read-only profile map output, read-only doctor output, one-screen summary
  output, read-only quickstart sequences, read-only readiness matrix and overviews,
  secret rotation dry-run/confirm behavior, rotate JSON metadata, public-stack preflight safety,
  non-destructive security review, admin audit export without secret leakage,
  restore planning, and public route-contract smoke output
- `test:mcp-golden-four`: passed with a fake MCP streamable HTTP host and
  secret-leak guard for the executable golden-four smoke
- `test:local-stack`: passed for one-command local stack command sequencing,
  managed process status/log behavior, JSON plan/up/status/log/down metadata,
  and secret-leak guard
- `published-image:plan -- --json` / `published-image:smoke -- --dry-run --json`:
  passed for public-stack release image registry/tag visibility, the
  `COMPOSE_NO_BUILD=true` delegated command, strict smoke defaults, and
  machine-readable release-plan and dry-run smoke metadata
- `published-image:smoke -- --image-tag latest`: passed with `repos/platform`
  public-stack smoke running in `mode=published_image`, completing the gateway
  proxy scenario, and cleaning up compose
- `test:published-image-smoke`: passed with a fake platform repo covering
  compose image-template validation, dry-run delegation, and secret-leak guard
- `operator:onboarding:check`: passed for the public-stack `/console/` and
  `/gateway/*` route contract, `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`, platform
  operator guide, brand-site Deployability Profiles, fourth-repo source
  fallback runbook narrative, `selfhost:readiness`, `selfhost:ports`, and
  `selfhost:ops-report`; `operator:onboarding:check -- --json` returns the same
  check results, file references, blockers, notes, and next commands as clean
  JSON without printing secret values
- `test:operator-onboarding`: passed with a fake repo covering the operator
  onboarding plan, stale platform-guide detection, brand-site planned-copy
  detection, readiness/ports/ops-report handoff command drift detection, and
  secret-leak guard
- `repos/brand-site` `npm run smoke:deployability-content`: passed for the
  bilingual Deployability Profiles route/content contract, including the
  admin-only Billing console narrative plus `selfhost:security-review` and
  `selfhost:audit-export` / `selfhost:profiles` / `selfhost:quickstart` / `selfhost:readiness -- --all` / `selfhost:readiness` / `selfhost:doctor` / `selfhost:init -- --json` / `selfhost:init -- --profile public-stack --json` / `selfhost:summary` / `selfhost:ports` /
  `selfhost:ops-report` / `selfhost:status -- --json` / `selfhost:config -- --json` / `selfhost:backup-validate` / `selfhost:restore-plan` / `selfhost:rotate -- --profile public-stack --json` / `selfhost:rotate -- --profile public-stack --confirm --json` / `deployability:quickstart` / `deployability:quickstart -- --json` / `deployability:safety` / `deployability:safety -- --json` / `deployability:doctor` / `corepack pnpm run deployability:doctor` / `corepack pnpm --silent run deployability:doctor -- --json` / `deployability:handoff` / `deployability:handoff -- --json` / `operator:onboarding:check -- --json` / `published-image:smoke -- --dry-run --json`
  commands
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
`dev:local:plan -- --json`, `dev:local:up -- --json`,
`dev:local:status -- --json`, `dev:local:logs -- --json`, and
`dev:local:down -- --json` provide machine-readable metadata for dashboards and
scripts. The lifecycle JSON paths omit child command stdout, and the logs JSON
path reports log file metadata only without printing raw log lines.

`corepack pnpm run mcp:golden-four` validates the MCP host-facing path as an
executable smoke: six-tool discovery, workspace-summary hotline search, request
preparation, signed result delivery via `send_request`, and byte-stable
`report_response` recovery.

`corepack pnpm run selfhost:profiles` lists built-in deployment profiles,
deploy directories, service counts, declared host ports, and matching doctor
commands without reading `.env`, inspecting Docker, or printing secret values;
`corepack pnpm run selfhost:quickstart` prints the recommended copy-paste
command sequence for the selected profile, including public-stack security,
published-image, onboarding, and handoff evidence steps when applicable, without
running Docker, mutating files, reading `.env`, or printing secret values;
`corepack pnpm run selfhost:plan` prints the selected profile's read-only
deployment map: purpose, deploy directory, env path, services, URLs, safety
checks, and notes. It does not call Docker, mutate files, probe the network, or
print secret values; `--json` emits the same map for generated docs, dashboards,
and management scripts;
`corepack pnpm run selfhost:readiness -- --all` prints a read-only readiness
matrix for every built-in profile; `corepack pnpm run selfhost:readiness` prints
the selected-profile deployment overview. Both combine profile files, `.env`
status, secret hygiene, public-stack origin/route blockers, URLs, declared host
ports, and next commands without calling Docker, binding sockets, probing the
network, mutating files, or printing secret values; either form accepts
`--json`, and CI/dashboard/management-script consumers should invoke it through
`corepack pnpm --silent run` to preserve clean JSON stdout with the same
readiness exit code;
`corepack pnpm run selfhost:doctor` now diagnoses local tool visibility,
profile files, `.env` presence, and secret/public-origin hygiene without calling
`docker compose`, starting services, probing the network, or printing secret values;
`corepack pnpm run selfhost:preflight` now combines secret hygiene, compose
config validation, and route output before services are started;
`corepack pnpm run selfhost:security-review` adds a non-destructive public
exposure review that repeats the secret, compose, and public route-contract
checks and prints the backup, rotation, and smoke commands an operator should
run before treating a public stack as exposure-ready;
`corepack pnpm run selfhost:audit-export` reads the selected profile `.env`,
calls the existing platform admin audit endpoint, and writes the response as a
local JSON artifact under `exports/audit/<profile>/` without printing the admin
key; `--json` emits source URL, output path, limit, item count, and safety notes
without printing the admin key or exported audit body;
`corepack pnpm run selfhost:ops-report` writes a Markdown handoff report under
`exports/selfhost/<profile>/` with URLs, host ports, secret hygiene status, and
operator commands while omitting raw secret values; `--json` emits the same
non-secret handoff data without writing a Markdown file;
`corepack pnpm run selfhost:status` is the post-start runtime management
snapshot. It calls Docker compose `ps`, checks secret hygiene status, and probes
configured health endpoints without printing secret values; `--json` emits the
same runtime service state, health checks, blockers, and safety notes for
dashboards and management scripts;
`corepack pnpm run selfhost:smoke` is the post-start acceptance gate. It checks
secret hygiene, Docker compose config, public route contract, and configured
health endpoints without printing secret values; `--json` emits smoke pass/fail,
blockers, route contract, health metadata, and safety notes while omitting
expanded compose config stdout because it may contain environment values;
`corepack pnpm run selfhost:up` is the guarded startup command. It runs init,
preflight, then Docker compose `up -d`; `--json` emits init, preflight,
compose-up, blocker, and note metadata while omitting command stdout because it
may contain sensitive values;
`corepack pnpm run selfhost:logs` is the private-operator raw log view and
supports `--service` and `--tail`; `--json` emits command metadata, selected
service, tail size, exit code, and stderr metadata while omitting raw log stdout
because application logs may contain sensitive values;
`corepack pnpm run selfhost:down` stops the selected profile through Docker
compose; `--json` emits command metadata, exit code, blockers, and stderr
metadata while omitting compose down stdout because compose output may contain
sensitive values;
`corepack pnpm run selfhost:config` validates the selected profile compose
config. The text form prints compose output for a private operator terminal;
`--json` emits pass/fail, blocker, and stderr metadata while omitting expanded
compose stdout because it can contain environment values;
`corepack pnpm run selfhost:ports` prints the selected profile's declared host
ports without binding sockets, inspecting the local network, or calling Docker;
`corepack pnpm run selfhost:summary` prints a read-only one-screen profile
overview with deploy paths, URLs, declared host ports, secret hygiene status,
and next commands without calling Docker, binding sockets, probing the network,
or printing secret values;
`corepack pnpm run selfhost:backup-plan` prints the backup directory, private
`.env` copy step, PostgreSQL dump command, and compose-config capture command
without copying files, dumping the database, or reading secret values;
`corepack pnpm run selfhost:backup-validate` checks a backup directory for
`.env`, `postgres.sql`, and `compose.config.txt` presence and size without
reading or printing `.env` secret values;
`corepack pnpm run selfhost:restore-plan` prints the downtime, private `.env`
review, `postgres.sql` import, restart, and smoke-validation sequence for a
backup directory without stopping services or importing SQL;
`corepack pnpm run selfhost:rotate-plan` prints the backup-first, downtime
window, dry-run, confirmed rotation, restart, and smoke-validation checklist
without reading or modifying `.env`;
`corepack pnpm --silent run selfhost:rotate -- --json` prints machine-readable
dry-run rotation metadata without modifying `.env`, and
`corepack pnpm --silent run selfhost:rotate -- --confirm --json` writes the
same backup/rotated `.env` artifacts as text mode while returning changed-file,
backup-path, restart/smoke next-command, and safety metadata without printing
secret values;
`corepack pnpm run selfhost:smoke` remains the post-start health endpoint check
and, for `public-stack`, also validates the edge route contract for `/healthz`,
`/platform/healthz`, `/relay/healthz`, `/gateway/healthz`, and `/console/`;
`corepack pnpm --silent run selfhost:smoke ... --json` exposes the same
post-start acceptance evidence to CI, dashboards, and management scripts without
embedding expanded compose config stdout.
For public profiles, unsafe public origin settings are warnings/failures instead
of being hidden behind a green status. `selfhost:up` reuses the preflight gate by
default and will not continue when it fails unless `--force` is passed
explicitly.

`corepack pnpm run published-image:plan` reviews the three public-stack release
images, `rsp-platform`, `rsp-relay`, and `rsp-gateway`, and confirms the compose
image templates are still parameterized by `IMAGE_REGISTRY` / `IMAGE_TAG`.
`published-image:plan -- --json` emits the same image refs, delegated command,
smoke env metadata, and safety notes for release dashboards and management
scripts without printing secret env values. `published-image:smoke -- --dry-run
--json` emits dry-run smoke status without starting Docker or printing delegated
smoke stdout.
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
`selfhost:audit-export`, `selfhost:audit-export -- --json`, `selfhost:profiles`, `selfhost:quickstart`, `selfhost:readiness -- --all`, `selfhost:readiness`, `selfhost:readiness -- --json`, `selfhost:doctor`, `selfhost:init -- --json`, `selfhost:init -- --profile public-stack --json`, `selfhost:summary`, `selfhost:ports`,
`selfhost:up -- --json`, `selfhost:smoke -- --json`, `selfhost:logs -- --json`, `selfhost:down -- --json`, `selfhost:ops-report`, `deployability:safety`, `deployability:safety -- --json`, `deployability:doctor`, `corepack pnpm run deployability:doctor`, `corepack pnpm --silent run deployability:doctor -- --json`, `deployability:handoff`, `operator:onboarding:check -- --json`,
`selfhost:plan`, `selfhost:plan -- --json`, `selfhost:backup-plan`, `selfhost:backup-validate`, `selfhost:restore-plan`, `selfhost:rotate-plan`, `selfhost:rotate -- --profile public-stack --json`, and `selfhost:rotate -- --profile public-stack --confirm --json` as pre-exposure safety,
evidence, quickstart sequencing, human-readable and machine-readable readiness overview, selected-profile deployment maps, port visibility, safe startup/log/stop command metadata, handoff-report,
machine-readable handoff, backup planning, backup-artifact validation, recovery-rehearsal, rotation-planning, and rotation-metadata commands. Capabilities that
are not ready remain outside the
green path, and secrets, public origins, and billing readiness must not be
hidden behind green status.

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
