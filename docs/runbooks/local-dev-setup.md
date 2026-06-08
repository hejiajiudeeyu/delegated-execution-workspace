# Local Dev Setup

## Prerequisites

- Node.js >= 20
- corepack enabled (`corepack enable`)
- pnpm 10.x (managed via corepack)
- Docker Desktop (for platform deployment and integration tests)
- Git with submodule support

## Setup Steps

### 1. Clone and Initialize Submodules

```bash
git clone <repo-url>
cd delegated-execution-dev
git submodule update --init --recursive
```

### 2. Install Workspace Dependencies

```bash
corepack pnpm install
```

If you change protocol contracts locally and need client/platform validation to consume the in-repo version, refresh the shared package overlays:

```bash
corepack pnpm run sync:local-contracts
```

### 3. Create Environment Files

Copy the example env files for the platform components you need:

```bash
# Platform API + relay (minimum for integration tests)
cp repos/platform/deploy/platform/.env.example repos/platform/deploy/platform/.env

# All-in-one local stack
cp repos/platform/deploy/all-in-one/.env.example repos/platform/deploy/all-in-one/.env 2>/dev/null || true
```

Edit the `.env` files with your local configuration (see comments inside each file).

### 4. Run Fourth-Repo Validation

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

> **Important**: Do not run `npm install` inside `repos/platform` for cross-repo validation. That path resolves the last published `@delexec/contracts` from npm instead of the local protocol source package.

### 5. Start Local Source Integration

```bash
# One-command managed local loop:
corepack pnpm run dev:local:plan
corepack pnpm --silent run dev:local:plan -- --json
corepack pnpm run dev:local:up
corepack pnpm --silent run dev:local:up -- --json
corepack pnpm run dev:local:status
corepack pnpm --silent run dev:local:status -- --json

# Manual fallback, if you want separate terminals:
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
```

`dev:local:up` initializes the `platform` self-host profile, starts the
standalone relay as a managed background process, runs client bootstrap once,
and starts the ops supervisor as a managed background process. Logs and pid files
live under `.run/local-stack/`.

Stop the managed local loop with:

```bash
corepack pnpm run dev:local:down
corepack pnpm --silent run dev:local:down -- --json
```

Inspect managed process logs with:

```bash
corepack pnpm run dev:local:logs -- --service relay --tail 80
corepack pnpm run dev:local:logs -- --service supervisor --tail 80
corepack pnpm --silent run dev:local:logs -- --service supervisor --tail 80 --json
```

`dev:local:plan -- --json` emits the boot sequence and managed service files
without starting services or reading secrets. `dev:local:up -- --json` emits
startup step status without printing child command stdout. `dev:local:status
-- --json` emits managed relay/supervisor state and verification commands.
`dev:local:logs -- --json` emits log file metadata only and does not print raw
log lines, because local agent and supervisor logs can contain sensitive runtime
output. `dev:local:down -- --json` emits stop step status without printing child
command stdout.

Optional console UI for browser-side inspection still runs separately:

```bash
corepack pnpm run dev:console   # gateway on :8079 + ops-console UI on :4174
```

Check the daily local stack health:

```bash
corepack pnpm run deployability:overview
corepack pnpm --silent run deployability:overview -- --json
corepack pnpm run deployability:quickstart
corepack pnpm --silent run deployability:quickstart -- --json
corepack pnpm run deployability:safety
corepack pnpm --silent run deployability:safety -- --json
corepack pnpm run deployability:doctor
corepack pnpm --silent run deployability:doctor -- --json
corepack pnpm run deployability:dashboard
corepack pnpm --silent run deployability:dashboard -- --json
corepack pnpm run deployability:action-plan
corepack pnpm --silent run deployability:action-plan -- --json
corepack pnpm run deployability:action-plan -- --list-profiles
corepack pnpm --silent run deployability:action-plan -- --list-profiles --json
corepack pnpm run deployability:action-plan -- --profile public-stack
corepack pnpm --silent run deployability:action-plan -- --profile public-stack --json
corepack pnpm run deployability:commands
corepack pnpm --silent run deployability:commands -- --json
corepack pnpm run deployability:commands -- --profile public-stack
corepack pnpm --silent run deployability:commands -- --profile public-stack --json
corepack pnpm run compat:status
corepack pnpm --silent run compat:status -- --json
corepack pnpm run deployability:handoff
corepack pnpm --silent run deployability:handoff -- --json
corepack pnpm run test:deployability
corepack pnpm run test:deployability-operations
corepack pnpm run dev:doctor
corepack pnpm --silent run dev:doctor -- --json
corepack pnpm run test:agent-e2e
corepack pnpm run mcp:golden-four
corepack pnpm run test:local-stack
corepack pnpm run test:selfhost-kit
```

`deployability:overview` is the read-only command map for the local,
self-host, public-stack, onboarding, and published-image paths. Its JSON form
lists pipeline commands and safety notes without reading `.env`, calling Docker,
probing networks, or printing secret values.

`deployability:quickstart` is the read-only first-use guide for a fresh
checkout. It lists ordered tracks for daily development, self-host platform,
public-stack exposure review, and release-image review without running those
commands. Its JSON form returns the same track and step metadata without
reading `.env`, calling Docker, probing networks, or printing secret values.

`deployability:safety` is the read-only command posture matrix. It describes
which deployability commands are read-only, write files, start or stop services,
call Docker, probe networks, or print private terminal text. Its JSON form is
safe for dashboards and does not read `.env`, call Docker, probe networks, or
print secret values.

`deployability:doctor` is the read-only deployability alignment snapshot. It
checks the compatibility ledger, top-level scripts, documentation, brand-site
file alignment, brand-site deployability content smoke, and safety contract
before an operator continues to pipeline-specific diagnostics. Its JSON form
reports checks, blockers, warnings, evidence, and next commands without reading
`.env`, calling Docker, probing networks, or printing secret values.

`deployability:dashboard` is the read-only aggregate payload for dashboards and
CI. It combines overview, quickstart, safety, doctor, and compatibility JSON
sections plus per-pipeline summaries without reading `.env`, calling Docker,
binding ports, probing networks, or printing secret values. Profile-specific
readiness, preflight, status, smoke, and audit commands remain authoritative.
The per-pipeline summaries use the same fourth-repo metadata builder as
`deployability:overview` and `deployability:handoff`, so command counts and
safety gate counts stay aligned across docs, dashboard JSON, and handoff
reports.

`deployability:action-plan` is the read-only operator action selector. It
combines the dashboard and command catalog into profile-level recommended
commands, dashboard-safe commands, public-exposure gates, service-touching
commands, safety notes, and next JSON commands without reading `.env`, calling
Docker, binding ports, probing the network, or printing secrets.
Use `--list-profiles` or `--profiles` first when an operator or dashboard
needs the supported profile keys, aliases, pipeline keys, and purposes without
calling the dashboard or command catalog.
The same selector is also present in `deployability:quickstart`,
`deployability:safety`, and `deployability:commands -- --track daily_dev`, so
management surfaces can discover it before rendering a focused action plan.
Use `--profile public-stack` or another profile key/alias when an operator
needs only one focused next-action list. The JSON form includes
`profile_filter` and returns a blocker for unknown profile names.

`deployability:commands` is the read-only command catalog for humans,
dashboards, and CI. It merges overview, quickstart, and safety metadata into
one list that can be filtered by category, posture, first-use track, or
pipeline. It also supports `--profile <key-or-alias>` as the operator-friendly
alias layer over pipeline filters, so `--profile public-stack` returns only the
public-stack command catalog and unknown profile names return clean blockers.
Profile-specific command variants inherit the safety posture of their base
command. It does not read `.env`, call Docker, bind ports, probe networks, or
print secret values.

`compat:status` is the read-only compatibility-ledger snapshot. It compares the
current submodule gitlinks to the latest `changes/CHG-*.yaml`, reports dirty
submodule worktrees as warnings, and keeps ledger mismatches as blockers. Its
JSON form does not read `.env`, call Docker, probe networks, or print secrets.

`deployability:handoff` writes a non-secret Markdown handoff report under
`exports/deployability/` unless `--output` is provided. It combines the current
bundle, compatibility warnings, command map, shared per-pipeline summaries, safety
notes, and next validation commands. Its JSON form writes the same report and
returns metadata without reading `.env`, calling Docker, probing networks, or
printing secret values.

`dev:doctor -- --json` reports local prerequisites, runtime health,
caller-skill manifest/search checks, blockers, and next commands as clean JSON.
It does not print raw service logs or secret values.

Initialize and inspect a self-host profile:

```bash
corepack pnpm run selfhost:profiles
corepack pnpm --silent run selfhost:profiles -- --json
corepack pnpm run selfhost:quickstart
corepack pnpm --silent run selfhost:quickstart -- --json
corepack pnpm run selfhost:readiness -- --all
corepack pnpm --silent run selfhost:readiness -- --all --json
corepack pnpm run selfhost:readiness
corepack pnpm --silent run selfhost:readiness -- --json
corepack pnpm run selfhost:doctor
corepack pnpm --silent run selfhost:doctor -- --json
corepack pnpm run selfhost:init
corepack pnpm --silent run selfhost:init -- --json
corepack pnpm run selfhost:summary
corepack pnpm --silent run selfhost:summary -- --json
corepack pnpm run selfhost:plan
corepack pnpm --silent run selfhost:plan -- --json
corepack pnpm run selfhost:urls
corepack pnpm --silent run selfhost:urls -- --json
corepack pnpm run selfhost:ports
corepack pnpm --silent run selfhost:ports -- --json
corepack pnpm run selfhost:preflight
corepack pnpm --silent run selfhost:preflight -- --json
corepack pnpm run selfhost:up
corepack pnpm --silent run selfhost:up -- --json
corepack pnpm run selfhost:status
corepack pnpm --silent run selfhost:status -- --json
corepack pnpm run selfhost:logs
corepack pnpm --silent run selfhost:logs -- --json
corepack pnpm run selfhost:down
corepack pnpm --silent run selfhost:down -- --json
corepack pnpm run selfhost:smoke
corepack pnpm --silent run selfhost:smoke -- --json
corepack pnpm run selfhost:security-review
corepack pnpm --silent run selfhost:security-review -- --json
corepack pnpm run selfhost:config
corepack pnpm --silent run selfhost:config -- --json
```

For the public operator stack:

```bash
corepack pnpm run selfhost:quickstart -- --profile public-stack
corepack pnpm --silent run selfhost:quickstart -- --profile public-stack --json
corepack pnpm run selfhost:readiness -- --profile public-stack
corepack pnpm --silent run selfhost:readiness -- --profile public-stack --json
corepack pnpm run selfhost:doctor -- --profile public-stack
corepack pnpm --silent run selfhost:doctor -- --profile public-stack --json
corepack pnpm run selfhost:init -- --profile public-stack
corepack pnpm --silent run selfhost:init -- --profile public-stack --json
corepack pnpm run selfhost:summary -- --profile public-stack
corepack pnpm --silent run selfhost:summary -- --profile public-stack --json
corepack pnpm run selfhost:plan -- --profile public-stack
corepack pnpm --silent run selfhost:plan -- --profile public-stack --json
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm --silent run selfhost:urls -- --profile public-stack --json
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm --silent run selfhost:ports -- --profile public-stack --json
corepack pnpm run selfhost:preflight -- --profile public-stack
corepack pnpm --silent run selfhost:preflight -- --profile public-stack --json
corepack pnpm run selfhost:up -- --profile public-stack
corepack pnpm --silent run selfhost:up -- --profile public-stack --json
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm --silent run selfhost:security-review -- --profile public-stack --json
corepack pnpm run selfhost:status -- --profile public-stack
corepack pnpm --silent run selfhost:status -- --profile public-stack --json
corepack pnpm run selfhost:logs -- --profile public-stack
corepack pnpm --silent run selfhost:logs -- --profile public-stack --json
corepack pnpm run selfhost:down -- --profile public-stack
corepack pnpm --silent run selfhost:down -- --profile public-stack --json
corepack pnpm run selfhost:smoke -- --profile public-stack
corepack pnpm --silent run selfhost:smoke -- --profile public-stack --json
corepack pnpm run selfhost:config -- --profile public-stack
corepack pnpm --silent run selfhost:config -- --profile public-stack --json
```

`selfhost:up` automatically runs the same preflight gate first. If public origin
or secret hygiene checks fail, it will not start the profile by default; passing
`--force` is the explicit override. `selfhost:preflight -- --json` keeps the
same gate and exit-code semantics while returning machine-readable secret
hygiene, compose config, route, blocker, and note fields for dashboards or
deployment scripts.

`selfhost:up -- --json` keeps the same init, preflight, and Docker compose
startup sequence while returning machine-readable init, preflight, compose-up,
blockers, and notes. JSON form intentionally omits init, preflight, and Docker
compose up stdout because command output may contain sensitive values.

`selfhost:init -- --json` creates or hardens the selected profile `.env` and
prints clean machine-readable metadata: action, changed files, secret hygiene
statuses, warnings, and next commands. It does not print generated secret values
or URL prose such as the Platform API / Console lines.

`selfhost:status` is the runtime management snapshot after a profile is started.
It calls Docker compose `ps`, checks secret hygiene status, and probes configured
health endpoints without printing secret values. Use
`corepack pnpm --silent run selfhost:status ... --json` when dashboards or
management scripts need compose service state, health checks, blockers, and
safety notes without parsing terminal prose.

`selfhost:smoke` is the post-start acceptance check for secret hygiene, Docker
compose config, public route contract, and configured health endpoints. Use
`corepack pnpm --silent run selfhost:smoke ... --json` when CI, dashboards, or
management scripts need smoke pass/fail, blockers, route contract, and health
metadata without embedding expanded compose stdout.

`selfhost:logs` remains the private-operator raw log view and can be filtered by
`--service` and `--tail`. Use
`corepack pnpm --silent run selfhost:logs ... --json` when dashboards or
management scripts only need command metadata, exit code, stderr lines, service
filter, and tail size; the JSON form intentionally omits Docker compose logs
stdout because application logs may contain sensitive values.

`selfhost:down` stops the selected profile through Docker compose. Use
`corepack pnpm --silent run selfhost:down ... --json` when dashboards,
management scripts, or runbooks need the stop command metadata, exit code,
stderr lines, and blockers; the JSON form intentionally omits Docker compose
down stdout because compose output may contain sensitive values.

`selfhost:config` validates the selected profile's Docker compose config. The
text form prints the compose output for a private operator terminal; the JSON
form intentionally omits compose stdout because expanded compose output can
contain environment values. Use
`corepack pnpm --silent run selfhost:config ... --json` when dashboards or CI
need compose config pass/fail, blocker, and stderr metadata without secret-valued
stdout.

`selfhost:profiles` is the read-only deployment map. It lists the built-in
profiles, purpose, deploy directory, service count, declared host ports, and
the matching `selfhost:doctor` command without reading `.env` or touching
Docker. Use `corepack pnpm --silent run selfhost:profiles -- --json` when a
console, dashboard, or script needs the same profile selector data without
parsing terminal prose.

`selfhost:quickstart` prints the recommended command sequence for a selected
profile without executing it. Use it when you want the shortest copy-paste
path from profile discovery to doctor, init, summary, preflight, up, smoke, and
handoff evidence. Use `corepack pnpm --silent run selfhost:quickstart ... --json`
when a console or script needs the same ordered command sequence without
parsing terminal prose.

`selfhost:readiness -- --all` prints a read-only readiness matrix for every
built-in profile. `selfhost:readiness` prints the same kind of deployment
overview for one selected profile. Both combine profile file presence, `.env`
status, secret hygiene, public-stack origin/route blockers, URLs, declared host
ports, and next commands without calling Docker, binding ports, probing the
network, mutating files, or printing secret values. Use
`corepack pnpm --silent run selfhost:readiness ... --json` when CI,
dashboards, or management scripts need machine-readable `ok`/`blockers`/`next`
output with the same exit-code semantics.

`selfhost:doctor` is the earliest read-only deployment diagnostic. It checks
local tool visibility, profile files, `.env` presence, and secret/public-origin
hygiene, then prints the next commands without calling `docker compose`,
starting services, probing the network, or printing secret values. Use
`corepack pnpm --silent run selfhost:doctor ... --json` when a dashboard or
script needs the same checks, blocker status, and next commands with the same
exit-code semantics.

`selfhost:summary` is the read-only one-screen overview for a selected profile.
It prints deploy paths, URLs, declared host ports, secret hygiene status, and
next commands without calling Docker, binding sockets, probing the network, or
printing secret values. Use `corepack pnpm --silent run selfhost:summary ... --json`
when a dashboard or script needs the same overview card data without parsing
terminal prose.

`selfhost:plan` is the read-only deployment map for a selected profile. It prints
the profile purpose, services, URLs, and safety checks without calling Docker or
printing secret values. Use `corepack pnpm --silent run selfhost:plan ... --json`
when generated docs, dashboards, or scripts need the same profile explanation
data.

`selfhost:urls` prints the selected profile's declared URLs without calling
Docker, binding sockets, probing the network, or printing secret values. Use
`corepack pnpm --silent run selfhost:urls ... --json` when dashboards or
deployment scripts need the same URL inventory without parsing terminal prose.

`selfhost:ports` prints the selected profile's declared host ports without
binding sockets, calling Docker, or probing whether ports are free. Use
`corepack pnpm --silent run selfhost:ports ... --json` when dashboards or
deployment scripts need the same declared port inventory without parsing
terminal prose.

`selfhost:security-review` is the non-destructive public exposure review. It
reuses secret hygiene, compose config, and public route-contract checks, then
prints the backup, rotation, and smoke commands to run before treating a public
stack as exposure-ready. It does not print secret values. Use
`corepack pnpm --silent run selfhost:security-review ... --json` when dashboards
or deployment controllers need machine-readable secret hygiene, compose config,
public route contract, operational prerequisite, blocker, and safety-note fields
without parsing terminal prose.

Validate published public-stack images:

```bash
corepack pnpm run published-image:plan
corepack pnpm --silent run published-image:plan -- --json
corepack pnpm run published-image:smoke -- --image-registry ghcr.io/hejiajiudeeyu --image-tag latest
corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>
corepack pnpm --silent run published-image:smoke -- --dry-run --image-tag <candidate-tag> --json
corepack pnpm run test:published-image-smoke
```

`published-image:plan -- --json` emits the resolved release image refs,
delegated platform smoke command, smoke env metadata, and safety notes without
printing secret env values. `published-image:smoke -- --dry-run --json` emits
the same smoke command metadata plus dry-run result status without running
Docker or printing delegated smoke stdout. `published-image:smoke` sets
`COMPOSE_NO_BUILD=true` and `STRICT_COMPOSE_SMOKE=true` by default, then
delegates to the `repos/platform` public-stack smoke. Use `--dry-run` when you
only want to inspect the command shape; pass `--allow-skip` only when you
explicitly allow a no-Docker local probe to skip.

Check the operator first-use contract:

```bash
corepack pnpm run operator:onboarding:plan
corepack pnpm --silent run operator:onboarding:plan -- --json
corepack pnpm run operator:onboarding:check
corepack pnpm --silent run operator:onboarding:check -- --json
corepack pnpm run test:operator-onboarding
```

Use the `--json` forms when a console, CI job, or deployment script needs the
public-stack first-use phases, commands, safety notes, check results, blockers,
and next validation steps without parsing terminal prose.

Operational helpers:

```bash
corepack pnpm run selfhost:logs -- --service platform-api --tail 80
corepack pnpm --silent run selfhost:logs -- --service platform-api --tail 80 --json
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm --silent run selfhost:urls -- --profile public-stack --json
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm --silent run selfhost:ports -- --profile public-stack --json
corepack pnpm run selfhost:ops-report -- --profile public-stack
corepack pnpm --silent run selfhost:ops-report -- --profile public-stack --json
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm run selfhost:audit-export -- --profile public-stack
corepack pnpm --silent run selfhost:audit-export -- --profile public-stack --json
corepack pnpm run selfhost:backup-plan -- --profile public-stack
corepack pnpm --silent run selfhost:backup-plan -- --profile public-stack --json
corepack pnpm run selfhost:backup-validate -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm --silent run selfhost:backup-validate -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp> --json
corepack pnpm run selfhost:restore-plan -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm --silent run selfhost:restore-plan -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp> --json
corepack pnpm run selfhost:rotate-plan -- --profile public-stack
corepack pnpm --silent run selfhost:rotate-plan -- --profile public-stack --json
corepack pnpm --silent run selfhost:rotate -- --profile public-stack --json
corepack pnpm --silent run selfhost:rotate -- --profile public-stack --confirm --json
corepack pnpm run selfhost:rotate -- --confirm
```

`selfhost:audit-export` reads the selected profile `.env`, calls the platform
admin audit endpoint, and writes a JSON artifact under `exports/audit/<profile>/`
unless `--output` is provided. It uses the admin key for the request but never
prints that key. Use `corepack pnpm --silent run selfhost:audit-export ... --json`
when dashboards, CI, or management scripts need source URL, output path, limit,
item count, and safety notes without printing the admin key or exported audit
body.

`selfhost:ops-report` writes a Markdown handoff report under
`exports/selfhost/<profile>/` unless `--output` is provided. It includes URLs,
host ports, secret hygiene status, and next commands, but never writes raw
secret values. Use `corepack pnpm --silent run selfhost:ops-report ... --json`
when dashboards, CI, or management scripts need the same non-secret handoff
data without creating a Markdown file or parsing terminal prose.

`selfhost:urls` prints the declared URLs for the selected profile without
calling Docker or probing the network. Use it before `selfhost:up` when checking
which local or public routes the profile expects, or use the `--json` form when
a dashboard or script needs the same URL inventory.

`selfhost:ports` prints the declared host ports for the selected profile without
binding sockets or calling Docker. Use it before `selfhost:up` when checking for
local port conflicts, or use the `--json` form when a dashboard or script needs
the same declared port inventory.

`selfhost:backup-plan` is plan-only. It prints the backup directory, `.env`
copy step, PostgreSQL dump command, and compose-config capture command without
copying files, dumping the database, or reading secret values. Use
`corepack pnpm --silent run selfhost:backup-plan ... --json` when dashboards,
CI, or recovery rehearsal scripts need the same ordered plan and next
backup-validate command without parsing terminal prose.

`selfhost:backup-validate` checks a backup directory for `.env`, `postgres.sql`,
and `compose.config.txt` presence and size before restore rehearsal. It does not
read or print `.env` values. Use
`corepack pnpm --silent run selfhost:backup-validate ... --json` when dashboards,
CI, or recovery rehearsal scripts need machine-readable file status, blockers,
and the matching restore-plan command.

`selfhost:restore-plan` is also plan-only. It prints the downtime, `.env`
review, `postgres.sql` import, restart, and smoke-validation sequence for a
backup directory without copying files, importing SQL, or stopping services. Use
`corepack pnpm --silent run selfhost:restore-plan ... --json` when dashboards,
CI, or recovery rehearsal scripts need the same ordered recovery steps without
parsing terminal prose.

`selfhost:rotate-plan` is plan-only. It prints the backup-first, downtime
window, dry-run, confirmed rotation, restart, and smoke-validation checklist
without reading or modifying `.env`. Use
`corepack pnpm --silent run selfhost:rotate-plan ... --json` when dashboards,
CI, or operator runbooks need the same rotation sequence and safety notes
without parsing terminal prose.

`selfhost:rotate -- --json` is the machine-readable dry-run for the selected
profile. It reports the `.env` path, keys that would rotate, next commands, and
safety notes without changing files or printing secret values.
`selfhost:rotate -- --confirm --json` performs the same confirmed rotation as
text mode, writes a `.env.rotate-backup-*` file next to the selected profile
`.env`, and returns changed-file metadata plus restart/smoke next commands
without printing any generated secret values.

Default endpoints:

- Platform API: `http://127.0.0.1:8080`
- Transport relay: `http://127.0.0.1:8090`
- Ops console gateway (supervisor): `http://127.0.0.1:8079`
- Ops console UI (Vite dev server): `http://127.0.0.1:4174`
- Platform console UI (Vite dev server, only via `dev:platform-console`): `http://127.0.0.1:4175`

## Platform-Specific Notes

### macOS (Apple Silicon)

Docker Desktop must be running. Ensure Rosetta emulation is enabled if you encounter `exec format error` on x86 images:

```bash
softwareupdate --install-rosetta
```

### Linux

Ensure Docker daemon is running and your user is in the `docker` group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Windows (WSL2)

Use WSL2 with Ubuntu 22.04+. Docker Desktop with WSL2 backend is recommended. Run all commands inside the WSL2 environment.

## Common Env Issues

| Issue | Resolution |
|-------|------------|
| `pnpm: command not found` | Run `corepack enable` as root or with sudo |
| `ERR_PNPM_PEER_DEP_ISSUES` | Run `pnpm install --no-strict-peer-dependencies` for local dev only |
| Platform API port conflict | Change `PORT` in `.env` |
| SQLite locked error | Stop all running dev servers before re-running tests |

## Submodule Workflow

When working on changes across repos:

```bash
# Update a submodule to a specific branch
git -C repos/client fetch origin
git -C repos/client checkout <branch-name>

# After changes are committed in the formal repo:
git add repos/client
git commit -m "chore: advance client submodule to <description>"
```

Always include a change bundle YAML under `changes/` for any submodule SHA update.
