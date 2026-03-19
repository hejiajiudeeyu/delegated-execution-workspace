# ADR-001: Fourth Repo Purpose

## Status

Accepted

## Context

The delegated execution system spans three repositories (protocol, client, platform) that must be developed and tested together. Cross-repo changes require validation that specific SHA combinations are compatible.

## Decision

Create a fourth repository as a synthetic monorepo superproject. This repository:

- Provides a unified Codex/Cursor workspace
- Orchestrates local cross-repo integration
- Validates contract and integration compatibility
- Records verified protocol/client/platform commit combinations

This repository does **not**:

- Define business schema, protocol fields, or runtime behavior
- Duplicate source from the three formal repositories
- Replace formal release ownership

## Consequences

- All business changes must be made in the owning submodule repository.
- `workspace:*` resolution is for development-time only and must not leak into formal releases.
- The main branch must only point to verified compatible submodule SHAs.
- Every cross-repo SHA update requires a change bundle YAML.
