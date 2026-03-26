# Boundary Rules

## Overview

Boundary enforcement is managed by the fourth-repo using `tools/project-boundaries.yaml` and Nx project grouping. These rules exist to prevent cross-repo runtime coupling and to ensure each formal repository remains independently deployable.

## Project Groups

| Group | Packages |
|---|---|
| `protocol/contracts` | `@delexec/contracts` |
| `shared/runtime-support` | `@delexec/runtime-utils`, `@delexec/sqlite-store` |
| `client/runtime` | `@delexec/caller-controller`, `@delexec/caller-controller-core`, `@delexec/responder-controller`, `@delexec/responder-runtime-core` |
| `client/transports` | `@delexec/transport-*` |
| `client/ops` | `@delexec/ops` |
| `platform/data` | `@delexec/postgres-store` |
| `platform/api` | `@delexec/platform-api` |
| `platform/relay` | `@delexec/transport-relay` |
| `platform/gateway` | `@delexec/platform-console-gateway` |

## Allowed Dependency Directions

```
protocol/contracts
    ↓           ↓
client/*   platform/*

shared/runtime-support
    ↓           ↓
client/*   platform/*
```

- `protocol` → `client`: Client packages may consume `@delexec/contracts`
- `protocol` → `platform`: Platform packages may consume `@delexec/contracts`
- `shared/runtime-support` → `client`: Client packages may consume `@delexec/runtime-utils`, `@delexec/sqlite-store`
- `shared/runtime-support` → `platform`: Platform packages may consume `@delexec/runtime-utils`, `@delexec/sqlite-store`

## Forbidden Dependencies

| From | To | Reason |
|------|----|--------|
| `client` | `platform` | Client must not import platform packages at runtime |
| `platform` | `client` | Platform must not import client packages at runtime |
| `fourth-repo scripts` | any formal repo source | Scripts here cannot substitute for owning-repo changes |

## Governance Policies

### Cross-Boundary Changes
Any change that moves code between boundary groups must:
1. Land in the owning repository first
2. Be released (or tagged as development-only via `workspace:*`)
3. Have the submodule SHA updated in this repo
4. Include a change bundle YAML under `changes/`

### `workspace:*` Restrictions
`workspace:*` links are **development-only** and **must not** appear in formal release manifests. They are used here to enable local cross-repo integration testing before formal releases.

### Violation Examples
- ❌ Adding a `require('@delexec/platform-api')` inside `repos/client/`
- ❌ Modifying `repos/platform/apps/platform-api/src/server.js` to import from `repos/client/`
- ❌ Creating a new package in this fourth-repo that duplicates logic from a formal repository
- ❌ Editing orchestration scripts to bypass owning-repo changes

## Validation

Run from the fourth-repo root:

```bash
corepack pnpm run check:boundaries
```

This uses Nx project graph analysis against `tools/project-boundaries.yaml` to detect cross-boundary imports.
