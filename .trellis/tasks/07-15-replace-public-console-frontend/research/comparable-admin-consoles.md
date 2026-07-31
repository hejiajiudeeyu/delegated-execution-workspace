# Comparable Admin Console Research

## Research question

Which patterns from Sub2API-like management consoles should inform a complete rewrite of the CALL ANYTHING public Console, without copying another product's brand or inventing unsupported backend capabilities?

## 1. Sub2API

Primary sources:

* https://github.com/Wei-Shaw/sub2api
* https://github.com/Wei-Shaw/sub2api/blob/main/frontend/src/router/index.ts
* https://github.com/Wei-Shaw/sub2api/blob/main/frontend/src/components/layout/AppSidebar.vue
* https://github.com/Wei-Shaw/sub2api/blob/main/frontend/src/components/layout/TablePageLayout.vue
* https://github.com/Wei-Shaw/sub2api/blob/main/frontend/src/views/admin/DashboardView.vue
* https://github.com/Wei-Shaw/sub2api/blob/main/frontend/src/views/admin/UsersView.vue

Observed patterns:

* One web application contains separate public, authenticated user, and admin route families; route metadata and guards enforce role and feature access.
* Admin navigation is resource-oriented: dashboard, operations monitoring, users, groups, channels, subscriptions, upstream accounts, announcements, proxies, risk control, usage, payments, and settings.
* Navigation supports nested groups, feature flags, a reduced/simple mode, and custom menu items.
* The dashboard starts with compact core-stat cards and then moves into trends/distributions.
* Management pages use a consistent workbench: fixed actions, fixed search/filter controls, scrollable data table, fixed pagination, explicit empty state, and modal or detail workflows for resource actions.
* Setup and authentication are first-class route families rather than ad-hoc popovers.

Why the patterns exist:

* Resource-oriented navigation matches repeated CRUD/operations work across many entity types.
* Fixed filters/actions/pagination keep high-volume tables operable without losing context.
* Separate user/admin routes let one deployment serve both audiences while still preserving role boundaries.
* Feature-gated navigation prevents operators from seeing pages that cannot work in the current deployment mode.

What maps well here:

* A stable operator shell with resource workbenches for Reviews, Directory, Activity, and Billing.
* Standard table/list mechanics and persistent filters/actions.
* First-class setup/readiness routes and a global environment/session indicator.
* Explicit role/feature access if this project intentionally chooses a unified multi-role Console.

What should not be copied:

* Sub2API's many metric cards and charts depend on mature usage/monitoring APIs that the current platform Console does not have.
* Its very large sidebar component and broad route tree reflect a much wider product; cloning the taxonomy would create empty navigation and frontend-only promises.
* Its visual style, rounded card treatment, dark theme, labels, and branding are not design references for CALL ANYTHING.

## 2. Grafana

Primary sources:

* https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v9-5/
* https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/
* https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/

Observed patterns:

* Related tools are grouped in navigation; a shared header, breadcrumbs, search, and command palette reduce sidebar hunting.
* Summary dashboards and investigative Explore views are separate but deeply linked.
* Filters and investigation context are represented in URLs so views can be shared and revisited.
* Permissions determine not only action availability but which resource scopes users can access.

Mapping here:

* Keep a small number of top-level jobs, then drill from attention summaries to focused resource/detail views.
* Encode safe filters/selected records in routes so operator evidence can be linked and revisited.
* Treat global search/command palette as a future extension until cross-resource query support is real.

## 3. Stripe Dashboard

Primary sources:

* https://docs.stripe.com/dashboard/basics
* https://docs.stripe.com/dashboard/search
* https://docs.stripe.com/stripe-apps/deep-links

Observed patterns:

* Primary navigation follows business resources while Home summarizes operational/business performance.
* Global search is a major navigation path across customers, payments, invoices, payouts, and products.
* Deep links reduce navigation steps and preserve resource context.

Mapping here:

* Responder, Hotline, Request, and billing tenant IDs should be linkable/copyable resources with consistent detail routes.
* A future global resource search could be valuable, but the current APIs do not yet provide a trustworthy cross-resource search surface.

## Common conventions

Across the three products, the strongest reusable conventions are:

1. A persistent shell that exposes environment/identity/readiness globally.
2. Navigation organized around stable operator jobs or resources, not raw endpoints.
3. Dashboard as an attention/triage surface, not a duplicate of every management page.
4. List/table workbenches with filters, pagination, bulk or row actions, and explicit states.
5. Linkable resource details and preserved investigation context.
6. Role/permission/feature gates that change visible affordances rather than failing late.

## Feasible approaches for this project

### Approach A — Operator cockpit + resource workbenches (recommended)

* Keep the first release operator/admin-only.
* Use a compact cockpit for readiness and attention queues.
* Use stable workbenches for Reviews, Directory, Activity, Billing, and System.
* Merge routes where the operator job is shared; use detail drawers/routes rather than a separate page for every endpoint.

Pros: fits existing APIs and security model; captures the best Sub2API mechanics; rewrite scope is controllable.

Cons: does not deliver Caller/Responder self-service in the same release.

### Approach B — Unified role-aware Console

* One shell and codebase contains operator, Caller, and Responder areas, with role-aware route groups similar to Sub2API's user/admin split.

Pros: one public product entry and long-term coherence.

Cons: scope expands across `repos/platform` and `repos/client`; authentication and product roles are not yet one coherent contract; high risk of recreating the old design's role ambiguity.

### Approach C — Task-first operations center

* Primary navigation is queues and goals—Setup, Needs Attention, Publish, Money, Incidents—with resources accessed mostly through search/drilldown.

Pros: strong next-action orientation and less endpoint-shaped navigation.

Cons: requires stronger aggregate/search APIs than currently exist; can obscure stable resource management tasks.

## Recommendation

Start with Approach A and design extension seams for a later role-aware outer shell. Borrow Sub2API's resource-workbench mechanics, Grafana's triage-to-investigation links, and Stripe's linkable resource context, while keeping CALL ANYTHING's own visual and content contract.
