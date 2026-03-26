# CI Layering

## Overview

This document describes how CI responsibilities are divided between the three formal repositories and the fourth-repo orchestration layer. Each layer is independently responsible for its own correctness; the fourth-repo validates that a specific **combination** of formal-repo SHAs is compatible.

## Formal Repository CI

Each formal repository owns standalone CI for its own artifacts:

| Stage | Description |
|-------|-------------|
| `install` | Dependency installation and lockfile integrity |
| `build` | Package compilation and artifact generation |
| `test` | Unit, integration, and end-to-end tests |
| `release` | npm publish, Docker image push, GitHub Release |

These pipelines run on every PR and merge to the formal repo's main branch. They do **not** test cross-repo compatibility.

## Fourth-Repository CI

This repository validates combination compatibility. It runs only when submodule SHAs or orchestration files change.

| Job | Description | Command |
|-----|-------------|---------|
| `check-submodules` | Verifies submodule SHA references are reachable and not detached | `pnpm run check:submodules` |
| `check-boundaries` | Nx graph analysis against `tools/project-boundaries.yaml` | `pnpm run check:boundaries` |
| `check-bundles` | Validates that all pending SHA changes have a corresponding change bundle YAML | `pnpm run check:bundles` |
| `test-contracts` | Runs `@delexec/contracts` unit tests against the pinned protocol SHA | `pnpm run test:contracts` |
| `test-integration` | Cross-repo source integration tests (platform + client + protocol together) | `pnpm run test:integration` |

## Dependency Between Layers

```
formal-repo CI (per repo)
      ↓
  release tag / SHA
      ↓
fourth-repo: update submodule SHA + change bundle
      ↓
fourth-repo CI: check:submodules + check:boundaries + check:bundles + test:contracts + test:integration
      ↓
  verified combination → merge to main
```

## Failure Response

| Failure | Owner | Action |
|---------|-------|--------|
| Formal-repo CI fails | Owning repository team | Fix in owning repo; do not patch in fourth-repo |
| Fourth-repo boundary check fails | Fourth-repo orchestration | Review cross-boundary imports; fix must land in the owning formal repo |
| Fourth-repo bundle check fails | Fourth-repo orchestration | Add the missing change bundle YAML under `changes/` |
| Integration test fails against new SHA | Both teams | Coordinate fix; may require changes in both owning repo and fourth-repo contract tests |

## Never Do

- Do not disable CI checks to unblock a merge
- Do not patch formal-repo behavior via fourth-repo scripts
- Do not claim a cross-repo change is complete before all fourth-repo CI jobs pass
