# Deployability Pipeline PRDs

> Chinese source: [./deployability-pipelines-prd.zh-CN.md](./deployability-pipelines-prd.zh-CN.md)
> Note: the Chinese document is authoritative.

Updated: 2026-06-06

## Pipeline A: Local Agent Loop

Goal: make the local caller-skill/MCP loop the fastest development path.

Required commands:

- `corepack pnpm run dev:doctor`
- `corepack pnpm run test:agent-e2e`
- `corepack pnpm run dev:client:bootstrap`
- `corepack pnpm run dev:client:supervisor`

Acceptance:

- doctor passes
- six caller-skill actions are visible
- bundled workspace-summary Hotline can run end to end
- docs and brand-site describe this as the fastest local path

## Pipeline B: Self-host Platform Profile

Goal: make `repos/platform/deploy/platform` safe to initialize and inspect.

Required commands:

- `corepack pnpm run selfhost:init`
- `corepack pnpm run selfhost:status`
- `corepack pnpm run selfhost:smoke`
- `corepack pnpm run selfhost:config`
- `corepack pnpm run selfhost:plan`
- `corepack pnpm run selfhost:urls`
- `corepack pnpm run selfhost:logs`
- `corepack pnpm run selfhost:backup-plan`
- `corepack pnpm run selfhost:rotate-plan`
- `corepack pnpm run test:selfhost-kit`

Acceptance:

- `.env` is created from `.env.example` when missing
- placeholder secrets are replaced with generated values
- status shows Docker compose state and health endpoints
- smoke checks secret hygiene, compose config, and health endpoints
- logs can be filtered by service and tail length
- backup and rotation are explicit plans before destructive action
- selfhost kit has automated coverage for env creation and secret rotation dry-run/confirm behavior
- no command prints secret values

## Pipeline C: Public Stack Profile

Goal: make `repos/platform/deploy/public-stack` understandable before public exposure.

Required behavior:

- `--profile public-stack` support in self-host helper
- generated admin and bootstrap secrets
- public route list
- clear warning when `PUBLIC_SITE_ADDRESS` is still localhost
- public-stack smoke fails when the public origin is still unsafe

Acceptance:

- operator can inspect ports, routes, and secrets status before `up`
- docs describe platform, relay, gateway, console, and edge roles

## Pipeline D: Management Console

Goal: move operational state from terminal-only checks into console surfaces.

Acceptance:

- runtime page shows platform, relay, caller, responder, skill adapter, MCP adapter
- settings page explains local/public mode and approval policies
- logs page can guide users without dumping secrets
- billing readiness is explicit instead of implied

## Pipeline E: Brand Site

Goal: make the public narrative match the deployability work.

Acceptance:

- homepage/docs explain the deployment profiles
- console prototype highlights management rather than only visual polish
- self-host messaging is honest about what is ready now versus planned
