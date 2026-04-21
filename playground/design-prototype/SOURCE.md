# Console Design Prototype — Vendored Snapshot

This directory is a **read-only vendored snapshot** of the high-fidelity
ops-console design prototype. It is the single source of truth for what
`apps/ops-console` (in the `repos/client` submodule) should look like and
contain.

It is NOT compiled. It is NOT imported by any production code.
It is reference material only.

## Source repository

| Field | Value |
|---|---|
| Repository | `call-anything-brand-site` |
| Default location | `~/Documents/Projects/call-anything-brand-site` |
| Origin remote | _not configured yet_ — repo lives only on the developer machine |
| Pinned commit | `42f24648` |
| Pinned commit subject | `feat(playground/console): high-fidelity ops-console design prototype` |
| Vendored on | 2026-04-17 |

If `call-anything-brand-site` later gets pushed to GitHub, this SHA stays
valid (commits don't change just because they get a remote).

## What's here

```
playground/design-prototype/
├── SOURCE.md                              ← this file
├── sync.sh                                ← rsync helper to refresh from brand-site
├── docs/
│   ├── console-content-spec.md            ← THE content contract
│   └── console-prototype-handoff.md       ← engineer handoff notes
├── shells/
│   └── console-shell.tsx                  ← chrome (header/sidebar/from-context)
├── patterns/
│   ├── console-page-dashboard.tsx
│   ├── console-page-catalog.tsx
│   ├── console-page-calls.tsx
│   ├── console-page-approvals.tsx
│   ├── console-page-help.tsx
│   └── console-page-access-lists.tsx
└── styles/
    ├── console-mode.css                   ← scoped `.console-mode` activation
    └── delexec-console-tokens.css         ← brand tokens
```

## Hierarchy of authority

When the prototype and the running ops-console disagree:

1. **`docs/console-content-spec.md` is the source of truth for content
   and behavior.** What each region says, what real data backs it, what
   actions it exposes, what its empty/error states look like.
2. **The `.tsx` patterns are the source of truth for visual treatment.**
   Layout, spacing, type scale, color, brutalist accents.
3. **The implementation under `repos/client/apps/ops-console/` is the
   source of truth for behavior, wiring, and protocol contract.**
   When implementation contradicts prototype on _behavior_ (auth flow,
   API shape, status polling), the implementation wins — but the
   prototype must be updated too so they don't drift.

## Updating this snapshot

When the prototype evolves in `call-anything-brand-site`:

```bash
cd /path/to/delegated-execution-dev
./playground/design-prototype/sync.sh
```

This rsyncs the listed files from the brand-site repo on disk into
this directory. After running:

1. `git diff` to inspect what changed.
2. Update the `Pinned commit` row above to the new brand-site SHA.
3. Commit the update with subject
   `chore(playground): sync design prototype to brand-site <short SHA>`.

## Why vendored, not submoduled?

`call-anything-brand-site` is also the public marketing site
(homepage, marketplace, brand identity). Pulling it in as a git
submodule would force every fourth-repo SHA bump to think about it,
even though it has no role in protocol contract or runtime
integration.

A read-only vendored snapshot under `playground/` (a top-level
directory explicitly outside `repos/`) preserves the design reference
without expanding the workspace's business-orchestration scope.

See `AGENTS.md` for the workspace boundary rules this respects.

## Why `playground/` and not `docs/`?

Two reasons:

- The bulk of the content here is `.tsx` source — it _looks_ like
  code even though it doesn't run. `docs/` is for prose.
- Future design references (e.g. platform-console prototypes) can sit
  alongside, keeping the design-asset tree separate from runtime
  documentation.
