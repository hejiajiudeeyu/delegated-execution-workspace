# Development Guidelines

## Overview

Guidelines for call-anything-brand-site, a brand React/Vite site under `repos/brand-site`.

- This package owns the public brand/site surface, design system patterns, SEO pages, prerender output, and content smoke checks.

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

- Use repos/brand-site/src/app/routes.tsx as a current reference.
- Use repos/brand-site/src/app/components/brand-scaffold.tsx as a current reference.
- Use repos/brand-site/src/design-system/patterns/homepage-hero.tsx as a current reference.
- Use repos/brand-site/src/styles/theme.css as a current reference.

## Validation

- Run `npm --prefix repos/brand-site run lint` when this area changes.
- Run `npm --prefix repos/brand-site run build` when this area changes.
- Run `npm --prefix repos/brand-site run smoke:deployability-content` when this area changes.

**Language**: Documentation in this directory is written in English.
