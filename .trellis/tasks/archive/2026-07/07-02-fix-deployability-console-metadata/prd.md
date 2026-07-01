# Fix Deployability Console Metadata Crash

## Goal

Restore the fourth-repo deployability management metadata surface so `deployability:console --json` emits valid JSON instead of crashing, and so dependent operator status, roadmap, menu, dashboard, recipe, and next-action commands can report the real remaining gates.

## What I Already Know

* Current Trellis state had no active task before this task was created.
* The compatibility ledger is healthy at `changes/CHG-2026-169.yaml`; current submodule SHAs match the bundle.
* `node tools/compat-status.mjs --json` passes.
* `node tools/deployability-readiness.mjs --json` passes with `daily_deployable_with_safety_gates`.
* `node tools/deployability-console.mjs --json` fails with `Cannot read properties of undefined (reading 'trim')`.
* `deployability:roadmap`, `deployability:status`, `deployability:menu`, `deployability:dashboard`, `deployability:recipe`, `deployability:next`, and profile action-plan views surface downstream blockers because console/menu/recipe metadata cannot be aggregated cleanly.
* This is fourth-repo orchestration tooling; it must not change protocol schema, client runtime truth, platform runtime truth, or submodule SHAs.

## Requirements

* Fix the undefined `.trim()` crash in the deployability console metadata path.
* Preserve read-only behavior for deployability metadata commands: no Docker startup, no port binding, no network probing, no secret printing.
* Restore valid JSON output for `deployability:console --json`.
* Restore dependent deployability aggregate commands so they no longer fail solely because console metadata is unavailable.
* Keep public-stack exposure safety gates explicit; do not turn planned/gated production work into a pass.
* Add or update focused tests around the failing command path and affected aggregate behavior.

## Acceptance Criteria

* [x] `node tools/deployability-console.mjs --json` exits 0 and emits valid JSON.
* [x] `node tools/deployability-roadmap.mjs --json` no longer lists `console: source did not emit valid JSON`.
* [x] `node tools/deployability-status.mjs --json` reports only real remaining gates/blockers.
* [x] `node tools/deployability-menu.mjs --profile public-stack --json` no longer fails because of console metadata.
* [x] `node tools/deployability-recipe.mjs --profile public-stack --json` emits non-empty recipe steps/copy-paste commands or otherwise reports a deliberate product gate rather than a metadata aggregation failure.
* [x] Relevant deployability tests pass.

## Definition of Done

* Targeted deployability command tests pass.
* At least the affected metadata commands are manually verified with direct `node tools/*.mjs --json` invocations.
* No submodule SHA changes are introduced.
* No change bundle is added unless submodule SHAs change.
* Any remaining blocked/gated status is explained as real product readiness state, not a tooling crash.

## Out of Scope

* Protocol schema, contract fields, or package release changes.
* Client/runtime/platform behavior changes inside `repos/`.
* Opening public-stack edge routes or asserting production readiness.
* Running Docker startup/smoke commands unless needed later for a separate deployment validation task.
* Changing submodule SHAs or compatibility bundle entries.

## Technical Notes

* Required repo docs read before changes: `README.md`, `docs/orchestration/cross-repo-change-process.md`, `docs/orchestration/developer-workflow.md`, `docs/orchestration/agent-workflow.md`, `AGENTS.md`.
* Likely files: `tools/deployability-console.mjs`, aggregate deployability scripts under `tools/deployability-*.mjs`, shared helpers under `tools/lib/`, and associated `tools/*.test.mjs`.
* Use direct `node tools/*.mjs` commands for local verification because this environment does not have `corepack` on PATH and bundled pnpm 11 attempts a non-TTY `node_modules` purge before running scripts.

## Verification

* [x] `node tools/deployability-console.mjs --json`
* [x] `node tools/deployability-menu.mjs --profile public-stack --json`
* [x] `node tools/deployability-recipe.mjs --profile public-stack --json`
* [x] `node tools/deployability-roadmap.mjs --json`
* [x] `node tools/deployability-status.mjs --json`
* [x] `node tools/deployability-dashboard.mjs --profile public-stack --json`
* [x] `node tools/deployability-next.mjs --profile public-stack --json`
* [x] `node tools/deployability-action-plan.mjs --profile public-stack --json`
* [x] `node tools/run-tests.mjs --concurrency 6 tools/deployability-console.test.mjs tools/deployability-menu.test.mjs tools/deployability-recipe.test.mjs tools/deployability-roadmap.test.mjs tools/deployability-status.test.mjs tools/deployability-dashboard.test.mjs tools/deployability-next.test.mjs tools/deployability-action-plan.test.mjs`
* [x] `node tools/run-tests.mjs --concurrency 8 ...` for the `test:fast` script's deployability files
* [x] `node tools/validate-submodules.mjs`
* [x] `node tools/check-boundaries.mjs`
* [x] `node tools/validate-change-bundle.mjs`
* [x] `node tools/contracts-check.mjs`
* [ ] `node tools/source-integration-check.mjs` not run; this command starts Docker services and hard-requires `corepack pnpm install`, while this environment has no `corepack` on PATH.
