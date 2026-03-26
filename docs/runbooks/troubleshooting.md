# Troubleshooting

## Submodule Issues

### Submodule not initialized

```bash
git submodule update --init --recursive
```

### Submodule is in detached HEAD state after checkout

This is expected after `git submodule update`. It means the submodule is pinned to the SHA recorded in the fourth-repo. To work on a branch:

```bash
git -C repos/client checkout <branch-name>
```

### Submodule SHA check fails

The check `pnpm run check:submodules` verifies that each submodule SHA is reachable in the remote. Ensure you have fetched the latest refs:

```bash
git -C repos/protocol fetch origin
git -C repos/client fetch origin
git -C repos/platform fetch origin
```

---

## Workspace Install Issues

### `pnpm install` fails or hangs

Ensure corepack is enabled and pnpm version matches `packageManager` in `package.json`:

```bash
corepack enable
corepack pnpm install
```

### Peer dependency warnings or conflicts

For local development only:

```bash
corepack pnpm install --no-strict-peer-dependencies
```

Do not use `--legacy-peer-deps` with npm directly; always use pnpm through corepack in this workspace.

---

## Contract and Boundary Issues

### Platform or client picked up an old `@delexec/contracts` package

Refresh the local shared contract overlays before running cross-repo checks:

```bash
corepack pnpm run sync:local-contracts
```

If you previously ran `npm install` inside `repos/platform`, run the sync command again before `test:contracts` or `test:integration`.

### Boundary check failures

Review `tools/project-boundaries.yaml` and check for newly introduced cross-boundary imports. See [Boundary Rules](../architecture/boundary-rules.md).

Nx will print the specific file and import that violates the boundary:

```
NX  Cannot import from @delexec/platform-api in group client/*
    File: repos/client/apps/ops/src/config.js
```

The fix must land in the **owning** repository (the repo that contains the importing file). Do not add exceptions to `tools/project-boundaries.yaml` without team review.

### Bundle check fails

Every submodule SHA update must have a corresponding change bundle YAML under `changes/`. Create one:

```bash
# changes/YYYYMMDD-description.yaml
bundle_type: update
protocol_sha: <sha>
client_sha: <sha>
platform_sha: <sha>
reason: "<description>"
```

---

## Integration Test Issues

### Source integration fails to start

1. Ensure platform `.env` is configured (see `docs/runbooks/local-dev-setup.md`).
2. Check that Docker is running (required for platform deployment).
3. Verify all submodules are on the expected commits: `git submodule status`.
4. Check for port conflicts: `lsof -i :8080 -i :8090 -i :3000`.

### `test:integration` passes locally but fails in CI

Likely cause: a formal repo dependency was resolved from npm (published version) in CI but from the local workspace in your environment. Run:

```bash
corepack pnpm run sync:local-contracts
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

### E2E tests time out on Docker startup

Increase Docker resource limits (CPU/memory) in Docker Desktop settings. The default 2GB memory limit may be insufficient for the full stack.

---

## Platform-Specific Issues

### `exec format error` on macOS Apple Silicon

Enable Rosetta for x86 images:

```bash
softwareupdate --install-rosetta
```

Or use `--platform linux/amd64` in your Docker commands.

### SQLite database locked

Multiple processes are competing for the same SQLite file. Stop all running dev servers:

```bash
lsof +D repos/ | grep ".sqlite" | awk '{print $2}' | sort -u | xargs kill -9 2>/dev/null || true
```

### Platform API `DATABASE_URL` connection refused

The PostgreSQL container may not be healthy yet. Wait for the healthcheck to pass:

```bash
docker compose ps
# Wait for postgres to show "(healthy)"
```
