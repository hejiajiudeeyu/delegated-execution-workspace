# Development Guidelines

## Overview

Guidelines for @delexec/platform-console, a platform operator console React app under `repos/platform/apps/platform-console`.

- This package belongs to the platform truth source. Keep platform API, relay, console gateway, compose/image/deploy behavior, operator docs, and persistence here.

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

- Use repos/platform/apps/platform-console/src/App.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/components/layout/AppShell.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/pages/BillingPage.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/lib/api.ts as a current reference.

## Validation

- Run `npm --prefix repos/platform run test:unit` when this area changes.
- Run `npm --prefix repos/platform run test:release:docs` when this area changes.

**Language**: Documentation in this directory is written in English.
