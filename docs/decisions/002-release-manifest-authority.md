# ADR-002: Release Manifest Authority (A-09)

> Chinese version: [./002-release-manifest-authority.zh-CN.md](./002-release-manifest-authority.zh-CN.md)
> Note: the Chinese document is the source of truth.

## Status

Accepted (owner approved 2026-07-31)

## Context

The stage PRD's E0 requires repository, release artifact and deployment facts to agree. Today disagreement is the norm rather than the exception:

- Production ran gateway v0.2.0 while the workspace `main` still recorded the platform gitlink at v0.1.7, with the matching change bundle uncommitted (closed 2026-07-31).
- The "current combination" was inferred from whichever `changes/CHG-*.yaml` happened to be newest; there was no explicit current pointer.
- Running services did not report their own version, so deployment facts could only be checked against release notes and human memory (the FR-082 gap).

If Platform also generated a cross-repo manifest, there would be two sources each claiming to be the authoritative combination — the mirror image of PRD risk R6, "the fourth repository becomes a second source of truth".

## Decision

**The workspace generates and freezes immutable release manifests; owning services only report the build facts they observe, for comparison.**

Concretely:

1. **Immutable manifest**: `releases/manifests/<release_id>.yaml` is written once and never modified, recording protocol/client/platform/brand SHAs and artifacts (npm versions, image tags).
2. **Small pointer**: `releases/current.yaml` contains only `release_id` and `manifest_sha256`, naming the currently certified combination. It is small enough to verify at a glance.
   - **Naming constraint (learned in practice 2026-08-01)**: when a combination ships images, its `release_id` **must equal the git tag those images were built from** (e.g. `v0.3.0`), because that is the value injected at build time and reported by `/buildz`. A date-slug id can never match what a service reports; the drift check refused the first real production roll for exactly this reason. Date-slug ids remain fine for combinations that ship no images, where services report null and the verdict is correctly undetermined.
3. **Observed facts**: platform-api, transport-relay and platform-console-gateway each expose `GET /buildz` reporting component, version, git sha, image digest, console asset fingerprint, release id and manifest hash. These are **observations, not authority**; uninjected values report null and are never guessed.
4. **Drift validator**: a workspace tool compares observed facts against the canonical manifest and blocks on mismatch (FR-083), reporting HEAD/index/worktree/bundle/manifest/artifact/runtime differences separately.
5. **Platform must not generate a second canonical cross-repo manifest.**

## Consequences

- Certification order is fixed: owning-repo release → gitlink and change bundle → five-check chain passes → only then update `current.yaml`. The pointer lagging the bundle is normal; the reverse is an error.
- Immutability means corrections ship as a new release id rather than rewriting history, so rollbacks are recorded by construction (FR-084).
- Services must have build facts injected at image build time (Dockerfile build args plus the images workflow), otherwise `/buildz` reports null and drift checking degrades to "cannot determine" rather than "passed".
- The existing `changes/CHG-*.yaml` mechanism stays authoritative and is not replaced: a bundle records *this change*, the manifest records *which combination is current*.
- Production probing needs a reachable runtime; locally executed validation must be labelled local-only and never treated as publication evidence.
