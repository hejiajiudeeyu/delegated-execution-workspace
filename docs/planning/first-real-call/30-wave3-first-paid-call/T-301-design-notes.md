# T-301 billing enforcement design notes

Date: 2026-06-11

Status: blocked before implementation. The runtime protocol contracts do not yet expose the pricing and billing fields needed for platform enforcement.

## Scope read

T-301 wants the platform call path to enforce prepaid billing:

- reject paid calls when the caller tenant lacks enough balance
- record a billing hold when a task token is issued
- settle or refund the hold when the request reaches a terminal result
- leave free hotlines and `BILLING_ENFORCEMENT=disabled` behavior unchanged

The existing billing foundation is present in `repos/platform`:

- `repos/platform/packages/postgres-store/migrations/002_p1_tenant_balance.sql` defines `tenant_balance`, `tenant_quota_window`, `tenant_balance_ledger`, and `tenant_recharge_request`.
- `tenant_balance_ledger.kind` already includes `hold`, `hold_release`, `debit`, `refund`, `credit`, `pending_credit_release`, `pending_credit_revoke`, `recharge`, and `admin_adjustment`.
- `repos/platform/packages/billing-store/src/index.js` exposes `createTenant`, `getBalance`, `getLedger`, `applyBalanceDelta`, `ensureWindowFresh`, and `createRecharge`.
- `repos/platform/apps/platform-api/src/server.js` already wires admin-only billing endpoints under `/v1/admin/billing/*`.

## Current call path

| Step | Current code path | Current billing behavior | T-301/P-2 billing hook |
| :--- | :--- | :--- | :--- |
| User/caller registration | `POST /v1/callers/register` and auth/session helpers in `server.js` | No tenant-balance creation is required by the public caller path. Admins can create billing tenants separately through `/v1/admin/billing/tenants`. | Later implementation needs a deliberate tenant-binding rule: caller `user_id` or tenant id must map to `tenant_balance.tenant_id` before any enforced paid call. |
| Catalog/hotline discovery | `GET /v2/hotlines`, `/marketplace/hotlines`, `/v1/catalog/hotlines/:id` | Catalog entries are passed through/sanitized, but live runtime contract/template surfaces do not define `pricing_hint`. | Paid/free decision must come from a protocol-owned hotline pricing field, not from platform-private metadata. |
| Task token issuance | `POST /v1/tokens/task` -> `issueTaskToken` -> `createTaskClaims` | Verifies caller auth, request ownership, responder/hotline binding, and public catalog visibility. It writes `TASK_TOKEN_ISSUED`. No billing store lookup, hold, quote, consent, or billing claim exists. | Enforced paid path should validate caller consent and balance, then atomically write a `hold` ledger row before returning the task token. The token should freeze protocol billing claims. |
| Delivery metadata | `POST /v1/requests/:id/delivery-meta` -> `createDeliveryMeta` | Verifies task token claims if provided, request binding, result delivery, and catalog visibility. It writes `DELIVERY_META_ISSUED`. | Should verify billing claims still match the request and catalog binding. It should not create a second hold. |
| Responder ack | `POST /v1/requests/:id/ack` | Writes `ACKED` once per responder/hotline/request binding. | No charge yet. Ack is not terminal and should not settle or refund. |
| Result/event landing | `POST /v1/requests/:id/events` accepts responder `COMPLETED` or `FAILED`; result-package transport also lands through relay/result flows outside this narrow route. | Writes terminal-style events, but no ledger movement occurs. | `SUCCEEDED`/verified completion should settle the held amount: release the unused hold difference, write caller `debit`, and write responder `credit` or pending credit in one transaction. Failure, timeout, `UNVERIFIED`, frozen hotline, or content rejection should write a full `refund` or `hold_release` according to the frozen billing contract. |
| Ledger readback | `GET /v1/admin/billing/tenants/:tenant_id/ledger` | Admin can inspect existing recharge/admin ledger rows. | T-301 tests should eventually assert hold/debit/refund rows by `request_id`. |

## Billing timing table

| Timing | Trigger | Desired operation | Required data | Current readiness |
| :--- | :--- | :--- | :--- | :--- |
| Precheck | Before task token issuance | Determine whether hotline is paid, confirm caller acknowledged the price, confirm `max_charge_cents`, currency, pricing model, trust tier, balance, and quota. | `hotline.pricing_hint`, caller consent, token `billing` claims, tenant binding. | Blocked: these fields are not in the runtime contracts package. |
| Hold | Task token issuance succeeds | `applyBalanceDelta({ kind: "hold", direction: "caller_spend", deltaCents: -max_charge_cents, requestId })`; reject before token response if this fails. | Frozen max charge and request id. | Billing store can write the row, but protocol-owned amount/consent fields are missing. |
| Delivery meta | Caller asks for delivery metadata | Verify the request, token, and catalog still match the hold context. | Token `billing` claims and request billing state. | Request state has no billing sub-object today. |
| Settlement | Verified successful result lands | Convert the held cap into actual debit. For fixed price, actual comes from hotline pricing; for variable models, actual comes from validated result `usage`, capped by max. Write responder credit/pending credit in the same transaction. | Result `usage.total_cents` and pricing metadata, frozen token billing claims, responder trust tier. | Blocked by missing protocol usage/billing fields and missing platform settlement state. |
| Refund/release | Failed, timed out, `UNVERIFIED`, frozen, or content-rejected terminal state | Return the full hold to caller and emit the appropriate billing/refund event. | Terminal outcome taxonomy, request billing state, held ledger id/amount. | Ledger kinds exist, but the protocol error/event constants and request billing state are not frozen. |
| Disabled/free path | `BILLING_ENFORCEMENT=disabled` or free/no pricing | Preserve current token/delivery/result behavior; no billing store requirement. | Runtime flag plus free pricing semantics. | Runtime flag can be added later, but free pricing semantics must still be protocol-owned. |

## Protocol field check

The required protocol fields are only documented as planned proposals, not implemented runtime contracts:

- `repos/protocol/docs/planned/design/billing-and-quota.md` Appendix A.1 proposes hotline `pricing_hint`, token `billing`, and result `usage` billing fields.
- `repos/protocol/docs/planned/design/billing-and-quota.md` Appendix A.2 proposes billing error/event constants such as `ERR_BILLING_CONSENT_REQUIRED`, `ERR_PREPAID_BALANCE_INSUFFICIENT`, and `caller.request.refunded_*`.
- `repos/platform/docs/planned/design/billing-design-rfc.md` describes platform P-2 hold/debit/refund behavior, but explicitly depends on the protocol direction and says the platform must not invent surfaces the protocol did not define.

Live runtime surfaces checked:

- `repos/protocol/packages/contracts/src/index.js` has no `pricing_hint` validation or billing error registry entries. It preserves arbitrary `usage` in result signature canonicalization, but does not define billing semantics for `usage.total_cents`.
- `repos/protocol/docs/templates/catalog-hotline.template.json` has no `pricing_hint`.
- `repos/platform/apps/platform-api/src/server.js` does not read catalog pricing, token billing claims, or result billing usage on the call path.

Conclusion: T-301 cannot proceed to platform implementation without a protocol-owned minor-version change. Adding `pricing_hint` only as platform catalog metadata would violate the task card and fourth-repo ownership rules.

## Minimal protocol proposal for unblock

Protocol should land first in `repos/protocol`, with contracts/tests and bundled template updates, before platform enforcement work starts.

Minimum additive field set:

- Catalog and template bundle:
  - `pricing_hint.pricing_model`: `fixed_price | base_plus_duration | base_plus_tokens`
  - `pricing_hint.currency`: initially `PTS`
  - `pricing_hint.fixed_price_cents`
  - `pricing_hint.base_price_cents`
  - `pricing_hint.variable_unit`
  - `pricing_hint.variable_unit_description`
  - `pricing_hint.variable_unit_price_cents`
  - `pricing_hint.max_total_cents`
  - `pricing_hint.free_tier`
  - `pricing_hint.billing_disclosure_url`
  - `pricing_hint.trust_tier`
- Task token claims:
  - `billing.acknowledged`
  - `billing.pricing_model`
  - `billing.currency`
  - `billing.max_charge_cents`
  - `billing.consent_at`
  - `billing.trust_tier_seen`
- Result package usage:
  - `usage.pricing_model`
  - `usage.base_price_cents`
  - `usage.variable_unit`
  - `usage.variable_units`
  - `usage.variable_unit_price_cents`
  - `usage.variable_subtotal_cents`
  - `usage.total_cents`
- Error codes/events:
  - `ERR_BILLING_CONSENT_REQUIRED`
  - `ERR_BILLING_PRICING_MODEL_MISMATCH`
  - `ERR_BILLING_MAX_CHARGE_TOO_LOW`
  - `ERR_PREPAID_BALANCE_INSUFFICIENT`
  - `ERR_BILLING_CURRENCY_UNSUPPORTED`
  - `ERR_TRUST_TIER_LIMIT_EXCEEDED`
  - `caller.request.billing_held`
  - `caller.request.billing_capped`
  - `caller.request.refunded_unverified`
  - `caller.request.refunded_timeout`
  - `caller.request.refunded_failed`
  - `caller.request.refunded_hotline_frozen`

## Recommended next slice

Do not implement platform billing enforcement yet.

Start a protocol-owned T-301 unblock slice:

1. Add contract constants/validation helpers for the Appendix A.1/A.2 billing surface in `repos/protocol`.
2. Add `pricing_hint` to the catalog hotline template and at least one sample hotline/template bundle.
3. Add protocol tests proving billing fields are accepted/rejected consistently and result `usage.total_cents` is treated as billing evidence only when paired with the new pricing model fields.
4. Commit `repos/protocol`, update the fourth repo submodule SHA, add a change bundle, and run the fourth-repo validation chain.
5. Return to platform T-301 implementation using the newly published/linked protocol contract.
