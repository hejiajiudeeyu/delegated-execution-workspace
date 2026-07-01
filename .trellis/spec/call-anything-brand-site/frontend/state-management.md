# State Management

## Scope

call-anything-brand-site uses local React state, context for auth/session concerns, URL state for selected views, and server state loaded through local API helpers.

## Categories

- Local form/filter/dialog state stays in the page or component that owns the interaction.
- Auth/session state belongs in an explicit provider/hook pair, for example `src/hooks/useAuth.tsx`.
- Server state is fetched through `src/lib/api.ts` wrappers and refreshed deliberately.
- URL state is acceptable for selected rows, deep links, and mode-specific screens.

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

- Use repos/brand-site/src/app/routes.tsx as a current reference.
- Use repos/brand-site/src/app/components/brand-scaffold.tsx as a current reference.
- Use repos/brand-site/src/design-system/patterns/homepage-hero.tsx as a current reference.
- Use repos/brand-site/src/styles/theme.css as a current reference.
