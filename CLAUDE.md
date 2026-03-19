# CLAUDE.md

This repository is a synthetic monorepo superproject for cross-repo development orchestration.

## Start Here

Read in this order before changing behavior:

1. `README.md`
2. `docs/cross-repo-change-process.md`
3. `docs/developer-workflow.md`
4. `AGENTS.md`

## Repository Boundary

This repository owns only:

- submodule SHA combination management
- local cross-repo integration
- workspace install and task orchestration
- contract and integration certification
- compatible combination bookkeeping

This repository does not own:

- protocol truth-source logic
- client runtime truth
- platform runtime truth
- formal product release

## Development Rules

- `workspace:*` is only for development-time linking here, never for formal release.
- Business changes must be made in the owning submodule under `repos/`.
- Do not add schema, protocol fields, or runtime implementation here.
- Do not duplicate source out of the formal repositories to create a new truth source.
- Every cross-repo combination update must include a YAML change bundle.
- The main branch of this repository must point only to verified compatible submodule SHAs.
- Do not update fourth-repo orchestration to sidestep required owning-repo changes.
- Do not claim cross-repo completion before fourth-repo integration checks pass.

## Validation

Minimum fourth-repo validation:

```bash
pnpm check:submodules
pnpm check:boundaries
pnpm check:bundles
pnpm test:contracts
pnpm test:integration
```
