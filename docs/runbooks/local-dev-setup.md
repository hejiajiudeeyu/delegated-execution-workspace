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
corepack pnpm run dev:local:up
corepack pnpm run dev:local:status

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
```

Inspect managed process logs with:

```bash
corepack pnpm run dev:local:logs -- --service relay --tail 80
corepack pnpm run dev:local:logs -- --service supervisor --tail 80
```

Optional console UI for browser-side inspection still runs separately:

```bash
corepack pnpm run dev:console   # gateway on :8079 + ops-console UI on :4174
```

Check the daily local stack health:

```bash
corepack pnpm run dev:doctor
corepack pnpm run test:agent-e2e
corepack pnpm run mcp:golden-four
corepack pnpm run test:local-stack
corepack pnpm run test:selfhost-kit
```

Initialize and inspect a self-host profile:

```bash
corepack pnpm run selfhost:profiles
corepack pnpm run selfhost:quickstart
corepack pnpm run selfhost:readiness -- --all
corepack pnpm run selfhost:readiness
corepack pnpm run selfhost:doctor
corepack pnpm run selfhost:init
corepack pnpm run selfhost:summary
corepack pnpm run selfhost:plan
corepack pnpm run selfhost:urls
corepack pnpm run selfhost:preflight
corepack pnpm run selfhost:status
corepack pnpm run selfhost:smoke
```

For the public operator stack:

```bash
corepack pnpm run selfhost:quickstart -- --profile public-stack
corepack pnpm run selfhost:readiness -- --profile public-stack
corepack pnpm run selfhost:doctor -- --profile public-stack
corepack pnpm run selfhost:init -- --profile public-stack
corepack pnpm run selfhost:summary -- --profile public-stack
corepack pnpm run selfhost:urls -- --profile public-stack
corepack pnpm run selfhost:preflight -- --profile public-stack
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm run selfhost:status -- --profile public-stack
corepack pnpm run selfhost:smoke -- --profile public-stack
```

`selfhost:up` automatically runs the same preflight gate first. If public origin
or secret hygiene checks fail, it will not start the profile by default; passing
`--force` is the explicit override.

`selfhost:profiles` is the read-only deployment map. It lists the built-in
profiles, purpose, deploy directory, service count, declared host ports, and
the matching `selfhost:doctor` command without reading `.env` or touching
Docker.

`selfhost:quickstart` prints the recommended command sequence for a selected
profile without executing it. Use it when you want the shortest copy-paste
path from profile discovery to doctor, init, summary, preflight, up, smoke, and
handoff evidence.

`selfhost:readiness -- --all` prints a read-only readiness matrix for every
built-in profile. `selfhost:readiness` prints the same kind of deployment
overview for one selected profile. Both combine profile file presence, `.env`
status, secret hygiene, public-stack origin/route blockers, URLs, declared host
ports, and next commands without calling Docker, binding ports, probing the
network, mutating files, or printing secret values.

`selfhost:doctor` is the earliest read-only deployment diagnostic. It checks
local tool visibility, profile files, `.env` presence, and secret/public-origin
hygiene, then prints the next commands without calling `docker compose`,
starting services, probing the network, or printing secret values.

`selfhost:summary` is the read-only one-screen overview for a selected profile.
It prints deploy paths, URLs, declared host ports, secret hygiene status, and
next commands without calling Docker, binding sockets, probing the network, or
printing secret values.

`selfhost:security-review` is the non-destructive public exposure review. It
reuses secret hygiene, compose config, and public route-contract checks, then
prints the backup, rotation, and smoke commands to run before treating a public
stack as exposure-ready. It does not print secret values.

Validate published public-stack images:

```bash
corepack pnpm run published-image:plan
corepack pnpm run published-image:smoke -- --image-registry ghcr.io/hejiajiudeeyu --image-tag latest
corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>
corepack pnpm run test:published-image-smoke
```

`published-image:smoke` sets `COMPOSE_NO_BUILD=true` and
`STRICT_COMPOSE_SMOKE=true` by default, then delegates to the `repos/platform`
public-stack smoke. Use `--dry-run` when you only want to inspect the command
shape; pass `--allow-skip` only when you explicitly allow a no-Docker local
probe to skip.

Check the operator first-use contract:

```bash
corepack pnpm run operator:onboarding:plan
corepack pnpm run operator:onboarding:check
corepack pnpm run test:operator-onboarding
```

Operational helpers:

```bash
corepack pnpm run selfhost:logs -- --service platform-api --tail 80
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm run selfhost:ops-report -- --profile public-stack
corepack pnpm run selfhost:security-review -- --profile public-stack
corepack pnpm run selfhost:audit-export -- --profile public-stack
corepack pnpm run selfhost:backup-plan
corepack pnpm run selfhost:backup-validate -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm run selfhost:restore-plan -- --profile public-stack --backup-dir backups/selfhost/public-stack/<stamp>
corepack pnpm run selfhost:rotate-plan
corepack pnpm run selfhost:rotate -- --confirm
```

`selfhost:audit-export` reads the selected profile `.env`, calls the platform
admin audit endpoint, and writes a JSON artifact under `exports/audit/<profile>/`
unless `--output` is provided. It uses the admin key for the request but never
prints that key.

`selfhost:ops-report` writes a Markdown handoff report under
`exports/selfhost/<profile>/` unless `--output` is provided. It includes URLs,
host ports, secret hygiene status, and next commands, but never writes raw
secret values.

`selfhost:ports` prints the declared host ports for the selected profile without
binding sockets or calling Docker. Use it before `selfhost:up` when checking for
local port conflicts.

`selfhost:backup-validate` checks a backup directory for `.env`, `postgres.sql`,
and `compose.config.txt` presence and size before restore rehearsal. It does not
read or print `.env` values.

`selfhost:restore-plan` is also plan-only. It prints the downtime, `.env`
review, `postgres.sql` import, restart, and smoke-validation sequence for a
backup directory without copying files, importing SQL, or stopping services.

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
