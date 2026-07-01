# Type Safety

## Scope

This project currently mixes JavaScript runtime packages with TypeScript React console/site code. Type safety is enforced through package boundaries, exported constants, runtime validators, tests, and TypeScript in UI apps.

## Conventions

- Protocol enums, error registries, validators, and canonicalization helpers live in `repos/protocol/packages/contracts/src/index.js` and should be reused by client/platform code.
- UI apps use TypeScript for components and helpers. Keep API response shapes local and explicit near `src/lib/api.ts` unless they belong in protocol contracts.
- Runtime services use JavaScript with runtime validation. Validate JSON bodies, env-derived values, CLI args, billing inputs, and delivery metadata before use.
- Prefer exported constants/Object.freeze registries for shared string domains such as statuses, pricing models, trust tiers, and billing events.

## Validation

- Use protocol validation helpers for request/result/delivery/billing semantics instead of re-implementing partial checks in consumers.
- Use structured error builders from contracts when returning API errors.
- Parse JSON in one place per boundary and report invalid JSON distinctly from unsupported business values.
- Keep tests covering both good cases and error matrix cases.

## Forbidden Patterns

- Do not use ad hoc strings for protocol status/error domains when an exported constant exists.
- Do not cast unknown API responses straight into UI state without status and parse-error handling.
- Do not let client or platform introduce new protocol semantics before the protocol package and docs are updated.
- Do not use `any` as a shortcut in TypeScript UI code when a local type or narrow helper can describe the response.

## Current References

- Use repos/client/apps/ops-console/src/App.tsx as a current reference.
- Use repos/client/apps/ops-console/src/components/layout/AppShell.tsx as a current reference.
- Use repos/client/apps/ops-console/src/pages/caller/CatalogPage.tsx as a current reference.
- Use repos/client/apps/ops-console/src/lib/api.ts as a current reference.
