# Paid-Call CLI Contract

## Scenario: Public `delexec-ops call-hotline`

### 1. Scope / Trigger

- Trigger: any change to the public paid Caller flow in `repos/client/apps/ops/src/cli.js`.
- Reason: this command crosses CLI input, Platform billing/token APIs, caller-controller dispatch, relay-backed result delivery, and evidence reporting. Treat it as a cross-layer contract, not just a convenience wrapper.

### 2. Signatures

- Direct command: `delexec-ops call-hotline --platform <url> --hotline-id <id> --responder-id <id> [--text <text> | --payload-json <json>] [--request-id <id>] [--max-charge-cents <amount>] [--currency <code>] [--trust-tier <tier>] [--relay <url>] [--caller-base-url <url>] [--timeout-ms <ms>] [--poll-interval-ms <ms>]`
- Logical-service command: `delexec-ops call-hotline --platform <url> (--service-id <id> | --capability <capability>) [--task-type <type>] [--text <text> | --payload-json <json>] [--request-id <id>] [--max-charge-cents <amount>] [--currency <code>] [--trust-tier <tier>] [--relay <url>] [--caller-base-url <url>] [--timeout-ms <ms>] [--poll-interval-ms <ms>]`
- Required args: `--platform` plus either concrete `--hotline-id` + `--responder-id` or logical `--service-id` / `--capability`.
- Caller API key sources: existing ops state/secrets, `CALLER_PLATFORM_API_KEY`, or `PLATFORM_API_KEY`.

### 3. Contracts

- Platform token request: `POST /v1/tokens/task` with `request_id`, `responder_id`, `hotline_id`, and `billing`.
- Platform service resolve request: `POST /v1/service-resolutions` with `request_id`, `service_id` or `capability`, optional `task_type`, `billing`, and `result_delivery`; use this only when the caller selected logical service mode.
- Billing body: `acknowledged: true`, `pricing_model: "fixed_price"`, `currency`, `max_charge_cents`, `trust_tier`.
- Delivery metadata request: `POST /v1/requests/:request_id/delivery-meta` with `responder_id`, `hotline_id`, `task_token`, and `result_delivery`.
- Result delivery: `{ "kind": "relay_http", "address": "local://relay/caller-controller/:request_id" }`.
- Caller-controller create: `POST /controller/requests` with token, delivery metadata, result delivery, expected signer public key, and payload/task input.
- Caller-controller dispatch: `POST /controller/requests/:request_id/dispatch`; do not hand-roll relay send in the CLI.
- Polling: call `/controller/inbox/pull` before reading `/controller/requests/:request_id/result`.
- Evidence output must include request id, token claims or token presence, delivery metadata, dispatch envelope, inbox/result, events, balance, and ledger. It must not print Caller API keys.

### 4. Validation & Error Matrix

- Missing `--platform` -> `platform_required`.
- Missing both a concrete pair and a logical service selector -> `hotline_id_and_responder_id_or_service_id_or_capability_required`.
- Missing Caller key -> `caller_platform_api_key_required`.
- Invalid JSON payload -> `payload_json_invalid` or `payload_json_must_be_object`.
- Unsupported trust tier -> `trust_tier_unsupported`.
- Non-positive timeout/poll values -> `timeout_ms_must_be_positive_integer` or `poll_interval_ms_must_be_positive_integer`.
- Non-2xx upstream responses -> preserve the stage in the thrown error code, for example `CALL_HOTLINE_TOKEN_FAILED`.

### 5. Good/Base/Bad Cases

- Good: registered Caller with enough balance calls a public paid Hotline and receives result plus balance/ledger/events evidence.
- Base: `--text` builds payload `{ "text": "<value>" }`; `--payload-json` accepts an object for structured input.
- Bad: command output contains raw API keys or bypasses caller-controller dispatch/polling.

### 6. Tests Required

- Integration test for the full wrapper path with fake Platform and fake caller-controller servers.
- Assertions must cover billing consent, path-prefix preservation, result delivery address, caller-controller create/dispatch/poll/result order, evidence shape, and secret redaction.
- Help output must include `delexec-ops call-hotline`.
- Package checks must pass after version changes.

### 7. Wrong vs Correct

#### Wrong

Calling `/v1/messages/send` directly from the CLI and then querying Platform evidence. This bypasses caller-controller result validation and billing settlement hooks.

#### Correct

Use Platform only for token, delivery metadata, and evidence reads; use caller-controller for local request creation, dispatch, inbox pull, and signed result retrieval.
