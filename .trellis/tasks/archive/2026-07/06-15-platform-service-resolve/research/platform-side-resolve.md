# Platform-Side Resolve Research

## Current Repo Constraints

- Business truth must stay in `repos/protocol`, `repos/client`, and `repos/platform`.
- The fourth repo can orchestrate and validate, but must not define protocol fields or runtime truth.
- Existing protocol/platform/client flow already binds task token, delivery metadata, ACK, and result verification to concrete `responder_id + hotline_id`.
- Existing platform catalog treats `hotline_id` as a unique catalog key and rejects reuse by another responder.
- Existing catalog filtering already supports `capability`, `task_type`, `availability_status`, and public visibility.
- Existing responder runtime has local worker concurrency and priority queueing, so MVP platform resolve should choose a candidate, not own remote execution scheduling.

## Feasible Approaches

### Approach A: Platform resolve endpoint, then existing direct flow

Caller submits logical `service_id` or `capability`; platform selects a concrete catalog item and returns selected responder/hotline plus task token and delivery metadata.

Pros:
- Centralizes pool choice and future policy.
- Keeps existing direct flow and security binding intact.
- Smallest safe change that makes platform-side resolve usable.

Cons:
- Requires protocol, platform, and client changes.
- First scheduling policy should be deliberately simple.

### Approach B: Caller-side catalog selection

Caller lists hotlines by capability and picks one itself.

Pros:
- Lowest platform change.
- Can work with existing catalog filters.

Cons:
- Routing logic spreads across clients.
- Harder to enforce fair policy, health semantics, and audit.
- User explicitly chose platform-side resolve, so this is not the target.

### Approach C: Responder-owned internal pool

A single responder/hotline hides multiple backend machines behind its own adapter.

Pros:
- No protocol-level pool concept needed.
- Good for one provider scaling its own service.

Cons:
- Does not solve multi-provider shared logical services.
- Platform cannot manage priority across providers.

## Recommendation

Use Approach A. Implement the first version as an additive, deterministic resolver that prioritizes availability and compatibility over advanced load balancing.
