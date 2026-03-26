# Terminology Migration Audit

This document records the current closeout state of the `caller / responder / hotline` terminology migration in the fourth-repo workspace.

Updated: 2026-03-21

## Scope

This audit covers:

- source files in the fourth repository
- reader-facing docs mirrored into the three formal repositories
- local development dependency artifacts that can reintroduce old names during validation

This audit does not redefine protocol semantics. The canonical mapping still lives in [terminology.md](terminology.md).

## Current Status

- Source file names using `buyer`, `seller`, or `subagent`: `0`
- Source-text legacy mentions outside intentional mapping/history files: `0`
- Dependency artifact legacy file names under `node_modules` / `.pnpm`: `0` after local sync
- Fourth-repo contract validation: passing

## Intentional Legacy Locations

These locations are allowed to keep legacy terms because they are mapping or historical records:

1. [terminology.md](terminology.md)
   Contains the explicit canonical-to-legacy terminology mapping table.
2. [pre-split-naming-matrix.zh-CN.md](/Users/hejiajiudeeyu/Documents/Projects/delegated-execution-dev/repos/protocol/docs/current/guides/pre-split-naming-matrix.zh-CN.md)
   Preserves a historical naming matrix for pre-split planning context.

No other source files should keep legacy role or capability labels as primary reader-facing terms.

## Local Validation Overlay

`repos/platform` now declares `@delexec/contracts` with a compatible semver range so local validation overlays can consume the current protocol package without entering an invalid dependency state.

For fourth-repo cross-repo validation, the workspace now uses a local overlay step:

```bash
corepack pnpm run sync:local-contracts
```

That command:

- overlays `repos/platform` workspace installs with the current local `repos/protocol/packages/contracts`
- removes stale legacy executable shims under `repos/client/apps/ops/node_modules/.bin`
- removes stale top-level pnpm cache entries for the old contracts tarball

It is invoked automatically by:

- `node tools/contracts-check.mjs`
- `node tools/source-integration-check.mjs`

## Expected `npm ls` Behavior

After the local overlay is applied, this command in `repos/platform`:

```bash
npm ls @delexec/contracts --all
```

should resolve to the local protocol package without reporting `invalid`:

- `tools/contracts-check.mjs`
- `tools/source-integration-check.mjs`

If it does not, rerun:

```bash
corepack pnpm run sync:local-contracts
```

## Operator Guidance

- For fourth-repo validation, use top-level commands only.
- Do not rely on standalone `npm install` inside `repos/platform` if the validation target includes local protocol changes.
- If a local install reintroduces old contract assets, rerun:

```bash
corepack pnpm run sync:local-contracts
```

## Exit Criteria

This migration closeout can be considered complete for local development when all of the following remain true:

1. Source file names contain no `buyer`, `seller`, or `subagent`.
2. Source-text legacy mentions remain only in approved mapping/history files.
3. `tools/contracts-check.mjs` passes.
4. `tools/source-integration-check.mjs` passes.
5. Dependency artifact legacy names remain absent after `corepack pnpm run sync:local-contracts`.

## Remaining Follow-Up

One follow-up item is still open:

1. Publish and consume the next formal `@delexec/contracts` release so standalone repository installs and fourth-repo local validation converge on the same artifact version.
