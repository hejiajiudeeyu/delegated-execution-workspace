# Platform Console Billing Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the newly certified Billing P-1 M1.2 admin read model in the public-stack platform console without leaking admin secrets or implying end-user billing readiness.

**Architecture:** `repos/platform` owns both the admin billing API and the platform-console management surface. The React console calls `platform-console-gateway` `/proxy/v1/admin/billing/*`; the gateway injects the stored platform admin key server-side.

**Tech Stack:** React, TypeScript, Vite, existing platform-console component kit, Vitest unit tests for display/view-model behavior, existing platform gateway proxy.

---

### Task 1: Billing View-Model Tests

**Files:**
- Modify: `repos/platform/apps/platform-console/src/view-model.js`
- Modify: `repos/platform/tests/unit/platform-console-view-models.test.js`

- [x] **Step 1: Write failing tests**

Add tests for:

```js
expect(renderBillingBalanceSummary(balance)).toContain("tenant_alpha")
expect(renderBillingLedgerSummary([{ kind: "recharge", amount_cents: 1200 }])).toContain("recharge")
expect(renderBillingReadinessNotice()).toContain("admin-only")
```

- [x] **Step 2: Run unit test**

Run:

```bash
cd repos/platform && ./node_modules/.bin/vitest run --config tests/config/vitest.unit.config.mjs tests/unit/platform-console-view-models.test.js
```

Expected: FAIL because billing helpers are not exported.

### Task 2: Platform Console Billing Page

**Files:**
- Create: `repos/platform/apps/platform-console/src/pages/BillingPage.tsx`
- Modify: `repos/platform/apps/platform-console/src/App.tsx`
- Modify: `repos/platform/apps/platform-console/src/components/layout/AppShell.tsx`

- [x] **Step 1: Implement page**

The page provides:

- tenant id input
- create tenant button
- refresh balance button
- manual recharge form (`recharge_id`, `amount_cents`, optional provider/reference)
- ledger list filtered to the selected tenant
- visible admin-only/non-ready notice

- [x] **Step 2: Wire route and nav**

Add `/billing` to routes and sidebar.

- [x] **Step 3: Verify build**

Run:

```bash
cd repos/platform/apps/platform-console && npm run build
```

Expected: build exits 0.

### Task 3: Docs and Compatibility Ledger

**Files:**
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`
- Modify: `docs/product/deployability-ecosystem-prd.md`
- Modify: `docs/product/deployability-ecosystem-prd.zh-CN.md`
- Create: `changes/CHG-2026-042.yaml`

- [x] **Step 1: Update readiness wording**

Record that Billing P-1 M1.2 is now visible in platform-console as an operator-only management page.

- [x] **Step 2: Add bundle**

Pin the new platform and brand-site SHAs while keeping protocol/client unchanged.

- [x] **Step 3: Run required gates**

Run platform build/unit checks and fourth-repo gates:

```bash
cd repos/platform && ./node_modules/.bin/vitest run --config tests/config/vitest.unit.config.mjs tests/unit/platform-console-view-models.test.js
cd repos/platform/apps/platform-console && npm run build
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```
