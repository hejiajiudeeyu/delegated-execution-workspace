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

Check whether the local daily agent/caller-skill development stack is ready:

```bash
corepack pnpm run deployability:overview
corepack pnpm --silent run deployability:overview -- --json
corepack pnpm run deployability:quickstart
corepack pnpm --silent run deployability:quickstart -- --json
corepack pnpm run deployability:safety
corepack pnpm --silent run deployability:safety -- --json
corepack pnpm run deployability:readiness
corepack pnpm --silent run deployability:readiness -- --json
corepack pnpm run deployability:doctor
corepack pnpm --silent run deployability:doctor -- --json
corepack pnpm run deployability:dashboard
corepack pnpm --silent run deployability:dashboard -- --json
corepack pnpm run deployability:dashboard -- --profile public-stack
corepack pnpm --silent run deployability:dashboard -- --profile public-stack --json
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
corepack pnpm run deployability:commands -- --profile public-stack
corepack pnpm --silent run deployability:commands -- --profile public-stack --json
corepack pnpm run compat:status
corepack pnpm --silent run compat:status -- --json
corepack pnpm run deployability:handoff
corepack pnpm --silent run deployability:handoff -- --json
corepack pnpm run deployability:handoff -- --profile public-stack
corepack pnpm --silent run deployability:handoff -- --profile public-stack --json
corepack pnpm run test:deployability
corepack pnpm run test:deployability-operations
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
- Use `corepack pnpm --silent run deployability:menu -- --profile public-stack --json`
  when a management UI needs one public-stack first screen. The focused menu
  includes `selected_onboarding_plan` from the read-only
  `operator:onboarding:plan` projection, alongside the selected runbook, without
  reading `.env`, calling Docker, probing networks, or printing secret values.
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
