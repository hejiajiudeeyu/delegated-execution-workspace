# Platform Service Resolution

## Scenario: Platform-side service resolution

### 1. Scope / Trigger
- Trigger: callers need to request a logical service or capability while Platform chooses the concrete `responder_id + hotline_id`.
- Business truth lives in `repos/protocol`, `repos/platform`, and `repos/client`; the fourth repo only records this implementation contract.

### 2. Signatures
- Platform API: `POST /v1/service-resolutions`
- Client API: `platformClient.resolveService({ requestId, serviceId, capability, taskType, constraints, resultDelivery })`

### 3. Contracts
- Request requires `request_id` plus at least one of `service_id` or `capability`.
- Optional request fields: `task_type`, `constraints`, `result_delivery`.
- Catalog entries may expose optional `service_id`; `hotline_id` remains the concrete unique catalog key.
- Response returns `selected.responder_id`, `selected.hotline_id`, `task_token`, `claims`, and `delivery_meta`.
- `claims.responder_id`, `claims.hotline_id`, `delivery_meta.responder_id`, and `delivery_meta.hotline_id` must match the selected concrete candidate.
- User/operator entrypoints must expose the logical binding and call path:
  responder add-hotline/attach-project flows can set `service_id`, catalog surfaces display it, and caller flows can request service resolution by `service_id` or `capability`.

### 4. Validation & Error Matrix
- Missing `request_id` -> `CONTRACT_INVALID_SERVICE_RESOLUTION_REQUEST`, non-retryable.
- Missing both `service_id` and `capability` -> `CONTRACT_INVALID_SERVICE_RESOLUTION_REQUEST`, non-retryable.
- Unsupported `result_delivery` -> existing delivery validation error; do not bind request state first.
- No public enabled healthy candidate -> `CATALOG_SERVICE_NOT_FOUND`, non-retryable.
- Existing request binding mismatch -> existing `REQUEST_BINDING_MISMATCH`.

### 5. Good/Base/Bad Cases
- Good: multiple hotlines share one `service_id`; Platform filters to public healthy candidates and returns a deterministic concrete hotline.
- Base: direct callers still pass `responder_id + hotline_id` and skip service resolution.
- Bad: backend supports service resolution but CLI/Console only expose concrete responder/hotline calls.
- Bad: a caller asks for `service_id` and local fallback silently dispatches to the first unrelated hotline.

### 6. Tests Required
- Protocol unit tests validate request/response helpers and error codes.
- Platform integration tests assert selected concrete bindings, token claims, delivery metadata, no-candidate errors, and invalid delivery atomic failure.
- Caller-controller integration tests assert both prepare and remote dispatch work through service resolution while direct concrete dispatch remains compatible.
- Fourth-repo checks required before completion: `check:submodules`, `check:boundaries`, `check:bundles`, `test:contracts`, `test:integration`.

### 7. Wrong vs Correct

#### Wrong
Resolve `service_id` in the caller by listing catalog entries and picking one locally.

#### Correct
Call `POST /v1/service-resolutions`, let Platform choose the concrete hotline, then dispatch with the resolved `responder_id + hotline_id`.
