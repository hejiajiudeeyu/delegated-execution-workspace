# Delegated Execution Workspace

This repository is the fourth repository: a synthetic monorepo superproject for cross-repo development orchestration.

It does not replace the three formal repositories:

- `repos/protocol` -> `delegated-execution-protocol`
- `repos/client` -> `delegated-execution-client`
- `repos/platform` -> `delegated-execution-platform-selfhost`

Its responsibilities are limited to:

- providing a unified Codex/Cursor workspace
- orchestrating local cross-repo integration
- validating contract and integration compatibility
- recording verified protocol/client/platform commit combinations

This repository must not become a new business truth source.

## What This Repository Owns

- git submodule combination management
- workspace install and local dependency linking for development
- Nx graph, affected evaluation, and boundary checks
- source integration orchestration
- change bundle records
- Agent routing rules for cross-repo development

## What This Repository Does Not Own

- protocol schema, protocol fields, or contract truth
- client runtime truth
- platform runtime truth
- formal npm or image release

All business changes still belong in the owning repository under `repos/`.

## Strong Constraints

1. `workspace:*` is only for fourth-repo development-time resolution. Formal releases must not depend on it.
2. The main branch of this repository must point only to verified compatible submodule SHAs.
3. This repository only orchestrates, validates, and routes work. Business changes must land in the owning submodule repository.

## Repository Layout

- `repos/protocol` -> protocol truth-source submodule
- `repos/client` -> client product submodule
- `repos/platform` -> self-hosted platform submodule
- `changes/` -> change bundle YAML files
- `docs/` -> orchestration, architecture, runbooks, and decision records
- `tools/` -> orchestration and validation scripts

## CI Responsibility Split

Formal repository CI still owns:

- standalone install
- standalone build
- standalone test
- standalone release

Fourth-repository CI owns only combination validity:

- submodule SHA integrity
- cross-repo workspace install
- Nx graph and affected evaluation
- boundary validation
- contract and source integration checks
- change bundle validation

The fourth-repository CI certifies that a specific protocol/client/platform SHA combination is usable together. It does not replace the formal repository release gates.

## Daily Workflow

1. Make business changes in the owning formal repository first.
2. Point this repository's submodules at the target branch or commit.
3. Add or update a change bundle under `changes/`.
4. Run fourth-repo checks.
5. Merge in the formal repositories.
6. Update this repository main branch to the verified compatible SHAs.

## Common Commands

Bootstrap the workspace:

```bash
corepack pnpm install
```

Refresh local protocol contracts into client/platform validation installs:

```bash
corepack pnpm run sync:local-contracts
```

Initialize or sync submodules:

```bash
git submodule update --init --recursive
corepack pnpm run submodules:sync
```

Run fourth-repo validation:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

Use layered test entrypoints during daily work:

```bash
# Fast local loop: pure JSON, fixture-backed aggregate, and lightweight CLI tests.
corepack pnpm run test:fast

# Full deployability tool coverage, including fixture-backed aggregate tests plus real aggregate smoke.
corepack pnpm run test:deployability

# Submit/merge gate: deployability tests, operations tests, and the AGENTS.md five-command validation chain.
corepack pnpm run test:release-gate
```

`test:release-gate` intentionally keeps the normal origin-reachability checks in
`check:submodules` and `check:bundles`. For local-only commits that have not yet
been pushed to the owning submodule remotes, run the same gate as
`SKIP_ORIGIN_REACHABILITY=1 corepack pnpm run test:release-gate` and record that
it was a no-push local validation.

Recent local timing baseline on this Mac:

- before this split: `corepack pnpm run test:deployability` passed in `1084.02s`
- after this split: `corepack pnpm run test:fast` passed in `14.54s`
- after this split: `corepack pnpm run test:deployability` passed in `295.34s`
- after this split: `SKIP_ORIGIN_REACHABILITY=1 corepack pnpm run test:release-gate` passed in `379.05s`

Check whether the local daily agent/caller-skill development stack is ready:

```bash
corepack pnpm run deployability:overview
corepack pnpm --silent run deployability:overview -- --json
corepack pnpm run deployability:quickstart
corepack pnpm --silent run deployability:quickstart -- --json
corepack pnpm run deployability:safety
corepack pnpm --silent run deployability:safety -- --json
corepack pnpm run deployability:explain
corepack pnpm --silent run deployability:explain -- --json
corepack pnpm run deployability:production
corepack pnpm --silent run deployability:production -- --json
corepack pnpm run deployability:hardening-plan
corepack pnpm --silent run deployability:hardening-plan -- --json
corepack pnpm run deployability:readiness
corepack pnpm --silent run deployability:readiness -- --json
corepack pnpm run deployability:prd
corepack pnpm --silent run deployability:prd -- --json
corepack pnpm run deployability:roadmap
corepack pnpm --silent run deployability:roadmap -- --json
corepack pnpm run deployability:status
corepack pnpm --silent run deployability:status -- --json
corepack pnpm run deployability:gates
corepack pnpm --silent run deployability:gates -- --json
corepack pnpm run deployability:exposure
corepack pnpm --silent run deployability:exposure -- --json
corepack pnpm run deployability:release -- --image-tag <candidate-tag>
corepack pnpm --silent run deployability:release -- --image-tag <candidate-tag> --json
corepack pnpm run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag>
corepack pnpm --silent run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag> --json
corepack pnpm run deployability:doctor
corepack pnpm --silent run deployability:doctor -- --json
corepack pnpm run deployability:dashboard
corepack pnpm --silent run deployability:dashboard -- --json
corepack pnpm run deployability:dashboard -- --profile public-stack
corepack pnpm --silent run deployability:dashboard -- --profile public-stack --json
corepack pnpm run deployability:next
corepack pnpm --silent run deployability:next -- --json
corepack pnpm run deployability:next -- --profile public-stack
corepack pnpm --silent run deployability:next -- --profile public-stack --json
corepack pnpm run deployability:profiles
corepack pnpm --silent run deployability:profiles -- --json
corepack pnpm run deployability:profiles -- --profile public-stack
corepack pnpm --silent run deployability:profiles -- --profile public-stack --json
corepack pnpm run deployability:action-plan
corepack pnpm --silent run deployability:action-plan -- --json
corepack pnpm run deployability:action-plan -- --list-profiles
corepack pnpm --silent run deployability:action-plan -- --list-profiles --json
corepack pnpm run deployability:action-plan -- --profile public-stack
corepack pnpm --silent run deployability:action-plan -- --profile public-stack --json
corepack pnpm run deployability:commands
corepack pnpm --silent run deployability:commands -- --json
corepack pnpm run deployability:runbook
corepack pnpm --silent run deployability:runbook -- --json
corepack pnpm run deployability:menu
corepack pnpm --silent run deployability:menu -- --json
corepack pnpm run deployability:menu -- --profile public-stack
corepack pnpm --silent run deployability:menu -- --profile public-stack --json
corepack pnpm run deployability:recipe -- --profile public-stack
corepack pnpm --silent run deployability:recipe -- --profile public-stack --json
corepack pnpm run deployability:console
corepack pnpm --silent run deployability:console -- --json
corepack pnpm run deployability:commands -- --profile public-stack
corepack pnpm --silent run deployability:commands -- --profile public-stack --json
corepack pnpm run compat:status
corepack pnpm --silent run compat:status -- --json
corepack pnpm run deployability:handoff
corepack pnpm --silent run deployability:handoff -- --json
corepack pnpm run deployability:handoff -- --profile public-stack
corepack pnpm --silent run deployability:handoff -- --profile public-stack --json
corepack pnpm run deployability:evidence -- --profile public-stack
corepack pnpm --silent run deployability:evidence -- --profile public-stack --json
corepack pnpm run test:fast
corepack pnpm run test:deployability
corepack pnpm run test:deployability-operations
corepack pnpm run test:release-gate
corepack pnpm run dev:local:plan
corepack pnpm --silent run dev:local:plan -- --json
corepack pnpm run dev:local:up
corepack pnpm --silent run dev:local:up -- --json
corepack pnpm run dev:local:status
corepack pnpm --silent run dev:local:status -- --json
corepack pnpm run dev:local:logs
corepack pnpm --silent run dev:local:logs -- --json
corepack pnpm run dev:local:down
corepack pnpm --silent run dev:local:down -- --json
corepack pnpm run dev:doctor
corepack pnpm --silent run dev:doctor -- --json
corepack pnpm run test:agent-e2e
corepack pnpm run mcp:golden-four
corepack pnpm run test:selfhost-kit
corepack pnpm run operator:onboarding:plan
corepack pnpm --silent run operator:onboarding:plan -- --json
corepack pnpm run operator:onboarding:check
corepack pnpm --silent run operator:onboarding:check -- --json
corepack pnpm run published-image:plan
corepack pnpm --silent run published-image:plan -- --json
corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>
corepack pnpm --silent run published-image:smoke -- --dry-run --image-tag <candidate-tag> --json
```

`deployability:profiles` derives its read-only profile cards from overview, command, and doctor metadata plus shared pipeline/profile summary helpers and the shared profile registry.

Initialize and inspect a self-host profile:

```bash
corepack pnpm run selfhost:profiles
corepack pnpm --silent run selfhost:profiles -- --json
corepack pnpm run selfhost:quickstart
corepack pnpm --silent run selfhost:quickstart -- --json
corepack pnpm run selfhost:readiness -- --all
corepack pnpm --silent run selfhost:readiness -- --all --json
corepack pnpm run selfhost:readiness
corepack pnpm --silent run selfhost:readiness -- --json
corepack pnpm run selfhost:doctor
corepack pnpm --silent run selfhost:doctor -- --json
corepack pnpm run selfhost:init
corepack pnpm --silent run selfhost:init -- --json
corepack pnpm run selfhost:summary
corepack pnpm --silent run selfhost:summary -- --json
corepack pnpm run selfhost:plan
corepack pnpm --silent run selfhost:plan -- --json
corepack pnpm run selfhost:urls
corepack pnpm --silent run selfhost:urls -- --json
corepack pnpm run selfhost:ports
corepack pnpm --silent run selfhost:ports -- --json
corepack pnpm run selfhost:ops-report
corepack pnpm --silent run selfhost:ops-report -- --json
corepack pnpm run selfhost:preflight
corepack pnpm --silent run selfhost:preflight -- --json
corepack pnpm run selfhost:up
corepack pnpm --silent run selfhost:up -- --json
corepack pnpm run selfhost:status
corepack pnpm --silent run selfhost:status -- --json
corepack pnpm run selfhost:logs
corepack pnpm --silent run selfhost:logs -- --json
corepack pnpm run selfhost:down
corepack pnpm --silent run selfhost:down -- --json
corepack pnpm run selfhost:smoke
corepack pnpm --silent run selfhost:smoke -- --json
corepack pnpm run selfhost:security-review
corepack pnpm --silent run selfhost:security-review -- --json
corepack pnpm run selfhost:audit-export
corepack pnpm --silent run selfhost:audit-export -- --json
corepack pnpm run selfhost:config
corepack pnpm --silent run selfhost:config -- --json
corepack pnpm run selfhost:backup-plan
corepack pnpm --silent run selfhost:backup-plan -- --json
corepack pnpm run selfhost:backup-validate -- --backup-dir backups/selfhost/platform/<stamp>
corepack pnpm --silent run selfhost:backup-validate -- --backup-dir backups/selfhost/platform/<stamp> --json
corepack pnpm run selfhost:restore-plan -- --backup-dir backups/selfhost/platform/<stamp>
corepack pnpm --silent run selfhost:restore-plan -- --backup-dir backups/selfhost/platform/<stamp> --json
corepack pnpm run selfhost:rotate-plan
corepack pnpm --silent run selfhost:rotate-plan -- --json
corepack pnpm --silent run selfhost:rotate -- --json
corepack pnpm --silent run selfhost:rotate -- --confirm --json

# Public operator stack:
corepack pnpm run selfhost:quickstart -- --profile public-stack
corepack pnpm --silent run selfhost:quickstart -- --profile public-stack --json
corepack pnpm run selfhost:readiness -- --profile public-stack
corepack pnpm --silent run selfhost:readiness -- --profile public-stack --json
corepack pnpm run selfhost:doctor -- --profile public-stack
corepack pnpm --silent run selfhost:doctor -- --profile public-stack --json
corepack pnpm run selfhost:init -- --profile public-stack
corepack pnpm --silent run selfhost:init -- --profile public-stack --json
corepack pnpm run selfhost:summary -- --profile public-stack
corepack pnpm --silent run selfhost:summary -- --profile public-stack --json
corepack pnpm run selfhost:plan -- --profile public-stack
corepack pnpm --silent run selfhost:plan -- --profile public-stack --json
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm --silent run selfhost:urls -- --profile public-stack --json
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm --silent run selfhost:ports -- --profile public-stack --json
corepack pnpm run selfhost:public-origin -- --profile public-stack --origin <public-origin>
corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --json
corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin <public-origin> --confirm --json
corepack pnpm run selfhost:ops-report -- --profile public-stack
corepack pnpm --silent run selfhost:ops-report -- --profile public-stack --json
corepack pnpm run selfhost:preflight -- --profile public-stack
corepack pnpm --silent run selfhost:preflight -- --profile public-stack --json
corepack pnpm run selfhost:up -- --profile public-stack
corepack pnpm --silent run selfhost:up -- --profile public-stack --json
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json
corepack pnpm run selfhost:audit-export -- --profile public-stack
corepack pnpm --silent run selfhost:audit-export -- --profile public-stack --json
corepack pnpm run selfhost:config -- --profile public-stack
corepack pnpm --silent run selfhost:config -- --profile public-stack --json
corepack pnpm run selfhost:backup-plan -- --profile public-stack
corepack pnpm --silent run selfhost:backup-plan -- --profile public-stack --json
corepack pnpm run selfhost:backup-validate -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm --silent run selfhost:backup-validate -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp> --json
corepack pnpm run selfhost:restore-plan -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm --silent run selfhost:restore-plan -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp> --json
corepack pnpm run selfhost:rotate-plan -- --profile public-stack
corepack pnpm --silent run selfhost:rotate-plan -- --profile public-stack --json
corepack pnpm --silent run selfhost:rotate -- --profile public-stack --json
corepack pnpm --silent run selfhost:rotate -- --profile public-stack --confirm --json
corepack pnpm run selfhost:status -- --profile public-stack
corepack pnpm --silent run selfhost:status -- --profile public-stack --json
corepack pnpm run selfhost:logs -- --profile public-stack
corepack pnpm --silent run selfhost:logs -- --profile public-stack --json
corepack pnpm run selfhost:down -- --profile public-stack
corepack pnpm --silent run selfhost:down -- --profile public-stack --json
corepack pnpm run selfhost:smoke -- --profile public-stack
corepack pnpm --silent run selfhost:smoke -- --profile public-stack --json
```

Notes:

- Use the top-level `corepack pnpm install` as the default workspace install path.
- Standalone `npm install` inside `repos/platform` may restore the last published `@delexec/contracts` tarball. Run `corepack pnpm run sync:local-contracts` or any fourth-repo validation command to relink the current local protocol package before checking cross-repo changes.
- Use `corepack pnpm --silent run selfhost:init ... --json` when a dashboard,
  CI job, or deployment script needs created/hardened `.env` metadata, secret
  hygiene statuses, warnings, and next commands without parsing terminal prose.
  The JSON form does not print secret values or profile URL prose.
- Use `corepack pnpm --silent run deployability:readiness -- --json` when a
  management UI, CI job, or daily operator handoff needs only the
  daily-deployable scorecard. It reports profile choice, secret generation,
  startup path, doctor path, runtime inspection, boundary understanding, and
  brand-site story evidence without reading `.env`, calling Docker, probing
  networks, or printing secret values.
- Use `corepack pnpm --silent run deployability:prd -- --json` when a
  management UI, planning review, or brand-site alignment check needs the PRD
  document, audience, pipeline, and safety-boundary index before reading the
  milestone roadmap. It is read-only and does not read `.env`, call Docker,
  probe networks, or print secret values.
- Use `corepack pnpm --silent run deployability:roadmap -- --json` when a
  management UI or planning review needs the PRD milestone view. It separates
  satisfied, gated, and planned work so daily deployability stays visible
  without overstating public production readiness.
- Use `corepack pnpm --silent run deployability:explain -- --json` when an
  operator console or onboarding surface needs a read-only architecture,
  source-of-truth boundary, profile, gate, and validation explainer before
  choosing a deployment path. It only projects existing metadata and does not
  read `.env`, call Docker, probe networks, or print secret values.
- Use `corepack pnpm --silent run deployability:production -- --json` when an
  operator console needs a read-only production hardening boundary review. It
  separates daily deployability from public exposure and formal production
  readiness, surfaces billing/email/marketplace/formal release gates, and does
  not execute deployment commands.
- Use `corepack pnpm --silent run deployability:hardening-plan -- --json` when
  an operator console needs an actionable production hardening plan. It
  decomposes public exposure, billing, email transport, marketplace readiness,
  and formal release into owner repo, stages, blockers, guardrails, and evidence
  commands without treating the plan as production readiness.
- Use `corepack pnpm --silent run deployability:status -- --json` when an
  operator console needs one compact first-glance status. It projects readiness
  and roadmap metadata into status cards, including the roadmap's console
  management, hardening plan, and public-stack recipe milestones, without
  reading `.env`, calling Docker, probing networks, or printing secret values.
- Use `corepack pnpm --silent run deployability:gates -- --json` when an
  operator console needs the public exposure and production hardening gate
  checklist. It keeps public-stack exposure gated and formal production
  hardening planned without running security-review, Docker, network, or
  release commands.
- Use `corepack pnpm --silent run deployability:exposure -- --json` when an
  operator console needs the actual public-stack exposure blocker snapshot.
  It runs the non-destructive public-stack security review, calls Docker only
  for compose config, does not start services or bind ports, and reports
  findings such as localhost public origin under `exposure_blockers`. It also
  emits `operator_next_action`; when `PUBLIC_SITE_ADDRESS` is still localhost,
  that action points to `repos/platform/deploy/public-stack/.env`, names the
  required `PUBLIC_SITE_ADDRESS` change, gives the `selfhost:public-origin`
  dry-run/apply commands, and gives the security-review command to rerun before
  any public exposure claim. The same payload includes
  `pre_exposure_remediation_plan`, an ordered checklist for configuring the
  public origin, rerunning security review, confirming route contract, running
  onboarding check, running published-image dry-run, and exporting
  public-stack evidence.
- Use `corepack pnpm --silent run deployability:release -- --image-tag <candidate-tag> --json`
  when an operator console needs a release candidate gate. It aggregates
  production hardening, public exposure, published-image plan, and dry-run
  smoke evidence without publishing images or packages, starting services,
  probing endpoints, or printing secret values.
- Use `corepack pnpm --silent run deployability:operator-checklist -- --profile public-stack --image-tag <candidate-tag> --json`
  when an operator console needs one public-stack readiness checklist. It
  groups menu, recipe, onboarding, exposure/release gate, backup-plan, and
  handoff evidence into ready/blocked checklist items without starting
  services, probing endpoints, publishing artifacts, or printing secret values.
- Use `corepack pnpm --silent run deployability:next -- --json` when a human,
  dashboard, or agent needs one safest next action instead of a full menu. It
  combines read-only menu, action-plan, and gate metadata into a single
  decision, defaults to the public-stack safety gate when public exposure is
  still gated, supports `--profile <key-or-alias>`, and does not execute the
  recommended command. For public-stack gate decisions it also includes
  `detail_command` and `detail_json_command` pointing at `deployability:exposure`
  so management surfaces can open the blocker-specific `operator_next_action`
  without making `deployability:next` call Docker or read `.env`.
- Use `corepack pnpm --silent run deployability:menu -- --profile public-stack --json`
  when a management UI needs one public-stack first screen. The focused menu
  includes `operator_status_summary` and `operator_status_cards` from
  menu-local read-only profiles/commands/console inputs, plus
  `operator_next_decision` from the selected profile and shared operator
  decision helper, plus
  `selected_onboarding_plan` from the read-only `operator:onboarding:plan`
  projection alongside the selected runbook, without recursively calling the
  `deployability:status` or `deployability:next` CLIs, reading `.env`, calling
  Docker, probing networks, or printing secret values. The JSON marks
  `source_status.operator_next_decision.avoids_recursive_next_cli=true`, and
  public-stack decisions keep the same `detail_command` / `detail_json_command`
  exposure-remediation links used by `deployability:next`.
- Use `corepack pnpm --silent run deployability:console -- --json` when a
  management UI needs the Management Console surface index. It returns
  `console_management_index` for runtime status, settings, logs, billing
  readiness, public-stack console, and gateway session surfaces; each surface
  includes `next_action`, and the top-level `surface_next_actions` list makes
  owner repo, primary command, evidence commands, and guardrails machine
  readable without starting console services or turning the fourth repo into
  runtime truth. The `runtime_status` surface now consumes the client-owned
  `corepack pnpm --dir repos/client run check:ops-console-runtime-surface`
  evidence command and reports `client_owned_evidence_available` when the
  ops-console Runtime page is wired to `/status`, `/runtime/logs`, and
  `/runtime/alerts` with secret-safety copy. The `settings_approval_policy`
  surface also consumes the client-owned
  `corepack pnpm --dir repos/client run check:ops-console-settings-surface`
  evidence command and reports `client_owned_evidence_available` when
  Preferences and Access Lists are wired to `/caller/global-policy`, approval
  modes, whitelist/Blocklist lists, and `allow_all` safety copy. The
  `logs_guidance` surface consumes
  `corepack pnpm --dir repos/client run check:ops-console-logs-surface` and
  reports `client_owned_evidence_available` when Runtime and Help expose
  `/runtime/logs`, `/runtime/alerts`, caller/responder/relay log services,
  log filtering metadata, `selfhost:logs`, and secret-safety copy.
- Use `corepack pnpm --silent run deployability:recipe -- --profile public-stack --json`
  when a fresh operator or management UI needs one linear first-run recipe. It
  combines readiness, menu, runbook, and onboarding metadata into inspect, gate,
  start, verify, operate, and evidence steps without executing those commands.

Inspect the Nx workspace:

```bash
NX_DAEMON=false corepack pnpm exec nx show projects
NX_DAEMON=false corepack pnpm exec nx graph --affected
```

Start local source integration:

```bash
corepack pnpm run dev:local:up
corepack pnpm --silent run dev:local:up -- --json
corepack pnpm --silent run dev:local:status -- --json
corepack pnpm --silent run dev:local:down -- --json

# Or run the underlying steps manually:
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
```

## Documents

- [Documentation Index](docs/README.md)
- [Terminology Mapping](docs/architecture/terminology.md)
- [Terminology Migration Audit](docs/architecture/terminology-migration-audit.md)
- [Cross-Repo Change Process](docs/orchestration/cross-repo-change-process.md)
- [Developer Workflow](docs/orchestration/developer-workflow.md)
- [CI Layering](docs/orchestration/ci-layering.md)
- [System Overview](docs/architecture/system-overview.md)
- [Boundary Rules](docs/architecture/boundary-rules.md)
- [Local Dev Setup](docs/runbooks/local-dev-setup.md)
- [AGENTS.md](AGENTS.md)
- [CLAUDE.md](CLAUDE.md)
