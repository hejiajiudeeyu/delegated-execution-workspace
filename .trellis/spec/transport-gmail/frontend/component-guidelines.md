# Component Guidelines

## Scope

@delexec/transport-gmail is not primarily a React component package. Do not invent a component layer here; route UI work to the console/site package that owns the screen.

## Patterns

- Runtime/service packages should expose functions, adapters, or server factories rather than UI components.
- If a package needs a human-facing representation, add it in `ops-console`, `platform-console`, or `call-anything-brand-site` and call this package through its public API.
- Keep DTO shaping close to route/client boundaries; do not create React props or view models inside service packages unless the existing package already does so.

## Styling and Accessibility

- Service and package code should not import browser styling or component libraries.
- API responses should be machine-readable JSON, with human-oriented labels added only by console/site packages.

## Common Mistakes

- Do not copy component code between client and platform consoles. If a pattern repeats, first decide which repository owns it and whether a shared package already exists.
- Do not add presentation-only behavior to `repos/protocol`; protocol docs can describe UI consequences but must not implement them.
- Do not add a fourth-repo component as a new source of truth for business behavior.

## Current References

- Use repos/client/packages/transports/gmail/src/index.js as a current reference.
- Use repos/client/tests/integration/gmail-transport.integration.test.js as a current reference.
