# Directory Structure

## Scope

delegated-execution-platform-selfhost is a platform repository umbrella under `repos/platform`.

- This package belongs to the platform truth source. Keep platform API, relay, console gateway, compose/image/deploy behavior, operator docs, and persistence here.

## Layout

- Runtime source is intentionally small and package-local, usually `repos/platform/src/index.js` or `repos/platform/src/server.js`.
- HTTP apps expose their route wiring from `src/server.js`; package libraries expose public helpers from `src/index.js`.
- Tests live in the owning repository's top-level `tests/unit`, `tests/integration`, `tests/e2e`, or `tests/smoke` directories, not beside generated Trellis spec files.
- Keep docs and release-surface updates in `docs/current/` when externally visible behavior changes.

## Module Boundaries

- Do not move business truth into the fourth repository. Cross-repo SHA movement is recorded by change bundles under `changes/`.
- Do not duplicate code between `repos/protocol`, `repos/client`, and `repos/platform`; import the released/workspace package that owns the behavior.
- Keep files narrow: routing/server setup can live in `server.js`, while reusable validation, config, transport, and store helpers should stay in package modules.

## Naming

- Existing runtime files use JavaScript `.js`; console/site UI uses TypeScript React `.tsx` for components and `.ts` for browser helpers.
- Use lowercase kebab-case directories for apps and packages. Preserve package names already present in `package.json`.
- Keep test filenames descriptive, for example `ops-console.catalog.test.tsx` or `platform-api-billing.integration.test.js`.

## Current References

- Use repos/platform/apps/platform-api/src/server.js as a current reference.
- Use repos/platform/apps/platform-console/src/App.tsx as a current reference.
- Use repos/platform/apps/transport-relay/src/server.js as a current reference.
- Use repos/platform/tests/integration/platform-api.integration.test.js as a current reference.
