# brainstorm: close unfinished repository work

## Goal

Inventory the currently unfinished work in the delegated-execution superproject and converge on a safe closeout order. The closeout must preserve the fourth-repo rules: business changes stay in owning submodules, every submodule SHA movement has a change bundle, and cross-repo work is only called complete after the required validation chain passes.

## What I already know

* User asked: "仓库里目前还有哪些未收口的工作，准备收口".
* This repository is the fourth repository. It owns orchestration, compatibility ledger, change bundles, and integration checks, not business truth.
* Required read order completed: `README.md`, `docs/orchestration/cross-repo-change-process.md`, `docs/orchestration/developer-workflow.md`, `docs/orchestration/agent-workflow.md`, `AGENTS.md`.
* Current root branch is `main`, ahead of `origin/main` by 1 commit: `fcd39fe chore(bundle): record platform v0.1.4 console UX for operator gateway`.
* Current active Trellis tasks at inventory time:
  * `00-bootstrap-guidelines/` status `in_progress`.
  * `06-15-platform-service-resolve/` status `in_progress`.
  * `06-30-close-unfinished-work/` status `planning` and current.
* Initial `compat:status --json` reported `ok: false`.
* Latest current bundle from `compat:status` is `changes/CHG-2026-168.yaml`.
* `CHG-2026-168` tracks protocol `52f57e1`, client `526f02e`, platform `38dfeea`, and brand-site `d0f50ed`, with `contracts_check: passed` and `integration_check: pending`.
* `compat:status` blockers are both brand-site related:
  * `repos/brand-site: current SHA does not match latest bundle`.
  * `repos/brand-site: submodule gitlink marker is not clean`.
* `repos/protocol`, `repos/client`, and `repos/platform` match their current bundle SHAs and have clean worktrees.
* `repos/brand-site` is dirty and at `2b97cf2`, while the latest bundle expects `d0f50ed`.
* Initial top-level `check:submodules` failed on `repos/brand-site`.
* Top-level `check:boundaries` passes.
* Top-level `check:bundles` passes.
* The root index already contains a large staged set: Trellis task records, change bundles `CHG-2026-146` through `CHG-2026-148`, first-real-call planning docs, deployability/tooling edits, skill files, `pnpm-lock.yaml`, `skills-lock.json`, and helper/test changes.
* Prior memory says the June 15 service-resolution work was completed and root verification passed; unrelated first-real-call/deployability WIP was intentionally left visible for separate handling.

## Assumptions (temporary)

* "收口" means decide what to finish, validate, commit/archive, or explicitly defer, not delete unrelated WIP.
* The current root staged changes were accumulated across at least two workstreams and should not be committed as one undifferentiated batch without user approval.
* Brand-site dirty work may represent an active separate workstream and should not be reverted automatically.

## Open Questions

* None for the ledger-first closeout slice.

## Requirements (evolving)

* Produce a concrete inventory of open work by workstream.
* Separate workstreams before committing or archiving.
* Do not modify business code in the fourth repo to bypass owning-repo changes.
* Do not claim `CHG-2026-168` complete until `integration_check` is passed or explicitly left pending with a documented blocker.
* Treat `repos/brand-site` dirty work as protected until the user chooses commit, defer, or restore-to-bundle.

## Acceptance Criteria (evolving)

* [x] Root dirty state is classified into task-related groups.
* [x] Each active Trellis task is either completed, archived, or intentionally left active with a reason.
* [x] `repos/brand-site` mismatch is resolved or explicitly deferred.
* [x] For any completed cross-repo bundle, run and record:
  * `corepack pnpm run check:submodules`
  * `corepack pnpm run check:boundaries`
  * `corepack pnpm run check:bundles`
  * `corepack pnpm run test:contracts`
  * `corepack pnpm run test:integration`
* [x] If a validation command cannot be run or fails for an external reason, the blocker is recorded in the relevant task/bundle notes.

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint/typecheck/CI-equivalent checks green for the workstream being closed.
* Docs/notes updated if behavior or operator process changes.
* Rollout/rollback considered for cross-repo SHA changes.
* Dirty WIP from unrelated workstreams is preserved, not hidden or deleted.

## Current Inventory

### A. Immediate blocker: brand-site mismatch

Evidence:
* `compat:status` reports latest bundle `CHG-2026-168` expects `brand_site_sha: d0f50ede1099c9abd01a56a5202c123230c6f4d4`.
* `repos/brand-site` is currently at `2b97cf240b3da62d369d0c9de3c978b4325e027e`.
* `repos/brand-site` has uncommitted homepage/mobile navigation changes.
* `check:submodules` fails solely on `repos/brand-site`.

Closeout options:
* Restore brand-site to the bundle SHA and preserve the dirty work separately, then validate `CHG-2026-168`.
* Finish and commit the brand-site work in its owning repo, update bundle SHA, then validate the new combination.
* Defer `CHG-2026-168` completion and first close root-only staged work that does not depend on a clean bundle.

### B. Current bundle pending: `CHG-2026-168`

Evidence:
* Root commit `fcd39fe` already records platform v0.1.4 gateway UI.
* `changes/CHG-2026-168.yaml` says `integration_check: pending`.
* Notes mention prior `test:integration` was blocked by Docker npm network during platform image build.

Closeout need:
* Re-run full fourth-repo validation after brand-site mismatch is resolved, or keep the bundle explicitly pending with current blocker notes.

### C. Staged first-real-call/deployability planning and tool changes

Evidence:
* Staged docs under `docs/planning/first-real-call/**` and `docs/planning/field-audit/**`.
* Staged tool/test changes under `tools/deployability-*.test.mjs`, `tools/dev-doctor*`, `tools/mcp-golden-four*`, `tools/agent-e2e/agent-e2e-test.py`, and `tools/test-helpers/current-bundle.mjs`.
* Staged bundles `CHG-2026-146.yaml`, `CHG-2026-147.yaml`, and `CHG-2026-148.yaml`.
* These appear related to older first-real-call/public-stack/operator work, not directly to the current `CHG-2026-168` bundle.

Closeout need:
* Decide whether to commit as planning/tooling history, split into smaller commits, or re-audit because some staged notes claim passed validations from earlier dates.

### D. Service-resolution Trellis task still active

Evidence:
* `.trellis/tasks/06-15-platform-service-resolve/` is staged and task status is still `in_progress`.
* Prior memory records the service-resolution implementation as completed, verified, and committed as root `cf653ec`.

Closeout need:
* Mark/archive this task after confirming no live dirty files belong to service-resolution.

### E. Bootstrap Trellis task still active

Evidence:
* `00-bootstrap-guidelines/` remains `in_progress`.

Closeout need:
* Decide whether this is a persistent project task or should be archived.

### F. Personal skill additions

Evidence:
* Staged `.agents/skills/grill-me/SKILL.md`, `.agents/skills/grilling/SKILL.md`, and `skills-lock.json`.

Closeout need:
* Decide whether these belong in this repo's shared agent config or should be separated from product/orchestration closeout.

## Closeout Result

### Ledger-first slice completed

Actions:
* Preserved dirty `repos/brand-site` work with `git -C repos/brand-site stash push -u -m "codex-closeout-preserve-brand-site-wip-20260630"`.
* Checked out `repos/brand-site` to bundle SHA `d0f50ede1099c9abd01a56a5202c123230c6f4d4`.
* Re-ran `compat:status --json`; result became `ok: true`, `ledger_matches_current: true`, no blockers, no warnings.
* Updated `changes/CHG-2026-168.yaml` from `integration_check: pending` to `integration_check: passed`.

Validation passed:
* `corepack pnpm run check:submodules`
* `corepack pnpm run check:boundaries`
* `corepack pnpm run check:bundles`
* `corepack pnpm run test:contracts`
* `corepack pnpm run test:integration`

### Intentionally deferred work

* Root staged first-real-call/deployability/tooling docs and tests remain staged for a separate workstream.
* `repos/brand-site` homepage/mobile navigation WIP is preserved in submodule stash `stash@{0}` with message `codex-closeout-preserve-brand-site-wip-20260630`.
* `00-bootstrap-guidelines/` remains active because it appears to be persistent project setup work, not part of this ledger closeout.
* `06-15-platform-service-resolve/` remains active in the task list but is not part of current dirty code; archive separately if desired.
* Personal skill additions remain staged and should be committed or separated as their own repo configuration decision.

## Handoff For Next Formal Development

The repository is ready to start the next formal development task from a compatibility-ledger perspective once the user chooses the next task. Before coding the next task:
* Confirm whether to keep brand-site at the verified bundle SHA or restore the preserved brand-site stash as the new frontend workstream.
* Do not mix the deferred staged first-real-call/deployability/tooling files into unrelated future business commits.
* If the next task touches submodule SHAs, update the corresponding change bundle and run the full fourth-repo validation chain again.

## Reassessment After T-502 Closeout (2026-07-01)

T-502 is now closed and archived. The remaining dirty tree is still mixed and should not be committed as one batch.

### Current state

* Compatibility ledger is clean: `compat:status --json` reports `ok: true`, current bundle `CHG-2026-169`, and no dirty submodules.
* Remaining root dirty files are staged/unstaged fourth-repo planning, tooling, skill, and old Trellis task records.
* `06-15-platform-service-resolve/` remains active in Trellis, but the actual service-resolution code/bundle work was already recorded by commit `cf653ec`.
* `docs/planning/first-real-call/**` includes the full first-real-call campaign plan and Wave task cards, including T-503 rehearsal templates. These are planning/runbook artifacts, not business implementation.
* `tools/deployability-*.test.mjs`, `tools/dev-doctor*`, `tools/mcp-golden-four*`, and `tools/test-helpers/current-bundle.mjs` are tooling/test changes that make tests follow the current bundle dynamically and align local golden inputs with the current example/capability shape.
* `.agents/skills/grill-me`, `.agents/skills/grilling`, `skills-lock.json`, and `.gitignore` are repo-local agent/skill configuration changes and should be kept separate from product/tooling closeout.

### Recommended closeout grouping

1. **Planning/runbook docs commit**: `docs/planning/first-real-call/**` plus `docs/planning/field-audit/**`.
   * Reason: coherent documentation artifact; low runtime risk.
   * Validation: markdown/source review plus no fourth-repo runtime gate needed unless combined with code.
2. **Tooling/test cleanup commit**: deployability/dev-doctor/mcp-golden-four/agent-e2e test changes plus `tools/test-helpers/current-bundle.mjs` and related `pnpm-lock.yaml` only if lockfile is genuinely caused by these tool changes.
   * Reason: executable test behavior; should be validated before commit.
   * Validation: at least `corepack pnpm run test:fast`, `corepack pnpm run test:dev-doctor`, `corepack pnpm run test:mcp-golden-four`, and relevant deployability tests touched by the diff.
3. **Archive old service-resolution Trellis task**: update/archive `.trellis/tasks/06-15-platform-service-resolve/` referencing commit `cf653ec`.
   * Reason: active task pointer is stale relative to completed implementation.
   * Validation: inspect that no current dirty source files belong to service-resolution.
4. **Skill config commit or defer**: `.agents/skills/**`, `skills-lock.json`, `.gitignore`.
   * Reason: repo-agent configuration decision, not part of first-real-call or runtime tooling.
   * Validation: confirm user wants these shared in this repo rather than local-only.

### Do not do

* Do not commit all 57 dirty files together.
* Do not fold T-503 rehearsal templates into a claim that T-503 is complete.
* Do not rerun full fourth-repo integration for documentation-only planning commits unless a submodule SHA or executable validation surface changes.

## Expansion Sweep

### Future evolution

* A recurring closeout checklist could use `compat:status`, `check:submodules`, bundle status, and Trellis task status to produce the same inventory automatically.
* Bundle notes should distinguish "validated and complete" from "recorded but pending external validation" so main does not silently drift from the verified ledger rule.

### Related scenarios

* Closeout should stay consistent with the prior dirty-WIP pattern: classify by workstream, then commit only coherent groups.
* Brand-site is not one of the three formal business truth repositories named in `AGENTS.md`, but this superproject already tracks `brand_site_sha` in bundles; its dirty state still blocks compatibility ledger checks.

### Failure and edge cases

* Reverting brand-site to satisfy `CHG-2026-168` may discard or hide active WIP unless preserved.
* Committing staged docs/tooling together may make later rollback and review harder because it mixes planning, tests, skills, and historical bundles.
* Running full integration while Docker/npm network is flaky can leave `integration_check` pending again; if that happens, record the exact external blocker.

## Feasible Approaches

### Approach A: Ledger-first unblock (Recommended)

How:
* Preserve current `repos/brand-site` WIP by branch/stash/worktree-safe means.
* Restore or align brand-site to `CHG-2026-168`'s expected SHA.
* Run the required fourth-repo validation chain for `CHG-2026-168`.
* Update `CHG-2026-168` from pending to passed if validation succeeds, or record the precise blocker if it fails.

Pros:
* Clears the hard compatibility blocker first.
* Brings `main` closer to the stated rule that it points at verified compatible SHAs.

Cons:
* Does not immediately clean the large staged first-real-call/tooling set.
* Requires careful preservation of brand-site WIP.

### Approach B: WIP-split-first

How:
* Split the root staged files into coherent workstreams: historical bundles, planning docs, deployability tooling, Trellis closeout, skills.
* Commit/archive safe root-only groups first.
* Leave `CHG-2026-168` pending until brand-site is resolved.

Pros:
* Reduces review noise and preserves history in understandable chunks.
* Avoids touching brand-site WIP immediately.

Cons:
* `compat:status` and `check:submodules` remain blocked.
* Does not solve the current ledger mismatch.

### Approach C: Brand-site-forward

How:
* Treat dirty `repos/brand-site` as the next product workstream.
* Finish, test, and commit the brand-site changes in its owning repo.
* Update the bundle to the new brand-site SHA and run full fourth-repo checks.

Pros:
* Keeps current brand-site work moving instead of parking it.
* Ends with a bundle that reflects the real local state.

Cons:
* Highest scope because it requires understanding and validating the brand-site changes.
* May turn a closeout task into frontend implementation work.

## Technical Notes

* Commands run:
  * `git status --short --branch --untracked-files=all`
  * `git submodule status --recursive`
  * `python3 ./.trellis/scripts/task.py list`
  * `corepack pnpm --silent run compat:status -- --json`
  * `corepack pnpm run check:submodules`
  * `corepack pnpm run check:boundaries`
  * `corepack pnpm run check:bundles`
* Validation observed:
  * `check:submodules` failed on dirty/mismatched `repos/brand-site`.
  * `check:boundaries` passed.
  * `check:bundles` passed.
* Memory reference used:
  * June 15 service-resolution closeout memory: implementation was completed and unrelated first-real-call/deployability dirty WIP was intentionally left separate.
