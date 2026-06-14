# T-405 Public Paid Call CLI

## Goal

Add a public `@delexec/ops` CLI wrapper for the paid public relay call path introduced by T-404. The command should replace the long public-doc curl chain for Caller users by handling paid task-token issuance, delivery metadata, relay dispatch, caller inbox polling, signed result retrieval, and evidence output from one CLI entrypoint.

## What I Already Know

* T-404 deployed public docs that explain the low-level flow, but the Caller path is still too manual.
* Existing client APIs already support most of the needed work:
  * `delexec-ops auth register --platform ...` stores the Caller API key.
  * Supervisor exposes `POST /requests`, but `caller-controller-core` `issueTaskToken` currently does not forward billing consent, so that route is not enough for paid calls.
  * Caller controller exposes lower-level endpoints: `POST /controller/requests`, `POST /controller/requests/:id/dispatch`, `POST /controller/inbox/pull`, and `GET /controller/requests/:id/result`.
  * Platform exposes `/v1/tokens/task`, `/v1/requests/:id/delivery-meta`, `/v1/tenants/me/balance`, `/v1/tenants/me/ledger`, and `/v1/requests/:id/events`.
* Owning repo is `repos/client`; root repo only records the submodule SHA and bundle.

## Proposed CLI

`delexec-ops call-hotline`

Required arguments:

* `--platform <url>`
* `--hotline-id <id>`
* `--responder-id <id>`

Common optional arguments:

* `--text <text>`: convenience payload `{ text }`.
* `--payload-json <json>`: explicit payload object.
* `--request-id <id>`: otherwise generated.
* `--max-charge-cents <amount>`: default `500`.
* `--currency <code>`: default `PTS`.
* `--trust-tier <tier>`: default `untrusted`.
* `--relay <url>`: default derived from public site for `callanything.xyz/platform` or from env `TRANSPORT_BASE_URL`.
* `--caller-base-url <url>`: default `http://127.0.0.1:${OPS_PORT_CALLER || 8081}`.
* `--timeout-ms <ms>` and `--poll-interval-ms <ms>` for result polling.

Behavior:

1. Read the Caller API key from the existing ops state/secrets or `CALLER_PLATFORM_API_KEY` / `PLATFORM_API_KEY`.
2. Request a task token from `/v1/tokens/task` with billing consent.
3. Request delivery metadata from `/v1/requests/:id/delivery-meta` with result delivery `local://relay/caller-controller/:request_id`.
4. Create a local caller-controller request with expected signer binding and delivery metadata.
5. Dispatch through caller-controller so the relay send path and result validation stay in existing runtime code.
6. Poll caller inbox and local result until signed result is available or timeout.
7. Fetch Platform events, balance, and ledger and return a JSON evidence object.

## Requirements

* Add integration test coverage in `repos/client/tests/integration/ops-cli.integration.test.js`.
* The RED test should fail before implementation because `call-hotline` is not recognized.
* The command must preserve platform URL path prefixes.
* The command must require billing consent via `max_charge_cents`.
* The command must not print API keys or secrets.
* The command must return enough evidence for docs/T-403-style proof:
  * `request_id`
  * `task_token_claims` or billing claims if returned, but not raw API key
  * `delivery_meta`
  * `dispatch.envelope`
  * `result`
  * `events`
  * `balance`
  * `ledger`

## Acceptance Criteria

* [ ] Targeted RED/green ops CLI integration test covers paid call wrapper.
* [ ] `delexec-ops --help` includes `call-hotline`.
* [ ] Full `tests/integration/ops-cli.integration.test.js` passes.
* [ ] `npm test` and `npm run test:packages` pass in `repos/client`.
* [ ] If package version changes, update `@delexec/ops` version and package lock consistently.
* [ ] Root change bundle records new client SHA and required gates pass.

## Out of Scope

* Changing protocol fields or Platform APIs.
* Building the operator console UI.
* Publishing a new npm package unless required by the release workflow later.
* Re-running a production paid-call rehearsal in this task.

## Technical Notes

* T-404 docs card: `docs/planning/first-real-call/40-wave4-public-exposure/T-404-public-docs-onboarding.md`.
* Relevant client files:
  * `repos/client/apps/ops/src/cli.js`
  * `repos/client/apps/ops/src/supervisor.js`
  * `repos/client/packages/caller-controller-core/src/index.js`
  * `repos/client/tests/integration/ops-cli.integration.test.js`
