# Deployability Ecosystem PRD

> Chinese source: [./deployability-ecosystem-prd.zh-CN.md](./deployability-ecosystem-prd.zh-CN.md)
> Note: the Chinese document is authoritative.

Updated: 2026-06-08

## 1. Background

CALL ANYTHING already has the correct repository split:

- `repos/protocol` owns contracts and templates
- `repos/client` owns caller/responder local runtime and agent-facing tools
- `repos/platform` owns platform API, relay, gateway, persistence, and deploy manifests
- the fourth repository owns orchestration, compatibility ledgers, validation, and local cross-repo development
- `repos/brand-site` explains the product and console shape

The next product objective is to make the full architecture as easy to deploy,
manage, understand, and operate safely as projects such as Sub2API and
CLIProxyAPI: one clear deployment path, generated secrets, understandable
management surfaces, health/status commands, and explicit security defaults.

External reference anchors:

- [Sub2API](https://github.com/Wei-Shaw/Sub2API): self-hosted AI API aggregation with Docker deployment, admin UI, data directory, generated secrets, rate limiting, billing, and monitoring.
- [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI): CLI/API proxy management with Docker deployment, management API, hot reload, Web UI, logging, dashboards, and token/security controls.

## 2. Product Goal

Make CALL ANYTHING deployable as a managed local/self-hosted system with:

- one obvious quick-start path
- a small number of named deployment profiles
- generated production-grade local secrets
- deterministic health checks
- simple status/logs lifecycle commands
- console-visible runtime state
- safety controls that are understandable before the first public exposure

## 3. User Personas

- **Solo operator**: wants to expose one private workflow as a Hotline without learning the full protocol first.
- **Agent developer**: wants a local caller-skill/MCP loop that can be started, checked, and reset quickly.
- **Self-host administrator**: wants a public or private platform stack with clear env, ports, logs, and safety controls.
- **Brand-site reader**: wants to understand what to deploy and why it is safe before touching code.

## 4. Readiness Definition

The ecosystem is "daily-deployable" when a fresh operator can:

1. choose a profile: local agent loop, all-in-one demo, public platform, or formal production stack
2. generate `.env` secrets without editing placeholder values by hand
3. start the selected profile with one command or one copied command block
4. run a doctor command and see all required endpoints
5. inspect logs and container/service state from one entry point
6. understand which data stays local, which metadata reaches the platform, and which secrets must rotate
7. find the same deployment story on the brand site

## 5. Non-Goals

- Do not move protocol, client, or platform business truth into the fourth repository.
- Do not duplicate formal deploy manifests from `repos/platform`.
- Do not claim production readiness for billing, email, or public marketplace behavior before their own gates pass.
- Do not hide unsafe defaults behind a green "ready" label.

## 6. Capability Map

| Capability | Owner | Initial Work |
| --- | --- | --- |
| Compatibility ledger | fourth repo | change bundles and required gates |
| Compatibility status | fourth repo | `corepack pnpm run compat:status`, plus `corepack pnpm --silent run compat:status -- --json` for current bundle, submodule SHA, dirty-worktree, blocker, and warning metadata |
| Deployability overview | fourth repo | `corepack pnpm run deployability:overview`, plus `corepack pnpm --silent run deployability:overview -- --json` as the read-only command map for all deployment and management paths |
| Deployability quickstart | fourth repo | `corepack pnpm run deployability:quickstart`, plus `corepack pnpm --silent run deployability:quickstart -- --json` as the read-only first-use guide for daily development, self-host, public-stack, and release-review paths |
| Deployability safety matrix | fourth repo | `corepack pnpm run deployability:safety`, plus `corepack pnpm --silent run deployability:safety -- --json` as the descriptive read/write/startup/network/logging posture map for deployment commands |
| Deployability doctor | fourth repo | `corepack pnpm run deployability:doctor`, plus `corepack pnpm --silent run deployability:doctor -- --json` as the read-only readiness snapshot for compatibility ledger, top-level scripts, docs, brand-site, and safety-contract alignment |
| Deployability dashboard | fourth repo | `corepack pnpm run deployability:dashboard`, plus `corepack pnpm --silent run deployability:dashboard -- --json` as the single read-only aggregate payload for top-level dashboards and CI, combining overview, quickstart, safety, doctor, and compatibility sections |
| Deployability commands catalog | fourth repo | `corepack pnpm run deployability:commands`, plus `corepack pnpm --silent run deployability:commands -- --json` as the read-only searchable command catalog with category, posture, first-use track, and pipeline filters |
| Deployability handoff | fourth repo | `corepack pnpm run deployability:handoff`, plus `corepack pnpm --silent run deployability:handoff -- --json` for a non-secret ecosystem handoff report under `exports/deployability/` |
| Daily local doctor | fourth repo | `corepack pnpm run dev:doctor`, plus `corepack pnpm --silent run dev:doctor -- --json` for dashboards and scripts |
| Local agent loop management metadata | fourth repo | `corepack pnpm run dev:local:plan`, `dev:local:up`, `dev:local:status`, `dev:local:logs`, and `dev:local:down`, plus `--json` for dashboards and scripts |
| Agent-facing smoke | fourth repo | `corepack pnpm run test:agent-e2e` |
| Self-host deployment map | fourth repo | `corepack pnpm run selfhost:profiles` |
| Self-host quickstart sequence | fourth repo | `corepack pnpm run selfhost:quickstart` |
| Self-host readiness overview | fourth repo | `corepack pnpm run selfhost:readiness -- --all`, plus `corepack pnpm --silent run ... --json` for automation |
| Self-host deployment doctor | fourth repo | `corepack pnpm run selfhost:doctor`, plus `--json` for diagnostic panels |
| Self-host env generator | fourth repo | `corepack pnpm run selfhost:init`, plus `corepack pnpm --silent run selfhost:init -- --json` for created/hardened `.env` metadata without secret values or URL prose |
| Self-host profile plan | fourth repo | `corepack pnpm run selfhost:plan`, plus `--json` for generated docs and dashboards |
| Self-host profile summary | fourth repo | `corepack pnpm run selfhost:summary`, plus `--json` for overview cards |
| Self-host URL inventory | fourth repo | `corepack pnpm run selfhost:urls`, plus `--json` for dashboards and scripts |
| Self-host declared ports inventory | fourth repo | `corepack pnpm run selfhost:ports`, plus `--json` for dashboards and scripts |
| Self-host ops handoff | fourth repo | `corepack pnpm run selfhost:ops-report`, plus `--json` for dashboards and management scripts |
| Self-host preflight gate | fourth repo | `corepack pnpm run selfhost:preflight`, plus `--json` for deployment controllers |
| Self-host runtime status | fourth repo | `corepack pnpm run selfhost:status`, plus `--json` for dashboards and management scripts |
| Self-host smoke acceptance | fourth repo | `corepack pnpm run selfhost:smoke`, plus `--json` for CI, dashboards, and management scripts |
| Self-host compose config validation | fourth repo | `corepack pnpm run selfhost:config`, plus `--json` for CI and dashboards |
| Self-host security review | fourth repo | `corepack pnpm run selfhost:security-review`, plus `--json` for public exposure dashboards |
| Self-host audit evidence export | fourth repo | `corepack pnpm run selfhost:audit-export`, plus `--json` for export metadata |
| Self-host backup planning | fourth repo | `corepack pnpm run selfhost:backup-plan`, plus `--json` for recovery rehearsal scripts |
| Self-host backup validation | fourth repo | `corepack pnpm run selfhost:backup-validate`, plus `--json` for recovery rehearsal scripts |
| Self-host restore rehearsal | fourth repo | `corepack pnpm run selfhost:restore-plan`, plus `--json` for recovery rehearsal scripts |
| Self-host rotation planning and execution metadata | fourth repo | `corepack pnpm run selfhost:rotate-plan`, plus `selfhost:rotate -- --json` / `selfhost:rotate -- --confirm --json` for safe dry-run and confirmed-rotation metadata |
| Compose lifecycle wrapper | fourth repo | delegate to `repos/platform/deploy/*`; `selfhost:up -- --json`, `selfhost:logs -- --json`, and `selfhost:down -- --json` emit command metadata without raw compose stdout |
| Published-image smoke wrapper | fourth repo | delegate to `repos/platform` public-stack smoke; `published-image:plan -- --json` and `published-image:smoke -- --dry-run --json` for release dashboards and management scripts |
| Operator onboarding contract | fourth repo | `operator:onboarding:check` keeps public-stack, brand-site, and runbooks aligned; `operator:onboarding:check -- --json` emits check results and blockers for CI and dashboards |
| Public stack deploy manifests | `repos/platform` | existing `deploy/public-stack` |
| Billing admin read model | `repos/platform` | admin-only tenant, balance, recharge, and ledger endpoints plus Platform Console management page |
| Runtime console | `repos/client` and `repos/platform` | status, logs, settings, approvals |
| Brand explanation | `repos/brand-site` | deployability narrative and quick-start entry |

## 7. Security Defaults

Required baseline:

- generated `TOKEN_SECRET`, `PLATFORM_ADMIN_API_KEY`, and console bootstrap secrets
- warning or failure when default `change-me` secrets remain
- no public stack "ready" verdict without admin secret and bootstrap secret
- explicit local/public boundary in docs
- health checks that do not leak secrets
- logs/status commands that help debug without dumping `.env`
- machine-readable status output for dashboards without leaking secret values
- machine-readable compose config validation that omits expanded compose stdout
  because it can contain environment values
- machine-readable logs metadata that omits raw log stdout because application
  logs may contain sensitive values
- machine-readable rotation metadata that reports dry-run/confirmed status,
  changed-file paths, backup path, and next commands without printing rotated
  secret values
- machine-readable stop-command metadata that omits compose down stdout because
  compose output may contain sensitive values
- machine-readable startup metadata that omits init, preflight, and compose up
  stdout because command output may contain sensitive values
- machine-readable env initialization metadata that reports created/hardened
  `.env` files, secret hygiene statuses, warnings, and next commands without
  printing generated secret values or profile URL prose
- machine-readable smoke metadata that omits expanded compose config stdout
  because it can contain environment values
- machine-readable audit export metadata that does not print admin keys or the
  exported audit body
- machine-readable local agent loop log metadata that does not print raw local
  relay or supervisor log lines
- machine-readable local agent loop startup/stop metadata that omits child
  command stdout because local bootstrap and stop output can contain
  environment-specific runtime details
- machine-readable daily local doctor metadata that reports prerequisites,
  runtime health, caller-skill checks, blockers, and next commands without raw
  logs or secret values
- machine-readable deployability overview metadata that lists pipelines,
  commands, JSON entry points, safety notes, and next commands without reading
  `.env`, calling Docker, binding ports, probing networks, or printing secrets
- machine-readable deployability quickstart metadata that lists first-use
  tracks, ordered commands, JSON entry points, safety notes, and next commands
  without reading `.env`, calling Docker, binding ports, probing networks, or
  printing secrets
- machine-readable deployability safety metadata that lists command categories,
  read/write/startup/network/logging posture, CI/dashboard suitability, safety
  notes, and next commands without reading `.env`, calling Docker, binding
  ports, probing networks, or printing secrets
- machine-readable deployability doctor metadata that reports compatibility
  ledger, script, documentation, brand-site, and safety-contract checks,
  blockers, warnings, and next commands without reading `.env`, calling Docker,
  binding ports, probing networks, or printing secrets
- machine-readable deployability dashboard metadata that aggregates overview,
  quickstart, safety, doctor, and compatibility JSON sections as one top-level
  payload without reading `.env`, calling Docker, binding ports, probing
  networks, or printing secrets
- machine-readable deployability command catalog metadata that merges overview,
  quickstart, and safety metadata into a filterable command list without
  reading `.env`, calling Docker, binding ports, probing networks, or printing
  secrets
- machine-readable compatibility status metadata that reports the current
  bundle, submodule SHAs, ledger matches, dirty submodules, blockers, warnings,
  and next commands without reading `.env`, calling Docker, probing networks, or
  printing secrets
- machine-readable deployability handoff metadata, paired with a non-secret
  Markdown report, that combines current bundle, compatibility warnings,
  command map, safety notes, and next validation commands without reading
  `.env`, calling Docker, probing networks, or printing secrets

## 8. Success Metrics

- A fresh checkout can run `deployability:overview`,
  `deployability:overview -- --json`, `deployability:quickstart`,
  `deployability:quickstart -- --json`, `deployability:safety`,
  `deployability:safety -- --json`, `deployability:doctor`,
  `deployability:doctor -- --json`, `deployability:dashboard`,
  `deployability:dashboard -- --json`, `deployability:commands`,
  `deployability:commands -- --json`, `compat:status`,
  `compat:status -- --json`, `deployability:handoff`,
  `deployability:handoff -- --json`, `dev:local:plan -- --json`,
  `dev:local:up -- --json`, `dev:local:status -- --json`,
  `dev:local:logs -- --json`, `dev:local:down -- --json`,
  `selfhost:profiles`, `selfhost:quickstart`,
  `selfhost:readiness -- --all`, `selfhost:readiness`, `selfhost:doctor`,
  `selfhost:init`, `selfhost:init -- --json`, `selfhost:summary`,
  `selfhost:preflight`, `selfhost:status`,
  `selfhost:status -- --json`, `selfhost:up -- --json`, `selfhost:logs -- --json`,
  `selfhost:down -- --json`, `selfhost:smoke -- --json`, `dev:doctor`,
  `dev:doctor -- --json`,
  `test:agent-e2e`, `published-image:plan -- --json`,
  `published-image:smoke -- --dry-run --json`, `selfhost:security-review`,
  `selfhost:audit-export -- --json`, `operator:onboarding:check`, and
  `operator:onboarding:check -- --json`.
- Platform billing operators have an admin-only API and Platform Console page
  for tenant setup, balance inspection, manual recharge capture, and ledger
  browsing, while end-user billing remains outside the ready verdict.
- PRD, runbooks, README, and brand-site copy use the same named profiles.
- Fourth-repo CI remains green after adding orchestration helpers.
- Brand-site build remains green after messaging updates.

## 9. Milestones

### M1: Management spine

- Add PRDs.
- Add self-host env/lifecycle helper.
- Update daily runbooks and readiness docs.
- Update brand-site copy to explain the new deployment philosophy.

### M2: One-command profile launcher

- Add profile-specific `up/down/logs/status` wrappers.
- Add `selfhost:up -- --json` so dashboards and management scripts can consume
  startup preflight, compose-up status, blockers, and notes without embedding
  init, preflight, or Docker compose up stdout.
- Add `selfhost:logs -- --json` so dashboards and management scripts can check
  log command execution, service filter, tail size, and stderr metadata without
  embedding raw application log stdout.
- Add `selfhost:down -- --json` so dashboards and management scripts can check
  stop command execution, exit status, blockers, and stderr metadata without
  embedding raw Docker compose down stdout.
- Add smoke checks per profile, plus `selfhost:smoke -- --json` so CI,
  dashboards, and management scripts can consume post-start secret hygiene,
  compose config, public route contract, health endpoint, blocker, and note
  metadata without embedding expanded compose config stdout.
- Add explicit failure messages for unsafe secrets.

### M3: Console management parity

- Make runtime status, logs, approval policy, adapter health, and billing readiness visible in console surfaces.
- Add operator-first public-stack onboarding checks.
- Add a platform-owned billing admin read model before exposing client-facing
  billing workflows.
- Expose that billing read model in Platform Console as an admin-only operator
  page through the gateway proxy, without leaking admin keys to the browser.
- Keep public-stack `/console/`, gateway session flow, and brand-site Operator
  Onboarding narrative aligned.

### M4: Production hardening

- Add backup/restore, rotation, audit export, and public-stack security review gates.
- Start with a non-destructive `selfhost:security-review` gate that verifies
  secret hygiene, compose config, public route contracts, and operator
  backup/rotation/smoke prerequisites before public exposure. Add `--json` so
  dashboards and deployment controllers can consume the same public exposure
  blockers and safety notes without parsing terminal prose.
- Add `selfhost:plan -- --json` so generated docs, dashboards, and scripts can
  consume the same read-only profile purpose, services, URLs, and safety checks
  that operators see in terminal output.
- Add `selfhost:audit-export` so operators can save platform admin audit events
  as local JSON evidence without printing admin keys. Add `--json` so dashboards,
  CI, and management scripts can consume source URL, output path, limit, item
  count, and safety notes without printing the admin key or exported audit body.
- Add `selfhost:ops-report` so operators can hand off a Markdown profile
  summary with URLs, host ports, safety posture, and next commands without
  secret values. Add `--json` so dashboards and management scripts can consume
  the same non-secret handoff data without parsing Markdown.
- Add `selfhost:urls` so operators can inspect declared profile URLs and
  public-stack routes before startup, with `--json` for dashboards and
  deployment scripts.
- Add `selfhost:ports` so operators can inspect declared host ports before
  starting a profile or exposing public-stack, with `--json` for dashboards
  and deployment scripts.
- Add `selfhost:preflight -- --json` so deployment controllers can consume the
  same secret hygiene, compose config, route, blocker, and safety-note gate that
  `selfhost:up` uses before starting services.
- Add `selfhost:status -- --json` so dashboards and management scripts can
  consume runtime Docker compose service state, secret hygiene status, health
  endpoint checks, blockers, and safety notes without parsing terminal prose or
  printing secret values.
- Add `selfhost:config -- --json` so CI, dashboards, and management scripts can
  consume compose config pass/fail, blocker, and stderr metadata without
  including expanded compose stdout that may contain environment values.
- Add `selfhost:summary` so operators can see deploy paths, URLs, declared
  host ports, secret hygiene status, and next commands in one read-only screen.
- Add `selfhost:doctor` as the earliest read-only deployment diagnostic for
  local tools, profile files, `.env` presence, and secret/public-origin hygiene,
  with `--json` for diagnostic panels and deployment scripts.
- Add `selfhost:profiles` as the read-only deployment map for built-in profiles,
  deploy directories, services, declared host ports, and matching doctor commands.
- Add `selfhost:quickstart` as the read-only copy-paste sequence for a selected
  profile, including public-stack safety and handoff evidence steps.
- Add `selfhost:init -- --json` so first-run dashboards, CI jobs, and deployment
  scripts can consume created/hardened `.env` metadata, secret hygiene statuses,
  warnings, and next commands without parsing terminal prose or printing secret
  values.
- Add `selfhost:readiness` as the read-only deployment readiness overview that
  combines profile files, `.env` status, secret hygiene, public-stack
  origin/route blockers, URLs, declared host ports, and next commands. Add
  `selfhost:readiness -- --all` as the built-in multi-profile readiness matrix,
  and support `--json` on both forms for CI, dashboards, and management scripts
  through `corepack pnpm --silent run` so stdout remains clean JSON.
- Require the operator onboarding contract to include `selfhost:readiness`,
  `selfhost:ports`, and `selfhost:ops-report` in the public-stack first-use path
  so the handoff sequence cannot drift back to terminal-only startup/smoke steps.
- Add `selfhost:backup-plan -- --json` so dashboards, CI, and recovery rehearsal
  scripts can consume the generated backup directory, ordered backup steps, next
  validation command, and safety notes without copying files, dumping the
  database, or reading secret values.
- Add `selfhost:backup-validate` so restore rehearsal starts from a checked
  backup directory shape without reading or printing `.env` secrets. Add
  `--json` so recovery rehearsal scripts can consume file status, blockers,
  next restore-plan command, and safety notes.
- Add `selfhost:restore-plan` so backup artifacts have a visible recovery
  rehearsal path before any destructive restore action. Add `--json` so
  dashboards and recovery rehearsal scripts can render the same ordered steps
  without executing them.
- Add `selfhost:rotate-plan -- --json` so dashboards, CI, and operator runbooks
  can consume the backup-first, dry-run, confirm, restart, and smoke-validation
  secret rotation checklist without reading or mutating `.env`.
- Add `selfhost:rotate -- --json` and `selfhost:rotate -- --confirm --json`
  so dashboards, CI, and operator runbooks can inspect dry-run rotation intent
  and confirmed rotation artifacts without parsing terminal prose or printing
  rotated secret values.
- Published-image smoke is first connected as a fourth-repo wrapper; formal
  image build, publish, and release gates remain owned by `repos/platform`.
