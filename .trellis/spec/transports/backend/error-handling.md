# Backend Error Handling

## Scope

Transport and runtime packages should return explicit failures that callers can classify. Protocol-facing errors must use contract error codes when the failure crosses repository boundaries.

## Patterns

- Validate input before side effects.
- Preserve stage-specific error codes in CLI and integration flows, for example token, delivery-meta, dispatch, poll, or result stages.
- Use structured contract errors for API responses and non-retryable validation failures.
- Keep retryability intentional: transport timeouts and rate limits may be retryable; malformed input and binding mismatches are not.

## Forbidden Patterns

- Do not collapse all adapter failures into generic `Error: failed` messages.
- Do not leak tokens, API keys, payload secrets, or env-derived credentials in error text.
- Do not convert protocol validation errors into successful fallback behavior.

## Examples

- `repos/client/apps/ops/src/cli.js` preserves stage-specific call-hotline errors.
- `repos/platform/apps/platform-api/src/server.js` uses structured JSON error responses.
- `repos/protocol/packages/contracts/src/index.js` owns the error registry and retryability metadata.
