# Agent End-to-End Check (`tools/agent-e2e/`)

> ⚠️ **Status (CHG-2026-007 baseline): script is stale.**
>
> The current caller-skill HTTP surface in `repos/client` exposes
> `POST /skills/caller/search-hotlines-brief`,
> `POST /skills/caller/search-hotlines-detailed`,
> `GET /skills/caller/hotlines/:hotlineId`,
> `POST /skills/caller/prepare-request`,
> `POST /skills/caller/send-request`, and
> `POST /skills/caller/requests/:requestId/report`.
>
> The script in this folder still calls the older
> `/skills/remote-hotline/{catalog,preflight,invoke,policies/...,global-policy,
> approvals/...,audit}` paths, so a fresh run aborts in step 1 with
> `catalog_reachable: 0 hotlines` and `test_hotline_active: not found`.
>
> Treat this tool as quarantined until a refresh CHG lands in
> `repos/client` that either (a) re-exposes the legacy `/skills/remote-hotline/*`
> paths as a thin compatibility layer or (b) re-targets this script to the
> current `/skills/caller/*` surface. Do not delete it — the assertion
> ladder and the DeepSeek tool wiring are still useful as a baseline once
> the endpoint mismatch is resolved.
>
> The MCP-host validation in
> `docs/runbooks/caller-skill-mcp-integration.md` (the "golden four"
> checks under "Validation ladder") still works against the current stack
> and is the correct path to claim "agent-driven end-to-end works" in the
> meantime.

Fourth-repo owned scripted end-to-end validation for the caller-skill +
caller-controller + platform + responder integration. One file, no
dependencies beyond `python3` and the standard library plus a DeepSeek API
key.

## What this tool validates

It exercises a realistic agent loop:

1. A DeepSeek chat session receives six `caller_skill.*` style tools.
2. The agent searches the local hotline catalog, runs preflight against
   the target hotline, and invokes it with synthetic input.
3. The out-of-band approval path is exercised via the caller console
   approvals endpoint (auto-approved when `AUTO_APPROVE=true`).
4. The audit log is fetched and asserted against the expected action
   sequence.

If this check passes end-to-end, the three-layer stack (platform ->
caller/responder controllers -> caller-skill adapter) is wired correctly
and speaks the endpoint contract below.

It intentionally does not cover the MCP adapter wire format; that is
covered by the per-host validation in
`docs/runbooks/caller-skill-mcp-integration.md`.

## Running

Prerequisites (run `corepack pnpm run dev:platform`, `dev:relay`, and
`dev:client:supervisor` first; see
`docs/runbooks/local-dev-setup.md`):

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap    # one-time
corepack pnpm run dev:client:supervisor   # long-running
```

Then:

```bash
export DEEPSEEK_API_KEY=sk-...
corepack pnpm run test:agent-e2e
# equivalent to: AUTO_APPROVE=true python3 tools/agent-e2e/agent-e2e-test.py
```

Exit codes:

- `0` — all assertions passed
- `1` — prerequisite missing or at least one assertion failed

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DEEPSEEK_API_KEY` | (required) | DeepSeek chat credential for the agent side |
| `SKILL_ADAPTER_BASE_URL` | `http://localhost:8091` | caller-skill HTTP truth surface |
| `SUPERVISOR_BASE_URL` | `http://localhost:8079` | ops supervisor status endpoint |
| `AUTO_APPROVE` | `true` (via npm script) | auto-approve any pending OOB approval |
| `AGENT_E2E_HOTLINE_ID` | `local.delegated-execution.workspace-summary.v1` | hotline under test |

The hotline id default matches the bundled example responder seeded by
`dev:client:bootstrap`. When the client renames that example, update this
default and open a CHG.

## Endpoint contract exercised

This is the stable HTTP surface the script depends on. Treat this list as a
contract between the fourth repo and `repos/client`. If `repos/client`
changes any of these, it must land there first, be covered by a new CHG,
and only then be reflected here.

Ops supervisor (`SUPERVISOR_BASE_URL`, default `:8079`):

- `GET /status` — supervisor health + child process states

Caller-skill adapter (`SKILL_ADAPTER_BASE_URL`, default `:8091`):

- `GET  /skills/remote-hotline/catalog[?query&capability&task_type]`
- `POST /skills/remote-hotline/preflight`
- `POST /skills/remote-hotline/invoke`
- `PUT  /skills/remote-hotline/policies/{hotline_id}`
- `PUT  /skills/remote-hotline/global-policy`
- `GET  /skills/remote-hotline/approvals/{approval_id}`
- `GET  /skills/remote-hotline/audit?limit=N`

External (DeepSeek):

- `POST https://api.deepseek.com/v1/chat/completions` (model `deepseek-chat`)

## When this tool should fail you

- Supervisor `/status` not reachable — boot step not complete.
- Catalog empty — `dev:client:bootstrap` was not run, or the example
  hotline id was renamed on the client side without updating
  `AGENT_E2E_HOTLINE_ID`.
- `preflight` or `invoke` non-2xx — client-side regression in the
  caller-skill adapter; fix in `repos/client`, bump via a new CHG, then
  re-run.
- Approval stuck in pending with `AUTO_APPROVE=true` — OOB approval
  handler regression in the caller console backend; fix in `repos/client`.

## Relation to other fourth-repo checks

| Check | Scope |
|-------|-------|
| `corepack pnpm run check:submodules` | gitlink integrity |
| `corepack pnpm run check:bundles` | change bundle YAML |
| `corepack pnpm run check:boundaries` | cross-repo dependency directions |
| `corepack pnpm run test:contracts` | protocol contract matrix |
| `corepack pnpm run test:integration` | `tools/source-integration-check.mjs` boots the full stack and probes it |
| `corepack pnpm run test:agent-e2e` | this tool — layered on top of `test:integration`, adds an LLM-driven caller agent |

`test:agent-e2e` is not required for a CHG to be marked
`integration_check: passed`; `test:integration` already covers the
controller layer. Treat this as the extra gate before claiming
"caller-skill end-to-end works with a real agent".

## Scope boundary

This tool lives in the fourth repo only because orchestration is the
integration boundary. It is not business logic. All assertions are driven
by the published HTTP surface of `repos/client`. Do not add
hotline-specific or contract-specific logic here; that belongs inside
`repos/client` or `repos/protocol`.
