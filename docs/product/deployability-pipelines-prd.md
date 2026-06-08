# Deployability Pipeline PRDs

> Chinese source: [./deployability-pipelines-prd.zh-CN.md](./deployability-pipelines-prd.zh-CN.md)
> Note: the Chinese document is authoritative.

Updated: 2026-06-08

## Pipeline 0: Deployability Overview

Goal: give operators and dashboards one read-only map and one compatibility
status snapshot before they choose a specific local, self-host, public-stack,
onboarding, or release-image path.

Required commands:

- `corepack pnpm run deployability:overview`
- `corepack pnpm --silent run deployability:overview -- --json`
- `corepack pnpm run deployability:quickstart`
- `corepack pnpm --silent run deployability:quickstart -- --json`
- `corepack pnpm run deployability:safety`
- `corepack pnpm --silent run deployability:safety -- --json`
- `corepack pnpm run deployability:doctor`
- `corepack pnpm --silent run deployability:doctor -- --json`
- `corepack pnpm run deployability:dashboard`
- `corepack pnpm --silent run deployability:dashboard -- --json`
- `corepack pnpm run deployability:profiles`
- `corepack pnpm --silent run deployability:profiles -- --json`
- `corepack pnpm run deployability:profiles -- --profile public-stack`
- `corepack pnpm --silent run deployability:profiles -- --profile public-stack --json`
- `corepack pnpm run deployability:action-plan`
- `corepack pnpm --silent run deployability:action-plan -- --json`
- `corepack pnpm run deployability:action-plan -- --list-profiles`
- `corepack pnpm --silent run deployability:action-plan -- --list-profiles --json`
- `corepack pnpm run deployability:action-plan -- --profile public-stack`
- `corepack pnpm --silent run deployability:action-plan -- --profile public-stack --json`
- `corepack pnpm run deployability:commands`
- `corepack pnpm --silent run deployability:commands -- --json`
- `corepack pnpm run deployability:runbook`
- `corepack pnpm --silent run deployability:runbook -- --json`
- `corepack pnpm run deployability:menu`
- `corepack pnpm --silent run deployability:menu -- --json`
- `corepack pnpm run deployability:menu -- --profile public-stack`
- `corepack pnpm --silent run deployability:menu -- --profile public-stack --json`
- `corepack pnpm run deployability:commands -- --profile public-stack`
- `corepack pnpm --silent run deployability:commands -- --profile public-stack --json`
- `corepack pnpm run compat:status`
- `corepack pnpm --silent run compat:status -- --json`
- `corepack pnpm run deployability:handoff`
- `corepack pnpm --silent run deployability:handoff -- --json`
- `corepack pnpm run test:deployability-overview`
- `corepack pnpm run test:deployability-quickstart`
- `corepack pnpm run test:deployability-safety`
- `corepack pnpm run test:deployability-doctor`
- `corepack pnpm run test:deployability-dashboard`
- `corepack pnpm run test:deployability-action-plan`
- `corepack pnpm run test:deployability-profiles`
- `corepack pnpm run test:deployability-pipeline-summaries`
- `corepack pnpm run test:deployability-commands`
- `corepack pnpm run test:compat-status`
- `corepack pnpm run test:deployability-handoff`
- `corepack pnpm run test:deployability`
- `corepack pnpm run test:deployability-operations`

Acceptance:

- overview lists Local Agent Loop, All-in-One Demo, Selfhost Platform, Public
  Stack, Recovery & Evidence, Operator Onboarding, and Published Image paths
- overview includes the human commands and machine-readable JSON commands for
  each path
- overview is read-only: it does not read `.env`, call Docker, bind ports, or
  probe network endpoints
- quickstart lists Daily Development, All-in-One Demo, Selfhost Platform,
  Public Stack, and Release Review as ordered first-use tracks without
  executing commands
- quickstart exposes `deployability:action-plan -- --list-profiles` in the
  Daily Development track before the full action plan so operators and
  dashboards can render a profile selector first
- quickstart exposes `deployability:profiles` in the Daily Development track
  before focused profile commands, so operators and dashboards can render a
  complete profile-card catalog without calling action-plan mode first
- `deployability:quickstart -- --json` emits clean track, step, safety-default,
  and next-command metadata without terminal prose or secret values
- safety matrix lists read/write/startup/stop/Docker/network/logging posture
  for top-level, local-loop, self-host, public-stack, and release-review
  commands without executing commands
- `deployability:safety -- --json` emits clean command posture, CI/dashboard
  suitability, safety-default, and next-command metadata without terminal prose
  or secret values
- doctor reports compatibility ledger, top-level scripts, documentation,
  brand-site file alignment, brand-site deployability content smoke, and
  safety-contract alignment as one read-only snapshot without executing Docker,
  reading `.env`, probing networks, or printing secrets
- `deployability:doctor -- --json` emits clean check, blocker, warning,
  evidence, safety-default, and next-command metadata without terminal prose or
  secret values
- `deployability:dashboard -- --json` emits one clean top-level payload with
  overview, quickstart, safety, doctor, and compatibility sections, section
  status, ecosystem_readiness scorecard, per-pipeline summaries, blockers,
  warnings, safety defaults, and next commands without reading `.env`, calling
  Docker, binding ports, probing networks, or printing secret values
- `deployability:action-plan -- --json` emits a clean profile-level operator
  action plan with current bundle, ecosystem readiness, recommended commands,
  dashboard-safe commands, public-exposure gate commands, service-touching
  commands, safety notes, next JSON commands, profile `attention` level/rank
  metadata, primary next commands, and top-level `recommended_profile_keys`
  without reading `.env`, calling Docker, binding ports, probing networks, or
  printing secret values
- `deployability:action-plan -- --profile public-stack --json` emits the same
  schema narrowed to `public_stack`, includes `profile_filter`, and keeps
  unknown profile names as clean blockers rather than falling back to all
  profiles
- `deployability:action-plan -- --list-profiles --json` emits a clean
  `profile_list` payload with supported keys, aliases, pipeline keys, purposes,
  safety defaults, and next profile commands without calling dashboard/catalog
  metadata, reading `.env`, calling Docker, binding ports, probing networks, or
  printing secret values
- `deployability:profiles -- --json` emits a clean `profile_catalog` payload
  with current bundle, ecosystem readiness, aliases, labels, pipeline keys,
  status, counts, next commands, next JSON commands, safety notes, shared
  `attention` metadata, and top-level `recommended_profile_keys`, derived from
  dashboard `profile_summaries` and the shared fourth-repo profile registry
  without reading `.env`, calling Docker, binding ports, probing networks, or
  printing secret values
- `deployability:profiles -- --profile public-stack --json` emits the same
  schema narrowed to `public_stack`, includes `profile_filter`, and reports
  unknown profile names as clean blockers instead of falling back to all
  profiles
- the dashboard and handoff ecosystem_readiness scorecard maps the daily-deployable
  definition to profile choice, generated secrets, startup path, doctor path,
  runtime inspection, boundary understanding, and brand-site story; when all
  checks pass it reports `daily_deployable_with_safety_gates`
- `deployability:overview`, `deployability:dashboard`, and
  `deployability:handoff` use shared fourth-repo metadata sources and
  consistency tests for ecosystem_readiness, command counts, JSON counts,
  dashboard-safe counts, CI-safe counts, public exposure gate counts, next
  commands, and safety notes
- `test:deployability` runs the top-level deployability regression suite as one
  command, covering overview, quickstart, safety, doctor, dashboard,
  profile catalog, pipeline-summary consistency, command catalog, handoff, and
  compatibility status tests
- `test:deployability-operations` runs the operator-facing deployment and
  management regression suite as one command, covering daily local doctor,
  local-stack lifecycle metadata, self-host kit behavior, published-image smoke
  orchestration, and operator onboarding contract tests
- the aggregate and operations regression gates are discoverable from the first
  command map: `deployability:overview` lists both in next commands,
  `deployability:safety` gives both an explicit top-level `contract_test`
  posture, and `deployability:commands` includes both in the searchable
  top-level catalog
- `deployability:commands -- --json` emits a clean command catalog with
  category, posture, track, and pipeline filters, merging overview,
  quickstart, and safety metadata, and inheriting base safety posture for
  profile-specific command variants without reading `.env`, calling Docker,
  binding ports, probing networks, or printing secret values
- `deployability:runbook -- --json` emits a clean `profile_runbook_index`
  payload, and `deployability:runbook -- --profile public-stack --json`
  emits a clean `profile_runbook` payload with inspect, gate, start, verify,
  operate, and evidence phases. Gate phases must appear before start phases,
  phase commands must preserve command-catalog safety posture metadata, and
  unknown profiles must return blockers instead of falling back to all profiles
- `deployability:menu -- --json` emits a clean `operator_menu` payload with
  current bundle, ecosystem readiness, recommended profile keys, profile
  choices, attention metadata, primary commands, runbook, action-plan,
  dashboard, handoff, and command-catalog entry points. Focused
  `corepack pnpm run deployability:menu -- --profile public-stack` /
  `corepack pnpm --silent run deployability:menu -- --profile public-stack --json`
  must include
  `profile_filter`, one menu choice, selected profile metadata, selected
  runbook phases, and `selected_onboarding_plan` from the read-only
  `operator:onboarding:plan` projection. The onboarding plan must preserve
  preflight, operator surface, smoke/evidence, and contract-validation phases
  without reading `.env`, calling Docker, binding ports, probing networks, or
  printing secret values
- the same `deployability:commands -- --json` payload includes
  `filters.profiles` with supported profile keys, aliases, owning pipeline
  keys, and purposes so dashboards can render the command-catalog profile
  selector without parsing prose or calling runtime commands
- `deployability:dashboard -- --json` and `deployability:handoff -- --json`
  lift that same command-catalog profile directory to top-level
  `profile_selector`, so management surfaces can render profile choices
  without knowing the internal `sections.commands.filters.profiles` path
- `deployability:dashboard -- --profile public-stack --json` and
  `deployability:handoff -- --profile public-stack --json` reuse the same
  profile resolver, emit `profile_filter`, filter command catalog and
  pipeline summaries to the owning pipeline, and keep ecosystem_readiness as
  the global daily-deployable scorecard
- focused dashboard and handoff commands are included in the daily development
  quickstart and searchable command catalog with inherited read-only posture
- dashboard and handoff JSON include `profile_summaries`, derived from
  `profile_selector` plus `pipeline_summaries`, so UI cards can show aliases,
  purpose, status, command counts, exposure gates, next commands, safety notes,
  and shared `attention` metadata from one array; both payloads also expose
  top-level `recommended_profile_keys`
- `deployability:commands -- --profile public-stack --json` resolves
  operator profile keys or aliases to the owning pipeline, emits the resolved
  `profile` filter metadata, filters the catalog to that pipeline, and reports
  unknown profile names as clean blockers instead of falling back to all
  commands
- `deployability:commands -- --track daily_dev --json` includes
  `deployability:profiles` and
  `deployability:action-plan -- --list-profiles`, `deployability:menu`, plus the daily profile
  runbook entry as `top_level` / `read_only` / dashboard-safe commands,
  sourced from quickstart and safety metadata
- `deployability:commands -- --json` does not expose `unmapped` category or
  posture values for ready-now command paths; local doctor/acceptance commands
  and full published-image smoke use explicit `runtime_diagnostic`,
  `runtime_acceptance`, and `delegated_smoke` posture labels
- `deployability:overview -- --json` emits clean pipeline, safety-default, and
  next-command metadata without terminal `[ok]` / `[fail]` prose or secret
  values
- docs and brand-site present it as the first command map, not as a replacement
  for pipeline-specific doctor/readiness/smoke gates
- `compat:status -- --json` reports current bundle, submodule SHA matches,
  dirty submodule warnings, blockers, and next validation commands as clean
  JSON without reading `.env`, calling Docker, probing networks, or printing
  secret values
- dirty submodules are visible warnings, while latest-bundle SHA mismatches and
  dirty gitlink markers remain blockers
- `deployability:handoff` writes a non-secret Markdown report under
  `exports/deployability/` unless `--output` is provided, and its JSON form
  returns the same bundle, compatibility, command-map, ecosystem_readiness,
  top-level profile selector, shared per-pipeline summary, safety-note, and
  next-command metadata without terminal prose or secret values

## Pipeline A: Local Agent Loop

Goal: make the local caller-skill/MCP loop the fastest development path.

Required commands:

- `corepack pnpm run dev:doctor`
- `corepack pnpm --silent run dev:doctor -- --json`
- `corepack pnpm run dev:local:plan`
- `corepack pnpm --silent run dev:local:plan -- --json`
- `corepack pnpm run dev:local:up`
- `corepack pnpm --silent run dev:local:up -- --json`
- `corepack pnpm run dev:local:status`
- `corepack pnpm --silent run dev:local:status -- --json`
- `corepack pnpm run dev:local:logs`
- `corepack pnpm --silent run dev:local:logs -- --json`
- `corepack pnpm run dev:local:down`
- `corepack pnpm --silent run dev:local:down -- --json`
- `corepack pnpm run test:agent-e2e`
- `corepack pnpm run test:local-stack`
- `corepack pnpm run test:mcp-golden-four`
- `corepack pnpm run mcp:golden-four`
- `corepack pnpm run dev:client:bootstrap`
- `corepack pnpm run dev:client:supervisor`

Acceptance:

- doctor passes
- `dev:doctor -- --json` returns clean machine-readable prerequisites,
  runtime-health, caller-skill check, blocker, and next-command metadata without
  raw logs or secret values
- one-command local bootstrap starts platform, relay, client bootstrap, and
  supervisor in the documented order
- managed relay/supervisor status, logs, and down commands are available
- `dev:local:plan -- --json` returns the same boot sequence, state directory,
  managed service pid/log files, and safety notes without starting services or
  reading secrets
- `dev:local:up -- --json` returns startup step status, managed relay/supervisor
  log files, next verification commands, and safety notes without printing child
  command stdout
- `dev:local:status -- --json` returns relay/supervisor running state, pid/log
  metadata, and next verification commands without printing secret values
- `dev:local:logs -- --json` returns log file presence and line-count metadata
  without printing raw log lines because local relay/supervisor logs may contain
  sensitive runtime output
- `dev:local:down -- --json` returns stop step status and safety notes without
  printing child command stdout; `--keep-platform` keeps the platform profile
  out of the stop sequence
- the command catalog maps `dev:doctor` as `runtime_diagnostic` and
  `test:agent-e2e` / `mcp:golden-four` as `runtime_acceptance`, with matching
  Local Agent Loop human and JSON command summary positions for status, logs,
  down, doctor, and acceptance commands
- six caller-skill actions are visible
- bundled workspace-summary Hotline can run end to end
- executable MCP golden-four smoke validates tool discovery, hotline search,
  request preparation, signed result delivery, and report recovery
- docs and brand-site describe this as the fastest local path

## Pipeline A1: All-in-One Demo Profile

Goal: give a fresh operator one single-machine product-evaluation path before
they split caller, responder, relay, and platform responsibilities.

Required commands:

- `corepack pnpm run selfhost:quickstart -- --profile all-in-one`
- `corepack pnpm --silent run selfhost:quickstart -- --profile all-in-one --json`
- `corepack pnpm run selfhost:readiness -- --profile all-in-one`
- `corepack pnpm --silent run selfhost:readiness -- --profile all-in-one --json`
- `corepack pnpm run selfhost:init -- --profile all-in-one`
- `corepack pnpm --silent run selfhost:init -- --profile all-in-one --json`
- `corepack pnpm run selfhost:preflight -- --profile all-in-one`
- `corepack pnpm --silent run selfhost:preflight -- --profile all-in-one --json`
- `corepack pnpm run selfhost:up -- --profile all-in-one`
- `corepack pnpm --silent run selfhost:up -- --profile all-in-one --json`
- `corepack pnpm run selfhost:status -- --profile all-in-one`
- `corepack pnpm --silent run selfhost:status -- --profile all-in-one --json`
- `corepack pnpm run selfhost:smoke -- --profile all-in-one`
- `corepack pnpm --silent run selfhost:smoke -- --profile all-in-one --json`

Acceptance:

- deployability overview shows All-in-One Demo as `ready_now` between Local
  Agent Loop and Selfhost Platform
- deployability quickstart exposes `all_in_one_demo` as its own first-use track
- deployability commands can filter by `--pipeline all_in_one_demo` and
  `--track all_in_one_demo`
- all-in-one profile-specific command variants inherit the base selfhost safety
  posture instead of showing `unmapped`
- dashboard and handoff pipeline summaries include All-in-One Demo through the
  same shared metadata source
- docs and brand-site present all-in-one as a local evaluation profile, not as
  public exposure or formal production readiness

## Pipeline B: Self-host Platform Profile

Goal: make `repos/platform/deploy/platform` safe to initialize and inspect.

Required commands:

- `corepack pnpm run selfhost:init`
- `corepack pnpm --silent run selfhost:init -- --json`
- `corepack pnpm run selfhost:profiles`
- `corepack pnpm --silent run selfhost:profiles -- --json`
- `corepack pnpm run selfhost:quickstart`
- `corepack pnpm --silent run selfhost:quickstart -- --json`
- `corepack pnpm run selfhost:readiness -- --all`
- `corepack pnpm --silent run selfhost:readiness -- --all --json`
- `corepack pnpm run selfhost:readiness`
- `corepack pnpm --silent run selfhost:readiness -- --json`
- `corepack pnpm run selfhost:doctor`
- `corepack pnpm --silent run selfhost:doctor -- --json`
- `corepack pnpm run selfhost:preflight`
- `corepack pnpm --silent run selfhost:preflight -- --json`
- `corepack pnpm run selfhost:up`
- `corepack pnpm --silent run selfhost:up -- --json`
- `corepack pnpm run selfhost:status`
- `corepack pnpm --silent run selfhost:status -- --json`
- `corepack pnpm run selfhost:smoke`
- `corepack pnpm --silent run selfhost:smoke -- --json`
- `corepack pnpm run selfhost:security-review`
- `corepack pnpm --silent run selfhost:security-review -- --json`
- `corepack pnpm run selfhost:audit-export`
- `corepack pnpm --silent run selfhost:audit-export -- --json`
- `corepack pnpm run selfhost:config`
- `corepack pnpm --silent run selfhost:config -- --json`
- `corepack pnpm run selfhost:plan`
- `corepack pnpm --silent run selfhost:plan -- --json`
- `corepack pnpm run selfhost:summary`
- `corepack pnpm --silent run selfhost:summary -- --json`
- `corepack pnpm run selfhost:urls`
- `corepack pnpm --silent run selfhost:urls -- --json`
- `corepack pnpm run selfhost:ports`
- `corepack pnpm --silent run selfhost:ports -- --json`
- `corepack pnpm run selfhost:logs`
- `corepack pnpm --silent run selfhost:logs -- --json`
- `corepack pnpm run selfhost:down`
- `corepack pnpm --silent run selfhost:down -- --json`
- `corepack pnpm run selfhost:ops-report`
- `corepack pnpm --silent run selfhost:ops-report -- --json`
- `corepack pnpm run selfhost:backup-plan`
- `corepack pnpm --silent run selfhost:backup-plan -- --json`
- `corepack pnpm run selfhost:backup-validate`
- `corepack pnpm --silent run selfhost:backup-validate -- --backup-dir <dir> --json`
- `corepack pnpm run selfhost:restore-plan`
- `corepack pnpm --silent run selfhost:restore-plan -- --backup-dir <dir> --json`
- `corepack pnpm run selfhost:rotate-plan`
- `corepack pnpm --silent run selfhost:rotate-plan -- --json`
- `corepack pnpm --silent run selfhost:rotate -- --json`
- `corepack pnpm --silent run selfhost:rotate -- --confirm --json`
- `corepack pnpm run test:selfhost-kit`

Acceptance:

- `.env` is created from `.env.example` when missing
- placeholder secrets are replaced with generated values
- `selfhost:init -- --json` returns clean created/hardened `.env` metadata,
  secret hygiene statuses, warnings, changed files, and next commands without
  printing generated secret values or URL prose
- profiles lists built-in deployment profiles, purpose, deploy directories,
  service counts, declared host ports, and matching doctor commands without
  reading `.env` or touching Docker; `--json` returns the same profile selector
  data for consoles, dashboards, and scripts
- quickstart prints the recommended copy-paste command sequence for the
  selected profile without executing Docker, mutating files, or printing
  secrets; `--json` returns the same ordered sequence for consoles and scripts
- readiness prints a read-only deployment overview for one profile, and
  `readiness --all` prints a built-in profile matrix; both combine profile file
  presence, `.env` status, secret hygiene, public-stack origin/route blockers,
  URLs, declared host ports, and next commands without executing Docker,
  mutating files, probing the network, binding sockets, or printing secrets;
  `--json` prints machine-readable `ok`, `blockers`, and `next` fields for the
  same single-profile or all-profile readiness checks
- doctor checks local tool visibility, profile files, `.env` presence, and
  secret/public-origin hygiene without calling `docker compose`, starting
  services, probing the network, or printing secrets; `--json` returns the same
  checks, blocker status, and next commands for dashboards and scripts with the
  same exit-code semantics
- status shows Docker compose state and health endpoints; `--json` returns the
  same runtime service state, secret hygiene status, health checks, blockers,
  and safety notes for dashboards and management scripts without printing
  secret values
- config validates Docker compose config; `--json` returns pass/fail, blocker,
  and stderr metadata for CI, dashboards, and management scripts while omitting
  expanded compose stdout because it can contain environment values
- smoke checks secret hygiene, compose config, public route contract, and health
  endpoints; `--json` returns the same post-start acceptance result, blockers,
  route contract, health metadata, and safety notes for CI, dashboards, and
  management scripts while omitting expanded compose config stdout because it
  can contain environment values
- preflight checks secret hygiene, compose config, and routes before `up`,
  without requiring services to be running; `--json` preserves the same
  exit-code semantics and returns machine-readable secret hygiene, compose
  config, route, blocker, and safety-note fields without printing secret values
- `selfhost:up` reuses the preflight gate by default; it does not continue
  when preflight fails unless `--force` is passed explicitly
- `selfhost:up -- --json` returns machine-readable init, preflight, compose-up,
  blocker, and note fields without printing init, preflight, or Docker compose
  up stdout
- logs can be filtered by service and tail length; `--json` returns command
  metadata, exit status, stderr lines, selected service, and tail size while
  omitting Docker compose logs stdout because application logs may contain
  sensitive values
- down stops the selected profile; `--json` returns command metadata, exit
  status, stderr lines, and blockers while omitting Docker compose down stdout
  because compose output may contain sensitive values
- summary prints a one-screen, read-only profile overview with deploy paths,
  URLs, declared host ports, secret hygiene status, and next commands without
  calling Docker, binding sockets, probing the network, or printing secrets;
  `--json` returns the same overview card data for dashboards and scripts
- plan prints a read-only deployment map with purpose, services, URLs, and
  safety checks without calling Docker or printing secrets; `--json` returns
  the same profile explanation data for dashboards, generated docs, and scripts
- backup and rotation are explicit plans before destructive action
- security review is a non-destructive public exposure gate that checks secret
  hygiene, compose config, route contracts, and backup/rotation/smoke
  prerequisites
- audit export writes platform admin audit events to a local JSON artifact
  without printing admin keys; `--json` returns export metadata including source
  URL, output path, limit, item count, and safety notes without printing the
  admin key or exported audit body
- ops report writes a Markdown handoff artifact with URLs, host ports, secret
  hygiene status, and operator commands without raw secret values; `--json`
  returns the same non-secret handoff data for dashboards, CI, and management
  scripts without writing a Markdown file
- urls prints the selected profile URL inventory without calling Docker,
  binding sockets, probing the network, or printing secrets; `--json` returns
  the same URL inventory for dashboards and scripts
- ports prints declared host port usage for the selected profile without
  binding sockets or calling Docker; `--json` returns the same declared port
  inventory for dashboards and scripts
- backup plan prints the manual backup checklist without copying files,
  dumping the database, or reading secret values; `--json` returns the same
  backup directory, ordered plan steps, next backup-validate command, and
  safety notes for dashboards, CI, and recovery rehearsal scripts
- backup validate checks `.env`, `postgres.sql`, and `compose.config.txt`
  presence/size without reading or printing secret values; `--json` returns
  machine-readable file status, blockers, next restore-plan command, and safety
  notes for dashboards, CI, and recovery rehearsal scripts
- restore plan prints a recovery rehearsal sequence for backup directories
  without stopping services or importing SQL; `--json` returns the same ordered
  recovery steps and safety notes for dashboards, CI, and recovery rehearsal
  scripts
- rotate plan prints the manual secret rotation checklist without reading or
  changing `.env`; `--json` returns the same backup-first, dry-run, confirm,
  restart, smoke-validation steps and safety notes for dashboards, CI, and
  operator runbooks
- rotate dry-run JSON reports the selected `.env` path, keys that would rotate,
  next commands, and safety notes without changing files or printing secret
  values; confirmed rotate JSON writes the `.env.rotate-backup-*` artifact and
  reports changed-file metadata plus restart/smoke next commands without
  printing generated secret values
- selfhost kit has automated coverage for env creation and secret rotation dry-run/confirm behavior
- no command prints secret values

## Pipeline B1: Recovery & Evidence

Goal: make the operator handoff, audit evidence, backup validation, restore
rehearsal, and secret rotation path visible as one top-level deployability
pipeline before public exposure or handoff.

Required commands:

- `corepack pnpm run selfhost:ops-report`
- `corepack pnpm --silent run selfhost:ops-report -- --json`
- `corepack pnpm run selfhost:audit-export`
- `corepack pnpm --silent run selfhost:audit-export -- --json`
- `corepack pnpm run selfhost:backup-plan`
- `corepack pnpm --silent run selfhost:backup-plan -- --json`
- `corepack pnpm run selfhost:backup-validate`
- `corepack pnpm --silent run selfhost:backup-validate -- --backup-dir <backup-dir> --json`
- `corepack pnpm run selfhost:restore-plan`
- `corepack pnpm --silent run selfhost:restore-plan -- --backup-dir <backup-dir> --json`
- `corepack pnpm run selfhost:rotate-plan`
- `corepack pnpm --silent run selfhost:rotate-plan -- --json`
- `corepack pnpm --silent run selfhost:rotate -- --json`

Acceptance:

- deployability overview shows Recovery & Evidence as `ready_now`
- deployability dashboard and handoff expose `recovery_evidence` through the
  same shared pipeline summary metadata as overview
- `deployability:commands -- --pipeline recovery_evidence` returns the handoff,
  audit export, backup, restore, and rotation commands without `unmapped`
  posture entries
- safety matrix labels the commands as `writes_report`, `exports_evidence`,
  `read_only`, or `writes_env` so dashboards can explain risk before services
  start or public exposure is attempted
- docs and brand-site present this as evidence and recovery readiness, not as a
  destructive restore or automatic rotation workflow

## Pipeline C: Public Stack Profile

Goal: make `repos/platform/deploy/public-stack` understandable before public exposure.

Required behavior:

- `--profile public-stack` support in self-host helper
- generated admin and bootstrap secrets
- public route list
- `selfhost:preflight -- --profile public-stack` checks public routes and
  exposure blockers before `up`
- `selfhost:security-review -- --profile public-stack` checks the public
  exposure contract without starting services; `--json` returns the same secret
  hygiene, compose config, route contract, operational prerequisite, blocker,
  and safety-note fields for dashboards and deployment controllers
- `selfhost:up -- --profile public-stack` is blocked by preflight by default
  so unsafe public origins are not started accidentally
- clear warning when `PUBLIC_SITE_ADDRESS` is still localhost
- public-stack smoke fails when the public origin is still unsafe
- `selfhost:smoke -- --profile public-stack` checks the public route contract,
  not only health endpoint reachability

Acceptance:

- operator can inspect ports, routes, and secrets status before `up`
- operator can run one non-destructive command to review public exposure
  readiness before treating the stack as ready to expose
- smoke lists and validates edge routes for `/healthz`, `/platform/healthz`,
  `/relay/healthz`, `/gateway/healthz`, and `/console/`
- docs describe platform, relay, gateway, console, and edge roles

## Pipeline D: Management Console

Goal: move operational state from terminal-only checks into console surfaces.

Acceptance:

- runtime page shows platform, relay, caller, responder, skill adapter, MCP adapter
- settings page explains local/public mode and approval policies
- logs page can guide users without dumping secrets
- billing readiness is explicit instead of implied
- Platform Console has an admin-only `/billing` page for tenant setup, balance
  inspection, manual recharge capture, and ledger review through the gateway
  proxy
- public-stack `/console/` and gateway session flow are explained and
  validated as the operator's first-use entry point

## Pipeline E: Brand Site

Goal: make the public narrative match the deployability work.

Acceptance:

- homepage/docs explain the deployment profiles
- `/docs/deployability-profiles` and `/en/docs/deployability-profiles` explain
  Local Agent Loop, All-in-One Demo, Selfhost Platform, Public Stack,
  Management Console, ready-now versus planned boundaries, and secret-safety
  defaults
- Deployability Profiles include `selfhost:init -- --json` and the public-stack
  variant as machine-readable first-run initialization commands
- Deployability Profiles include `test:deployability` and
  `test:deployability-operations`, explaining that both gates are discoverable
  from overview next commands, the safety matrix `contract_test` posture, and
  the searchable command catalog
- Deployability Profiles include `deployability:action-plan` and explain that
  it is the read-only operator next-action selector between the dashboard and
  full command catalog
- Deployability Profiles include the focused
  `deployability:action-plan -- --profile public-stack --json` path and explain
  profile aliases plus unknown-profile blockers
- Deployability Profiles explain that dashboard and handoff expose top-level
  `profile_selector` metadata sourced from the command catalog, so management
  surfaces do not need to parse prose or runtime commands
- Deployability Profiles include focused dashboard and handoff examples for
  `--profile public-stack`, explaining that profile focus filters management
  metadata without changing the global ecosystem_readiness scorecard
- Deployability Profiles explain `profile_summaries` as a dashboard/handoff
  convenience projection for management UI cards
- Deployability Profiles explain that ready-now command catalog entries do not
  fall back to `unmapped`, including `runtime_diagnostic`,
  `runtime_acceptance`, and `delegated_smoke` posture examples
- console prototype highlights management rather than only visual polish
- self-host messaging is honest about what is ready now versus planned
- brand-site build and deployability-content smoke pass

## Pipeline F: Published Image Release Smoke

Goal: provide a fourth-repo entry point for public-stack published-image
validation without copying the release implementation owned by `repos/platform`.

Required commands:

- `corepack pnpm run published-image:plan`
- `corepack pnpm --silent run published-image:plan -- --json`
- `corepack pnpm run published-image:smoke`
- `corepack pnpm --silent run published-image:smoke -- --dry-run --json`
- `corepack pnpm run test:published-image-smoke`

Required behavior:

- plan prints resolved registry/tag refs for `rsp-platform`, `rsp-relay`, and
  `rsp-gateway`
- plan validates that the three release images in
  `repos/platform/deploy/public-stack/docker-compose.yml` are parameterized by
  `IMAGE_REGISTRY` and `IMAGE_TAG`
- plan `--json` emits the same image refs, compose path, platform smoke script,
  delegated command, smoke env metadata, and safety notes without printing
  secret env values
- smoke delegates to `repos/platform` `test:public-stack-smoke`
- smoke `--dry-run --json` emits the same image refs, delegated command, smoke
  env metadata, dry-run result status, and safety notes without running Docker
  or printing delegated smoke stdout
- smoke sets `COMPOSE_NO_BUILD=true` by default so platform smoke pulls
  published images instead of building locally
- smoke uses strict Docker mode by default; only explicit `--allow-skip`
  permits local probe-style skipping
- command output shows only registry, tag, and command shape, never admin keys,
  bootstrap secrets, or `.env` values
- the command catalog maps dry-run smoke as dashboard-safe metadata and the
  real `published-image:smoke -- --image-tag <candidate-tag>` command as
  `delegated_smoke` instead of `unmapped`

Acceptance:

- operators can review the exact images and delegated platform smoke command
  before running Docker
- CI, dashboards, and release-management scripts can consume the plan as clean
  JSON before deciding whether to run Docker
- `--image-registry` and `--image-tag` support candidate release tags
- dry-run validates the orchestration contract without Docker
- release-management scripts can consume dry-run smoke status as clean JSON
  before starting a strict Docker smoke
- real container startup, health, and gateway scenario checks remain owned by
  `repos/platform`

## Pipeline G: Operator Onboarding Contract

Goal: turn platform-first/operator-first onboarding from a runbook into a
fourth-repo-checkable first-use contract.

Required commands:

- `corepack pnpm run operator:onboarding:plan`
- `corepack pnpm --silent run operator:onboarding:plan -- --json`
- `corepack pnpm run operator:onboarding:check`
- `corepack pnpm --silent run operator:onboarding:check -- --json`
- `corepack pnpm run test:operator-onboarding`

Required behavior:

- plan prints the public-stack first-use order: generated env, readiness
  overview, declared port inventory, preflight, `up`, open `/console/`, gateway
  session setup, credential persistence, route smoke, non-secret ops handoff
  report, and published-image smoke
- plan `--json` emits the same first-use phases, commands, safety notes, and
  next validation command for console, CI, and deployment-script consumption
  without parsing terminal prose or printing secrets
- check validates that public-stack `Caddyfile`, compose, and README agree on
  `/console/`, `/gateway/*`, and `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`
- check validates that the platform operator guide no longer claims
  `platform-console` is not bundled
- check validates that the fourth-repo source operator runbook still covers
  both automatic approval and manual approval pause branches plus the
  public-stack `selfhost:readiness`, `selfhost:ports`, and
  `selfhost:ops-report` handoff commands
- check validates that brand-site Deployability Profiles mark Operator
  Onboarding as a verifiable path, not as planned
- check `--json` emits the same pass/fail checks, file references, blockers,
  safety notes, and next validation commands without parsing terminal prose or
  printing secrets

Acceptance:

- an operator can find the public-stack first-use URL, admin credential setup
  flow, readiness overview, declared ports, non-secret handoff report, and gateway proxy
  verification path without reading the full protocol
- a management surface or CI job can consume the first-use plan as clean JSON
  through `corepack pnpm --silent run operator:onboarding:plan -- --json`
- a management surface or CI job can consume onboarding contract check results
  as clean JSON through `corepack pnpm --silent run operator:onboarding:check -- --json`
- fourth-repo check fails when docs drift away from the actual public-stack
  route contract
- this path still does not claim billing, email transport, or marketplace
  production readiness as complete
- billing management evidence is limited to the admin-only Platform Console
  page and must not be presented as end-user billing readiness
