# Console Mode Prototype — Handoff

> **Read first**: [`docs/console-content-spec.md`](./console-content-spec.md). The prototype validates **visual language**; the content spec defines **what each region/widget exists for, what real data feeds it, and what it doesn't show**. If you're about to ask "what should this page show?" — that document is the answer, not this one.
>
> Audience: agents working on `delegated-execution-dev` ops-console / future
> platform-console. This document is the source of truth for what the
> downstream consoles must look like, where the visual specs live, and how
> to mirror the prototype into a real app.
>
> **What this prototype does NOT replace**: real business logic. Mock data
> in `console-page-*.tsx` files are "dumb instances" of the real payload —
> field names and enums match, numbers are illustrative. Never treat the
> prototype as the source of truth for what to render — always cross-check
> the content spec.

## Where the prototype lives

Repo: `call-anything-brand-site` (sibling project, not a submodule).

| Path | Role |
|---|---|
| `src/styles/delexec-console-tokens.css` | **Canonical** console-mode tokens (palette, radius, fonts, status colors). Copy verbatim into each console. |
| `src/styles/console-mode.css` | Activation layer: scopes shadcn variable overrides + accent utilities under `.console-mode`. Copy + adapt as needed. |
| `src/design-system/shells/console-shell.tsx` | Chrome scaffold (Header + Sidebar + Main) and primitives (`ConsolePageHeader`, `ConsoleCard`, `ConsoleButton`). Reusable directly or as reference. |
| `src/design-system/patterns/console-page-*.tsx` | Three reference page implementations (dashboard / calls / access-lists). |
| `src/app/pages/Console/index.tsx` | Hub + react-router setup wiring shell + patterns. |
| Live preview | `npm run dev` then open <http://localhost:5173/console>. |
| Discoverable from | `/playground` → SECTION H · CONSOLE MODE 原型 |

## Visual rules (locked, do not deviate)

| Rule | Value | Token / class |
|---|---|---|
| Page background | paper `#F7F2E8` | `var(--brand-paper)` / `--surface` inside `.console-mode` |
| Card background | `#FFFFFF` (intentional contrast on paper) | `--card` |
| Sidebar background | paper-soft `#FCFAF3` | `--sidebar` |
| Body text | ink `#111111` | `var(--brand-ink)` / `--ink` |
| Muted text | `#5F5A50` | `var(--brand-muted)` |
| Border | `rgba(17,17,17,0.18)` | `--border` |
| Default radius | **4px** | `var(--c-radius)` / `--radius` |
| Small radius | 2px | `var(--c-radius-sm)` |
| Large radius | 8px | `var(--c-radius-lg)` |
| Pill | 999px | `var(--c-radius-pill)` |
| Sans font | Space Grotesk → Avenir → fallback | `var(--c-font)` |
| Mono font | IBM Plex Mono → JetBrains Mono → ui-monospace | `var(--c-font-mono)` |
| Body font size baseline | **14px** | (set on `.console-mode`) |
| Active signature | 1.5px ink border + 2px hard offset shadow + 1px lift | `.c-ink-border` + `.c-shadow-1` + `.c-lift` |
| Primary CTA | brand-green bg + ink border + lift | `<ConsoleButton variant="primary">` |
| Status pill | only `--c-status-{success,warn,info,error,degraded}-{bg,fg}` | `.c-status` + `.c-status-{success|warn|info|error|degraded|neutral}` |
| Role color (caller) | teal `#14B8A6` | `var(--brand-teal)` / `.c-role-caller` |
| Role color (responder) | orange `#F97316` | `var(--brand-orange)` / `.c-role-responder` |
| Role color (platform) | purple `#8B5CF6` | `var(--brand-purple)` / `.c-role-platform` |
| Role color (client) | blue `#3B82F6` | `var(--brand-blue)` / `.c-role-client` |
| Role color (protocol) | green `#A3E635` | `var(--brand-green)` / `.c-role-protocol` |
| Role color (selfhost) | yellow `#FACC15` | `var(--brand-yellow)` / `.c-role-selfhost` |
| Terminal viewport | bg `#111111`, fg `#D9F0E8` | `.c-terminal` |
| Eyebrow / kicker | uppercase tracking 0.12em, with leading bar | `.c-kicker` |
| Backdrop (default `branded`) | brand-site poster pattern at heavily reduced strength: 9-tile color wash @ 8% + repeating `BrandIconShapes` pattern @ 6% | `<ConsoleBackdrop intensity="branded">` (auto-mounted by `<ConsoleShell>`) |
| Backdrop (`subtle`) | pattern only @ ≤4.5%, no color tiles. Use for data-heavy pages | `<ConsoleShell backdrop="subtle">` |
| Backdrop (`off`) | solid paper, no decoration. Use for modals/embeds | `<ConsoleShell backdrop="off">` |
| Header / Sidebar transparency | half-transparent over backdrop; cards stay 100% opaque | `bg-white/70 backdrop-blur-[2px]` (header), sidebar 88% paper-mix |

### What console-mode is NOT

- ❌ full-strength poster backdrop. Console mode KEEPS the brand pattern but reduces strength dramatically (color tiles ≤8%, pattern ≤6%) so JSON / log streams / long lists stay legible. Never paint the homepage backdrop strength inside a console — use `<ConsoleBackdrop>` or `<ConsoleShell backdrop="…">`.
- ❌ shadcn default radius (`0.625rem` ≈ 10px). Console is 4px.
- ❌ pure white page background. It's paper `#F7F2E8`.
- ❌ ad-hoc Tailwind status colors (`bg-amber-50 text-amber-700`, `bg-emerald-500/15`, etc.). Always use `--c-status-*` tokens.
- ❌ heavy brutalist 6-12px borders + 12px shadows on dense interior elements. Reserve those for the brand site / marketing surfaces. Console only gets 1.5–2px borders + 2px shadows on signature elements.
- ❌ `Inter` or system-ui fallback for sans without first trying Space Grotesk. They look noticeably different.

## Page-by-page mapping (ops-console → prototype + content spec)

> Always check the content spec section before implementing — it lists every
> region's purpose, real data source, and the reason it exists. Visual
> prototype alone is not enough.

| ops-console page | Prototype reference | Content spec | Notes |
|---|---|---|---|
| `general/DashboardPage.tsx` | `console-page-dashboard.tsx` | [§1](./console-content-spec.md#1--generaldashboardpage--工作台) | Conditional onboarding · platform toggle · 4 health lamps · real 4-step guide · service health table · responder summary. **No** sparklines / activity feed / fake metrics. |
| `caller/CallsPage.tsx` | `console-page-calls.tsx` | [§2](./console-content-spec.md#2--callercallspage--调用记录) | Master-detail; **approvals are NOT here** — top-right Approval Center button + sidebar reminder card + detail-panel approval-link chip. Real RequestItem fields only. |
| `caller/AccessListsPage.tsx` | `console-page-access-lists.tsx` | [§3](./console-content-spec.md#3--calleraccesslistspage--名单管理) | **3 tabs** (responder whitelist / hotline whitelist / blocklist). 3 real modes (manual / allow_listed / allow_all). "未生效" chip when whitelist + non-allow_listed mode. |
| `caller/CallerApprovalsPage.tsx` | _planned (Phase 2)_ | [§4](./console-content-spec.md#4--callercallerapprovalspage--审批中心--当前-prototype-缺页) | Filter tabs (5) + ApprovalCard (risk factors / actions) + ExecutionBlock for non-pending. Build directly from spec when it's time. |
| `caller/PreferencesPage.tsx` | _planned next round_ | [§5.3](./console-content-spec.md#53-callerpreferencespage--偏好设置) | GlobalPolicyCard (mode select + AlertDialog impact summary) + task-type routing CRUD |
| `caller/CatalogPage.tsx` | _planned next round_ | [§5.2](./console-content-spec.md#52-callercatalogpage--热线目录) | Master-detail with HotlineDetail incl. input/output schema field rendering |
| `caller/CallerRegisterPage.tsx` | _planned next round_ | [§5.1](./console-content-spec.md#51-callercallerregisterpage--注册-caller) | Single email field, no extra fluff |
| `responder/ResponderHotlinesPage.tsx` | _planned next round_ | [§5.4](./console-content-spec.md#54-responderresponderhotlinespage--hotline-管理) | CRUD list + Add dialog + full-screen Draft dialog (5 tabs) |
| `general/RuntimePage.tsx` | _planned next round_ | [§5.5](./console-content-spec.md#55-generalruntimepage--runtime-监控) | Service tabs + 3 health cards + alert dedup + log terminal + Debug Snapshot |
| `general/TransportPage.tsx` | _planned next round_ | [§5.6](./console-content-spec.md#56-generaltransportpage--传输配置) | 3 transport types with conditional sub-form + test action |
| `auth/AuthPages.tsx` (Setup, Unlock) | _keep brand brutalist_ | — | Pre-app pages; allowed to use the full poster aesthetic |

## Migration plan for ops-console (next CHG)

> The fourth-repo CHG bundle should bump `client_sha` and record this work as a
> visual-system migration, distinct from per-page UX polish.

1. **Token import**
   - Copy `src/styles/delexec-console-tokens.css` → `repos/client/apps/ops-console/src/styles/console-tokens.css`.
   - Copy `src/styles/console-mode.css` → `repos/client/apps/ops-console/src/styles/console-mode.css`.
   - Strip the `@import "./delexec-console-tokens.css"` and replace with the new local path.
   - Add an `@import` to ops-console's main CSS entry.

2. **Activate console-mode globally**
   - Add `className="console-mode"` to the root `<div>` inside `AppShell.tsx`.
   - Likely also wrap `AuthPages` in `.console-mode` if you want them to share, OR keep auth on the brand-poster aesthetic — pick one.

3. **Replace the workspace BrandBackdrop with ConsoleBackdrop**
   - Delete `<BrandBackdrop variant="workspace" />` from `AppShell.tsx`.
   - Port `ConsoleBackdrop` from `console-shell.tsx` into ops-console (it
     reuses `BrandIconShapes`; either copy that SVG into ops-console or
     publish a tiny shared package). Mount it inside `AppShell.tsx` at the
     workspace level with `intensity="branded"` by default.
   - Make `<main>` fully transparent so the pattern shows through card
     gaps; keep cards on `bg-[var(--card)]` (pure white) to preserve
     readability of dense data. Sidebar/header stay half-transparent
     (see `console-shell.tsx` for exact mix).
   - Keep `<BrandBackdrop variant="auth" />` on `AuthPages` if you want
     auth to stay full-poster (recommended).

4. **Fonts**
   - Add Space Grotesk + IBM Plex Mono to ops-console's `index.html`. Easiest:
     a single Google Fonts `<link>` (`Space+Grotesk:wght@400;500;600;700` and
     `IBM+Plex+Mono:wght@400;500;600`). Brand-site itself currently relies on
     locally-installed fonts; ops-console should NOT — it ships to end users.

5. **shadcn radius / ring overrides**
   - The `.console-mode` scope already remaps `--radius` → 4px, but shadcn
     primitives have a number of internal `rounded-md` (≈ 6px) and
     `rounded-lg` (≈ 8px) overrides hard-coded in their templates. Audit
     `repos/client/apps/ops-console/src/components/ui/*.tsx` and:
     - Replace literal `rounded-md` / `rounded-lg` with `rounded-[var(--c-radius)]`
       OR adjust the shadcn `--radius-*` `@theme inline` block to derive
       from `--c-radius` inside `.console-mode`.

6. **Sidebar**
   - The role color dot (`bg-blue-500` / `bg-cyan-600` / `bg-orange-500`) must
     be swapped to `bg-[var(--brand-blue)]` / `bg-[var(--brand-teal)]` /
     `bg-[var(--brand-orange)]` to match the canonical hex.
   - The active item style (currently shadcn's subtle background tint) must
     adopt `c-ink-border c-shadow-1` per the prototype.

7. **Page-by-page refactor**
   - In order of impact: `AccessListsPage` → `CallsPage` → `DashboardPage` → the
     rest. Each page should match the corresponding prototype file 1:1 in
     visual hierarchy and class structure. Keep business logic untouched —
     this is a visual layer migration only.

8. **Status colors and strings**
   - Replace every Tailwind `bg-amber-*`, `bg-emerald-*`, `text-rose-*`, etc.
     in pages and components with the `c-status-*` utility classes. Add a
     small lint rule (or grep guard) to prevent regressions.

9. **Verification (fourth-repo)**
   - `corepack pnpm run check:submodules`
   - `corepack pnpm run check:boundaries`
   - `corepack pnpm run check:bundles`
   - `corepack pnpm run test:contracts`
   - Smoke test ops-console at http://127.0.0.1:4174 against this prototype at
     http://localhost:5173/console — pages should look the same.

## Round 2+ prototype TODO

When this prototype is approved and Round 1 ops-console migration is complete,
the next prototype round should add:

- `console-page-preferences.tsx` — form patterns, GlobalPolicyCard, AlertDialog
- `console-page-approvals.tsx` — pending-action queue, accept/reject actions
- `console-page-catalog.tsx` — card grid, search + filter
- `console-page-runtime.tsx` — `.c-terminal` heavy + alert lane
- `console-page-hotlines.tsx` — CRUD with sheet/dialog

After that, the prototype's `src/app/pages/Console/` is essentially a complete
high-fidelity reference for the entire console surface and ops-console can
finish migrating.
