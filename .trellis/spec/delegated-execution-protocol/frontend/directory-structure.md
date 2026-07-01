# Directory Structure

## Scope

delegated-execution-protocol is a protocol truth source under `repos/protocol`.

- This package owns protocol schemas, validators, error registries, canonicalization, signing rules, templates, and protocol docs. Runtime caller/responder/platform behavior belongs outside this repo.

## Layout

- Runtime source is intentionally small and package-local, usually `repos/protocol/src/index.js` or `repos/protocol/src/server.js`.
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

- Use repos/protocol/packages/contracts/src/index.js as a current reference.
- Use repos/protocol/tests/unit/schema-validation.test.js as a current reference.
- Use repos/protocol/tests/unit/error-codes.test.js as a current reference.
- Use repos/protocol/docs/current/spec/platform-api-v0.1.md as a current reference.
