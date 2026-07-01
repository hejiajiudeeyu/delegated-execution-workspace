# Directory Structure

## Scope

@delexec/caller-controller-core is a caller controller logic package under `repos/client/packages/caller-controller-core`.

- This package belongs to the client truth source. Keep end-user `delexec-ops`, local supervisor, local persistence, transport wiring, and client console behavior here.

## Layout

- Runtime source is intentionally small and package-local, usually `repos/client/packages/caller-controller-core/src/index.js` or `repos/client/packages/caller-controller-core/src/server.js`.
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

- Use repos/client/packages/caller-controller-core/src/index.js as a current reference.
- Use repos/client/tests/unit/caller-core-logic.test.js as a current reference.
- Use repos/client/tests/integration/caller-controller.integration.test.js as a current reference.
