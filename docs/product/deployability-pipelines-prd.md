# Deployability Pipeline PRDs

> Chinese source: [./deployability-pipelines-prd.zh-CN.md](./deployability-pipelines-prd.zh-CN.md)
> Note: the Chinese document is authoritative.

Updated: 2026-06-06

## Pipeline A: Local Agent Loop

Goal: make the local caller-skill/MCP loop the fastest development path.

Required commands:

- `corepack pnpm run dev:doctor`
- `corepack pnpm run dev:local:plan`
- `corepack pnpm run dev:local:up`
- `corepack pnpm run dev:local:status`
- `corepack pnpm run dev:local:logs`
- `corepack pnpm run test:agent-e2e`
- `corepack pnpm run test:local-stack`
- `corepack pnpm run test:mcp-golden-four`
- `corepack pnpm run mcp:golden-four`
- `corepack pnpm run dev:client:bootstrap`
- `corepack pnpm run dev:client:supervisor`

Acceptance:

- doctor passes
- one-command local bootstrap starts platform, relay, client bootstrap, and
  supervisor in the documented order
- managed relay/supervisor status, logs, and down commands are available
- six caller-skill actions are visible
- bundled workspace-summary Hotline can run end to end
- executable MCP golden-four smoke validates tool discovery, hotline search,
  request preparation, signed result delivery, and report recovery
- docs and brand-site describe this as the fastest local path

## Pipeline B: Self-host Platform Profile

Goal: make `repos/platform/deploy/platform` safe to initialize and inspect.

Required commands:

- `corepack pnpm run selfhost:init`
- `corepack pnpm run selfhost:preflight`
- `corepack pnpm run selfhost:status`
- `corepack pnpm run selfhost:smoke`
- `corepack pnpm run selfhost:security-review`
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
- preflight checks secret hygiene, compose config, and routes before `up`,
  without requiring services to be running
- `selfhost:up` reuses the preflight gate by default; it does not continue
  when preflight fails unless `--force` is passed explicitly
- logs can be filtered by service and tail length
- backup and rotation are explicit plans before destructive action
- security review is a non-destructive public exposure gate that checks secret
  hygiene, compose config, route contracts, and backup/rotation/smoke
  prerequisites
- selfhost kit has automated coverage for env creation and secret rotation dry-run/confirm behavior
- no command prints secret values

## Pipeline C: Public Stack Profile

Goal: make `repos/platform/deploy/public-stack` understandable before public exposure.

Required behavior:

- `--profile public-stack` support in self-host helper
- generated admin and bootstrap secrets
- public route list
- `selfhost:preflight -- --profile public-stack` checks public routes and
  exposure blockers before `up`
- `selfhost:security-review -- --profile public-stack` checks the public
  exposure contract without starting services
- `selfhost:up -- --profile public-stack` is blocked by preflight by default
  so unsafe public origins are not started accidentally
- clear warning when `PUBLIC_SITE_ADDRESS` is still localhost
- public-stack smoke fails when the public origin is still unsafe
- `selfhost:smoke -- --profile public-stack` checks the public route contract,
  not only health endpoint reachability

Acceptance:

- operator can inspect ports, routes, and secrets status before `up`
- operator can run one non-destructive command to review public exposure
  readiness before treating the stack as ready to expose
- smoke lists and validates edge routes for `/healthz`, `/platform/healthz`,
  `/relay/healthz`, `/gateway/healthz`, and `/console/`
- docs describe platform, relay, gateway, console, and edge roles

## Pipeline D: Management Console

Goal: move operational state from terminal-only checks into console surfaces.

Acceptance:

- runtime page shows platform, relay, caller, responder, skill adapter, MCP adapter
- settings page explains local/public mode and approval policies
- logs page can guide users without dumping secrets
- billing readiness is explicit instead of implied
- Platform Console has an admin-only `/billing` page for tenant setup, balance
  inspection, manual recharge capture, and ledger review through the gateway
  proxy
- public-stack `/console/` and gateway session flow are explained and
  validated as the operator's first-use entry point

## Pipeline E: Brand Site

Goal: make the public narrative match the deployability work.

Acceptance:

- homepage/docs explain the deployment profiles
- `/docs/deployability-profiles` and `/en/docs/deployability-profiles` explain
  Local Agent Loop, Selfhost Platform, Public Stack, Management Console,
  ready-now versus planned boundaries, and secret-safety defaults
- console prototype highlights management rather than only visual polish
- self-host messaging is honest about what is ready now versus planned
- brand-site build and deployability-content smoke pass

## Pipeline F: Published Image Release Smoke

Goal: provide a fourth-repo entry point for public-stack published-image
validation without copying the release implementation owned by `repos/platform`.

Required commands:

- `corepack pnpm run published-image:plan`
- `corepack pnpm run published-image:smoke`
- `corepack pnpm run test:published-image-smoke`

Required behavior:

- plan prints resolved registry/tag refs for `rsp-platform`, `rsp-relay`, and
  `rsp-gateway`
- plan validates that the three release images in
  `repos/platform/deploy/public-stack/docker-compose.yml` are parameterized by
  `IMAGE_REGISTRY` and `IMAGE_TAG`
- smoke delegates to `repos/platform` `test:public-stack-smoke`
- smoke sets `COMPOSE_NO_BUILD=true` by default so platform smoke pulls
  published images instead of building locally
- smoke uses strict Docker mode by default; only explicit `--allow-skip`
  permits local probe-style skipping
- command output shows only registry, tag, and command shape, never admin keys,
  bootstrap secrets, or `.env` values

Acceptance:

- operators can review the exact images and delegated platform smoke command
  before running Docker
- `--image-registry` and `--image-tag` support candidate release tags
- dry-run validates the orchestration contract without Docker
- real container startup, health, and gateway scenario checks remain owned by
  `repos/platform`

## Pipeline G: Operator Onboarding Contract

Goal: turn platform-first/operator-first onboarding from a runbook into a
fourth-repo-checkable first-use contract.

Required commands:

- `corepack pnpm run operator:onboarding:plan`
- `corepack pnpm run operator:onboarding:check`
- `corepack pnpm run test:operator-onboarding`

Required behavior:

- plan prints the public-stack first-use order: preflight, `up`, open
  `/console/`, gateway session setup, credential persistence, route smoke, and
  published-image smoke
- check validates that public-stack `Caddyfile`, compose, and README agree on
  `/console/`, `/gateway/*`, and `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`
- check validates that the platform operator guide no longer claims
  `platform-console` is not bundled
- check validates that the fourth-repo source operator runbook still covers
  both automatic approval and manual approval pause branches
- check validates that brand-site Deployability Profiles mark Operator
  Onboarding as a verifiable path, not as planned

Acceptance:

- an operator can find the public-stack first-use URL, admin credential setup
  flow, and gateway proxy verification path without reading the full protocol
- fourth-repo check fails when docs drift away from the actual public-stack
  route contract
- this path still does not claim billing, email transport, or marketplace
  production readiness as complete
- billing management evidence is limited to the admin-only Platform Console
  page and must not be presented as end-user billing readiness
