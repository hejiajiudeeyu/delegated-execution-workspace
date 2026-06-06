# Published Image Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth-repo published-image smoke entry point that validates public-stack image references and delegates the real Docker smoke to `repos/platform`.

**Architecture:** The fourth repo owns orchestration only. `tools/published-image-smoke.mjs` reads the platform public-stack compose contract, prints a release-smoke plan, and runs the existing platform `test:public-stack-smoke` script with `COMPOSE_NO_BUILD=true`; it does not build images or duplicate platform runtime logic.

**Tech Stack:** Node.js ESM, root `yaml` package, `corepack pnpm`, existing platform public-stack smoke.

---

### Task 1: Published Image Smoke Orchestrator

**Files:**
- Create: `tools/published-image-smoke.test.mjs`
- Create: `tools/published-image-smoke.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `tools/published-image-smoke.test.mjs` with temp-repo fixtures that include `repos/platform/package.json` and `repos/platform/deploy/public-stack/docker-compose.yml`. Assert `plan` prints the resolved `rsp-platform`, `rsp-relay`, and `rsp-gateway` image refs, and assert `smoke --dry-run --image-tag 2026.06.06 --image-registry registry.example/delexec` prints `COMPOSE_NO_BUILD=true` and the delegated platform smoke command without printing `PLATFORM_ADMIN_API_KEY`.

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm run test:published-image-smoke`

Expected: FAIL because `tools/published-image-smoke.mjs` or the package script is not implemented yet.

- [ ] **Step 3: Write minimal implementation**

Create `tools/published-image-smoke.mjs` with:

- CLI commands: `plan`, `smoke`, `help`
- options: `--profile public-stack`, `--image-registry`, `--image-tag`, `--dry-run`, `--allow-skip`
- compose validation for the public-stack `relay`, `platform-api`, and `platform-console-gateway` image templates
- smoke delegation to `corepack pnpm --dir repos/platform run test:public-stack-smoke`
- environment: `COMPOSE_NO_BUILD=true`, selected `IMAGE_REGISTRY`, selected `IMAGE_TAG`, and strict Docker by default via `STRICT_COMPOSE_SMOKE=true`

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm run test:published-image-smoke`

Expected: PASS with `[published-image-smoke.test] ok`.

- [ ] **Step 5: Wire package scripts**

Add:

```json
"published-image:plan": "node tools/published-image-smoke.mjs plan",
"published-image:smoke": "node tools/published-image-smoke.mjs smoke",
"test:published-image-smoke": "node tools/published-image-smoke.test.mjs"
```

### Task 2: PRD, Readiness, Runbook, Bundle

**Files:**
- Modify: `docs/product/deployability-pipelines-prd.zh-CN.md`
- Modify: `docs/product/deployability-pipelines-prd.md`
- Modify: `docs/architecture/main-readiness.zh-CN.md`
- Modify: `docs/architecture/main-readiness.md`
- Modify: `docs/runbooks/local-dev-setup.zh-CN.md`
- Modify: `docs/runbooks/local-dev-setup.md`
- Add: `changes/CHG-2026-039.yaml`

- [ ] **Step 1: Update PRD**

Add Pipeline F for Published Image Release Smoke. Mark required commands as `published-image:plan`, `published-image:smoke`, and `test:published-image-smoke`; acceptance must require registry/tag visibility, `COMPOSE_NO_BUILD=true`, platform smoke delegation, strict-by-default Docker behavior, and no secret output.

- [ ] **Step 2: Update readiness**

Move published-image smoke from "still not ready" to the usable fourth-repo orchestration list, with the boundary that actual image publishing and release certification remain owned by `repos/platform`.

- [ ] **Step 3: Update runbooks**

Add a short published-image validation section after public-stack selfhost commands.

- [ ] **Step 4: Add change bundle**

Create `changes/CHG-2026-039.yaml` with unchanged protocol/client/platform/brand-site SHAs and `affected_scope` including orchestration and documentation.

### Task 3: Verification

**Files:**
- No new files.

- [ ] **Step 1: Syntax checks**

Run:

```bash
node --check tools/published-image-smoke.mjs
node --check tools/published-image-smoke.test.mjs
```

- [ ] **Step 2: Targeted test**

Run:

```bash
corepack pnpm run test:published-image-smoke
```

- [ ] **Step 3: Required fourth-repo gates**

Run:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

- [ ] **Step 4: Git safety check**

Run `git status --short` and confirm no unrelated changes are staged or reverted; leave the pre-existing `repos/client` dirty state untouched.
