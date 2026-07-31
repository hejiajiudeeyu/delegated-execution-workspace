# CALL ANYTHING Private Capability Network MVP

## Goal

Turn the strategy-frozen next-stage PRD into an executable, evidence-driven cross-repository development program. The stage delivers a single-Operator Selfhost Private Capability Network that can run declared Hotlines across public networks without routine SSH, remote desktop, direct admin calls, or manual artifact transfer, and validates the same public Runtime and Platform APIs with the first-party Technical Route Decision Hotline.

This is a program-level planning task. Business behavior remains owned by `repos/protocol`, `repos/client`, `repos/platform`, and the separate first-party Research project. This fourth repository owns only compatible SHA combinations, change bundles, release-manifest verification, cross-repository validation, and evidence orchestration.

## Source of Truth

- Full product PRD: [`../../../_local_ref/260717-参考意见/CALL_ANYTHING_下一阶段产品需求文档_PRD_v1.0.docx`](../../../_local_ref/260717-参考意见/CALL_ANYTHING_下一阶段产品需求文档_PRD_v1.0.docx)
- Executive summary: [`../../../_local_ref/260717-参考意见/CALL_ANYTHING_下一阶段产品需求文档_PRD_v1.0.md`](../../../_local_ref/260717-参考意见/CALL_ANYTHING_下一阶段产品需求文档_PRD_v1.0.md)
- Repository orchestration contract: [`../../../docs/orchestration/cross-repo-change-process.md`](../../../docs/orchestration/cross-repo-change-process.md)
- Existing public Console planning: [`../07-15-replace-public-console-frontend/prd.md`](../07-15-replace-public-console-frontend/prd.md)
- Existing product/architecture audit: [`../../../docs/planning/product-audit/`](../../../docs/planning/product-audit/)
- First Goal-mode run contract: [`goal.md`](goal.md)

The Markdown source is a concise executive summary; the DOCX is the complete requirement source containing FR/NFR, object and state models, milestones, open questions, risks, and E0-E7 exit evidence.

## Frozen Product Decisions

- The main product for this stage is a single-Operator Selfhost private trust domain.
- The public Marketplace, federation, arbitrary shell, multi-round negotiation, nested Hotlines, general quality benchmarks, fiat settlement, multi-Operator RBAC, and large-scale self-service Provider onboarding are out of scope.
- Only predeclared Hotlines may execute; generic remote shell or generic code execution is prohibited.
- The supported privacy mode is `supervised`; sealed privacy remains a future-compatible concept only.
- Execution, delivery integrity, acceptance, and settlement are orthogonal state dimensions.
- Acceptance includes explicit accept, exactly one in-scope revision, dispute, and timeout-based auto-acceptance.
- Operator content access is exceptional: it requires a reason, bounded scope, and immutable audit evidence.
- Capability packages may migrate; quality, reputation, call history, revenue, ranking, and network endorsement may not.
- First-party Research must use the same public Runtime and Platform APIs and may not depend on hidden business APIs.
- The physical repository split remains unchanged for this stage.

## Program Scope

### P0

- Unified release manifest and runtime/repository fact reconciliation.
- Single-Operator network initialization and controlled identity/device registration.
- Responder heartbeat, capacity, online/degraded/offline state, and restart/reconciliation behavior.
- Versioned Hotline contracts with scope, schemas, artifacts, tiers, availability, privacy, fulfillment mode, examples, and execution binding.
- Idempotent Call submission, budget cap, accept/reject, queue/execution/terminal states, cancellation, timeout, and recovery.
- Reliable input/output/evidence artifact transfer with checksum and lifecycle metadata.
- Separate delivery verification, acceptance, one revision, dispute, auto-accept, settlement, and refund semantics.
- Exactly-once PTS hold/settle/refund and auditable ledger entries.
- Operator metadata control plane, reason-gated content review, and audit trail.
- Hotline export/import without reputation or quality-history transfer.
- Complete first-party Technical Route Decision Hotline with Decision Brief and Evidence Pack.
- Continuous evidence for MinerU, private-evidence retrieval, and technical-route research workflows.

### P1

- Resumable continuation for eligible long-running tasks beyond the P0 requirement for explicit restart reconciliation or a safe terminal state.
- Recoverable upload/resume for large artifacts.
- Stable/Preview channels, canary, richer tracing, and rollback.
- Notifications for acceptance, rejection, delivery, revision, and imminent auto-acceptance.
- Network- and Hotline-level retention policy.

### Out of Scope

- Public Marketplace implementation or marketplace reputation/earnings productization.
- Federation or multi-Operator trust domains.
- Arbitrary remote execution, general shell, or hidden first-party execution paths.
- Multi-round clarification/dynamic quote flows and nested Hotline orchestration.
- Production sealed privacy, fiat settlement, generic benchmarks, and automatic truth adjudication.
- Physical repository consolidation.
- Partner identity/onboarding implementation before the M5 exit gate is met.

## Current Repository Facts

- The workspace is a synthetic monorepo and compatibility ledger, not a business truth source.
- Root `HEAD` still records Platform `36d1839`; the index stages the Platform gitlink at `60311d9` (`v0.2.0`) and the checked-out Platform worktree is clean at that staged SHA. Protocol is `b9234e2`, Client is `c53cf7a6`, and Brand is `ac8ea7b`.
- `changes/CHG-2026-180.yaml` records the staged v0.2.0 combination and production evidence but is currently untracked. Therefore M0 is locally prepared, not committed/certified on workspace `main`.
- The required literal `corepack pnpm ...` validation path is currently unavailable because `corepack` is absent from `PATH`; `node` and `pnpm` are present. Do not silently substitute a different command when claiming the repository-mandated completion gate.
- The worktree already contains unrelated/uncommitted audit, Console, platform, and change-bundle work. This program must preserve and reconcile those changes rather than overwrite or silently absorb them.
- The existing `07-15-replace-public-console-frontend` task covers a unified Caller/Responder/Operator public Console and its identity/API gaps. It is broader than the Operator-only needs of FR-060-FR-066 and remains paused as a separate product task until M1-M3 APIs and authorization contracts exist. Only its relevant Operator research and patterns should be reused in this program.
- The product audit identifies economic-closure, security, async/device, API-consistency, and operational gaps. Its security/storage/CI findings remain relevant, but its Marketplace-driven priority for self-service PTS and Provider earnings must not be executed unchanged: this PRD postpones Marketplace and does not yet define whether Selfhost PTS is conserved accounting, an Operator-issued quota, or a future payable.

## Current Capability and Gap Snapshot

| Area | Existing foundation | Gap to the stage PRD |
|---|---|---|
| Device/Responder | Identity/catalog records, API-key scopes, heartbeat, online degradation | Secure enrollment, build/capacity/maintenance state, restart reconciliation, stronger ownership rules |
| Hotline | Schemas, attachment declarations, examples, guidance, pricing, mutable submission version | Immutable `HotlineVersion`, tiers, privacy/fulfillment mode, availability policy, Stable/Preview, import/export |
| Call dispatch | Task-token hold, delivery metadata, local queue, dedupe and ACK | Structured pre-execution reject, authoritative queue/execution state, cancel, recovery, terminal-state enforcement |
| Artifacts | Signed output result, output artifact hash and attachment binding | Cross-device input upload; MinerU still expects a Provider-local absolute path; resumable/large transfer and lifecycle authorization |
| Delivery integrity | Ed25519 result signature, request binding, output checksum checks | Frozen-schema validation and a separate persisted Delivery Integrity state |
| State model | One request status and billing events | Independent Execution, Delivery, Acceptance, Revision, Dispute, and Settlement objects/transitions |
| PTS | Budget check, hold, failed refund, capped immediate settlement and ledger | Settlement currently follows execution completion; no acceptance gate, dispute freeze, revision economics, or crash-safe multi-entry transaction |
| Operator governance | Generic audit append/list and v0.2.0 Operator SPA | Reason-gated content endpoint, bounded access scope, immutable content-access record, dispute adjudication timeline |
| Security | Signed results prevent forged success | Public unauthenticated relay read/inject/delete surface and bootstrap responder default-on must be closed before private evidence |
| Release truth | Bundles, gitlink checks, release gate and deployment evidence | One explicit immutable manifest and runtime probes; current-via-latest-file inference is insufficient |
| Research | Generic process/HTTP adapters | Separate owning project, public contract, Brief/Decision/Evidence schemas, human review, Stable/Preview, real decision evidence |

## Requirement Normalization Before Implementation

The source PRD deliberately leaves implementation fields open, but several semantic conflicts must be resolved explicitly rather than encoded accidentally:

1. `delivered` in FR-030 must not collapse execution completion with verified delivery. A-04 must define whether it means result submitted or remove it from Execution in favor of a Delivery event/state.
2. FR-030 and the proposed state table disagree on `submitted` and `rejected`; the legal transition table must be canonical before protocol changes.
3. Restart recovery is listed as P1 in one scope summary, while FR-031/FR-035 and E1/E7 make at least reconciliation-to-recovery-or-terminal-state a P0 exit requirement. P0 implements safe reconciliation; P1 adds resumable continuation and large-transfer recovery.
4. M1 precedes M2 in the product sequence, but M1 needs a minimal shared protocol slice for declared Hotline identity/version, Call state, artifact metadata, and terminal/reconciliation events. This slice belongs in M1; full service-contract productization remains M2.
5. The acceptance clock must start only from a defined event after Delivery Integrity is verified, not merely when a Responder submits bytes.
6. Cancellation, rejection, timeout, unrecoverable failure, invalid delivery, revision, dispute, and auto-accept require one explicit hold/settle/refund transition matrix.
7. Exactly-once behavior requires idempotency-key scope, event identity, replay/conflict behavior, transaction/outbox boundary, and reconciliation tests; the phrase alone is not an implementation design.
8. ExportBundle must explicitly strip secrets, private artifacts, local paths, access tokens, and quality/history fields before M2 import/export work begins.
9. M4 needs its own implementation specification for source policy, claim-evidence validation, human-review criteria/SLA, cost limits, and regression tests; chapter 10 is a product contract, not that private implementation specification.

## Architecture Decision Gate

No M1-M4 business implementation begins until the decisions needed by that milestone are recorded in owning-repo ADRs or task PRDs. Spikes may run in parallel.

| Decision | Scope | Must be resolved before |
|---|---|---|
| A-01 Artifact data path | Platform relay, object-store presigned transfer, direct transfer, or hybrid; checksum, authorization, retention, and resume semantics | M1 |
| A-02 Provider connection | Outbound persistent connection, long poll, Relay inbox, or another constrained model | M1 |
| A-03 Restart/reconciliation | Recoverable task classes, proof of local execution state, timeout/grace, and idempotent reconciliation | M1 |
| A-04 Shared state boundary | Which object/state/event semantics are protocol truth versus platform-private implementation | M1/M2/M3 |
| A-05 Acceptance defaults | Acceptance-window configuration, Operator caps, auto-accept clock, and dispute interaction | M3 |
| A-06 Revision economics | Included revision versus new Call, budget/hold behavior, and strict scope enforcement | M3 |
| A-07 Data retention | Separate retention for input, output, artifacts, execution logs, and audit events | M1/M3 |
| A-08 Research boundary | Separate private repository/deployment, version coupling, public API contract, and evidence handoff | M4 |
| A-09 Release manifest authority | Workspace-certified manifest versus Platform runtime manifest and verification direction | M0 |

Partner identity (original OQ-10) is deliberately deferred to M6 planning.

### Recommended MVP Architecture Baseline (Provisional)

These are codebase-backed recommendations for architecture review, not yet frozen product decisions. Numeric policy defaults require user/owner approval.

| Decision | Recommended MVP | Key boundary |
|---|---|---|
| A-01 | Platform-managed artifact metadata/authorization plus S3-compatible object storage for bytes; official Compose may include MinIO | Protocol carries descriptor/checksum/expiry, never bucket keys or presigned URLs |
| A-02 | Authenticated Relay Inbox with Provider-initiated HTTPS long polling, visibility lease, idempotent lease ACK, backoff and jitter | No Provider inbound port; connection presence does not replace heartbeat |
| A-03 | HotlineVersion declares `non_recoverable` (default), `restartable`, or `checkpointed`; unknown RUNNING work never auto-settles or blindly reruns | Client owns local journal/recovery; Platform owns reconciliation and financial blocking/refund |
| A-04 | Protocol defines four shared state axes, legal transitions, cross-repo objects/events and financial error semantics; Platform stores append-only Call events and projections | Relay leases, scheduler jobs, retry counters, object keys, UI filters stay internal |
| A-05 | Acceptance window is set per HotlineVersion/tier, constrained by network min/max and snapshotted into Call; timer starts at verified delivery and restarts after the one revision | Provisional defaults: network 72h, min 24h, max 7d; Quick 24h, Standard 72h, Deep 7d |
| A-06 | Fixed price includes one in-scope revision at zero extra price; original hold remains; out-of-scope work requires an explicit new Call | No silent paid upsell or automatic scope expansion |
| A-07 | Category-specific retention snapshotted into Call with tombstones after byte deletion and dispute/legal-hold override | Provisional defaults: content/artifacts 30d, raw execution logs 14d, metadata/events 180d, audit/ledger 365d |
| A-08 | Independent private first-party Research repository and private OCI worker behind the public Responder Runtime, preferably through an internal HTTP/Unix-socket adapter | Workspace may record image digest/evidence but never own private Research source or hidden APIs |
| A-09 | Workspace generates and freezes immutable release manifests; Platform/API/Relay/Gateway only report observed build facts for comparison | Platform must not generate a second canonical cross-repo manifest |

Recommended artifact flow: allocate scoped slot -> direct upload -> commit hash/size -> Relay sends only descriptor -> Responder downloads through scoped authorization -> output uses the reverse path -> Delivery Integrity becomes verified only after contract, binding and checksum checks.

Recommended release layout: immutable `releases/manifests/<release_id>.yaml` plus a small `releases/current.yaml` pointer containing `release_id` and `manifest_sha256`. Observed service facts should expose component, version, git SHA, image digest, Console asset hash, release id and manifest hash.

Recommended recovery proof for MVP is a signed reconciliation report backed by an append-only local task journal (`attempt_id`, `boot_id`, transition sequence, checkpoint/output-manifest digest). TPM or remote attestation is not required for this stage.

## State and Object Contract

The implementation plan must preserve four independent state axes:

1. Execution: submitted, accepted/rejected, queued, executing, delivered, failed, timed out, canceled.
2. Delivery integrity: pending, verified, invalid.
3. Acceptance: not started, pending, accepted, revision requested, disputed, auto-accepted.
4. Settlement: none, held, blocked, settled, refunded.

The minimal object vocabulary is Network, Identity/Member, Device/Responder, Hotline, HotlineVersion, Call, Artifact, Delivery, AcceptanceRecord, Revision, Settlement, AuditEvent, and ExportBundle. Exact field names, table names, API paths, and storage technology remain architecture decisions; shared semantics belong in `repos/protocol`, not this workspace.

## Repository Ownership

| Domain | Owns | Does not own |
|---|---|---|
| `repos/protocol` | Shared Hotline contract, artifact metadata, signed result/event semantics, cross-client/platform state and compatibility constraints | UI, device implementation, Platform persistence, Research method |
| `repos/client` | Caller submission/acceptance, Responder lifecycle, Hotline adapters, artifact send/receive, MinerU integration, local diagnostics | Platform business truth or ledger authority |
| `repos/platform` | Identity, catalog, routing, Call persistence/state, PTS, acceptance windows, disputes, audit, Console, deployment, backup/recovery | Provider code and private Research workflow |
| First-party Research project | Search/analysis workflow, Evidence Pack, Decision Brief, human review, internal quality engineering | Hidden Runtime or Platform APIs |
| Brand/docs repository | Selfhost and product documentation; future Marketplace rule preparation | Marketplace implementation in this stage |
| Fourth repository | Submodule combination, change bundles, boundaries, release-manifest certification, integration/evidence orchestration | New protocol fields, runtime behavior, or duplicate business truth |

## Development Plan

### Wave 0 - Architecture and factual baseline

1. Preserve the dirty worktree and reconcile the already-staged Platform v0.2.0 gitlink plus untracked `CHG-2026-180` before creating any new integration combination.
2. Snapshot root `HEAD`, index, owning-repo SHAs, published npm/image versions, current bundle, deployed image/frontend fingerprints, dirty worktrees, and open Trellis tasks.
3. Restore or explicitly approve the repository-mandated `corepack pnpm` execution path; do not mark the five-command chain passed through an undocumented substitute.
4. Finish A-09 and implement M0 as owning-repo/runtime probes plus fourth-repo certification, without adding another competing status projection.
5. Run A-01 through A-08 spikes; record chosen MVP decisions, rejected alternatives, migration/rollback implications, and test contracts.
6. Produce an FR-to-owner-to-test traceability ledger and create milestone child tasks only after decision ownership is clear.

Exit: M0/E0 facts agree, architecture decisions required for M1 are accepted, and the program backlog has no fourth-repo business implementation.

### Wave 1 - M1 public cross-device Runtime

1. Freeze the minimal M1 protocol slice and legal transition table for semantics that Client and Platform must both understand; do not wait for all M2 service-product fields.
2. Client-owned Responder identity/registration, heartbeat, capacity, constrained Hotline execution, restart reporting, MinerU adapter, artifact handling, and local diagnostics.
3. Platform-owned device/catalog state, routing/queueing, terminal-state enforcement, artifact authorization/metadata, recovery/reconciliation, and operational visibility.
4. Real MinerU path through public network; no SSH, remote desktop, direct admin curl, or manual artifact copy in the normal flow.
5. Failure matrix: offline before accept, loss during execution, duplicate submit, duplicate delivery, partial artifact, restart, timeout+grace, stale version, and retry.
6. Close the current relay/bootstrap security blockers before any private document or evidence enters the public path.

Exit: a real MinerU job completes unattended across devices with verified artifacts and explicit recovery/terminal behavior.

### Wave 2 - M2 minimal Hotline service contract

1. Freeze the minimal versioned contract for scope, schemas, artifacts, tiers, budget/duration, availability, privacy/fulfillment mode, examples, and execution binding.
2. Implement immutable HotlineVersion selection per Call and enable/pause/availability behavior.
3. Implement export/import, exclude reputation/history, run compatibility validation, and require approval in the destination network.
4. Express MinerU, private-evidence retrieval, and Technical Route Decision workflows with the same contract.

Exit: all three workflows are representable and validated without special hidden fields or APIs.

### Wave 3 - M3 delivery, acceptance, governance, and settlement

1. Implement delivery verification across identity, binding, signature, schema, required artifacts, checksum, time, and budget.
2. Implement explicit acceptance, one in-scope revision, acceptance window/auto-accept, dispute, and Operator contract-only adjudication.
3. Implement exactly-once hold/settle/refund with crash/retry tests and auditable linkage to Call, version, reason, and actor.
4. Implement reason-gated content access and immutable access/decision audit.
5. Integrate the public Console work for FR-060-FR-066 only after APIs and authorization are real; UI parity never substitutes for server-side scope enforcement.

Exit: accept, revision, auto-accept, dispute, settle, and refund all have end-to-end evidence with zero duplicate money events and zero unreasoned content access.

### Wave 4 - M4 first-party Technical Route Decision Hotline

1. Define the structured one-shot Research Brief and Quick/Standard/Deep service tiers.
2. Produce a Decision Brief plus Evidence Pack with claim-evidence mapping, counter-evidence, assumptions, gaps, as-of date, private/public evidence separation, and method/build identifiers.
3. Support new-route discovery as a separately marked output, abstention with a next experiment, and Deep human review.
4. Run exclusively through public Runtime and Platform APIs, including budget, artifact, verification, acceptance, revision, audit, and settlement paths.
5. Add Stable/Preview, canary, tracing, rollback, and regression evidence as P1 hardening.

Exit: at least one real technical-route decision is delivered through the complete fixed-service flow without hidden APIs.

### Wave 5 - M5 sustained owner Dogfood

1. Run MinerU, private-evidence retrieval, and Research workflows continuously through one Selfhost network.
2. Record unattended completion, manual intervention, terminal-state, checksum, acceptance, revision/dispute, audit, settlement, and version-drift metrics.
3. Exercise Platform, Responder, and Research recovery/rollback paths and retain evidence.
4. Fix product defects through owning repositories and certify each compatible SHA bundle; do not lower gates to make evidence green.

Exit: E0-E7 are met, including at least 10 real MinerU jobs with at least 90% unattended completion and 100% artifact checksum agreement; three real Research decisions, two resulting actions, and one repeat use.

### Wave 6 - M6 Partner Pilot preparation

Only after M5 exits: decide Partner identity/invite/revoke/device ownership, write supervised access and onboarding disclosures, ensure a Partner needs only a Responder rather than a full Platform, and prepare the runbook. Public Marketplace implementation remains out of scope.

## Cross-Repository Delivery Unit

Each independently reviewable behavior ships as a small cross-repository unit:

1. Change and test the owning formal repository or repositories.
2. Commit/publish the owning-repo candidate as required by that repository.
3. Update submodule SHA(s) in an integration branch of this workspace.
4. Add one matching YAML change bundle under `changes/` with exact SHAs and honest validation status.
5. Run formal-repo gates plus the fourth-repo completion chain.
6. Capture real-edge/published-artifact evidence when public deployment is affected.
7. Only then promote the compatible combination/current manifest.

Mandatory fourth-repo completion chain:

```text
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

Use `corepack pnpm run test:release-gate` as the aggregate submit/merge gate where appropriate. Local-only validation must explicitly record `SKIP_ORIGIN_REACHABILITY=1`; it is not publication evidence.

## Acceptance Criteria

- [ ] E0: Workspace current bundle, owning-repo releases, npm/image artifacts, and actual deployed versions agree with no unexplained drift.
- [ ] E1: At least 10 real MinerU jobs; unattended completion at least 90%; restart/network-interruption exercise included; artifact checksum agreement 100%.
- [ ] E2: MinerU, private-evidence retrieval, and Technical Route Decision run continuously through the same Selfhost network.
- [ ] E3: Accept, one revision, auto-accept, dispute, settle, and refund have end-to-end evidence; duplicate money events are zero.
- [ ] E4: Every Operator content access has a reason and audit record; unreasoned access is zero.
- [ ] E5: At least three real technical-route decisions, at least two concrete experiments/development actions, and at least one repeat use.
- [ ] E6: Normal work requires no SSH, remote desktop, direct admin curl, or manual artifact transfer.
- [ ] E7: Platform, Responder, and first-party Research Hotline each complete one controlled recovery/rollback exercise.
- [ ] NFR security: no generic remote shell/code execution; secrets are not logged/exported; minimum execution permissions are configurable; task tokens, result signatures, and sensitive operations are verifiable/auditable.
- [ ] NFR reliability: every Call reaches a terminal state; restart recovery is idempotent; failed checksum never becomes delivered; hold/settle/refund are exactly-once.
- [ ] Formal owning-repo tests and the five mandatory fourth-repo checks pass for every promoted cross-repo bundle.

## Definition of Done

- Architecture decisions A-01-A-09 are recorded at the owning layer and linked from this task.
- FR-001-FR-084 and NFR-S/R requirements are mapped to owning repo, implementation task, test/evidence, milestone, and status.
- Each milestone has explicit entry/exit gates, rollback plan, and small reviewable delivery units.
- E0-E7 evidence is reproducible and preserved without turning the fourth repository into a duplicate runtime truth source.
- All promoted submodule SHA combinations have matching change bundles and pass required formal/fourth-repo gates.
- The stage is considered complete only when the system is the preferred path for sustained real workflows, not when a feature checklist or one-time demo is complete.

## `/goal` Execution Contract

The autonomous goal must execute this program one verified delivery unit at a time. It may inspect and plan broadly, but it must not:

- overwrite unrelated dirty worktree changes;
- implement business behavior in the fourth repository;
- invent unresolved product decisions or silently reopen frozen strategy;
- start a milestone whose required architecture decisions are unresolved;
- update submodule SHAs without a matching change bundle;
- claim completion on builds alone, local-only evidence, a one-time demo, or partial E0-E7 evidence;
- deploy, publish, push, merge, or mutate external systems unless separately authorized by the user.

At every pause or handoff, report completed versus incomplete work, current owning-repo/SHA state, passed/failed gates, unresolved decisions, rollback point, and the single safest next delivery unit.

The first Goal run is intentionally limited to Wave 0. It must not continue automatically into M1 implementation. A new or edited Goal begins each implementation wave only after the preceding exit gate and required user/product decisions are satisfied.

## Open Questions

- Confirm or revise the recommended MVP answers produced by the architecture spikes for A-01-A-09.
- Recommended default: create milestone child tasks after architecture review, but activate only the next eligible delivery unit; do not create a single shared-write mega-task.
- Decide the separate repository/location and disclosure boundary for the first-party Research Provider implementation.
- Recommended default: keep the unified Console rewrite paused; reuse only M0 operational/version visibility and resume broader Operator surfaces after M1-M3 APIs/state foundations.

## Technical Notes

- PRD version: v1.0, strategy-frozen, dated 2026-07-16, ready for architecture review and development decomposition.
- Original traceability: M0 maps FR-080-FR-084; M1 FR-001-FR-006 and FR-020-FR-036; M2 FR-010-FR-016 and FR-070-FR-073; M3 FR-040-FR-055 and FR-060-FR-064; M4 chapter 10 plus relevant FR-010-FR-046; M5 chapters 12 and 17.
- FR-065/FR-066 span M0/M3 operations and P1 alerting even though the source traceability table stops M3 at FR-064; the implementation ledger must assign them explicitly rather than drop them.
- M6 and Partner OQ-10 remain gated by E0-E7 and the Partner Pilot entry conditions.
