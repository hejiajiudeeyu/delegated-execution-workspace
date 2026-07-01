# Hook Guidelines

## Scope

@delexec/platform-console may use React hooks for console/site state, auth/session context, polling, and browser effects.

## Patterns

- Name custom hooks with `use*` and keep them under `src/hooks` when shared across pages.
- Hooks that depend on context should fail fast with explicit provider errors, following `useAuth must be used within AuthProvider`-style checks.
- Polling hooks should centralize interval and cleanup behavior instead of duplicating `setInterval` logic in pages.
- Data fetching currently uses local API wrappers around `fetch`; keep response parsing and status handling in `src/lib/api.ts`.

## Data Fetching and Side Effects

- Put network calls behind package-local API helpers and have pages/components call those helpers.
- Keep URL query-param behavior near page-level components when it drives navigation or initial selection.
- Always handle loading, non-2xx, JSON parse failures, and empty responses in the UI path.

## Common Mistakes

- Do not call hooks conditionally or from non-React package code.
- Do not scatter duplicate polling/session logic across many pages; create or reuse a hook/helper.
- Do not let hooks print secrets, API keys, or full env-derived values in errors.

## Current References

- Use repos/platform/apps/platform-console/src/App.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/components/layout/AppShell.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/pages/BillingPage.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/lib/api.ts as a current reference.
