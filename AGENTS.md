# AGENTS.md

This repository is a synthetic monorepo superproject.

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
- The main branch of this repository must point only to verified compatible submodule SHAs.
- Every cross-repo SHA update must include a change bundle YAML under `changes/`.

Forbidden behavior:

- add business schema or protocol fields
- add runtime implementation as a new source of truth
- duplicate source code from the three formal repositories
- bypass owning-repo changes by only editing fourth-repo scripts
- modify orchestration files to avoid required owning-repo changes
- claim cross-repo work is complete without fourth-repo integration checks
- update submodule SHAs without a change bundle
