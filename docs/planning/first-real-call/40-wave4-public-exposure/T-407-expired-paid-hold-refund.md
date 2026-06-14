# T-407 Expired Paid Hold Refund

Status: released, deployed, and production-verified.

Created: 2026-06-14

## Goal

Close the platform billing consistency gap exposed by T-406 retry4: a Caller can obtain a paid task token and delivery metadata, then stop before the request reaches a responder terminal event. In enforced billing mode that left a held prepaid amount without `FAILED`/`BILLING_REFUNDED` terminal evidence.

## Implementation

- Owning repo: `repos/platform`.
- Business fix commit: `5ceb76cf2d3dcfea3ec07e2972f6d98a90973dcd`.
- Final release commit: `508d95a2418839018b5a23f7fb909664970eff4f`.
- `apps/platform-api/src/server.js` now records `billing.expires_at` when a paid hold is created.
- Existing held requests without `expires_at` derive expiry from `billing.held_at + TOKEN_TTL_SECONDS`, so persisted production requests can still be reconciled after deployment.
- Caller balance/ledger reads and request event reads lazily reconcile expired held requests:
  - refund the held amount exactly once;
  - set billing state to `refunded`;
  - append platform `FAILED` with `error_code: TASK_TOKEN_EXPIRED`;
  - append `BILLING_REFUNDED`.
- Batch request-event reads apply the same reconciliation for visible requests.
- Release follow-up `508d95a2418839018b5a23f7fb909664970eff4f` makes `scripts/bundle-workspace-deps.mjs` create the bundled workspace stage directory before writing `.workspace-bundle-stage.json`, fixing the platform main CI `test:service:packages` failure seen after the billing fix.

## Verification

- Targeted regression: `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/platform-api-billing.integration.test.js -t "expired paid holds"` passed.
- Full billing integration: `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/platform-api-billing.integration.test.js` passed with 11 tests.
- Platform checks passed:
  - `npm test`
  - `npm run test:service:packages`
  - `npm run test:deploy:config`
  - `npm run test:public-stack-smoke`
- Note: the first combined public-stack smoke attempt failed during local `rsp-gateway` image build without detailed stderr. A direct `docker build -f Dockerfile.workspace --build-arg APP_PATH=apps/platform-console-gateway -t ghcr.io/hejiajiudeeyu/rsp-gateway:latest .` succeeded, and the subsequent `npm run test:public-stack-smoke` rerun completed successfully.
- Platform main CI run `27495653899` passed after the release follow-up.
- Platform image workflow run `27495687079` succeeded for tag `v0.1.2`, including `rsp-platform`, `rsp-relay`, `rsp-gateway`, and published-image smoke.

## Deployment

- Deployed `v0.1.2` to Aliyun public stack at `/home/admin/apps/delegated-execution-public-stack` on 2026-06-14.
- Server `.env` backup: `/home/admin/apps/delegated-execution-public-stack/.env.bak.20260614T182142Z`.
- Running images after deployment:
  - `ghcr.io/hejiajiudeeyu/rsp-platform:v0.1.2`
  - `ghcr.io/hejiajiudeeyu/rsp-relay:v0.1.2`
  - `ghcr.io/hejiajiudeeyu/rsp-gateway:v0.1.2`
- Public checks with `deploycheck=20260614T182142Z` passed:
  - `https://callanything.xyz/healthz`
  - `https://callanything.xyz/platform/healthz`
  - `https://callanything.xyz/relay/healthz`
  - `https://callanything.xyz/gateway/healthz`
  - `https://callanything.xyz/marketplace/hotlines`

## Production Reconciliation

- Rechecked live request `req_t406_retry4_20260614T062857Z` after deployment.
- Evidence files:
  - `/tmp/delexec-t406-20260614T062857Z/retry2/request-events-req_t406_retry4_20260614T062857Z-post-t407.json`
  - `/tmp/delexec-t406-20260614T062857Z/retry2/caller-balance-post-t407.json`
  - `/tmp/delexec-t406-20260614T062857Z/retry2/caller-ledger-post-t407.json`
- Events now include `BILLING_HELD`, `TASK_TOKEN_ISSUED`, `DELIVERY_META_ISSUED`, platform `FAILED` with `TASK_TOKEN_EXPIRED`, and `BILLING_REFUNDED`.
- Retry Caller balance is now `credit_balance_cents: 150`, `pending_credit_cents: 0`, `currency: PTS`.
- Ledger contains retry4 hold `-50` and refund `+50`, moving balance from `100` back to `150`.
- Idempotency recheck evidence:
  - `/tmp/delexec-t406-20260614T062857Z/retry2/request-events-req_t406_retry4_20260614T062857Z-post-t407-idempotency.json`
  - `/tmp/delexec-t406-20260614T062857Z/retry2/caller-ledger-post-t407-idempotency.json`
- Idempotency recheck found exactly one `BILLING_REFUNDED` event and exactly one retry4 ledger refund.
