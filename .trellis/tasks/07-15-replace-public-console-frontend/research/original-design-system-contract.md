# Original Design System Contract for the Console Rewrite

## Sources inspected

* `repos/brand-site/docs/console-content-spec.md`
* `repos/brand-site/src/styles/delexec-console-tokens.css`
* `repos/brand-site/src/styles/console-mode.css`
* `repos/brand-site/src/design-system/shells/console-shell.tsx`
* `repos/brand-site/src/design-system/patterns/console-page-*.tsx`
* `repos/brand-site/src/design-system/{README.md,patterns/README.md}`

## Non-negotiable design principles to retain

1. **Content truth over prototype composition.** Prototype placeholder text and page shapes are not business truth. Every region must answer: why it exists, what operation/observation it serves, and where its data comes from.
2. **Operational density and scanability.** This is a management surface, not a marketing page. Use compact geometry, stable alignment, high information signal, and restrained decoration.
3. **Human-first summaries.** Translate status and workflow meaning for the operator. IDs and raw payloads remain available for support/debugging but are secondary and collapsed by default.
4. **State honesty.** Loading, unreachable/error, empty success, blocked/permission, stale/unknown, and populated success must be visibly distinct. A failed request must never masquerade as an empty list.
5. **Action locality.** Result feedback belongs beside the action that caused it; destructive or financially meaningful operations need deliberate confirmation and durable evidence.
6. **Canonical semantics.** Reuse defined status language and semantic colors. Do not invent new status terms or ad-hoc green/yellow/red meanings per page.
7. **Persistent next action.** A useful Console should continuously tell the operator what requires attention or what they can do next; onboarding guidance must not collapse into a one-time decorative tour.
8. **Real data only.** Do not create KPI cards, trend charts, QPS/SLA figures, or health claims without an actual data pipeline.

## Visual language to retain

* Brand palette remains semantic: green/protocol, blue/client, teal/caller, orange/responder, purple/platform, yellow/self-host, with canonical success/warn/info/error/degraded tokens.
* Neutral paper/ink surfaces anchor long reading and data tables.
* Console geometry is compact: 4px base radius, 2px small radius, 8px large radius; pill radius is reserved for true pills.
* Space Grotesk / IBM Plex Sans-style sans and IBM Plex Mono / JetBrains Mono-style monospace are the canonical direction.
* Light-brutalist ink borders and hard shadows are signature accents for selected navigation, primary actions, and a few focal elements—not a treatment for every card.
* Decorative brand backdrop is optional and must remain extremely faint or off on data-heavy pages. The token file favors solid neutral surfaces while `console-mode.css` permits a faint pattern; readability takes precedence.

## What must not be copied blindly

* The `general / caller / responder` sidebar grouping in the original `ConsoleShell` describes a local multi-role ops-console, not automatically the public platform-operator Console.
* The five-step Caller onboarding flow and its exact routes are role-specific content contracts, not a platform-admin IA.
* Existing prototype page patterns are examples of composition, not mandatory route boundaries.
* The old 224px sidebar + `max-w-6xl` canvas is an implementation choice, not a design principle.
* Marketing-site poster backdrops are not appropriate at marketing intensity inside an operator Console.

## Mapping to the rewrite

The replacement should inherit tokens, semantic status behavior, copy discipline, state honesty, and density. It may replace the shell, navigation hierarchy, page composition, component boundaries, and interaction patterns. Visual continuity should come from shared principles and tokens, not from keeping the old DOM structure.
