# Directory Structure

## Scope

@delexec/platform-console is a platform operator console React app under `repos/platform/apps/platform-console`.

- This package belongs to the platform truth source. Keep platform API, relay, console gateway, compose/image/deploy behavior, operator docs, and persistence here.

## Layout

- React entrypoints live under `repos/platform/apps/platform-console/src/main.tsx` and `repos/platform/apps/platform-console/src/App.tsx` when this package is a console/site app.
- Page-level screens live under `repos/platform/apps/platform-console/src/pages/` or `repos/platform/apps/platform-console/src/app/pages/`.
- Reusable UI components live under `repos/platform/apps/platform-console/src/components/` or `repos/platform/apps/platform-console/src/design-system/`.
- Shared browser helpers live under `repos/platform/apps/platform-console/src/lib/`, `src/hooks/`, and `src/styles/`.

## Module Boundaries

- Do not move business truth into the fourth repository. Cross-repo SHA movement is recorded by change bundles under `changes/`.
- Do not duplicate code between `repos/protocol`, `repos/client`, and `repos/platform`; import the released/workspace package that owns the behavior.
- Keep files narrow: routing/server setup can live in `server.js`, while reusable validation, config, transport, and store helpers should stay in package modules.

## Naming

- Existing runtime files use JavaScript `.js`; console/site UI uses TypeScript React `.tsx` for components and `.ts` for browser helpers.
- Use lowercase kebab-case directories for apps and packages. Preserve package names already present in `package.json`.
- Keep test filenames descriptive, for example `ops-console.catalog.test.tsx` or `platform-api-billing.integration.test.js`.

## Current References

- Use repos/platform/apps/platform-console/src/App.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/components/layout/AppShell.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/pages/BillingPage.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/lib/api.ts as a current reference.
