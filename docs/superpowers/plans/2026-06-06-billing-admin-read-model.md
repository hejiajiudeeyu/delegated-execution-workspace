# Billing Admin Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a platform-owned Billing P-1 admin API/read-model slice for tenant creation, balance lookup, recharge recording, and ledger browsing.

**Architecture:** `@delexec/platform-api` owns the HTTP surface and delegates all billing state changes to `@delexec/billing-store`, which remains the data source of truth. The fourth repo only records the compatible SHA and documentation ledger; it does not define billing schema or runtime behavior.

**Tech Stack:** Node.js ESM, Vitest integration tests, `pg-mem` for test PostgreSQL, existing platform API admin auth, existing billing-store migration and ledger APIs.

---

### Task 1: Platform API Integration Tests

**Files:**
- Modify: `repos/platform/tests/integration/platform-api.integration.test.js`

- [ ] **Step 1: Write the failing test**

Add a `pg-mem` backed billing store helper to the integration test and add tests that prove:

```js
it("exposes admin billing tenant, balance, recharge, and ledger read model", async () => {
  const billingStore = await createBillingTestStore();
  const billingState = createPlatformState({ billingStore });
  const billingServer = createPlatformServer({ state: billingState, serviceName: "platform-api-billing-test" });
  const billingUrl = await listenServer(billingServer);

  try {
    const headers = { Authorization: `Bearer ${billingState.adminApiKey}` };
    const tenant = await jsonRequest(billingUrl, "/v1/admin/billing/tenants", {
      method: "POST",
      headers,
      body: { tenant_id: "tenant_admin_read_model" }
    });
    expect(tenant.status).toBe(201);
    expect(tenant.body.balance.credit_balance_cents).toBe(0);

    const recharge = await jsonRequest(billingUrl, "/v1/admin/billing/tenants/tenant_admin_read_model/recharges", {
      method: "POST",
      headers,
      body: {
        recharge_id: "rch_admin_read_model_1",
        amount_cents: 12500,
        currency: "PTS",
        provider: "manual",
        external_reference: "ops-console-adjustment-1"
      }
    });
    expect(recharge.status).toBe(201);
    expect(recharge.body.ledger.new_balance_cents).toBe(12500);

    const balance = await jsonRequest(billingUrl, "/v1/admin/billing/tenants/tenant_admin_read_model/balance", { headers });
    expect(balance.status).toBe(200);
    expect(balance.body.balance.credit_balance_cents).toBe(12500);

    const ledger = await jsonRequest(billingUrl, "/v1/admin/billing/tenants/tenant_admin_read_model/ledger?limit=5&kind=recharge", { headers });
    expect(ledger.status).toBe(200);
    expect(ledger.body.items).toHaveLength(1);
    expect(ledger.body.items[0].kind).toBe("recharge");
  } finally {
    await closeServer(billingServer);
    await billingStore.close();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd repos/platform && ./node_modules/.bin/vitest run --config tests/config/vitest.integration.config.mjs tests/integration/platform-api.integration.test.js
```

Expected: FAIL with 404 for `/v1/admin/billing/tenants`.

### Task 2: Minimal Platform API Implementation

**Files:**
- Modify: `repos/platform/apps/platform-api/src/server.js`
- Modify: `repos/platform/apps/platform-api/package.json`

- [ ] **Step 1: Implement store wiring**

Import `createBillingStore`, accept `options.billingStore` in `createPlatformState`, and initialize a billing store when `BILLING_DATABASE_URL`, `PLATFORM_DATABASE_URL`, or `DATABASE_URL` is configured.

- [ ] **Step 2: Implement admin-only billing routes**

Add routes:

```text
POST /v1/admin/billing/tenants
GET /v1/admin/billing/tenants/:tenant_id/balance
GET /v1/admin/billing/tenants/:tenant_id/ledger
POST /v1/admin/billing/tenants/:tenant_id/recharges
```

All routes require existing operator/admin auth. Missing store returns `503 BILLING_STORE_UNAVAILABLE`. Billing store errors map through their `code`, `httpStatus`, and `retryable` fields.

- [ ] **Step 3: Run test to verify it passes**

Run the same platform API integration test command. Expected: PASS.

### Task 3: Docs and Compatibility Ledger

**Files:**
- Modify: `repos/platform/docs/planned/design/billing-p1-tenant-balance-impl.md`
- Modify: `repos/platform/docs/planned/design/billing-p1-tenant-balance-impl.zh-CN.md`
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`
- Modify: `docs/product/deployability-ecosystem-prd.md`
- Modify: `docs/product/deployability-ecosystem-prd.zh-CN.md`
- Create: `changes/CHG-2026-041.yaml`

- [ ] **Step 1: Update platform docs**

Record that Billing P-1 M1.2 now has an admin-only API/read-model slice while client-facing billing and enforcement remain planned.

- [ ] **Step 2: Update fourth-repo docs and bundle**

Move the pinned platform SHA after committing the platform submodule. Add `CHG-2026-041.yaml` with unchanged protocol/client/brand-site SHAs and the new platform SHA.

- [ ] **Step 3: Run required verification**

Run platform targeted tests and fourth-repo gates:

```bash
cd repos/platform && ./node_modules/.bin/vitest run --config tests/config/vitest.integration.config.mjs tests/integration/platform-api.integration.test.js
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

Expected: all commands exit 0 before this slice is reported as complete.
