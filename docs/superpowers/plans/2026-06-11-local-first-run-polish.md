# P1 Local First-Run Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align client onboarding around one local-first bootstrap path and prevent stale first-run commands from reappearing.

**Architecture:** Keep runtime truth in `repos/client`. Add a small static documentation checker in the client repository and update onboarding docs to lead with `bootstrap -> status -> run-example -> debug-snapshot`; keep curl/manual API material as advanced troubleshooting.

**Tech Stack:** Node.js ESM script, npm scripts, Markdown docs.

---

## File Structure

- Create `repos/client/scripts/check-onboarding-docs.mjs`: static checker for local-first onboarding docs.
- Modify `repos/client/package.json`: add `check:onboarding-docs`.
- Modify `repos/client/README.md`: make Quick Start lead with bootstrap and package/source commands.
- Modify `repos/client/docs/current/guides/local-mode-onboarding.md`: lead with bootstrap, include `OPS_PORT_MCP_ADAPTER`, move curl flow to advanced/manual API validation.
- Modify `repos/client/docs/current/guides/agent-local-install-playbook.md`: make agent playbook execute bootstrap/status/run-example/debug-snapshot first.
- Modify `repos/client/docs/current/guides/coding-agent-onboarding.md` and `.zh-CN.md`: replace stale split-step commands.
- Modify `repos/client/docs/current/guides/end-user-ai-deployment-guide.md` and `.zh-CN.md`: replace stale split-step commands.
- Modify `repos/client/docs/current/guides/deployment-guide.md` and `.zh-CN.md`: keep local CLI section aligned with bootstrap-first.
- Modify `repos/client/docs/current/guides/local-mode-onboarding.zh-CN.md` and `agent-local-install-playbook.zh-CN.md` only where needed to keep the checker green.

### Task 1: Add Onboarding Checker

**Files:**
- Create: `repos/client/scripts/check-onboarding-docs.mjs`
- Modify: `repos/client/package.json`

- [ ] **Step 1: Write the failing checker**

Create `scripts/check-onboarding-docs.mjs` with checks for these docs:

```js
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const docs = [
  "README.md",
  "docs/current/guides/local-mode-onboarding.md",
  "docs/current/guides/local-mode-onboarding.zh-CN.md",
  "docs/current/guides/agent-local-install-playbook.md",
  "docs/current/guides/agent-local-install-playbook.zh-CN.md",
  "docs/current/guides/coding-agent-onboarding.md",
  "docs/current/guides/coding-agent-onboarding.zh-CN.md",
  "docs/current/guides/deployment-guide.md",
  "docs/current/guides/deployment-guide.zh-CN.md",
  "docs/current/guides/end-user-ai-deployment-guide.md",
  "docs/current/guides/end-user-ai-deployment-guide.zh-CN.md"
];

const requiredCommands = [
  /delexec-ops bootstrap|npm run ops -- bootstrap/,
  /delexec-ops status|npm run ops -- status/,
  /delexec-ops run-example|npm run ops -- run-example/,
  /delexec-ops debug-snapshot|npm run ops -- debug-snapshot/
];

const errors = [];

for (const docPath of docs) {
  const absolute = path.join(ROOT, docPath);
  const content = fs.readFileSync(absolute, "utf8");

  if (/delexec-ops auth login/.test(content)) {
    errors.push(`${docPath}: stale command delexec-ops auth login`);
  }

  for (const pattern of requiredCommands) {
    if (!pattern.test(content)) {
      errors.push(`${docPath}: missing recommended command pattern ${pattern}`);
    }
  }

  if (/local-mode-onboarding|agent-local-install-playbook/.test(docPath) && !/OPS_PORT_MCP_ADAPTER/.test(content)) {
    errors.push(`${docPath}: missing OPS_PORT_MCP_ADAPTER in isolated port list`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`[check-onboarding-docs] ok docs=${docs.length}`);
```

Add `"check:onboarding-docs": "node scripts/check-onboarding-docs.mjs"` to `package.json`.

- [ ] **Step 2: Run checker to verify it fails**

Run:

```bash
npm run check:onboarding-docs
```

Expected: FAIL, naming stale `auth login` docs and missing `status` or `OPS_PORT_MCP_ADAPTER` entries.

### Task 2: Align First-Run Docs

**Files:**
- Modify: `repos/client/README.md`
- Modify: `repos/client/docs/current/guides/local-mode-onboarding.md`
- Modify: `repos/client/docs/current/guides/agent-local-install-playbook.md`
- Modify: `repos/client/docs/current/guides/coding-agent-onboarding.md`
- Modify: `repos/client/docs/current/guides/coding-agent-onboarding.zh-CN.md`
- Modify: `repos/client/docs/current/guides/deployment-guide.md`
- Modify: `repos/client/docs/current/guides/deployment-guide.zh-CN.md`
- Modify: `repos/client/docs/current/guides/end-user-ai-deployment-guide.md`
- Modify: `repos/client/docs/current/guides/end-user-ai-deployment-guide.zh-CN.md`
- Modify: `repos/client/docs/current/guides/local-mode-onboarding.zh-CN.md`
- Modify: `repos/client/docs/current/guides/agent-local-install-playbook.zh-CN.md`

- [ ] **Step 1: Replace stale recommended command blocks**

Use this source command block where the user runs from the repository:

```bash
npm install
npm run ops -- bootstrap --email localtest@example.com --text "Summarize this bootstrap request."
npm run ops -- status
npm run ops -- run-example --text "Summarize this follow-up request."
npm run ops -- debug-snapshot
```

Use this installed-package command block where the user runs the global CLI:

```bash
npm install -g @delexec/ops
delexec-ops bootstrap --email you@example.com --text "Summarize this bootstrap request."
delexec-ops status
delexec-ops run-example --text "Summarize this follow-up request."
delexec-ops debug-snapshot
```

- [ ] **Step 2: Reframe curl flows**

In local onboarding and agent playbook docs, keep manual endpoint instructions only as advanced/manual API validation after the recommended bootstrap path.

- [ ] **Step 3: Add missing port variable**

Add this line anywhere an isolated port list appears:

```bash
export OPS_PORT_MCP_ADAPTER=8192
```

Update default-port prose to include `8092`.

### Task 3: Verify Checker And Focused Commands

**Files:**
- Test: `repos/client/scripts/check-onboarding-docs.mjs`
- Test: `repos/client/package.json`

- [ ] **Step 1: Run docs checker**

Run:

```bash
npm run check:onboarding-docs
```

Expected: PASS with `[check-onboarding-docs] ok docs=11`.

- [ ] **Step 2: Run focused runtime/package checks**

Run:

```bash
npm run check:ops-console-runtime-surface
npm run test:packages
```

Expected: both commands exit 0.

### Task 4: Fourth-Repo Integration Gate

**Files:**
- Test from: repository root

- [ ] **Step 1: Run required fourth-repo checks**

Run:

```bash
corepack pnpm run check:boundaries
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

Expected: all exit 0.

- [ ] **Step 2: Run origin-dependent checks and report reachability separately**

Run:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:bundles
```

Expected: pass if referenced SHAs are reachable; if they fail only on known origin reachability for unpushed submodule SHAs, rerun with `SKIP_ORIGIN_REACHABILITY=1` and report both results.

## Self-Review

- The plan covers every scope item in the spec.
- There are no `TBD` or `TODO` placeholders.
- Every implementation step names exact files and commands.
- The checker is intentionally static and does not duplicate runtime truth.
