# Hook Guidelines

## Scope

@delexec/billing-store is a runtime/service/package area. Avoid React hooks here; use ordinary functions, async helpers, or server factories.

## Patterns

- Use small pure helpers for validation, config resolution, and adapter behavior.
- For long-lived services, return explicit start/stop handles or server instances rather than hiding lifecycle in module top-level state.
- Keep environment loading at app boundaries, not in lower-level protocol or utility packages.

## Data Fetching and Side Effects

- HTTP handlers should parse JSON bodies once, validate before mutation, and return structured JSON errors.
- CLI commands should parse arguments first, validate them, then call reusable helpers.
- Transport adapters should keep external side effects behind explicit function calls that tests can exercise.

## Common Mistakes

- Do not call hooks conditionally or from non-React package code.
- Do not scatter duplicate polling/session logic across many pages; create or reuse a hook/helper.
- Do not let hooks print secrets, API keys, or full env-derived values in errors.

## Current References

- Use repos/platform/packages/billing-store/src/index.js as a current reference.
- Use repos/platform/packages/billing-store/src/errors.js as a current reference.
- Use repos/platform/tests/unit/billing-store.unit.test.js as a current reference.
- Use repos/platform/tests/integration/billing-store.integration.test.js as a current reference.
