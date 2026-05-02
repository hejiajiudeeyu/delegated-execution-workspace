# Main Readiness

Updated: 2026-05-02

## Purpose

This document records the current readiness judgment for the fourth-repo `main` branch.

The goal is not to describe every planned capability. The goal is to separate:

- what has been verified as usable on the current pinned SHA combination
- what is validated only through the fourth-repo certification path
- what remains outside the current default product path and still needs its own readiness work

## Current Pinned Combination

- `repos/protocol`: `3f036da107d17807f0518972feccce0e323f8eed`
- `repos/client`: `bdf6c2c14cdaccd56c2cb959091ac313ecee2c0f`
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
5. billing: not yet established as a readiness-closed module
