# Agent Workflow

This document defines the required workflow for agents operating in the fourth repository.

Agents must treat this repository as an orchestration and compatibility workspace, not as a business truth source.

## Required Read Order

Before making changes, read these files in order:

1. `README.md`
2. `docs/orchestration/cross-repo-change-process.md`
3. `docs/orchestration/developer-workflow.md`
4. `docs/orchestration/agent-workflow.md`
5. `AGENTS.md`

## Operating Model

Agents may use this repository for:

- submodule combination management
- local cross-repo integration
- contract and source integration checks
- compatibility ledger updates
- orchestration scripts and runbooks

Agents must not use this repository to introduce new business truth.

## Required Development Sequence

For every cross-repo task, agents must follow this sequence:

1. Determine the owning repository for the intended business change.
2. Make business changes only in the owning submodule under `repos/`.
3. Update this repository's submodule references to the target commits.
4. Add or update a change bundle under `changes/`.
5. Run the required fourth-repo validation commands.
6. Only after validation passes, report the cross-repo task as complete.

## Ownership Decision

Use this routing rule before editing code:

- protocol schema, contracts, and protocol templates -> `repos/protocol`
- client runtime, controller, transport, and operator flows -> `repos/client`
- platform API, relay, gateway, deploy, and persistence -> `repos/platform`
- orchestration scripts, change bundles, runbooks, and compatibility checks -> fourth repository

If the intended change would alter business behavior and the only edits are in the fourth repository, stop and move the change to the owning submodule.

## Completion Gate

Agents must not claim cross-repo work is complete until all required checks pass:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

## Change Bundle Rule

Every cross-repo submodule SHA movement must have a matching bundle file under `changes/`.

The bundle must:

- include all required fields
- record the exact current `protocol`, `client`, and `platform` submodule SHAs
- reflect current validation status

If submodule SHAs change, the bundle must be updated in the same work.

## Forbidden Shortcuts

Agents must not:

- add business schema or protocol fields in the fourth repository
- add runtime implementation here as a new truth source
- copy source out of `repos/protocol`, `repos/client`, or `repos/platform`
- change orchestration only to avoid required owning-repo edits
- report success without running fourth-repo validation
- update submodule SHAs without updating the matching change bundle

## Recommended Working Style

- use integration branches for experimental SHA combinations
- keep `main` reserved for verified compatible combinations
- keep agent-facing rules short in `AGENTS.md`
- keep detailed procedures in `docs/orchestration/`
- prefer fail-fast script checks over prose-only guidance
