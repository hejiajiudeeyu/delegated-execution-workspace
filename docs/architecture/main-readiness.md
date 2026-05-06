# Main Readiness

Updated: 2026-05-06

## Purpose

This document records the current readiness judgment for the fourth-repo `main` branch.

The goal is not to describe every planned capability. The goal is to separate:

- what has been verified as usable on the current pinned SHA combination
- what is validated only through the fourth-repo certification path
- what remains outside the current default product path and still needs its own readiness work

## Current Pinned Combination

- `repos/protocol`: `3f036da107d17807f0518972feccce0e323f8eed`
- `repos/client`: `685aab0adbc1801143974fa07f6b77bd74a57488`
- `repos/platform`: `18313db01016256cb504b01c3bfca8bb9668c066`

## Readiness Verdict

`main` is currently usable for the local-first client path and for fourth-repo certified source integration.

That verdict is intentionally narrow. It does **not** mean every planned deployment shape, billing surface, email workflow, or historical test layer is already production-ready.

## Verified Usable Now

### 1. Fourth-repo certification chain

The required workspace certification commands pass on the pinned SHA combination:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

What this proves:

- submodule SHAs are consistent with the compatibility ledger
- cross-repo boundary rules still hold
- change bundles are present and structurally valid
- contracts, package shape, deploy config resolution, and source integration checks pass

### 2. Local-first fresh-home client path

A fresh `DELEXEC_HOME` local smoke was manually re-verified in this workspace on 2026-05-02.

Verified path:

```bash
node apps/ops/src/cli.js bootstrap --email you@example.com
node apps/ops/src/cli.js status
node apps/ops/src/cli.js ui start --no-browser
```

What was directly observed:

- `bootstrap` completed successfully from a clean home directory
- caller local registration completed in `local_only` mode
- the official example hotline was created locally
- supervisor-managed services started and became healthy
- the example request reached `SUCCEEDED`
- `ui start` reopened correctly on the requested host/port after the workspace Vite launch fix

### 3. Current validation/documentation entry points

The most user-facing validation docs in `repos/client` now match the current checkout reality.

Aligned documents include:

- `repos/client/tests/README.md`
- `repos/client/tests/README.zh-CN.md`
- `repos/client/docs/current/testing/testing-strategy.md`
- `repos/client/docs/current/testing/testing-strategy.zh-CN.md`
- `repos/client/docs/current/guides/deployment-guide.md`
- `repos/client/docs/current/guides/deployment-guide.zh-CN.md`

What this fixes:

- the checkout no longer claims missing `tests/e2e` or image-smoke scripts as current runnable truth
- operators now have a correct first-stop list for local tests, package checks, and fourth-repo certification

### 4. ops-console Phase 2 Stage 2 — caller-side chrome/UX

CHG-2026-018 through CHG-2026-021 land the four caller-side pages of `apps/ops-console` against `repos/brand-site/docs/console-content-spec.md`:

- DashboardPage (CHG-2026-018, spec §1.2b/§1.5/§1.5b): five-step onboarding strip, NextUp six-state card, PlatformValueDisclosure value-comparison table with session-based dismiss
- CallsPage (CHG-2026-019, spec §2): manual-call form removed; list rows now carry human-readable headlines; detail panel split into Summary / Request Context / Outcome sections with raw-JSON toggles preserved; failed/rejected calls render mandatory next-step CTAs
- CatalogPage (CHG-2026-020, spec §5.2): TryCallDrawer replaces the dead-end redirect to ManualCallForm; deep-link params `?hotline_id=` auto-select+auto-open the drawer, `?prefill=<base64>` closes the calls-retry loop, zero-hotlines empty state offers a dual CTA
- CallerApprovalsPage (CHG-2026-021, spec §4.0b/§4.3): M7 approval-fatigue banner (three triggers / 24 h cooldown) and M6 post-whitelist education popover (two copy variants / suppressed after 3 popovers per session)

`corepack pnpm run test:unit` covers 10 files / 111 tests across the four slices and stays green. All four slices skip `test:integration` per the precedent set by CHG-2026-009/010/011 — chrome/UX-only React refactors do not touch CLI / supervisor / caller-skill HTTP / MCP adapter / responder controller / protocol or platform contract surfaces.

Out of scope for this Stage 2 batch:

- ops-console `/help` content (the eight pages targeted by every `?from=…` deep link still resolve to a placeholder)
- React Testing Library coverage for CatalogPage / CallsPage / ApprovalsPage M6+M7 (12 pre-existing `tsc` errors in `ResponderHotlinesPage` / `ResponderReviewPage` / `sonner.tsx` recorded in CHG-2026-011 are unchanged and unrelated to this batch)

## Verified But Narrowly Scoped

### Source integration path

`corepack pnpm run test:integration` verifies the baseline source-integration path defined in [Integration Path](integration-path.md):

- platform API from `repos/platform`
- standalone relay from `repos/platform`
- source `delexec-ops` from `repos/client`
- approval plus a full request/response success path

This is stronger than a unit/integration-only claim, but it is still a certification path for source integration, not a blanket readiness claim for every deployment mode.

## Not Yet Re-Certified As Current Default Path

These areas should not be treated as already ready just because `main` is usable for the local-first baseline:

- billing and quota behavior
- email transport as an end-user default path
- image-based smoke and published-image validation paths
- broad E2E layers previously described in older docs but absent from the current checkout
- full platform/operator workflows as the first-use path for ordinary client onboarding

They may have code, partial tests, or older documentation, but they have not been re-established here as the default readiness baseline for `main`.

## Practical Boundary For Next Work

Use this split when choosing the next project theme:

- if the goal is to improve the current default product path, continue inside client usability, onboarding, local transport, and local UI ergonomics
- if the goal is to expand supported deployment shapes, treat billing, email, and image/deploy validation as new readiness tracks with their own acceptance criteria
- do not reopen historical test layers in docs unless the matching files and scripts are restored in the same checkout

## Next Recommended Track

The recommended next closeout item is a small follow-up readiness audit that lists, module by module:

1. local-first client path: verified
2. cross-repo source integration: verified
3. platform-first/operator-first onboarding: partially verified only through certification path
4. email transport: feature-present but not yet re-certified as current default path
5. billing: only the direction-setting RFC at `repos/protocol/docs/planned/design/billing-and-quota.md` exists today (still ahead 2 on the protocol submodule's `main` as of CHG-2026-021, awaiting the matching platform/client RFCs before being bumped into the super-repo); not yet a readiness-closed module
6. ops-console caller-side Stage 2 chrome: four pages landed (CHG-2026-018→021), but `/help` content and the matching RTL coverage are still outstanding
