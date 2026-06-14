# Bootstrap Task: Fill Project Development Guidelines

**You (the AI) are running this task. The developer does not read this file.**

The developer just ran `trellis init` on this project for the first time.
`.trellis/` now exists with empty spec scaffolding, and this bootstrap task
exists under `.trellis/tasks/`. When they want to work on it, they should start
this task from a session that provides Trellis session identity.

**Your job**: help them populate `.trellis/spec/` with the team's real
coding conventions. Every future AI session — this project's
`trellis-implement` and `trellis-check` sub-agents — auto-loads spec files
listed in per-task jsonl manifests. Empty spec = sub-agents write generic
code. Real spec = sub-agents match the team's actual patterns.

Don't dump instructions. Open with a short greeting, figure out if the repo
has any existing convention docs (CLAUDE.md, .cursorrules, etc.), and drive
the rest conversationally.

---

## Status (update the checkboxes as you complete each item)

- [ ] Fill guidelines for call-anything-brand-site
- [ ] Fill guidelines for delegated-execution-client
- [ ] Fill guidelines for delegated-execution-platform-selfhost
- [ ] Fill guidelines for delegated-execution-protocol
- [ ] Fill guidelines for @delexec/caller-controller
- [ ] Fill guidelines for @delexec/caller-skill-adapter
- [ ] Fill guidelines for @delexec/caller-skill-mcp-adapter
- [ ] Fill guidelines for @delexec/ops
- [ ] Fill guidelines for @delexec/ops-console
- [ ] Fill guidelines for @delexec/responder-controller
- [ ] Fill guidelines for @delexec/platform-api
- [ ] Fill guidelines for @delexec/platform-console
- [ ] Fill guidelines for @delexec/platform-console-gateway
- [ ] Fill guidelines for @delexec/transport-relay
- [ ] Fill guidelines for @delexec/caller-controller-core
- [ ] Fill guidelines for @delexec/responder-runtime-core
- [ ] Fill guidelines for @delexec/runtime-utils
- [ ] Fill guidelines for @delexec/sqlite-store
- [ ] Fill guidelines for transports
- [ ] Fill guidelines for @delexec/billing-store
- [ ] Fill guidelines for @delexec/postgres-store
- [ ] Fill guidelines for @delexec/contracts
- [ ] Fill guidelines for @delexec/transport-email
- [ ] Fill guidelines for @delexec/transport-emailengine
- [ ] Fill guidelines for @delexec/transport-gmail
- [ ] Fill guidelines for @delexec/transport-local
- [ ] Fill guidelines for @delexec/transport-relay-http
- [ ] Add code examples

---

## Spec files to populate

### Package: call-anything-brand-site (`spec/call-anything-brand-site/`)

- Frontend guidelines: `.trellis/spec/call-anything-brand-site/frontend/`

### Package: delegated-execution-client (`spec/delegated-execution-client/`)

- Frontend guidelines: `.trellis/spec/delegated-execution-client/frontend/`

### Package: delegated-execution-platform-selfhost (`spec/delegated-execution-platform-selfhost/`)

- Frontend guidelines: `.trellis/spec/delegated-execution-platform-selfhost/frontend/`

### Package: delegated-execution-protocol (`spec/delegated-execution-protocol/`)

- Frontend guidelines: `.trellis/spec/delegated-execution-protocol/frontend/`

### Package: @delexec/caller-controller (`spec/caller-controller/`)

- Frontend guidelines: `.trellis/spec/caller-controller/frontend/`

### Package: @delexec/caller-skill-adapter (`spec/caller-skill-adapter/`)

- Frontend guidelines: `.trellis/spec/caller-skill-adapter/frontend/`

### Package: @delexec/caller-skill-mcp-adapter (`spec/caller-skill-mcp-adapter/`)

- Frontend guidelines: `.trellis/spec/caller-skill-mcp-adapter/frontend/`

### Package: @delexec/ops (`spec/ops/`)

- Frontend guidelines: `.trellis/spec/ops/frontend/`

### Package: @delexec/ops-console (`spec/ops-console/`)

- Frontend guidelines: `.trellis/spec/ops-console/frontend/`

### Package: @delexec/responder-controller (`spec/responder-controller/`)

- Frontend guidelines: `.trellis/spec/responder-controller/frontend/`

### Package: @delexec/platform-api (`spec/platform-api/`)

- Frontend guidelines: `.trellis/spec/platform-api/frontend/`

### Package: @delexec/platform-console (`spec/platform-console/`)

- Frontend guidelines: `.trellis/spec/platform-console/frontend/`

### Package: @delexec/platform-console-gateway (`spec/platform-console-gateway/`)

- Frontend guidelines: `.trellis/spec/platform-console-gateway/frontend/`

### Package: @delexec/transport-relay (`spec/transport-relay/`)

- Frontend guidelines: `.trellis/spec/transport-relay/frontend/`

### Package: @delexec/caller-controller-core (`spec/caller-controller-core/`)

- Frontend guidelines: `.trellis/spec/caller-controller-core/frontend/`

### Package: @delexec/responder-runtime-core (`spec/responder-runtime-core/`)

- Frontend guidelines: `.trellis/spec/responder-runtime-core/frontend/`

### Package: @delexec/runtime-utils (`spec/runtime-utils/`)

- Frontend guidelines: `.trellis/spec/runtime-utils/frontend/`

### Package: @delexec/sqlite-store (`spec/sqlite-store/`)

- Frontend guidelines: `.trellis/spec/sqlite-store/frontend/`

### Package: transports (`spec/transports/`)

- Backend guidelines: `.trellis/spec/transports/backend/`

- Frontend guidelines: `.trellis/spec/transports/frontend/`

### Package: @delexec/billing-store (`spec/billing-store/`)

- Frontend guidelines: `.trellis/spec/billing-store/frontend/`

### Package: @delexec/postgres-store (`spec/postgres-store/`)

- Frontend guidelines: `.trellis/spec/postgres-store/frontend/`

### Package: @delexec/contracts (`spec/contracts/`)

- Frontend guidelines: `.trellis/spec/contracts/frontend/`

### Package: @delexec/transport-email (`spec/transport-email/`)

- Frontend guidelines: `.trellis/spec/transport-email/frontend/`

### Package: @delexec/transport-emailengine (`spec/transport-emailengine/`)

- Frontend guidelines: `.trellis/spec/transport-emailengine/frontend/`

### Package: @delexec/transport-gmail (`spec/transport-gmail/`)

- Frontend guidelines: `.trellis/spec/transport-gmail/frontend/`

### Package: @delexec/transport-local (`spec/transport-local/`)

- Frontend guidelines: `.trellis/spec/transport-local/frontend/`

### Package: @delexec/transport-relay-http (`spec/transport-relay-http/`)

- Frontend guidelines: `.trellis/spec/transport-relay-http/frontend/`


### Thinking guides (already populated)

`.trellis/spec/guides/` contains general thinking guides pre-filled with
best practices. Customize only if something clearly doesn't fit this project.

---

## How to fill the spec

### Step 1: Import from existing convention files first (preferred)

Search the repo for existing convention docs. If any exist, read them and
extract the relevant rules into the matching `.trellis/spec/` files —
usually much faster than documenting from scratch.

| File / Directory | Tool |
|------|------|
| `CLAUDE.md` / `CLAUDE.local.md` | Claude Code |
| `AGENTS.md` | Codex / Claude Code / agent-compatible tools |
| `.cursorrules` | Cursor |
| `.cursor/rules/*.mdc` | Cursor (rules directory) |
| `.windsurfrules` | Windsurf |
| `.clinerules` | Cline |
| `.roomodes` | Roo Code |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.vscode/settings.json` → `github.copilot.chat.codeGeneration.instructions` | VS Code Copilot |
| `CONVENTIONS.md` / `.aider.conf.yml` | aider |
| `CONTRIBUTING.md` | General project conventions |
| `.editorconfig` | Editor formatting rules |

### Step 2: Analyze the codebase for anything not covered by existing docs

Scan real code to discover patterns. Before writing each spec file:
- Find 2-3 real examples of each pattern in the codebase.
- Reference real file paths (not hypothetical ones).
- Document anti-patterns the team clearly avoids.

### Step 3: Document reality, not ideals

**Critical**: write what the code *actually does*, not what it should do.
Sub-agents match the spec, so aspirational patterns that don't exist in the
codebase will cause sub-agents to write code that looks out of place.

If the team has known tech debt, document the current state — improvement
is a separate conversation, not a bootstrap concern.

---

## Quick explainer of the runtime (share when they ask "why do we need spec at all")

- Every AI coding task spawns two sub-agents: `trellis-implement` (writes
  code) and `trellis-check` (verifies quality).
- Each task has `implement.jsonl` / `check.jsonl` manifests listing which
  spec files to load.
- The platform hook auto-injects those spec files + the task's `prd.md`
  into every sub-agent prompt, so the sub-agent codes/reviews per team
  conventions without anyone pasting them manually.
- Source of truth: `.trellis/spec/`. That's why filling it well now pays
  off forever.

---

## Completion

When the developer confirms the checklist items above are done with real
examples (not placeholders), guide them to run:

```bash
python3 ./.trellis/scripts/task.py finish
python3 ./.trellis/scripts/task.py archive 00-bootstrap-guidelines
```

After archive, every new developer who joins this project will get a
`00-join-<slug>` onboarding task instead of this bootstrap task.

---

## Suggested opening line

"Welcome to Trellis! Your init just set me up to help you fill the project
spec — a one-time setup so every future AI session follows the team's
conventions instead of writing generic code. Before we start, do you have
any existing convention docs (CLAUDE.md, .cursorrules, CONTRIBUTING.md,
etc.) I can pull from, or should I scan the codebase from scratch?"
