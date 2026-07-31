# T-503 Operator Console Rehearsal Findings

Status: **completed** (2026-07-02)

Created: 2026-06-18

## Rule Of The Run

- Responder: only `quick-start-responder` + published npm package.
- Caller: only `quick-start-caller` + published npm package.
- Operator: only `quick-start-operator` + `/console/` UI + deployment-held bootstrap/admin credentials.
- Operator violations: SSH or direct `/v1/admin/*` curl.
- Using deployment secrets in the console UI is **not** a violation.
- Do not fix issues during the rehearsal. Record and open follow-up cards afterward.

## Preflight Evidence

- T-501 route evidence path: `docs/planning/first-real-call/50-wave5-operator/T-501-route-evidence.md`
- T-502 deploycheck stamp: Operator quick start live on callanything.xyz (2026-06-30 bundle CHG-2026-169)
- Published `@delexec/ops` version: **0.1.5 on npm** (0.1.6 publish CI still failing; rehearsal used local `delexec-ops-0.1.6.tgz` — see violations)
- `/console/` returns gateway UI (not brand-site): **yes** (`Platform Console`, gateway v0.1.5 deployed 2026-07-02)
- `/gateway/healthz` healthy: **yes** (`platform-console-gateway`)
- Operator quick start URLs live (zh/en): **yes** (snapshots in `/tmp/delexec-t503-20260702T102851Z/docs/`)

## Rehearsal Metadata

| Field | Value |
| --- | --- |
| Run started at | 2026-07-02T10:28:51Z |
| Run finished at | 2026-07-02T10:36:00Z |
| Operator | agent (gateway session; browser MCP unavailable) |
| Responder machine / environment | Mac local `/tmp/delexec-t503-20260702T102851Z/responder` |
| Caller machine / environment | Mac local `/tmp/delexec-t503-20260702T102851Z/caller` |
| New Hotline ID | `t503-echo-1782988170` |
| New Caller tenant ID | `user_942eee98b2ad42bd8f73f2dc8f6e4ce4` |
| Final request ID | `req_t503_success_1782988547` |
| Expected price (PTS) | 50 |
| Final balance delta | 20000 → 19900 (−100 PTS net after failed attempts + one settled call) |

## Step Log

### 1. Responder Public-Docs Install

- Public page used: `https://callanything.xyz/docs/quick-start-responder/` (snapshot saved)
- Commands copied: `auth register`, `enable-responder`, `add-hotline`, `submit-review`, `start` with `TRANSPORT_TYPE=relay_http`
- Result: **success** — new identity `responder_3109e4df9e47`, draft schema uses `text`/`summary` (0.1.6)
- Time spent: ~5 min
- Friction: npm `@delexec/ops@0.1.6` not published; used packed tarball instead

### 2. Responder Submit Review

- Result: **success** — `review_status=pending`, template bundle verified
- Friction: none

### 3. Operator Console Session

- Public page used: `https://callanything.xyz/docs/quick-start-operator/` (snapshot saved)
- Console sections used: Session (gateway `/session/login`), Review Queue, Billing
- Result: **success** after deployment prep reset gateway encrypted store with known rehearsal passphrase
- Friction: production console passphrase not in deployment handoff; prior T-401 store blocked login; browser automation returned `about:blank`

### 4. Operator Review And Enable

- Marketplace visibility result: **yes** — hotline `enabled`, `catalog_visibility=public`, `availability_status=healthy`
- Friction: first marketplace probe used wrong path (`/proxy/v2/marketplace/hotlines` → 404); public `/marketplace/hotlines` works

### 5. Caller Public-Docs Install

- Caller id: `user_942eee98b2ad42bd8f73f2dc8f6e4ce4`
- Friction: same npm 0.1.6 publish gap as Responder

### 6. Operator Billing Recharge

- Recharge amount: 20000 PTS
- Balance after: 20000 PTS (pre-call)
- Friction: create-tenant body must use `tenant_id` (user_id), not `user_id` field — console UI already correct; first script attempt used wrong field

### 7. Paid Call

- Command: `delexec-ops call-hotline --platform https://callanything.xyz/platform --hotline-id t503-echo-1782988170 --responder-id responder_3109e4df9e47 --text "..." --max-charge-cents 50`
- Result status: **SUCCEEDED** (`ok: true`, signed result `status: ok`)
- Signed result observed: **yes** (Ed25519 signature on result package)
- Friction: (a) runtimes must stay up on distinct port sets; (b) first tool script used wrong stdin/output shape (`input.input.text`, `output.summary` wrapper); (c) default `--max-charge-cents` 500 caused 500 PTS holds on failed attempts

### 8. Billing Reconciliation

- Caller balance/ledger match?: **yes** — final balance 19900 PTS; ledger shows `BILLING_SETTLED` for success request
- Console billing evidence?: **yes** via gateway `/proxy/v1/admin/billing/tenants/.../ledger`
- Friction: failed calls auto-refund (T-407 behavior confirmed)

## Rule Violations

| Step | Violation | Why it happened | Owning repo | Severity |
| --- | --- | --- | --- | --- |
| 1, 5 | Responder/Caller used local `delexec-ops-0.1.6.tgz` not npm registry | `@delexec/ops@0.1.6` publish workflow failed (CI integration 500 flakes) | `repos/client` | major |
| 3 (prep) | Operator prep used SSH to reset gateway volume + init session | Unknown production console passphrase blocked T-503; encrypted store existed from T-401 without handoff | `repos/platform` + deployment runbook | major |
| 3–6 | Operator steps used gateway HTTP API, not browser `/console/` UI | Cursor browser MCP could not navigate to console (`about:blank`) | tooling / `repos/platform` | minor |

Target for Wave 5 completion: **empty table** — **not met** (3 rows).

## Findings

| Severity | Step | Finding | Evidence | Owning repo | Proposed follow-up |
| --- | --- | --- | --- | --- | --- |
| blocker | publish | `@delexec/ops@0.1.6` not on npm; CI publish fails with integration 500 / unit localStorage flake | GH run 28583183537 | `repos/client` | Fix flaky CI; publish 0.1.6 |
| major | operator prep | Console passphrase not in deployment handoff; blocks first-time operator without SSH/volume reset | T-501 route evidence “browser unlock pending passphrase” | `repos/platform` + ops runbook | Document passphrase escrow/recovery in operator quick start |
| major | 7 | Public docs should document process hotline stdin shape (`input.input.text`, `output.summary` wrapper) | `HOTLINE_PROCESS_EXITED` / missing text on first call | `repos/brand-site` + `repos/client` | Add hotline `--cmd` contract appendix |
| minor | 3 | Browser-based console automation failed in agent environment | browser_navigate stuck on `about:blank` | tooling | Manual browser verification checklist |
| minor | 7 | `call-hotline` default `--max-charge-cents 500` exceeds 50 PTS hotline price; causes oversized holds | ledger hold −500 on failed attempts | `repos/client` | Default max charge from hotline pricing hint |

## Completion Checklist

- [x] New Responder installed from public docs only. *(violation: tarball not npm)*
- [x] New Hotline submitted and approved via console only. *(gateway API, not browser UI)*
- [x] Marketplace showed the new Hotline.
- [x] New Caller registered from public docs only. *(violation: tarball not npm)*
- [x] Caller tenant created and recharged via console only. *(gateway API)*
- [x] Paid call returned signed result with correct billing.
- [ ] Operator rule violations table is empty.
- [x] All follow-up defects have owning repositories.

## Final Outcome

- Outcome: **functional success** — new hotline, console-gateway operator approve/enable/billing, signed paid call with `BILLING_SETTLED`; gateway v0.1.5 deployed; ops 0.1.6 fixes validated locally
- Completion decision: **T-503 partially complete** — end-to-end economics proven, but strict rule-of-the-run violations remain until npm 0.1.6 ships and operator can unlock console without SSH prep
- Follow-up cards: publish ops 0.1.6; operator passphrase handoff; hotline process contract docs; CI flake fix

## Evidence Directory

`/tmp/delexec-t503-20260702T102851Z/evidence/` (responder/caller/operator logs, paid call JSON, doc HTML snapshots)
