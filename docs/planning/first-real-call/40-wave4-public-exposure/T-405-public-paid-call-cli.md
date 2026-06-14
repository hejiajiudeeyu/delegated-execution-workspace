# T-405 Public Paid-Call CLI Wrapper

Status: published, documented, deployed, and public verified.

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
- After the package was published, the public Chinese and English Caller quick starts prefer `delexec-ops call-hotline` for the paid-call production rehearsal while keeping the wrapped Platform, Relay, and caller-controller APIs visible as diagnostic markers.

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
- Local publish attempt generated the `@delexec/ops@0.1.5` tarball but failed with `ENEEDAUTH`; `npm whoami` also failed with `ENEEDAUTH`.
- GitHub Actions publish run `27489575719` passed `npm test`, `npm run test:packages`, and `npm publish --workspace "@delexec/ops" --access public`.
- `npm view @delexec/ops version dist.integrity dist.tarball --json` returned version `0.1.5`, tarball `https://registry.npmjs.org/@delexec/ops/-/ops-0.1.5.tgz`, and integrity `sha512-8Dha9VxNF7JWb6t3zcM5QCo8fgJjIirMmvfcrhtD8h39CvumRZQxNBQXl1xfeuZZh0FetOlznz7ppCV29yPHqA==`.
- Registry clean install smoke passed in `/tmp/delexec-ops-015-registry-smoke-qGoP43` and confirmed `./node_modules/.bin/delexec-ops --help` includes `delexec-ops call-hotline`.
- `repos/brand-site`: Chinese and English Caller quick starts now make `delexec-ops call-hotline` the main paid-call path and keep low-level endpoints as diagnostic markers.
- `repos/brand-site`: `npm run smoke:first-real-call-content` passed with 145 checks.
- `repos/brand-site`: targeted `npx eslint src/app/pages/Docs/QuickStartCaller.tsx src/app/pages/en/Docs/QuickStartCaller.tsx scripts/first-real-call-content-smoke.mjs` passed.
- `repos/brand-site`: `npm run build` passed with the existing large chunk warning.
- Root validation passed:
  - `corepack pnpm run check:submodules`
  - `corepack pnpm run check:boundaries`
  - `corepack pnpm run check:bundles`
  - `corepack pnpm run test:contracts`
  - `corepack pnpm run test:integration`
- Deployed to Aliyun `/var/www/html`.
- Backup created: `/home/admin/site-backups/html.20260614T061527Z.tgz`.
- Public verification with `deploycheck=20260614T061527Z` passed for:
  - Chinese Caller quick start `delexec-ops call-hotline`, `--caller-base-url`, `--max-charge-cents`, `task_token_claims`, `delivery_meta`, and `$RELAY/v1/messages/send` markers.
  - English Caller quick start `delexec-ops call-hotline`, `--caller-base-url`, `--max-charge-cents`, `task_token_claims`, `delivery_meta`, and `$RELAY/v1/messages/send` markers.
  - `https://callanything.xyz/healthz`
  - `https://callanything.xyz/platform/healthz`
  - `https://callanything.xyz/relay/healthz`
  - `https://callanything.xyz/marketplace/hotlines`

## Remaining Follow-Ups

- Run the next public-docs-only unknown-user rehearsal against the deployed T-404/T-405 path.
