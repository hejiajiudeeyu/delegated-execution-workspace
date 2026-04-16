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
# Terminal 1: Platform API (docker) + standalone relay
corepack pnpm run dev:platform
corepack pnpm run dev:relay

# Terminal 2: Client bootstrap (registers example responder + hotline)
corepack pnpm run dev:client:bootstrap

# Terminal 3 (optional): Ops console UI for caller-side inspection
corepack pnpm run dev:console   # gateway on :8079 + ops-console UI on :4174
```

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
