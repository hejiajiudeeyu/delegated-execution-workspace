# Directory Structure

## Scope

@delexec/ops-console is a client operator console React app under `repos/client/apps/ops-console`.

- This package belongs to the client truth source. Keep end-user `delexec-ops`, local supervisor, local persistence, transport wiring, and client console behavior here.

## Layout

- React entrypoints live under `repos/client/apps/ops-console/src/main.tsx` and `repos/client/apps/ops-console/src/App.tsx` when this package is a console/site app.
- Page-level screens live under `repos/client/apps/ops-console/src/pages/` or `repos/client/apps/ops-console/src/app/pages/`.
- Reusable UI components live under `repos/client/apps/ops-console/src/components/` or `repos/client/apps/ops-console/src/design-system/`.
- Shared browser helpers live under `repos/client/apps/ops-console/src/lib/`, `src/hooks/`, and `src/styles/`.

## Module Boundaries

- Do not move business truth into the fourth repository. Cross-repo SHA movement is recorded by change bundles under `changes/`.
- Do not duplicate code between `repos/protocol`, `repos/client`, and `repos/platform`; import the released/workspace package that owns the behavior.
- Keep files narrow: routing/server setup can live in `server.js`, while reusable validation, config, transport, and store helpers should stay in package modules.

## Naming

- Existing runtime files use JavaScript `.js`; console/site UI uses TypeScript React `.tsx` for components and `.ts` for browser helpers.
- Use lowercase kebab-case directories for apps and packages. Preserve package names already present in `package.json`.
- Keep test filenames descriptive, for example `ops-console.catalog.test.tsx` or `platform-api-billing.integration.test.js`.

## Current References

- Use repos/client/apps/ops-console/src/App.tsx as a current reference.
- Use repos/client/apps/ops-console/src/components/layout/AppShell.tsx as a current reference.
- Use repos/client/apps/ops-console/src/pages/caller/CatalogPage.tsx as a current reference.
- Use repos/client/apps/ops-console/src/lib/api.ts as a current reference.
