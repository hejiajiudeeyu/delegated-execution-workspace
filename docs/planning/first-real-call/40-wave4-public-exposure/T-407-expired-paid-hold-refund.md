# T-407 Expired Paid Hold Refund

Status: implemented locally; release/deployment pending.

Created: 2026-06-14

## Goal

Close the platform billing consistency gap exposed by T-406 retry4: a Caller can obtain a paid task token and delivery metadata, then stop before the request reaches a responder terminal event. In enforced billing mode that left a held prepaid amount without `FAILED`/`BILLING_REFUNDED` terminal evidence.

## Implementation

- Owning repo: `repos/platform`.
- Commit: `5ceb76cf2d3dcfea3ec07e2972f6d98a90973dcd`.
- `apps/platform-api/src/server.js` now records `billing.expires_at` when a paid hold is created.
- Existing held requests without `expires_at` derive expiry from `billing.held_at + TOKEN_TTL_SECONDS`, so persisted production requests can still be reconciled after deployment.
- Caller balance/ledger reads and request event reads lazily reconcile expired held requests:
  - refund the held amount exactly once;
  - set billing state to `refunded`;
  - append platform `FAILED` with `error_code: TASK_TOKEN_EXPIRED`;
  - append `BILLING_REFUNDED`.
- Batch request-event reads apply the same reconciliation for visible requests.

## Verification

- Targeted regression: `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/platform-api-billing.integration.test.js -t "expired paid holds"` passed.
- Full billing integration: `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/platform-api-billing.integration.test.js` passed with 11 tests.
- Platform checks passed:
  - `npm test`
  - `npm run test:service:packages`
  - `npm run test:deploy:config`
  - `npm run test:public-stack-smoke`
- Note: the first combined public-stack smoke attempt failed during local `rsp-gateway` image build without detailed stderr. A direct `docker build -f Dockerfile.workspace --build-arg APP_PATH=apps/platform-console-gateway -t ghcr.io/hejiajiudeeyu/rsp-gateway:latest .` succeeded, and the subsequent `npm run test:public-stack-smoke` rerun completed successfully.

## Remaining Work

- Release a new platform image tag and deploy it to Aliyun.
- Recheck the live T-406 request `req_t406_retry4_20260614T062857Z`; expected post-deploy evidence is terminal `FAILED`, `BILLING_REFUNDED`, no outstanding held state, and ledger/balance consistency.
