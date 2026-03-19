# AGENTS.md

This repository is a synthetic monorepo superproject.

Read before making changes:

1. `README.md`
2. `docs/orchestration/cross-repo-change-process.md`
3. `docs/orchestration/developer-workflow.md`
4. `docs/orchestration/agent-workflow.md`
5. `AGENTS.md`

The three business truth sources live in:

- `repos/protocol`
- `repos/client`
- `repos/platform`

Use this repository for:

- submodule combination management
- local cross-repo integration
- contract and integration checks
- Agent routing and orchestration
- compatible SHA ledger management

Mandatory rules:

- `workspace:*` is for fourth-repo development only and must not leak into formal releases.
- Business changes must be made in the owning submodule under `repos/`.
- Follow the required sequence: owning repo change -> submodule SHA update -> change bundle update -> fourth-repo validation.
- The main branch of this repository must point only to verified compatible submodule SHAs.
- Every cross-repo SHA update must include a change bundle YAML under `changes/`.
- Do not claim cross-repo work is complete before running:
  - `corepack pnpm run check:submodules`
  - `corepack pnpm run check:boundaries`
  - `corepack pnpm run check:bundles`
  - `corepack pnpm run test:contracts`
  - `corepack pnpm run test:integration`

Forbidden behavior:

- add business schema or protocol fields
- add runtime implementation as a new source of truth
- duplicate source code from the three formal repositories
- bypass owning-repo changes by only editing fourth-repo scripts
- modify orchestration files to avoid required owning-repo changes
- claim cross-repo work is complete without fourth-repo integration checks
- update submodule SHAs without a change bundle
