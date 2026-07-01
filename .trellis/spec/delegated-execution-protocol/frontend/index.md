# Development Guidelines

## Overview

Guidelines for delegated-execution-protocol, a protocol truth source under `repos/protocol`.

- This package owns protocol schemas, validators, error registries, canonicalization, signing rules, templates, and protocol docs. Runtime caller/responder/platform behavior belongs outside this repo.

## Guidelines Index

| Guide | Path | Status |
|-------|------|--------|
| Directory Structure | [directory-structure.md](./directory-structure.md) | Filled |
| Component Guidelines | [component-guidelines.md](./component-guidelines.md) | Filled |
| Hook Guidelines | [hook-guidelines.md](./hook-guidelines.md) | Filled |
| State Management | [state-management.md](./state-management.md) | Filled |
| Quality Guidelines | [quality-guidelines.md](./quality-guidelines.md) | Filled |
| Type Safety | [type-safety.md](./type-safety.md) | Filled |

## Pre-Development Checklist

- Read this index plus the specific guideline file for the kind of change you are making.
- Search existing code before changing constants, ports, env names, status strings, protocol fields, or CLI flags.
- Confirm the owning repo: protocol semantics in `repos/protocol`, client UX/runtime in `repos/client`, platform API/deploy in `repos/platform`, public site in `repos/brand-site`.
- For cross-repo behavior, plan the full sequence: owning repo change, submodule SHA update, change bundle update, fourth-repo validation.

## Current Examples

- Use repos/protocol/packages/contracts/src/index.js as a current reference.
- Use repos/protocol/tests/unit/schema-validation.test.js as a current reference.
- Use repos/protocol/tests/unit/error-codes.test.js as a current reference.
- Use repos/protocol/docs/current/spec/platform-api-v0.1.md as a current reference.

## Validation

- Run `npm --prefix repos/protocol test` when this area changes.

**Language**: Documentation in this directory is written in English.
