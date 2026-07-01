# Directory Structure

## Scope

call-anything-brand-site is a brand React/Vite site under `repos/brand-site`.

- This package owns the public brand/site surface, design system patterns, SEO pages, prerender output, and content smoke checks.

## Layout

- React entrypoints live under `repos/brand-site/src/main.tsx` and `repos/brand-site/src/App.tsx` when this package is a console/site app.
- Page-level screens live under `repos/brand-site/src/pages/` or `repos/brand-site/src/app/pages/`.
- Reusable UI components live under `repos/brand-site/src/components/` or `repos/brand-site/src/design-system/`.
- Shared browser helpers live under `repos/brand-site/src/lib/`, `src/hooks/`, and `src/styles/`.

## Module Boundaries

- Do not move business truth into the fourth repository. Cross-repo SHA movement is recorded by change bundles under `changes/`.
- Do not duplicate code between `repos/protocol`, `repos/client`, and `repos/platform`; import the released/workspace package that owns the behavior.
- Keep files narrow: routing/server setup can live in `server.js`, while reusable validation, config, transport, and store helpers should stay in package modules.

## Naming

- Existing runtime files use JavaScript `.js`; console/site UI uses TypeScript React `.tsx` for components and `.ts` for browser helpers.
- Use lowercase kebab-case directories for apps and packages. Preserve package names already present in `package.json`.
- Keep test filenames descriptive, for example `ops-console.catalog.test.tsx` or `platform-api-billing.integration.test.js`.

## Current References

- Use repos/brand-site/src/app/routes.tsx as a current reference.
- Use repos/brand-site/src/app/components/brand-scaffold.tsx as a current reference.
- Use repos/brand-site/src/design-system/patterns/homepage-hero.tsx as a current reference.
- Use repos/brand-site/src/styles/theme.css as a current reference.
