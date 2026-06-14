# T-406 Public-Docs CLI Rehearsal

Status: completed with business success and residual findings.

Created: 2026-06-14

## Goal

Run a fresh public-docs-only rehearsal against the deployed T-405 Caller path. The target proof is an unknown-user style Caller using the published `@delexec/ops@0.1.5` docs path and `delexec-ops call-hotline` to make a paid public relay call, then reconciling result, events, balance, and ledger evidence.

## Rule Of The Run

- Start from public URLs and the published npm package.
- Do not rely on source-only commands for the Caller path.
- Record any step that needs private operator action or non-public knowledge.
- Do not print production secrets into this file.

## Preflight Evidence

- `npm view @delexec/ops version dist.tarball --json` returns version `0.1.5`.
- T-405 public deployment with `deploycheck=20260614T061527Z` confirms the Chinese and English Caller quick starts include `delexec-ops call-hotline`, `--caller-base-url`, `--max-charge-cents`, `task_token_claims`, `delivery_meta`, and `$RELAY/v1/messages/send`.
- `https://callanything.xyz/platform/healthz` returns platform-api health.
- `https://callanything.xyz/relay/healthz` returns transport-relay health.
- `https://callanything.xyz/marketplace/hotlines?probe=t406` shows the previous OPC0 Hotline `opc0.summary-20260613t200916z.v1` is still public and approved, but `availability_status` is `offline`.

## Rehearsal Plan

1. Prepare a clean temp Caller environment with the published npm package.
2. Use public Caller docs to register a Caller against `https://callanything.xyz/platform`.
3. Create or recharge the Caller tenant through the operator path without recording secrets.
4. Ensure a public paid Hotline is online. If the previous OPC0 responder is offline, either restart the public Responder runtime using public docs or record the need for a fresh Responder setup.
5. Run `delexec-ops call-hotline` with `--platform`, `--caller-base-url`, `--responder-id`, `--hotline-id`, `--max-charge-cents`, `--poll-interval-ms`, and `--timeout-ms`.
6. Verify the JSON evidence includes `task_token_claims`, `delivery_meta`, `dispatch`, `inbox`, `result`, `events`, `balance`, and `ledger`.

## Evidence Log

- Evidence directory: `/tmp/delexec-t406-20260614T062857Z`.
- Public docs snapshots:
  - `/tmp/delexec-t406-20260614T062857Z/public-docs/caller-zh.html`
  - `/tmp/delexec-t406-20260614T062857Z/public-docs/caller-en.html`
- Published package install:
  - `npm install -g @delexec/ops@0.1.5` passed in the isolated npm prefix.
  - `delexec-ops --help` includes `delexec-ops call-hotline`.
- First Caller:
  - Caller id: `user_c6e488130a944e8ab411b46a96b0a31a`.
  - Operator tenant create and manual recharge succeeded; recharge id `rch_t406_20260614T062857Z`, balance after recharge `1000`.
  - First `call-hotline` attempt failed with `[delexec-ops] fetch failed` after the local Caller runtime exited; ledger showed a 500 PTS hold for `req_t406_20260614T062857Z`.
  - Later balance evidence showed this first failed hold was no longer the active proof path; the useful retry used a new Caller with a smaller cap.
- Retry Caller:
  - Caller id: `user_ba824beb20ec4cf7b848ce299a50f85b`.
  - Operator tenant create and manual recharge succeeded; recharge id `rch_t406_retry2_20260614T062857Z`, balance after recharge `200`.
  - Keeping Caller runtime in a foreground session on `8679/8681/8691/8692` avoided the local runtime exit seen in the first attempt.
  - Keeping the old OPC0 Responder runtime in a foreground session restored Marketplace availability from `offline` to `healthy`.
- CLI wrapper proof before adapter cwd fix:
  - Command: `delexec-ops call-hotline --platform https://callanything.xyz/platform --caller-base-url http://127.0.0.1:8681 --request-id req_t406_retry3_20260614T062857Z --responder-id responder_0f5343b85aa6 --hotline-id opc0.summary-20260613t200916z.v1 --max-charge-cents 50 --poll-interval-ms 2000 --timeout-ms 120000`.
  - Exit status: `0`.
  - Evidence file: `/tmp/delexec-t406-20260614T062857Z/retry2/call-hotline-result-retry3.json`.
  - Output included `task_token_claims`, `delivery_meta`, `dispatch`, `inbox`, `result`, `events`, `balance`, and `ledger`.
  - Result package was signed and schema-valid, but `result_package.status` was `error` with `HOTLINE_PROCESS_EXITED`.
  - Error cause: the old OPC0 process adapter tried to run `node ./my-tool/index.js` from `/Users/hejiajiudeeyu/Documents/Projects/delegated-execution-dev`, so Node could not find `/Users/hejiajiudeeyu/Documents/Projects/delegated-execution-dev/my-tool/index.js`.
  - Billing evidence for `req_t406_retry3_20260614T062857Z`: `BILLING_HELD` 50, `FAILED`, `BILLING_REFUNDED` 50.
  - Retry Caller balance returned to `200`; ledger contains hold/refund pairs for retry2 and retry3 plus the 200 PTS recharge.
- Adapter cwd repair:
  - Local OPC0 integration files were repaired to set `adapter.cwd` to `/tmp/delexec-opc0-20260613T200916Z/responder-work`.
  - Files changed for the live rehearsal only:
    - `/tmp/delexec-opc0-20260613T200916Z/responder-home/ops.config.json`
    - `/tmp/delexec-opc0-20260613T200916Z/responder-home/hotline-integrations/opc0.summary-20260613t200916z.v1.integration.json`
  - The public Responder runtime was restarted in a foreground session after this repair.
- Final business-success proof:
  - Command: `delexec-ops call-hotline --platform https://callanything.xyz/platform --caller-base-url http://127.0.0.1:8681 --request-id req_t406_retry5_20260614T062857Z --responder-id responder_0f5343b85aa6 --hotline-id opc0.summary-20260613t200916z.v1 --max-charge-cents 50 --poll-interval-ms 2000 --timeout-ms 120000`.
  - Exit status: `0`.
  - Evidence file: `/tmp/delexec-t406-20260614T062857Z/retry2/call-hotline-result-retry5.json`.
  - Output included `task_token_claims`, `delivery_meta`, `dispatch`, `inbox`, signed `result`, `events`, `balance`, and `ledger`.
  - Result package status: `ok`.
  - Result output summary: `OPC0 summary: T-406 retry5: final public-docs CLI proof after fixing the responder adapter cwd and keeping both runtimes`.
  - Request events for `req_t406_retry5_20260614T062857Z`: `BILLING_HELD`, `TASK_TOKEN_ISSUED`, `DELIVERY_META_ISSUED`, `COMPLETED`, `BILLING_SETTLED`, and `ACKED`.
  - Billing evidence: 50 PTS hold followed by settlement; retry Caller balance after final proof was `100`.
  - Marketplace still reported the OPC0 Hotline as `healthy` after the proof.

## Findings

- `delexec-ops call-hotline` is usable from the deployed public Caller docs and published `@delexec/ops@0.1.5`: it obtained a paid task token, delivery metadata, dispatched through the local Caller controller, pulled the inbox, retrieved a signed `ok` result package, fetched request events, and reconciled balance and ledger.
- The old OPC0 Responder adapter configuration was not restart-durable until its local integration was repaired. The adapter command is relative (`node ./my-tool/index.js`) and originally had no `cwd`, so restarting from another working directory caused `MODULE_NOT_FOUND`.
- Long-running runtime lifecycle is still fragile in manual rehearsals. Background `nohup` attempts can exit or leave unclear process state; foreground sessions made both Caller and Responder proof paths reliable.
- Billing failure behavior is correct for the retry proof: the platform held 50 PTS and refunded 50 PTS after the responder-side process error, returning the Caller balance to 200.
- Residual billing cleanup risk: `req_t406_retry4_20260614T062857Z` has `BILLING_HELD`, `TASK_TOKEN_ISSUED`, and `DELIVERY_META_ISSUED` events but no terminal event at the time of capture. Its 50 PTS hold remains visible in the retry Caller ledger, so it needs either automatic timeout/refund confirmation or operator cleanup.
- Live residual recheck on 2026-06-14: production API still reports only `BILLING_HELD`, `TASK_TOKEN_ISSUED`, and `DELIVERY_META_ISSUED` for `req_t406_retry4_20260614T062857Z`; the retry Caller balance reports `credit_balance_cents: 100` and `pending_credit_cents: 0`; the ledger still contains a retry4 `-50` row. This narrows the follow-up from "pending hold cleanup" to "request terminalization and billing/event consistency."
- Public docs hardening after the finding: brand-site commit `d0f50ede1099c9abd01a56a5202c123230c6f4d4` adds `--cwd "$PWD"` to Chinese and English Responder process adapter examples wherever `--cmd "node ./my-tool/index.js"` uses a relative path, plus explanatory restart-durability copy. The content smoke now asserts `--cwd "$PWD"`.
- Public deployment after hardening: deployed current brand-site dist to Aliyun `/var/www/html` after backup `/home/admin/site-backups/html.20260614T083652Z.tgz`, preserving `/boids*`. Public verification with `deploycheck=20260614T083652Z` passed for Chinese and English Responder `--cwd "$PWD"` markers, Chinese and English Caller `delexec-ops call-hotline` markers, `/healthz`, `/platform/healthz`, `/relay/healthz`, and `/marketplace/hotlines`.

## Follow-Ups

- `repos/client`: consider warning when a process Hotline command is relative without an explicit cwd.
- `repos/client`: improve `delexec-ops call-hotline` error reporting so early local runtime failures identify the failed stage instead of only `[delexec-ops] fetch failed`.
- `repos/platform`: ensure abandoned task-token holds such as `req_t406_retry4_20260614T062857Z` reach a terminal request state and keep billing balance, ledger, and event history consistent.
