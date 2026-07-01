# State Management

## Scope

@delexec/sqlite-store manages runtime, request, store, transport, or protocol state outside React. State should be explicit, serializable where possible, and owned by the package that persists or serves it.

## Categories

- Protocol constants and validation rules live in `repos/protocol/packages/contracts/src/index.js`.
- Client local state, secrets, and supervisor session files are managed by `@delexec/ops`, `@delexec/runtime-utils`, and `@delexec/sqlite-store`.
- Platform catalog/request/billing/persistence state is owned by platform API and store packages.
- Transport state should stay adapter-local and testable.

## Required Rules

- Validate external inputs before mutating durable state.
- Preserve direct caller/responder/hotline paths when adding logical service or capability flows.
- Keep migrations, docs, tests, and CLI/console copy aligned when local or persisted state changes.
- Treat submodule SHA movement as fourth-repo ledger state; it requires a matching change bundle.

## Common Mistakes

- Do not use the fourth repo to persist business runtime state.
- Do not derive platform selections in the client when the platform owns the decision, such as service resolution.
- Do not silently coerce malformed persisted values; return explicit structured errors or repair through a documented migration.

## Current References

- Use repos/client/packages/sqlite-store/src/index.js as a current reference.
- Use repos/client/tests/unit/ops-config.test.js as a current reference.
- Use repos/client/tests/integration/ops-supervisor.integration.test.js as a current reference.
