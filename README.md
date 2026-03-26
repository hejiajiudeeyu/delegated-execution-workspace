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

Notes:

- Use the top-level `corepack pnpm install` as the default workspace install path.
- Standalone `npm install` inside `repos/platform` may restore the last published `@delexec/contracts` tarball. Run `corepack pnpm run sync:local-contracts` or any fourth-repo validation command to relink the current local protocol package before checking cross-repo changes.

Inspect the Nx workspace:

```bash
NX_DAEMON=false corepack pnpm exec nx show projects
NX_DAEMON=false corepack pnpm exec nx graph --affected
```

Start local source integration:

```bash
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
