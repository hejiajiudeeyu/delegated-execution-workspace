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
| Deployability overview | fourth repo | `corepack pnpm run deployability:overview`, plus `corepack pnpm --silent run deployability:overview -- --json` as the read-only command map for all deployment and management paths, including the all-in-one demo profile |
| Deployability quickstart | fourth repo | `corepack pnpm run deployability:quickstart`, plus `corepack pnpm --silent run deployability:quickstart -- --json` as the read-only first-use guide for daily development, all-in-one demo, self-host, public-stack, and release-review paths; daily development includes the dedicated profile catalog, action-plan profile selector, and focused dashboard/handoff examples before operators choose deeper profile-specific commands |
| Deployability safety matrix | fourth repo | `corepack pnpm run deployability:safety`, plus `corepack pnpm --silent run deployability:safety -- --json` as the descriptive read/write/startup/network/logging posture map for deployment commands, including the dedicated profile catalog and action-plan profile selector as dashboard-safe read-only commands |
| Deployability operator explainer | fourth repo | `corepack pnpm run deployability:explain`, plus `corepack pnpm --silent run deployability:explain -- --json` as the read-only architecture, truth-source boundary, profile, gate, and cross-repo validation explainer for operators and management UIs |
| Deployability production hardening review | fourth repo | `corepack pnpm run deployability:production`, plus `corepack pnpm --silent run deployability:production -- --json` as the read-only production hardening boundary view that separates daily deployability from public exposure and formal production readiness; it surfaces billing, email, marketplace, and formal release gates without executing deployment commands |
| Deployability readiness scorecard | fourth repo | `corepack pnpm run deployability:readiness`, plus `corepack pnpm --silent run deployability:readiness -- --json` as the standalone daily-deployable scorecard for humans, CI, and management UIs; it reuses command-catalog and doctor metadata to report check evidence, summary counts, blockers, warnings, safety notes, and next commands without requiring consumers to parse the full dashboard or handoff payload |
| Deployability roadmap | fourth repo | `corepack pnpm run deployability:roadmap`, plus `corepack pnpm --silent run deployability:roadmap -- --json` as the read-only PRD milestone view for management UIs and planning reviews; it separates satisfied, gated, blocked, and planned deployability work so daily deployability remains visible without overstating public production readiness |
| Deployability operator status | fourth repo | `corepack pnpm run deployability:status`, plus `corepack pnpm --silent run deployability:status -- --json` as the compact operator status for first-glance management surfaces; it aggregates readiness, roadmap, and the public-stack recipe into status cards, primary next commands, source health, and safety defaults without executing deployment commands |
| Deployability gate checklist | fourth repo | `corepack pnpm run deployability:gates`, plus `corepack pnpm --silent run deployability:gates -- --json` as the read-only public exposure and production hardening gate checklist for management UIs; it projects roadmap, command catalog, and status metadata into explicit gate cards without running security-review, Docker, network, or release commands |
| Deployability public exposure review | fourth repo | `corepack pnpm run deployability:exposure`, plus `corepack pnpm --silent run deployability:exposure -- --json` as the non-destructive public-stack exposure blocker snapshot for management UIs; it runs the existing `selfhost:security-review -- --profile public-stack` path, calls Docker only for compose config, does not start services or bind ports, and reports gate findings under `exposure_blockers` |
| Deployability release candidate review | fourth repo | `corepack pnpm run deployability:release -- --image-tag <candidate-tag>`, plus `corepack pnpm --silent run deployability:release -- --image-tag <candidate-tag> --json` as the non-destructive release candidate gate for management UIs; it aggregates production hardening, public exposure, published-image plan, and dry-run smoke evidence without publishing images or packages, starting services, probing endpoints, or printing secret values |
| Deployability operator checklist | fourth repo | `corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>`, plus `corepack pnpm --silent run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag> --json` as the non-destructive public-stack operator checklist for management UIs; it aggregates menu, recipe, onboarding, exposure/release gate, backup-plan, and handoff evidence into checklist groups without starting services, probing endpoints, publishing artifacts, or printing secret values |
| Deployability doctor | fourth repo | `corepack pnpm run deployability:doctor`, plus `corepack pnpm --silent run deployability:doctor -- --json` as the read-only readiness snapshot for compatibility ledger, top-level scripts, docs, brand-site, and safety-contract alignment |
| Deployability dashboard | fourth repo | `corepack pnpm run deployability:dashboard`, plus `corepack pnpm --silent run deployability:dashboard -- --json` as the single read-only aggregate payload for top-level dashboards and CI, combining overview, quickstart, safety, doctor, compatibility, top-level `profile_selector`, derived `profile_summaries` with shared `attention` metadata, top-level `recommended_profile_keys`, ecosystem_readiness, and per-pipeline summary sections; `--profile <key-or-alias>` emits a focused dashboard payload with `profile_filter`, filtered command catalog, one owning pipeline summary, and one profile summary while keeping ecosystem_readiness global |
| Deployability action plan | fourth repo | `corepack pnpm run deployability:action-plan`, plus `corepack pnpm --silent run deployability:action-plan -- --json` as the read-only operator next-action selector that combines dashboard readiness and command catalog posture into profile-level recommended commands, dashboard-safe commands, public-exposure gates, service-touching command lists, profile `attention` metadata, and top-level `recommended_profile_keys`; `--list-profiles` / `--profiles` prints the read-only profile selector directory with keys, aliases, pipeline keys, and purposes without calling dashboard/catalog metadata; `--profile <key-or-alias>` narrows the output to one operator target and reports unknown profiles as blockers |
| Deployability profiles catalog | fourth repo | `corepack pnpm run deployability:profiles`, plus `corepack pnpm --silent run deployability:profiles -- --json` as the dedicated read-only profile-card catalog for management UIs, dashboards, CI, and operator docs; it derives labels, aliases, pipeline keys, status, counts, safety notes, next commands, JSON commands, shared `attention` metadata, and `recommended_profile_keys` from overview, command, and doctor metadata plus shared pipeline/profile summary helpers and the shared fourth-repo profile registry; `--profile <key-or-alias>` returns one profile or a clean unknown-profile blocker |
| Deployability commands catalog | fourth repo | `corepack pnpm run deployability:commands`, plus `corepack pnpm --silent run deployability:commands -- --json` as the read-only searchable command catalog with category, posture, first-use track, pipeline filters, `filters.profiles` selector metadata, `--profile <key-or-alias>` filtering that resolves operator profile names to their owning pipeline, inherited safety posture for profile-specific command variants, the dedicated profile catalog and action-plan profile selector surfaced under the `daily_dev` track, and no `unmapped` category/posture values for ready-now command paths |
| Deployability profile runbook | fourth repo | `corepack pnpm run deployability:runbook`, plus `corepack pnpm --silent run deployability:runbook -- --json` as the read-only staged runbook projection for one selected profile; `--profile <key-or-alias>` emits `profile_runbook` phases in the order inspect, gate, start, verify, operate, and evidence, reusing profile catalog and command catalog metadata without executing commands |
| Deployability operator menu | fourth repo | `corepack pnpm run deployability:menu`, plus `corepack pnpm --silent run deployability:menu -- --json` as the read-only first operator screen for humans and management UIs; `corepack pnpm run deployability:menu -- --profile public-stack` and `corepack pnpm --silent run deployability:menu -- --profile public-stack --json` focus the public-stack first screen; it joins profile choices, attention, primary command, runbook, action-plan, dashboard, handoff, command-catalog, and public-stack operator-onboarding entry points without executing commands; focused public-stack JSON includes `selected_onboarding_plan` from `operator:onboarding:plan` |
| Deployability profile recipe | fourth repo | `corepack pnpm run deployability:recipe -- --profile public-stack`, plus `corepack pnpm --silent run deployability:recipe -- --profile public-stack --json` as the read-only linear first-run recipe for one selected profile; it combines readiness, menu, runbook, and onboarding metadata into inspect, gate, start, verify, operate, and evidence steps without executing commands |
| Deployability recovery evidence path | fourth repo | `deployability:overview`, `deployability:dashboard`, `deployability:handoff`, and `deployability:commands -- --pipeline recovery_evidence` expose ops-report, audit export, backup, restore, and rotation commands as one ready-now evidence and recovery pipeline |
| Deployability handoff | fourth repo | `corepack pnpm run deployability:handoff`, plus `corepack pnpm --silent run deployability:handoff -- --json` for a non-secret ecosystem handoff report under `exports/deployability/`, including the same profile selector directory, derived profile summaries, and ecosystem_readiness scorecard used by the dashboard; `--profile <key-or-alias>` writes a focused handoff report for one owning pipeline |
| Deployability evidence bundle | fourth repo | `corepack pnpm run deployability:evidence -- --profile public-stack`, plus `corepack pnpm --silent run deployability:evidence -- --profile public-stack --json` for a non-secret evidence bundle directory containing manifest, focused dashboard/menu/recipe/handoff/command-catalog JSON, and handoff Markdown for management review |
| Daily local doctor | fourth repo | `corepack pnpm run dev:doctor`, plus `corepack pnpm --silent run dev:doctor -- --json` for dashboards and scripts |
| Local agent loop management metadata | fourth repo | `corepack pnpm run dev:local:plan`, `dev:local:up`, `dev:local:status`, `dev:local:logs`, and `dev:local:down`, plus `--json` for dashboards and scripts |
| Agent-facing smoke | fourth repo | `corepack pnpm run test:agent-e2e` |
| Self-host deployment map | fourth repo | `corepack pnpm run selfhost:profiles`, including `platform`, `public-stack`, and `all-in-one` profiles |
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
- machine-readable deployability explainer metadata that lists repository
  roles, truth-source boundaries, daily deployability, profile selection,
  public exposure gates, production hardening, and fourth-repo validation order
  without executing commands or printing secrets
- machine-readable deployability doctor metadata that reports compatibility
  ledger, script, documentation, brand-site file alignment, brand-site
  deployability content smoke, and safety-contract checks, blockers, warnings,
  and next commands without reading `.env`, calling Docker, binding ports,
  probing networks, or printing secrets
- machine-readable deployability dashboard metadata that aggregates overview,
  quickstart, safety, doctor, compatibility, top-level `profile_selector`,
  ecosystem_readiness, and per-pipeline summary JSON sections as one top-level
  payload without reading `.env`, calling Docker, binding ports, probing
  networks, or printing secrets
- machine-readable deployability action-plan metadata that turns the dashboard
  and command catalog into profile-level recommended commands,
  dashboard-safe commands, public-exposure gate commands, service-touching
  commands, safety notes, next JSON commands, profile `attention` level/rank
  metadata, primary next commands, and top-level `recommended_profile_keys`
  without reading `.env`, calling Docker, binding ports, probing networks, or
  printing secrets
- machine-readable deployability action-plan profile-list metadata that exposes
  the supported profile keys, aliases, pipeline keys, and purposes without
  calling dashboard/catalog metadata, reading `.env`, calling Docker, binding
  ports, probing networks, or printing secrets
- machine-readable deployability profile-catalog metadata that exposes a
  dedicated `deployability:profiles` management payload with labels, aliases,
  owning pipeline keys, status, counts, next commands, next JSON commands,
  safety notes, shared `attention` metadata, top-level
  `recommended_profile_keys`, and clean unknown-profile blockers, derived from
  overview, command, and doctor metadata plus shared pipeline/profile summary
  helpers and the shared fourth-repo profile registry
  without reading `.env`, calling Docker, binding ports, probing networks, or
  printing secrets
- machine-readable quickstart, safety, and command-catalog metadata that make
  the dedicated profile catalog and action-plan profile selector discoverable
  as first-use, read-only, dashboard-safe top-level commands before operators
  choose a focused profile
- machine-readable ecosystem_readiness metadata that turns the daily-deployable
  definition into a dashboard and handoff scorecard for profile choice,
  generated secrets, startup path, doctor path, runtime inspection, boundary
  understanding, and brand-site story; when all checks pass it reports
  daily_deployable_with_safety_gates rather than claiming ungated public
  production readiness
- shared fourth-repo pipeline summary metadata for `deployability:overview`,
  `deployability:dashboard`, and `deployability:handoff`, so command counts,
  JSON entry counts, dashboard-safe counts, CI-safe counts, public exposure
  gate counts, next commands, and safety notes stay aligned across surfaces
- machine-readable all-in-one demo metadata that exposes the existing
  `all-in-one` selfhost profile as a local evaluation path, inherits selfhost
  safety posture for profile-specific command variants, and avoids presenting
  it as public exposure or formal production readiness
- machine-readable deployability command catalog metadata that merges overview,
  quickstart, and safety metadata into a filterable command list, including
  `filters.profiles` with supported profile keys, aliases, owning pipeline
  keys, and purposes, `--profile <key-or-alias>` as an operator-friendly alias
  layer over pipeline filters, inherited posture for profile-specific command
  variants, clean unknown-profile blockers instead of falling back to every
  command, and explicit `runtime_diagnostic`, `runtime_acceptance`, and
  `delegated_smoke` posture labels for local doctor/acceptance and real
  published-image smoke commands, without reading `.env`, calling Docker,
  binding ports, probing networks, or printing secrets
- machine-readable deployability profile runbook metadata that turns one
  selected profile into a staged `profile_runbook` with inspect, gate, start,
  verify, operate, and evidence phases. The runbook is a projection over the
  profile catalog and command catalog, not a runner; it keeps public exposure
  gates before startup, returns clean unknown-profile blockers, and does not
  read `.env`, call Docker, bind ports, probe networks, or print secrets
- machine-readable deployability operator menu metadata that presents profile
  choices, attention level, primary command, runbook, action-plan, dashboard,
  handoff, command-catalog, and public-stack operator-onboarding entry points
  on one first screen. The menu is a convenience projection over existing
  deployability metadata, not a new truth source; focused
  `corepack pnpm run deployability:menu -- --profile public-stack` /
  `corepack pnpm --silent run deployability:menu -- --profile public-stack --json`
  output includes the selected runbook, and focused public-stack output includes
  `selected_onboarding_plan` from the read-only
  `operator:onboarding:plan` projection so management UIs can render preflight,
  `/console/` setup, gateway credential setup, smoke/evidence, and onboarding
  contract validation without a second lookup. Unknown profiles return clean
  blockers, and the command does not read `.env`, call Docker, bind ports,
  probe networks, or print secrets
- machine-readable dashboard and handoff profile selector metadata that lifts
  the same command-catalog `filters.profiles` directory to a top-level
  `profile_selector` field, so management surfaces can render profile choices
  without knowing the internal section path or calling runtime commands
- machine-readable dashboard and handoff profile filtering that accepts
  `--profile <key-or-alias>`, reuses the command-catalog resolver, emits
  `profile_filter`, limits command catalog and pipeline summary metadata to the
  owning pipeline, reports unknown profiles as blockers, and keeps
  ecosystem_readiness as the global daily-deployable scorecard; focused
  dashboard and handoff commands are discoverable from quickstart and the
  command catalog
- machine-readable `profile_summaries` metadata for dashboard and handoff,
  derived from `profile_selector`, `pipeline_summaries`, and command-catalog
  posture, so management UIs can render profile cards, sort them by shared
  `attention.rank`, highlight `attention.level=safety_gate`, and consume
  top-level `recommended_profile_keys` without joining arrays or re-deriving
  risk themselves; this is a convenience projection, not a new profile truth
  source
- machine-readable compatibility status metadata that reports the current
  bundle, submodule SHAs, ledger matches, dirty submodules, blockers, warnings,
  and next commands without reading `.env`, calling Docker, probing networks, or
  printing secrets
- machine-readable deployability roadmap metadata that reports PRD milestones,
  satisfied/gated/blocked/planned status, evidence commands, PRD sources,
  remaining work, source status, and next commands without reading `.env`,
  calling Docker, binding ports, probing networks, or printing secrets
- machine-readable deployability handoff metadata, paired with a non-secret
  Markdown report, that combines current bundle, compatibility warnings,
  command map, profile selector, ecosystem_readiness, shared per-pipeline
  summaries, safety notes, and next validation commands without reading
  `.env`, calling Docker, probing networks, or printing secrets
- machine-readable deployability evidence bundle metadata, generated by
  `corepack pnpm run deployability:evidence -- --profile public-stack` or
  `corepack pnpm --silent run deployability:evidence -- --profile public-stack --json`,
  that writes one non-secret directory with manifest, focused dashboard/menu/recipe/handoff/command-catalog
  JSON, and handoff Markdown for operators and management UIs
- machine-readable recovery evidence metadata that exposes the existing
  ops-report, audit-export, backup-plan, backup-validate, restore-plan,
  rotate-plan, and rotate commands as the `recovery_evidence` pipeline, with
  explicit `writes_report`, `exports_evidence`, `read_only`, and `writes_env`
  posture labels and no secret values in JSON output

## 8. Success Metrics

- A fresh checkout can run `deployability:overview`,
  `deployability:overview -- --json`, `deployability:quickstart`,
  `deployability:quickstart -- --json`, `deployability:safety`,
  `deployability:safety -- --json`, `deployability:explain`,
  `deployability:explain -- --json`, `deployability:production`,
  `deployability:production -- --json`, `deployability:readiness`,
  `deployability:readiness -- --json`, `deployability:roadmap`,
  `deployability:roadmap -- --json`, `deployability:status`,
  `deployability:status -- --json`, `deployability:gates`,
  `deployability:gates -- --json`, `deployability:exposure`,
  `deployability:exposure -- --json`,
  `deployability:release -- --image-tag <candidate-tag>`,
  `deployability:release -- --image-tag <candidate-tag> --json`,
  `corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>`,
  `corepack pnpm --silent run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag> --json`,
  `deployability:doctor`,
  `deployability:doctor -- --json`, `deployability:dashboard`,
  `deployability:dashboard -- --json`, `deployability:action-plan`,
  `deployability:action-plan -- --json`, `deployability:profiles`,
  `deployability:profiles -- --json`, `deployability:profiles -- --profile public-stack`,
  `deployability:commands`,
  `deployability:action-plan -- --profile public-stack`,
  `deployability:action-plan -- --list-profiles`,
  `deployability:action-plan -- --list-profiles --json`,
  `deployability:action-plan -- --profile public-stack --json`,
  `deployability:commands`, `deployability:commands -- --json`,
  `deployability:recipe -- --profile public-stack`,
  `deployability:recipe -- --profile public-stack --json`,
  `deployability:commands -- --profile public-stack`, `compat:status`,
  `compat:status -- --json`, `deployability:handoff`,
  `deployability:handoff -- --json`, `test:deployability`,
  `test:deployability-operations`,
  `deployability:commands -- --pipeline recovery_evidence`,
  `deployability:commands -- --pipeline local_agent_loop`,
  `deployability:commands -- --pipeline published_image`,
  `dev:local:plan -- --json`,
  `dev:local:up -- --json`, `dev:local:status -- --json`,
  `dev:local:logs -- --json`, `dev:local:down -- --json`,
  `selfhost:profiles`, `selfhost:quickstart`,
  `selfhost:readiness -- --all`, `selfhost:readiness`, `selfhost:doctor`,
  `selfhost:init`, `selfhost:init -- --json`, `selfhost:summary`,
  `selfhost:preflight`, `selfhost:status`,
  `selfhost:status -- --json`, `selfhost:up -- --json`, `selfhost:logs -- --json`,
  `selfhost:down -- --json`, `selfhost:smoke -- --json`, `dev:doctor`,
  `dev:doctor -- --json`,
  `test:agent-e2e`, `mcp:golden-four`, `published-image:plan -- --json`,
  `published-image:smoke -- --dry-run --json`, `published-image:smoke -- --image-tag <candidate-tag>`,
  `selfhost:security-review`,
  `selfhost:audit-export -- --json`, `selfhost:backup-plan`,
  `selfhost:restore-plan`, `selfhost:rotate-plan`, `operator:onboarding:check`, and
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
- Expose the existing ops-report, audit export, backup, restore, and rotation
  controls as the first-class `recovery_evidence` deployability pipeline so
  operators can filter and hand off recovery readiness from the top-level
  command map.
- Published-image smoke is first connected as a fourth-repo wrapper; formal
  image build, publish, and release gates remain owned by `repos/platform`.
