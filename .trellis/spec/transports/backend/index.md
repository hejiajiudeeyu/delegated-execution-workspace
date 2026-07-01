# Backend Development Guidelines

## Overview

Guidelines for backend-style transport adapter work under `repos/client/packages/transports`.

## Guidelines Index

| Guide | Path | Status |
|-------|------|--------|
| Directory Structure | [directory-structure.md](./directory-structure.md) | Filled |
| Error Handling | [error-handling.md](./error-handling.md) | Filled |
| Logging Guidelines | [logging-guidelines.md](./logging-guidelines.md) | Filled |
| Database Guidelines | [database-guidelines.md](./database-guidelines.md) | Filled |
| Quality Guidelines | [quality-guidelines.md](./quality-guidelines.md) | Filled |

## Pre-Development Checklist

- Read the adapter package source and its integration test before editing.
- Search for the same transport name across CLI, controller, docs, and tests.
- Keep protocol semantics in `@delexec/contracts`; keep adapter behavior in the adapter package.
- Run client unit and integration tests after meaningful transport changes.
