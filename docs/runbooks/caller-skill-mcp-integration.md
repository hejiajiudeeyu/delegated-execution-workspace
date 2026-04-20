# Caller Skill MCP Integration

Status: Active. Last verified against CHG-2026-003 (protocol `fac73ae`, client `40dddb7`, platform `6e5be15`) and CHG-2026-004 (client `402f300`).

This runbook belongs to the fourth-repo. It explains how to validate the
caller-skill MCP adapter end-to-end against the currently certified submodule
combination, for all three target agent hosts (Codex, Cursor, Claude Code).

It is deliberately thin: the authoritative per-host setup lives in the client
submodule under `repos/client/docs/current/guides/`. This page only records
the fourth-repo-level boot order, the stable endpoint contract that our
integration tests assume, and the cross-cutting troubleshooting items that
kept biting us during CHG-2026-003.

## What is being integrated

Three layers cooperate:

| Layer | Repo | Process |
|-------|------|---------|
| Local truth surface | `repos/client` | `@delexec/caller-skill-adapter` (HTTP, default 8091) |
| MCP bridge | `repos/client` | `@delexec/caller-skill-mcp-adapter` (stdio or streamable_http) |
| Host | external | Codex / Cursor / Claude Code |

The MCP adapter does not implement hotline business logic. It projects the
caller-skill HTTP surface into six MCP tools:

- `caller_skill.search_hotlines_brief`
- `caller_skill.search_hotlines_detailed`
- `caller_skill.read_hotline`
- `caller_skill.prepare_request`
- `caller_skill.send_request`
- `caller_skill.report_response`

If a host sees fewer or differently-named tools, the adapter version is out
of sync with this runbook. Bump the client submodule and open a new CHG.

## Authoritative per-host setup

The per-host config snippets below are operational defaults for the local
dev stack. The truth source is the running supervisor — query it before
copy-pasting so the values match your actual install:

```bash
curl -s http://127.0.0.1:8079/status \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{console.log(JSON.stringify(JSON.parse(d).runtime?.mcp_adapter?.spec, null, 2))})"
```

The `streamable_http.url` and `stdio.{command,args,env}` fields in that
response are what each host config must reflect. If the supervisor reports
`available: false`, fix the supervisor first; the host configs cannot
recover from a dead adapter.

Reference (in-repo, when present):

- `repos/client/apps/caller-skill-mcp-adapter/README.md` — adapter env vars
  and transport resolution order.
- `repos/client/docs/current/guides/caller-skill-codex-local-guide.md` —
  Codex-specific notes (currently absent in this combination; treat the
  config snippet below as the working contract until that guide lands).
- `repos/client/docs/current/guides/caller-skill-cursor-local-guide.md` —
  Cursor-specific notes (also currently absent).

If a host sees fewer or differently-named tools than the six listed above,
the adapter version is out of sync with this runbook. Bump the client
submodule and open a new CHG.

### Codex CLI (`~/.codex/config.toml`)

Codex prefers `streamable_http`; `stdio` is the local-debug fallback.

```toml
# Preferred — talks to the long-running adapter at 127.0.0.1:8092
[mcp_servers.delexec_caller_skill]
url = "http://127.0.0.1:8092/mcp"
transport = "streamable_http"

# Fallback — only when the streamable_http endpoint is down for debugging.
# Comment out the streamable_http entry above before enabling this one.
# [mcp_servers.delexec_caller_skill]
# command = "/opt/homebrew/Cellar/node@22/22.22.0_1/bin/node"
# args    = ["/Users/<you>/Documents/Projects/delegated-execution-dev/repos/client/apps/caller-skill-mcp-adapter/src/server.js"]
# [mcp_servers.delexec_caller_skill.env]
# CALLER_SKILL_BASE_URL = "http://127.0.0.1:8091"
```

Verify in Codex: open the MCP servers panel, confirm `delexec_caller_skill`
shows the six `caller_skill.*` tools.

### Cursor (`~/.cursor/mcp.json` or repo-level `.cursor/mcp.json`)

Cursor's stable transport is `stdio`. Streamable HTTP support is tracked in
the client design docs but not yet promoted to default.

```json
{
  "mcpServers": {
    "delexec-caller-skill": {
      "command": "/opt/homebrew/Cellar/node@22/22.22.0_1/bin/node",
      "args": [
        "/Users/<you>/Documents/Projects/delegated-execution-dev/repos/client/apps/caller-skill-mcp-adapter/src/server.js"
      ],
      "env": {
        "CALLER_SKILL_BASE_URL": "http://127.0.0.1:8091"
      }
    }
  }
}
```

Repo-level `.cursor/mcp.json` overrides user-level. Either restart Cursor
or use the MCP panel's "Refresh" after editing.

### Claude Code

Claude Code accepts both transports. The CLI form is the most reliable
because it survives settings.json schema drift.

```bash
# Streamable HTTP (preferred, matches Codex behavior)
claude mcp add delexec-caller-skill \
  --transport http \
  --url http://127.0.0.1:8092/mcp

# Stdio fallback
claude mcp add delexec-caller-skill \
  --transport stdio \
  -- /opt/homebrew/Cellar/node@22/22.22.0_1/bin/node \
     /Users/<you>/Documents/Projects/delegated-execution-dev/repos/client/apps/caller-skill-mcp-adapter/src/server.js
```

Equivalent JSON in `~/.claude/settings.json` (or per-project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "delexec-caller-skill": {
      "transport": "http",
      "url": "http://127.0.0.1:8092/mcp"
    }
  }
}
```

Run `claude mcp list` to confirm registration; the server should report
`status: ok` and list the six `caller_skill.*` tools.

### Substitutions you must edit

- `<you>` — your home dir under `/Users/`.
- `command` (`/opt/homebrew/.../node`) — paste from the supervisor `spec`
  (it reflects whichever node binary the supervisor itself launched the
  adapter with). Hard-coding `/usr/bin/node` will silently use a different
  Node major and may break the SDK.
- Port `8092` — only if you set `MCP_ADAPTER_PORT`. Default install uses
  `8092`; the supervisor will report the active value.

## Fourth-repo boot sequence

Before launching any host, the baseline integration stack must be up. Boot
strictly in this order; each step depends on the previous.

```bash
# 1. Platform (postgres + platform-api) via docker compose
corepack pnpm run dev:platform

# 2. Transport relay
corepack pnpm run dev:relay

# 3. Ops supervisor in the client submodule (owns caller + responder
#    controllers and the caller-skill HTTP adapter on :8091)
corepack pnpm run dev:client:bootstrap   # one-time: installs the official
                                         # example hotline and registers
                                         # the local responder
corepack pnpm run dev:client:supervisor  # long-running

# 4. (Optional) Ops console for browser-side inspection
corepack pnpm run dev:console
```

Verify before you point any host at the stack:

```bash
curl -sf http://127.0.0.1:8080/healthz    # platform-api
curl -sf http://127.0.0.1:8079/status     # ops supervisor
curl -sf http://127.0.0.1:8091/healthz    # caller-skill adapter
```

All three must return 2xx before starting the MCP adapter.

## Transport selection

| Host | Transport | Notes |
|------|-----------|-------|
| Codex | `streamable_http` (default) | `stdio` only as a local-debug fallback |
| Cursor | `stdio` | Streamable HTTP support tracked in client design docs |
| Claude Code | draft | Follow the Cursor profile until the client guide lands |

Transport selection is a client-side contract; do not invent new defaults in
fourth-repo scripts.

## Stable endpoint contract

`tools/agent-e2e/agent-e2e-test.py` (see `tools/agent-e2e/README.md`)
exercises this contract. It is expected to remain stable across client
bumps; when it changes, the owning PR in `repos/client` must ship a CHG.

Supervisor (`http://127.0.0.1:8079`):

- `GET /status`

Caller-skill adapter (`http://127.0.0.1:8091`):

- `GET  /skills/remote-hotline/catalog?query=&capability=&task_type=`
- `POST /skills/remote-hotline/preflight`
- `POST /skills/remote-hotline/invoke`
- `PUT  /skills/remote-hotline/policies/{hotline_id}`
- `PUT  /skills/remote-hotline/global-policy`
- `GET  /skills/remote-hotline/approvals/{approval_id}`
- `GET  /skills/remote-hotline/audit?limit=N`

The MCP adapter itself does not add new HTTP endpoints; it only maps these
into MCP tools.

## Validation ladder

1. Boot the stack (steps 1-3 above) and pass the three healthchecks.
2. Run the scripted end-to-end check:

   ```bash
   DEEPSEEK_API_KEY=... corepack pnpm run test:agent-e2e
   ```

   This exercises the full catalog + preflight + invoke + approvals + audit
   loop against the client-side surface. Failure here is a client-side bug,
   not a fourth-repo bug.

3. Start the MCP adapter in the transport the host expects (see the per-host
   guides).
4. From the host, run the "golden four" checks:
   - Tool discovery lists the six `caller_skill.*` tools.
   - `search_hotlines_brief` returns at least the bundled example hotline
     (`local.delegated-execution.workspace-summary.v1`).
   - `prepare_request` returns a consent token.
   - `send_request` + `report_response` complete without a platform token
     issued for `local_task_*` ids.

Only after all four pass should a CHG that touches the MCP adapter be marked
`integration_check: passed`.

## Troubleshooting

Stable items we keep re-hitting:

- Port 8080 (platform-api), 8079 (supervisor), 8091 (caller-skill adapter),
  8092 (MCP streamable_http), 4174 (ops console), 4175 (platform console) —
  if any is occupied by an unrelated process, healthchecks will pass
  inconsistently. `lsof -nP -iTCP:<port> -sTCP:LISTEN` before suspecting a
  code regression.
- Docker Desktop must be running before `dev:platform`. Cold-start compose
  can exceed the source-integration-check health timeout; re-run the check
  once the stack reports `healthy`.
- Example hotline id was renamed in CHG-2026-004 from `local.summary.v1`
  to `local.delegated-execution.workspace-summary.v1`. Any script, prompt,
  or host config pinned to the old id will stop returning results.
- The MCP adapter does not poll the platform. Polling stays inside the
  caller-skill / caller-controller loop.

## Scope boundary

This runbook does not define MCP tool schemas, transport wire formats, or
approval semantics. Those live in:

- `repos/client/apps/caller-skill-mcp-adapter/` (implementation)
- `repos/client/docs/planned/design/caller-skill-host-adapters.md`
- `repos/client/docs/planned/design/caller-skill-mcp-adapter.md`

Changes to any of those must land in `repos/client` first, then be bumped
here through a new CHG bundle.
