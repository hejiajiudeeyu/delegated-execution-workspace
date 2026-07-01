# Database Guidelines

## Scope

Persistence is owned by package-specific stores: SQLite for client/local state, billing store for platform billing state, and Postgres snapshot store for platform persistence.

## Patterns

- Keep schema and query logic inside the store package that owns it.
- Validate data before writing. Do not let HTTP handlers write unvalidated JSON directly into durable stores.
- Tests should cover both in-memory/unit paths and integration paths that exercise the store through public package APIs.
- Migrations or compatibility changes must be documented with the CLI/operator behavior that depends on them.

## Forbidden Patterns

- Do not create a new persistence truth source in the fourth repository.
- Do not make protocol packages depend on concrete client/platform database packages.
- Do not silently drop unknown state during migration; either preserve it or document the intentional removal.

## Examples

- `repos/client/packages/sqlite-store/src/index.js` owns local SQLite-backed state helpers.
- `repos/platform/packages/billing-store/src/index.js` owns platform billing state.
- `repos/platform/packages/postgres-store/src/index.js` owns Postgres snapshot persistence.
