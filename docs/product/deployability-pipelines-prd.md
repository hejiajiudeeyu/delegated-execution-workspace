# Deployability Pipeline PRDs

> Chinese source: [./deployability-pipelines-prd.zh-CN.md](./deployability-pipelines-prd.zh-CN.md)
> Note: the Chinese document is authoritative.

Updated: 2026-06-06

## Pipeline A: Local Agent Loop

Goal: make the local caller-skill/MCP loop the fastest development path.

Required commands:

- `corepack pnpm run dev:doctor`
- `corepack pnpm run dev:local:plan`
- `corepack pnpm --silent run dev:local:plan -- --json`
- `corepack pnpm run dev:local:up`
- `corepack pnpm run dev:local:status`
- `corepack pnpm --silent run dev:local:status -- --json`
- `corepack pnpm run dev:local:logs`
- `corepack pnpm --silent run dev:local:logs -- --json`
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
- `dev:local:plan -- --json` returns the same boot sequence, state directory,
  managed service pid/log files, and safety notes without starting services or
  reading secrets
- `dev:local:status -- --json` returns relay/supervisor running state, pid/log
  metadata, and next verification commands without printing secret values
- `dev:local:logs -- --json` returns log file presence and line-count metadata
  without printing raw log lines because local relay/supervisor logs may contain
  sensitive runtime output
- six caller-skill actions are visible
- bundled workspace-summary Hotline can run end to end
- executable MCP golden-four smoke validates tool discovery, hotline search,
  request preparation, signed result delivery, and report recovery
- docs and brand-site describe this as the fastest local path

## Pipeline B: Self-host Platform Profile

Goal: make `repos/platform/deploy/platform` safe to initialize and inspect.

Required commands:

- `corepack pnpm run selfhost:init`
- `corepack pnpm run selfhost:profiles`
- `corepack pnpm --silent run selfhost:profiles -- --json`
- `corepack pnpm run selfhost:quickstart`
- `corepack pnpm --silent run selfhost:quickstart -- --json`
- `corepack pnpm run selfhost:readiness -- --all`
- `corepack pnpm --silent run selfhost:readiness -- --all --json`
- `corepack pnpm run selfhost:readiness`
- `corepack pnpm --silent run selfhost:readiness -- --json`
- `corepack pnpm run selfhost:doctor`
- `corepack pnpm --silent run selfhost:doctor -- --json`
- `corepack pnpm run selfhost:preflight`
- `corepack pnpm --silent run selfhost:preflight -- --json`
- `corepack pnpm run selfhost:up`
- `corepack pnpm --silent run selfhost:up -- --json`
- `corepack pnpm run selfhost:status`
- `corepack pnpm --silent run selfhost:status -- --json`
- `corepack pnpm run selfhost:smoke`
- `corepack pnpm --silent run selfhost:smoke -- --json`
- `corepack pnpm run selfhost:security-review`
- `corepack pnpm --silent run selfhost:security-review -- --json`
- `corepack pnpm run selfhost:audit-export`
- `corepack pnpm --silent run selfhost:audit-export -- --json`
- `corepack pnpm run selfhost:config`
- `corepack pnpm --silent run selfhost:config -- --json`
- `corepack pnpm run selfhost:plan`
- `corepack pnpm --silent run selfhost:plan -- --json`
- `corepack pnpm run selfhost:summary`
- `corepack pnpm --silent run selfhost:summary -- --json`
- `corepack pnpm run selfhost:urls`
- `corepack pnpm --silent run selfhost:urls -- --json`
- `corepack pnpm run selfhost:ports`
- `corepack pnpm --silent run selfhost:ports -- --json`
- `corepack pnpm run selfhost:logs`
- `corepack pnpm --silent run selfhost:logs -- --json`
- `corepack pnpm run selfhost:down`
- `corepack pnpm --silent run selfhost:down -- --json`
- `corepack pnpm run selfhost:ops-report`
- `corepack pnpm --silent run selfhost:ops-report -- --json`
- `corepack pnpm run selfhost:backup-plan`
- `corepack pnpm --silent run selfhost:backup-plan -- --json`
- `corepack pnpm run selfhost:backup-validate`
- `corepack pnpm --silent run selfhost:backup-validate -- --backup-dir <dir> --json`
- `corepack pnpm run selfhost:restore-plan`
- `corepack pnpm --silent run selfhost:restore-plan -- --backup-dir <dir> --json`
- `corepack pnpm run selfhost:rotate-plan`
- `corepack pnpm --silent run selfhost:rotate-plan -- --json`
- `corepack pnpm run test:selfhost-kit`

Acceptance:

- `.env` is created from `.env.example` when missing
- placeholder secrets are replaced with generated values
- profiles lists built-in deployment profiles, purpose, deploy directories,
  service counts, declared host ports, and matching doctor commands without
  reading `.env` or touching Docker; `--json` returns the same profile selector
  data for consoles, dashboards, and scripts
- quickstart prints the recommended copy-paste command sequence for the
  selected profile without executing Docker, mutating files, or printing
  secrets; `--json` returns the same ordered sequence for consoles and scripts
- readiness prints a read-only deployment overview for one profile, and
  `readiness --all` prints a built-in profile matrix; both combine profile file
  presence, `.env` status, secret hygiene, public-stack origin/route blockers,
  URLs, declared host ports, and next commands without executing Docker,
  mutating files, probing the network, binding sockets, or printing secrets;
  `--json` prints machine-readable `ok`, `blockers`, and `next` fields for the
  same single-profile or all-profile readiness checks
- doctor checks local tool visibility, profile files, `.env` presence, and
  secret/public-origin hygiene without calling `docker compose`, starting
  services, probing the network, or printing secrets; `--json` returns the same
  checks, blocker status, and next commands for dashboards and scripts with the
  same exit-code semantics
- status shows Docker compose state and health endpoints; `--json` returns the
  same runtime service state, secret hygiene status, health checks, blockers,
  and safety notes for dashboards and management scripts without printing
  secret values
- config validates Docker compose config; `--json` returns pass/fail, blocker,
  and stderr metadata for CI, dashboards, and management scripts while omitting
  expanded compose stdout because it can contain environment values
- smoke checks secret hygiene, compose config, public route contract, and health
  endpoints; `--json` returns the same post-start acceptance result, blockers,
  route contract, health metadata, and safety notes for CI, dashboards, and
  management scripts while omitting expanded compose config stdout because it
  can contain environment values
- preflight checks secret hygiene, compose config, and routes before `up`,
  without requiring services to be running; `--json` preserves the same
  exit-code semantics and returns machine-readable secret hygiene, compose
  config, route, blocker, and safety-note fields without printing secret values
- `selfhost:up` reuses the preflight gate by default; it does not continue
  when preflight fails unless `--force` is passed explicitly
- `selfhost:up -- --json` returns machine-readable init, preflight, compose-up,
  blocker, and note fields without printing init, preflight, or Docker compose
  up stdout
- logs can be filtered by service and tail length; `--json` returns command
  metadata, exit status, stderr lines, selected service, and tail size while
  omitting Docker compose logs stdout because application logs may contain
  sensitive values
- down stops the selected profile; `--json` returns command metadata, exit
  status, stderr lines, and blockers while omitting Docker compose down stdout
  because compose output may contain sensitive values
- summary prints a one-screen, read-only profile overview with deploy paths,
  URLs, declared host ports, secret hygiene status, and next commands without
  calling Docker, binding sockets, probing the network, or printing secrets;
  `--json` returns the same overview card data for dashboards and scripts
- plan prints a read-only deployment map with purpose, services, URLs, and
  safety checks without calling Docker or printing secrets; `--json` returns
  the same profile explanation data for dashboards, generated docs, and scripts
- backup and rotation are explicit plans before destructive action
- security review is a non-destructive public exposure gate that checks secret
  hygiene, compose config, route contracts, and backup/rotation/smoke
  prerequisites
- audit export writes platform admin audit events to a local JSON artifact
  without printing admin keys; `--json` returns export metadata including source
  URL, output path, limit, item count, and safety notes without printing the
  admin key or exported audit body
- ops report writes a Markdown handoff artifact with URLs, host ports, secret
  hygiene status, and operator commands without raw secret values; `--json`
  returns the same non-secret handoff data for dashboards, CI, and management
  scripts without writing a Markdown file
- urls prints the selected profile URL inventory without calling Docker,
  binding sockets, probing the network, or printing secrets; `--json` returns
  the same URL inventory for dashboards and scripts
- ports prints declared host port usage for the selected profile without
  binding sockets or calling Docker; `--json` returns the same declared port
  inventory for dashboards and scripts
- backup plan prints the manual backup checklist without copying files,
  dumping the database, or reading secret values; `--json` returns the same
  backup directory, ordered plan steps, next backup-validate command, and
  safety notes for dashboards, CI, and recovery rehearsal scripts
- backup validate checks `.env`, `postgres.sql`, and `compose.config.txt`
  presence/size without reading or printing secret values; `--json` returns
  machine-readable file status, blockers, next restore-plan command, and safety
  notes for dashboards, CI, and recovery rehearsal scripts
- restore plan prints a recovery rehearsal sequence for backup directories
  without stopping services or importing SQL; `--json` returns the same ordered
  recovery steps and safety notes for dashboards, CI, and recovery rehearsal
  scripts
- rotate plan prints the manual secret rotation checklist without reading or
  changing `.env`; `--json` returns the same backup-first, dry-run, confirm,
  restart, smoke-validation steps and safety notes for dashboards, CI, and
  operator runbooks
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
  exposure contract without starting services; `--json` returns the same secret
  hygiene, compose config, route contract, operational prerequisite, blocker,
  and safety-note fields for dashboards and deployment controllers
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
- `corepack pnpm --silent run operator:onboarding:plan -- --json`
- `corepack pnpm run operator:onboarding:check`
- `corepack pnpm run test:operator-onboarding`

Required behavior:

- plan prints the public-stack first-use order: generated env, readiness
  overview, declared port inventory, preflight, `up`, open `/console/`, gateway
  session setup, credential persistence, route smoke, non-secret ops handoff
  report, and published-image smoke
- plan `--json` emits the same first-use phases, commands, safety notes, and
  next validation command for console, CI, and deployment-script consumption
  without parsing terminal prose or printing secrets
- check validates that public-stack `Caddyfile`, compose, and README agree on
  `/console/`, `/gateway/*`, and `PLATFORM_CONSOLE_BOOTSTRAP_SECRET`
- check validates that the platform operator guide no longer claims
  `platform-console` is not bundled
- check validates that the fourth-repo source operator runbook still covers
  both automatic approval and manual approval pause branches plus the
  public-stack `selfhost:readiness`, `selfhost:ports`, and
  `selfhost:ops-report` handoff commands
- check validates that brand-site Deployability Profiles mark Operator
  Onboarding as a verifiable path, not as planned

Acceptance:

- an operator can find the public-stack first-use URL, admin credential setup
  flow, readiness overview, declared ports, non-secret handoff report, and gateway proxy
  verification path without reading the full protocol
- a management surface or CI job can consume the first-use plan as clean JSON
  through `corepack pnpm --silent run operator:onboarding:plan -- --json`
- fourth-repo check fails when docs drift away from the actual public-stack
  route contract
- this path still does not claim billing, email transport, or marketplace
  production readiness as complete
- billing management evidence is limited to the admin-only Platform Console
  page and must not be presented as end-user billing readiness
