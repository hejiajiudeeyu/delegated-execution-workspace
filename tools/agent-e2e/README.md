# Agent End-to-End Check (`tools/agent-e2e/`)

Fourth-repo owned current-surface smoke for the caller-skill adapter, caller
controller, platform, responder, and MCP-facing tool contract.

The default check is deterministic and does not call an external LLM. It
validates the HTTP truth surface that the MCP adapter exposes to agent hosts.

## What This Tool Validates

`agent-e2e-test.py` exercises the current `/skills/caller/*` progressive
disclosure flow:

1. supervisor, caller-skill adapter, and MCP adapter health
2. `GET /skills/caller/manifest`
3. `POST /skills/caller/search-hotlines-brief`
4. `POST /skills/caller/search-hotlines-detailed`
5. `GET /skills/caller/hotlines/:hotlineId`
6. `POST /skills/caller/prepare-request`
7. `POST /skills/caller/send-request`
8. `GET /skills/caller/requests/:requestId/report`

The manifest must expose these six agent-facing actions:

- `search_hotlines_brief`
- `search_hotlines_detailed`
- `read_hotline`
- `prepare_request`
- `send_request`
- `report_response`

## Running

Prerequisites:

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
corepack pnpm run dev:client:supervisor
```

Then run:

```bash
corepack pnpm run test:agent-e2e
```

Exit codes:

- `0` means all assertions passed
- `1` means a prerequisite or assertion failed

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `SKILL_ADAPTER_BASE_URL` | `http://localhost:8091` | caller-skill HTTP truth surface |
| `SUPERVISOR_BASE_URL` | `http://localhost:8079` | ops supervisor status endpoint |
| `MCP_ADAPTER_BASE_URL` | `http://localhost:8092` | MCP adapter health endpoint |
| `AGENT_E2E_HOTLINE_ID` | `local.delegated-execution.workspace-summary.v1` | bundled hotline under test |

## Relation To Required Fourth-Repo Gates

`test:agent-e2e` is not required for a change bundle to claim
`integration_check: passed`; the required gate is still:

```bash
corepack pnpm run test:integration
```

Use `test:agent-e2e` as the additional daily-readiness check before claiming
that the local agent-facing caller-skill surface is usable by Codex, Cursor, or
Claude Code through the MCP adapter.

## Scope Boundary

This tool lives in the fourth repo because it validates orchestration and
cross-repo integration. It must not implement hotline business logic. All
business behavior belongs in `repos/protocol`, `repos/client`, or
`repos/platform`.
