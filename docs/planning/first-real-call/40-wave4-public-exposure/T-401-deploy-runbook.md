# T-401 public-stack deployment runbook

Status: agent-prepared, manual deployment pending.

Generated from:

- `corepack pnpm --silent run deployability:exposure -- --json`
- `corepack pnpm --silent run deployability:recipe -- --profile public-stack --json`
- `corepack pnpm run operator:onboarding:check`

## Current Gate Result

Public exposure is still blocked.

The current blocker is:

- `PUBLIC_SITE_ADDRESS` is still `http://localhost`; set it to the real public HTTPS origin before exposing public-stack.

The route contract is present for:

- `/healthz`
- `/platform/healthz`
- `/relay/healthz`
- `/gateway/healthz`
- `/console/`

The operator onboarding contract check passed:

- public-stack console and gateway setup are documented
- platform operator guide no longer says public-stack lacks bundled console
- source operator branch runbook still documents automatic and manual approval branches
- brand-site operator narrative exposes the verifiable operator path

## VPS Requirements

Prepare a VPS with:

- Docker and Docker Compose available to the deployment user
- ports `80` and `443` open to the internet
- enough disk for Postgres, relay SQLite data, gateway secret store, and Caddy state
- DNS `A` or `AAAA` record for the public hostname pointing to the VPS
- a concrete release image tag available in GHCR; do not use `latest` for first public exposure

## Secret Preparation

Do not paste secret values into chat, tickets, screenshots, or logs.

Use the selfhost tooling or an equivalent secret manager to generate:

- `TOKEN_SECRET`
- `PLATFORM_ADMIN_API_KEY`
- `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`
- `POSTGRES_PASSWORD`

Recommended local planning command:

```bash
corepack pnpm run selfhost:init -- --profile public-stack
```

The public-stack `.env.example` now documents:

- `PUBLIC_SITE_ADDRESS` must become a real HTTPS origin
- `IMAGE_TAG` must be a concrete release tag
- placeholder secrets must be replaced
- `BILLING_ENFORCEMENT=enforced` is required for the first paid-call path

## Configure Public Origin

Plan the public origin update first:

```bash
corepack pnpm run selfhost:public-origin -- --profile public-stack --origin https://<domain>
corepack pnpm --silent run selfhost:public-origin -- --profile public-stack --origin https://<domain> --json
```

Apply only after confirming the domain:

```bash
corepack pnpm run selfhost:public-origin -- --profile public-stack --origin https://<domain> --confirm
```

## Public-Stack Startup Sequence

Run in this order on the deployment host:

```bash
corepack pnpm run selfhost:readiness -- --profile public-stack
corepack pnpm run selfhost:ports -- --profile public-stack
corepack pnpm run selfhost:preflight -- --profile public-stack
corepack pnpm run selfhost:security-review -- --profile public-stack
```

Do not continue if the security review reports blockers.

Start services:

```bash
corepack pnpm run selfhost:up -- --profile public-stack
```

Verify public routes:

```bash
curl -fsS "https://<domain>/healthz"
curl -fsS "https://<domain>/platform/healthz"
curl -fsS "https://<domain>/relay/healthz"
curl -fsS "https://<domain>/gateway/healthz"
curl -fsS "https://<domain>/console/"
```

Then run:

```bash
corepack pnpm run selfhost:smoke -- --profile public-stack
corepack pnpm run operator:onboarding:check
corepack pnpm run published-image:smoke -- --dry-run --image-tag <candidate-tag>
corepack pnpm run deployability:exposure
```

## First Console Bootstrap

Open:

```text
https://<domain>/console/
```

Use `PLATFORM_CONSOLE_BOOTSTRAP_SECRET` only for first setup or passphrase recovery. Store `PLATFORM_ADMIN_API_KEY` through the gateway credential flow so the browser does not keep the admin key.

After bootstrap:

- rotate or escrow the bootstrap secret according to the operator policy
- keep the console passphrase separate from the admin API key
- do not share screenshots containing credential state details

## Billing Check

Before OPC #0:

```bash
corepack pnpm run test:paid-call-e2e
```

For the production env, confirm:

```text
BILLING_ENFORCEMENT=enforced
```

After a manual recharge and paid call, verify:

- caller `/v1/tenants/me/balance`
- caller `/v1/tenants/me/ledger`
- platform console `/billing`

## Backup And Operations

Before inviting a real Caller:

```bash
corepack pnpm run selfhost:backup-plan -- --profile public-stack
corepack pnpm run selfhost:ops-report -- --profile public-stack
corepack pnpm run deployability:evidence -- --profile public-stack
```

Normal operations:

```bash
corepack pnpm run selfhost:status -- --profile public-stack
corepack pnpm run selfhost:logs -- --profile public-stack
corepack pnpm run selfhost:down -- --profile public-stack
```

## Stop Conditions

Stop and open a follow-up card if:

- `deployability:exposure` has any blocker after setting the public origin
- `selfhost:security-review -- --profile public-stack` reports blocker status
- GHCR cannot pull the fixed `IMAGE_TAG`
- `/console/` is reachable but gateway credential setup fails
- billing is not enforced in production env
- the paid-call e2e fails after public-stack env changes
