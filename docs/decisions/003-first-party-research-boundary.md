# ADR-003: First-Party Research Project Boundary (A-08)

> Chinese version: [./003-first-party-research-boundary.zh-CN.md](./003-first-party-research-boundary.zh-CN.md)
> Note: the Chinese document is the source of truth.

## Status

Accepted (owner approved 2026-07-31) · lands at M4

## Context

The stage PRD makes the first-party Technical Route Decision Brief Hotline the flagship workload while imposing a hard constraint: **first-party work must run exclusively on the public Runtime and Platform APIs and may not depend on hidden business APIs** (PRD 10.8 explicitly forbids "hidden business APIs" and "bypassing budget, acceptance, refund or audit").

That creates a repository-topology question. Research orchestration, search planning, source selection, model routing and conflict handling are closed-source competitive assets (PRD 10.8 permits this), yet the same component must join the network as an ordinary Responder. Putting it inside any of the existing four repositories would mix closed-source logic into the open Runtime's release unit, making "no hidden APIs" unprovable.

## Decision

**First-party Research lives in an independent private repository and runs as a private OCI worker behind the public Responder Runtime, preferably through an internal HTTP / Unix-socket adapter.**

Boundaries:

| Item | Owner |
|---|---|
| Search/analysis workflow, Evidence Pack, Decision Brief, human review, internal quality engineering | independent private Research repository |
| Hotline contract, adapter, schema, examples, runtime framework | public (protocol/client repositories, as PRD 10.8 requires) |
| Responder lifecycle, artifact send/receive, local diagnostics | `repos/client` (an ordinary Responder Runtime, no privileged branch) |
| Identity, routing, Call state, PTS, acceptance, disputes, audit | `repos/platform` (the same path any third-party Provider takes) |
| Image digest and combination evidence | the fourth repository (records only, never owns the source) |

Hard constraints:

1. **No privileged path may be opened in Platform for the first party.** First-party Hotlines take exactly the same submission, budget, verification, acceptance, audit and settlement chain as a future Partner's.
2. **The workspace may record the Research image digest and evidence, but must never carry its source or private APIs.**
3. The only permitted first-party differences are the transparent ones PRD 10.8 enumerates: official labelling, recommended placement, Stable/Preview, reserved capacity, canary, fast rollback, longer version support — **all operational, visible differences, never a technical back door**.
4. Human involvement must be disclosed (Deep tier is human-reviewed by default) and never hidden.

## Consequences

- Before M4 starts, the private repository must exist and its distribution decided (image digest in a private registry). **This decision does not create the repository**; it only fixes the boundary. Creating it is an outward-facing action needing separate authorization.
- Because the first party rides the public APIs, the completeness of M1–M3 directly gates M4 — which is why the PRD sequences M4 after M3.
- "First party uses only public APIs" is verifiable: every platform call from the Research worker should appear in the audit log as an ordinary Responder. M5 should treat "no privileged first-party path" as checkable evidence.
- Risk R5 (Research succeeds but the platform does not) requires Runtime, Selfhost and Research metrics to be counted separately; this boundary is what makes that separation possible.
