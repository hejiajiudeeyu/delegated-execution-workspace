# T-503 Operator Console Rehearsal Findings

Status: draft template — do not mark T-503 complete until manual rehearsal sections are filled.

Created: 2026-06-18

## Rule Of The Run

- Responder: only `quick-start-responder` + published npm package.
- Caller: only `quick-start-caller` + published npm package.
- Operator: only `quick-start-operator` + `/console/` UI + deployment-held bootstrap/admin credentials.
- Operator violations: SSH or direct `/v1/admin/*` curl.
- Using deployment secrets in the console UI is **not** a violation.
- Do not fix issues during the rehearsal. Record and open follow-up cards afterward.

## Preflight Evidence

Fill before manual run:

- T-501 route evidence path:
- T-502 deploycheck stamp:
- Published `@delexec/ops` version:
- `/console/` returns gateway UI (not brand-site):
- `/gateway/healthz` healthy:
- Operator quick start URLs live (zh/en):

## Rehearsal Metadata

| Field | Value |
| --- | --- |
| Run started at | |
| Run finished at | |
| Operator | |
| Responder machine / environment | |
| Caller machine / environment | |
| New Hotline ID | |
| New Caller tenant ID | |
| Final request ID | |
| Expected price (PTS) | |
| Final balance delta | |

## Step Log

### 1. Responder Public-Docs Install

- Public page used:
- Commands copied:
- Result:
- Time spent:
- Friction:

### 2. Responder Submit Review

- Result:
- Friction:

### 3. Operator Console Session

- Public page used:
- Console sections used:
- Result:
- Friction:

### 4. Operator Review And Enable

- Marketplace visibility result:
- Friction:

### 5. Caller Public-Docs Install

- Caller id:
- Friction:

### 6. Operator Billing Recharge

- Recharge amount:
- Balance after:
- Friction:

### 7. Paid Call

- Command:
- Result status:
- Signed result observed:
- Friction:

### 8. Billing Reconciliation

- Caller balance/ledger match?:
- Console billing evidence?:
- Friction:

## Rule Violations

| Step | Violation | Why it happened | Owning repo | Severity |
| --- | --- | --- | --- | --- |
| | | | | |

Target for Wave 5 completion: **empty table**.

## Findings

| Severity | Step | Finding | Evidence | Owning repo | Proposed follow-up |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Completion Checklist

- [ ] New Responder installed from public docs only.
- [ ] New Hotline submitted and approved via console only.
- [ ] Marketplace showed the new Hotline.
- [ ] New Caller registered from public docs only.
- [ ] Caller tenant created and recharged via console only.
- [ ] Paid call returned signed result with correct billing.
- [ ] Operator rule violations table is empty.
- [ ] All follow-up defects have owning repositories.

## Final Outcome

- Outcome:
- Completion decision:
- Follow-up cards:
