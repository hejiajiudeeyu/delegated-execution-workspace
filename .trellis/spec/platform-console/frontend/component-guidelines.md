# Component Guidelines

## Scope

@delexec/platform-console has React UI surfaces. Build components from existing page/layout/ui primitives and keep user workflows directly usable.

## Patterns

- Keep page containers in `src/pages` or `src/app/pages`; keep shell/navigation pieces in `src/components/layout` or `src/design-system/shells`.
- Reuse the local `components/ui` primitives and CSS token files before adding new visual primitives.
- Components should accept plain typed props, keep side effects in hooks or submit handlers, and render explicit loading/error/empty states.
- Dashboard and console screens should be dense, operational, and scannable. Avoid marketing-style hero layouts inside console surfaces.

## Styling and Accessibility

- Use existing Tailwind/CSS token files such as `src/styles/theme.css`, `console-tokens.css`, or brand design-system tokens.
- Prefer semantic buttons, labels, tables, tabs, switches, dialogs, and status badges already present in `components/ui`.
- Preserve keyboard and screen-reader behavior inherited from Radix-style primitives; do not replace them with custom div-click handlers.

## Common Mistakes

- Do not copy component code between client and platform consoles. If a pattern repeats, first decide which repository owns it and whether a shared package already exists.
- Do not add presentation-only behavior to `repos/protocol`; protocol docs can describe UI consequences but must not implement them.
- Do not add a fourth-repo component as a new source of truth for business behavior.

## Current References

- Use repos/platform/apps/platform-console/src/App.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/components/layout/AppShell.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/pages/BillingPage.tsx as a current reference.
- Use repos/platform/apps/platform-console/src/lib/api.ts as a current reference.
