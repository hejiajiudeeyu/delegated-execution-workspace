# Platform-Side Service Resolve

## Goal

Add a platform-side service resolution path so callers can request a logical service or capability, such as `mineru.document.parse.v1`, and let the platform choose a concrete `responder_id + hotline_id` before the existing token, delivery-meta, and dispatch flow runs.

The change must be additive and test-first. The current direct `responder_id + hotline_id` flow must keep working unchanged.

## Requirements

- Add protocol-facing contract helpers, docs, or schemas for a service resolution request and response in the protocol truth source.
- Add a platform API endpoint that accepts a request id plus `service_id` or `capability`, resolves a public enabled candidate hotline, binds the request to the selected `responder_id + hotline_id`, issues a task token, and returns delivery metadata.
- Support service grouping without requiring multiple responders to reuse the same `hotline_id`. Candidate hotlines may expose a shared optional `service_id`.
- Prefer availability and correctness over advanced scheduling. MVP selection should filter to public enabled candidates, prefer healthy candidates by default, and choose a deterministic usable candidate.
- Preserve the existing direct prepare and dispatch path. Existing callers that provide `responder_id + hotline_id` must not use the new resolution endpoint unless explicitly requested.
- Add caller-controller support for preparing or dispatching by `service_id` or `capability`, while still sending the resolved concrete `responder_id + hotline_id` through the existing dispatch envelope.
- Add ops CLI support only where needed to exercise and verify the new flow from an operator/caller entrypoint.
- Add tests before implementation and keep iterating until targeted tests prove the platform-side resolve path is usable.
- Run relevant protocol, platform, client, and fourth-repo validation commands before claiming completion.

## Acceptance Criteria

- [x] Platform tests first fail, then pass, for resolving a service/capability to a concrete healthy hotline.
- [x] Platform response includes selected concrete `responder_id`, `hotline_id`, task token claims, and delivery metadata.
- [x] Token claims remain bound to the selected concrete responder/hotline, not merely to the logical service id.
- [x] No-candidate and invalid request cases return structured non-retryable errors.
- [x] Direct `responder_id + hotline_id` prepare/dispatch tests still pass.
- [x] Caller-controller can prepare and dispatch a request using `service_id` or `capability`.
- [x] Existing direct caller-controller APIs remain backwards compatible.
- [x] Protocol contract tests cover the new request/response helpers or validation surface.
- [x] Fourth-repo required checks are run before final completion, or any skipped/failed check is explicitly reported with the reason.

## Definition of Done

- Tests added or updated in the owning repositories.
- New behavior lives in `repos/protocol`, `repos/platform`, and `repos/client` as appropriate; the fourth repository remains orchestration-only.
- Cross-repo change bundle added or updated if submodule SHAs are moved.
- Required validation chain considered and run as far as feasible:
  - `corepack pnpm run check:submodules`
  - `corepack pnpm run check:boundaries`
  - `corepack pnpm run check:bundles`
  - `corepack pnpm run test:contracts`
  - `corepack pnpm run test:integration`

## Technical Approach

Implement an additive resolve endpoint rather than replacing the current direct flow:

1. Platform receives `POST /v1/service-resolutions`.
2. Request contains `request_id`, optional `service_id`, optional `capability`, optional `task_type`, optional constraints, and optional result delivery.
3. Platform filters public catalog entries by `service_id`, `capability`, `task_type`, status, review visibility, availability, and simple constraints.
4. Platform deterministically selects a candidate, binds the request to the concrete responder/hotline, reuses existing token issuing and delivery-meta creation logic, and returns the selected candidate plus token/delivery metadata.
5. Client caller-controller adds a service-based prepare path that calls platform resolution and then dispatches with the resolved concrete responder/hotline.

## Decision (ADR-lite)

**Context**: Multiple machines or responders can provide the same logical ability, such as MinerU document parsing. The existing architecture requires callers to pick a concrete `responder_id + hotline_id` before token and delivery metadata are issued.

**Decision**: Add platform-side service resolution as an additive pre-selection step. Keep token, delivery-meta, ACK, billing, and result verification bound to the selected concrete responder/hotline.

**Consequences**: The first implementation remains conservative and easy to verify. Advanced weighted routing, queue-aware balancing, and marketplace UX can follow after the resolve path is usable.

## Out of Scope

- Replacing the existing direct responder/hotline flow.
- Full marketplace UI for service pools.
- Sophisticated scheduling, fairness, distributed locks, or global queue leasing.
- Cross-responder shared `hotline_id`.
- Platform execution proxying or task body relay beyond the existing transport/delivery abstractions.

## Technical Notes

- Current platform spec says platform responsibilities are directory indexing, authorization issuing, and metrics aggregation, not task body proxying.
- Current implemented flow has caller select `responder_id + hotline_id`, then platform issues task token and delivery metadata.
- Current platform registration rejects reuse of the same `hotline_id` by a different responder, so logical service grouping must be a separate optional field such as `service_id`.
- Responder runtime already has per-responder queue, priority, worker concurrency, and configured hotline routing; platform-side resolve should not duplicate responder execution scheduling in MVP.
- Research reference: `research/platform-side-resolve.md`.
