# Development Guidelines

## Overview

Guidelines for @delexec/ops-console, a client operator console React app under `repos/client/apps/ops-console`.

- This package belongs to the client truth source. Keep end-user `delexec-ops`, local supervisor, local persistence, transport wiring, and client console behavior here.

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

- Use repos/client/apps/ops-console/src/App.tsx as a current reference.
- Use repos/client/apps/ops-console/src/components/layout/AppShell.tsx as a current reference.
- Use repos/client/apps/ops-console/src/pages/caller/CatalogPage.tsx as a current reference.
- Use repos/client/apps/ops-console/src/lib/api.ts as a current reference.

## Validation

- Run `npm --prefix repos/client run test:unit` when this area changes.
- Run `npm --prefix repos/client run check:ops-console-runtime-surface` when this area changes.

**Language**: Documentation in this directory is written in English.
