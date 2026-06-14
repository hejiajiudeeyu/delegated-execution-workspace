# T-405 Public Paid-Call CLI Wrapper

Status: local verified.

Created: 2026-06-14

## Goal

Replace the long public Caller paid-call curl chain with a first-class `delexec-ops call-hotline` command. A Caller should be able to provide a Platform URL, responder id, hotline id, billing cap, and payload, then receive one JSON evidence object covering token issuance, delivery metadata, relay-backed dispatch, caller inbox polling, signed result retrieval, request events, balance, and ledger.

## Scope

- Owning repo: `repos/client`.
- `@delexec/ops` now exposes `delexec-ops call-hotline` in help output.
- The command:
  - reads the Caller API key from existing ops state/secrets or `CALLER_PLATFORM_API_KEY` / `PLATFORM_API_KEY`;
  - posts `/v1/tokens/task` with explicit billing acknowledgement and `max_charge_cents`;
  - posts `/v1/requests/:request_id/delivery-meta` with `result_delivery` set to `local://relay/caller-controller/:request_id`;
  - creates a local caller-controller request with token, delivery metadata, result delivery, and expected signer binding;
  - dispatches through caller-controller instead of hand-rolling relay send;
  - polls `/controller/inbox/pull` and `/controller/requests/:request_id/result`;
  - fetches `/v1/requests/:request_id/events`, `/v1/tenants/me/balance`, and `/v1/tenants/me/ledger`.
- `@delexec/ops` package version is bumped from `0.1.4` to `0.1.5`.

## Verification

- RED test first failed on `unsupported_command:call-hotline`.
- `repos/client`: targeted `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/ops-cli.integration.test.js -t "calls a paid hotline through platform token delivery metadata dispatch and result polling"` passed after implementation.
- `repos/client`: targeted help + paid-call test passed with `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/ops-cli.integration.test.js -t "shows the public paid call wrapper in help output|calls a paid hotline through platform token delivery metadata dispatch and result polling"`.
- `repos/client`: full `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/ops-cli.integration.test.js` passed with 21 tests.
- `repos/client`: `npm test` passed.
- `repos/client`: `npm run test:packages` passed.
- Clean-room package smoke passed before publish:
  - `npm pack --workspace @delexec/ops` produced `delexec-ops-0.1.5.tgz`.
  - Installing that tarball into `/tmp/delexec-ops-015-smoke-qI25GQ` succeeded.
  - `./node_modules/.bin/delexec-ops --help` included `delexec-ops call-hotline`.
- Publish attempt generated the `@delexec/ops@0.1.5` tarball but failed with `ENEEDAUTH`; `npm whoami` also failed with `ENEEDAUTH`.
- `npm view @delexec/ops version` still returns `0.1.4`.
- Root validation passed:
  - `corepack pnpm run check:submodules`
  - `corepack pnpm run check:boundaries`
  - `corepack pnpm run check:bundles`
  - `corepack pnpm run test:contracts`
  - `corepack pnpm run test:integration`

## Remaining Follow-Ups

- Publish `@delexec/ops@0.1.5` from an authenticated npm environment before public docs instruct unknown users to rely on `delexec-ops call-hotline`.
- Update public Caller quick-start docs to prefer `delexec-ops call-hotline` over the low-level curl chain after the package is published.
- Run the next public-docs-only unknown-user rehearsal against the deployed T-404/T-405 path.
