# Developer Workflow

## Working Model

This repository is the unified workspace for:

- `repos/protocol`
- `repos/client`
- `repos/platform`

The three submodules remain the only business truth sources.

## Standard Setup

1. `git submodule update --init --recursive`
2. `corepack pnpm install`
3. on the first source-integration run, let the orchestration scripts perform submodule-local installs for `repos/client` and `repos/platform`
4. create local env files inside `repos/platform/deploy/platform/.env` when needed
5. run fourth-repo checks before claiming a cross-repo task is complete

## Standard Cross-Repo Loop

1. change the owning repository
2. update submodule SHAs here
3. add or update the matching change bundle
4. run:
   - `pnpm check:submodules`
   - `pnpm check:boundaries`
   - `pnpm check:bundles`
   - `pnpm test:contracts`
   - `pnpm test:integration`
5. only after those pass, promote the combination to main

## CI Layering

The three formal repositories still own:

- install
- build
- test
- release

This repository owns only:

- workspace install
- graph and affected evaluation
- boundary validation
- contract checks
- source integration checks
- change bundle validation

## Boundary Rules

- protocol may depend on nobody inside this workspace
- client may depend on protocol
- platform may depend on protocol
- shared support packages may flow into both client and platform
- client product/runtime packages must not depend on platform packages
- platform packages must not depend on client product/runtime packages

The fourth repository enforces these boundaries by package/dependency checks and Nx project grouping.

## Source Integration Path

Source integration is defined as:

- `repos/platform` starts `deploy/platform`
- `repos/platform` starts standalone relay
- `repos/client` runs source `delexec-ops`
- client uses `relay_http` pointed at platform relay

This is the required baseline integration path for fourth-repo certification.

Recommended commands:

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
corepack pnpm run dev:client:status
corepack pnpm run dev:approve-example
corepack pnpm run test:integration
```

## Change Bundle Discipline

Every cross-repo SHA movement belongs to a bundle file under `changes/`.

The bundle is the smallest management unit for:

- review
- CI display
- rollback
- verified compatibility history
