# Integration Path

## Overview

Source integration is the baseline integration path required for fourth-repo certification. It verifies that a specific SHA combination of `repos/protocol` + `repos/client` + `repos/platform` can complete a full task request/response cycle from source — without relying on published npm packages or Docker images.

## Integration Components

| Component | Repository | Role |
|-----------|------------|------|
| Platform API | `repos/platform` | Issues task tokens, manages hotline catalog, routes delivery |
| Transport Relay | `repos/platform` | In-process relay for local transport |
| Platform Console Gateway | `repos/platform` | WebSocket gateway for platform console UI |
| Caller Controller | `repos/client` | Submits task contracts, polls for results |
| Responder Controller | `repos/client` | Receives tasks, executes, returns signed results |
| `delexec-ops` CLI | `repos/client` | End-to-end operator tool for local orchestration |

## Integration Flow

```
delexec-ops CLI
    │
    ├─► POST /v1/responders/register  (register hotline)
    │       Platform API
    │           └─► stores catalogItem + templateBundle
    │
    ├─► POST /v1/admin/review         (approve hotline)
    │       Platform API
    │           └─► sets status=enabled, review_status=approved
    │
    ├─► POST /v1/tokens/task          (request task token)
    │       Platform API
    │           └─► issues JWT → caller
    │
    ├─► Caller Controller sends task contract via relay
    │       Transport Relay
    │           └─► delivers to Responder Controller
    │
    ├─► Responder Controller executes task
    │       └─► POST /v1/tokens/introspect (validate token)
    │       └─► signs result with Ed25519 private key
    │       └─► returns result via relay
    │
    └─► Caller Controller receives signed result
            └─► verifies signature against registered public key
```

## Step-by-Step Commands

```bash
# Step 1: Install workspace (local protocol source, not npm release)
corepack pnpm install
corepack pnpm run sync:local-contracts

# Step 2: Start Platform (API + PostgreSQL + relay)
corepack pnpm run dev:platform

# Step 3: Start standalone relay (for local transport)
corepack pnpm run dev:relay

# Step 4: Bootstrap client (register example responder + hotline)
corepack pnpm run dev:client:bootstrap

# Step 5: Check registration status
corepack pnpm run dev:client:status

# Step 6: Approve the example hotline (operator action)
corepack pnpm run dev:approve-example

# Step 7: Run integration test suite
corepack pnpm run test:integration
```

## Certification Criteria

The fourth-repo certifies that a specific SHA combination:

1. Installs cleanly with `workspace:*` links (local protocol source)
2. Passes `check:boundaries` — no cross-boundary imports
3. Passes `check:bundles` — every SHA change has a bundle YAML
4. Passes `test:contracts` — `@delexec/contracts` unit tests pass
5. Completes the full source integration flow without errors
6. All integration test assertions pass (token issuance, delivery, signature verification)

## Troubleshooting Integration Issues

### Platform API not accepting registrations

Verify the bootstrap environment is running and healthy:

```bash
docker compose -f repos/platform/deploy/platform/docker-compose.yml ps
```

Check platform API logs for startup errors:

```bash
docker compose -f repos/platform/deploy/platform/docker-compose.yml logs platform-api
```

### Token introspection failing

Ensure both client and platform are using the same `TOKEN_SECRET` environment variable. In source integration, this defaults to a dev constant — check `.env` files are consistent.

### Signature verification failing

The Responder must have registered its Ed25519 public key before task submission. Re-run `dev:client:bootstrap` to ensure registration completed successfully.
