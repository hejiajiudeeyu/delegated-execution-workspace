# `/goal` Run 1 - Wave 0 Architecture and Release Truth

## Goal command

Use the following as the first Goal-mode objective after the provisional architecture baseline in `prd.md` is approved:

```text
Execute Wave 0 of .trellis/tasks/07-17-call-anything-private-capability-network-mvp/prd.md. Preserve every pre-existing dirty-worktree change. Reconcile the staged Platform v0.2.0/CHG-2026-180 state, freeze A-01 through A-09 in owning-layer ADRs, build the FR-to-owner-to-test traceability ledger and milestone child-task backlog, and implement/verify the local M0 release-manifest and observed-build-fact path. Do not enter M1, do not add business truth to the fourth repository, and do not commit, push, publish, deploy, merge, or mutate external systems without explicit authorization. Finish only when local evidence is reproducible, all remaining external or product decisions are stated precisely, and the next delivery unit and rollback point are clear.
```

This objective is intentionally shorter than the supporting plan. Codex Goal mode treats the objective as both the initial prompt and the completion criterion, so the complete constraints and verification contract remain in this file and `prd.md`.

## Required outcomes

1. Preserve and inventory the pre-existing dirty tree, including staged audit documents, the staged Platform gitlink, `CHG-2026-180`, Console tasks, and local configuration changes.
2. Reconcile root `HEAD`, index, submodule worktrees, bundles, published artifacts, and any accessible deployed runtime facts. Never describe a staged or untracked combination as committed `main` truth.
3. Record owner-approved ADRs for A-01 through A-09. Product-policy numbers in A-05 and A-07 remain provisional until approved.
4. Define the canonical four-axis state transition model, artifact lifecycle, restart/reconciliation behavior, acceptance timer, revision/dispute matrix, and exactly-once operation-key/transaction strategy needed by later waves.
5. Produce a traceability ledger covering FR-001 through FR-084, NFR-S01 through S05, NFR-R01 through R06, E0 through E7, owner repo, milestone, implementation task, test/evidence, and current status.
6. Create milestone child tasks only after their architecture dependencies are resolved; activate only the next eligible small delivery unit.
7. Implement the local M0 design without creating a competing truth source:
   - immutable canonical release manifest generated/frozen by the Workspace;
   - small current pointer by release id and manifest hash;
   - owning services report observed component/build facts;
   - validator compares observed facts with the canonical manifest and blocks drift;
   - existing bundle/change-process rules remain authoritative.
8. Restore or explicitly resolve the missing literal `corepack pnpm` validation path before claiming the mandatory root checks passed.
9. Run proportionate owning-repo checks for every local change and the five mandatory fourth-repo checks when the toolchain allows them. Record failures honestly and do not weaken a gate.
10. End before M1 implementation with a completed/incomplete split, exact dirty/SHA state, checks run and results, unresolved approval/external blockers, rollback point, and one safest next action.

## Hard constraints

- No business schemas, protocol fields, runtime implementation, or platform behavior may be invented in the fourth repository.
- Owning-repo change comes first; gitlink, bundle, and fourth-repo evidence follow.
- Never overwrite, discard, unstage, amend, or absorb pre-existing user changes without explicit confirmation.
- Do not use the existing unified multi-role Console rewrite as a substitute for M1-M3 APIs and server-side authorization.
- Do not execute the older Marketplace-driven economic-closure blueprint unchanged; Selfhost PTS semantics must be decided first.
- Do not pass private artifact bytes through the unauthenticated public Relay. Relay/bootstrap security blockers must be closed before M1 real-data testing.
- Do not begin M1 automatically when Wave 0 is locally ready.
- Goal mode does not broaden sandbox or approval authority. Stop for explicit approval before commit, push, release, deployment, production probing that changes state, or creation of a new private Research repository.

## Verification

Wave 0 local readiness requires:

- architecture ADRs and traceability ledger are complete and mutually consistent;
- no unresolved A-01/A-02/A-03/A-04/A-07/A-09 decision required by M1 remains implicit;
- manifest schema, generator/current pointer, observed-build facts and drift validator have tests;
- all changed formal repositories pass their documented unit/integration/build checks;
- the root passes, when the approved toolchain is available:
  - `corepack pnpm run check:submodules`
  - `corepack pnpm run check:boundaries`
  - `corepack pnpm run check:bundles`
  - `corepack pnpm run test:contracts`
  - `corepack pnpm run test:integration`
- any local-only `SKIP_ORIGIN_REACHABILITY=1` run is labeled local-only and is not treated as publication evidence;
- root `HEAD`, index, worktree, bundle, manifest, artifact and runtime differences are reported separately;
- there is an explicit publication/deployment checklist for the remaining E0 evidence, without claiming E0 before it is actually satisfied.

## Completion boundary

Completing this Goal means Wave 0 is locally implemented, reviewable and ready for any separately authorized publication/deployment steps. It does not mean M0/E0 is certified if external evidence or committed/published state is still missing, and it does not mean the full PRD stage is complete.
