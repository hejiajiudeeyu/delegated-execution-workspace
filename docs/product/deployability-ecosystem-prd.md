# Deployability Ecosystem PRD

> Chinese source: [./deployability-ecosystem-prd.zh-CN.md](./deployability-ecosystem-prd.zh-CN.md)
> Note: the Chinese document is authoritative.

Updated: 2026-06-06

## 1. Background

CALL ANYTHING already has the correct repository split:

- `repos/protocol` owns contracts and templates
- `repos/client` owns caller/responder local runtime and agent-facing tools
- `repos/platform` owns platform API, relay, gateway, persistence, and deploy manifests
- the fourth repository owns orchestration, compatibility ledgers, validation, and local cross-repo development
- `repos/brand-site` explains the product and console shape

The next product objective is to make the full architecture as easy to deploy,
manage, understand, and operate safely as projects such as Sub2API and
CLIProxyAPI: one clear deployment path, generated secrets, understandable
management surfaces, health/status commands, and explicit security defaults.

External reference anchors:

- [Sub2API](https://github.com/Wei-Shaw/Sub2API): self-hosted AI API aggregation with Docker deployment, admin UI, data directory, generated secrets, rate limiting, billing, and monitoring.
- [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI): CLI/API proxy management with Docker deployment, management API, hot reload, Web UI, logging, dashboards, and token/security controls.

## 2. Product Goal

Make CALL ANYTHING deployable as a managed local/self-hosted system with:

- one obvious quick-start path
- a small number of named deployment profiles
- generated production-grade local secrets
- deterministic health checks
- simple status/logs lifecycle commands
- console-visible runtime state
- safety controls that are understandable before the first public exposure

## 3. User Personas

- **Solo operator**: wants to expose one private workflow as a Hotline without learning the full protocol first.
- **Agent developer**: wants a local caller-skill/MCP loop that can be started, checked, and reset quickly.
- **Self-host administrator**: wants a public or private platform stack with clear env, ports, logs, and safety controls.
- **Brand-site reader**: wants to understand what to deploy and why it is safe before touching code.

## 4. Readiness Definition

The ecosystem is "daily-deployable" when a fresh operator can:

1. choose a profile: local agent loop, all-in-one demo, public platform, or formal production stack
2. generate `.env` secrets without editing placeholder values by hand
3. start the selected profile with one command or one copied command block
4. run a doctor command and see all required endpoints
5. inspect logs and container/service state from one entry point
6. understand which data stays local, which metadata reaches the platform, and which secrets must rotate
7. find the same deployment story on the brand site

## 5. Non-Goals

- Do not move protocol, client, or platform business truth into the fourth repository.
- Do not duplicate formal deploy manifests from `repos/platform`.
- Do not claim production readiness for billing, email, or public marketplace behavior before their own gates pass.
- Do not hide unsafe defaults behind a green "ready" label.

## 6. Capability Map

| Capability | Owner | Initial Work |
| --- | --- | --- |
| Compatibility ledger | fourth repo | change bundles and required gates |
| Daily local doctor | fourth repo | `corepack pnpm run dev:doctor` |
| Agent-facing smoke | fourth repo | `corepack pnpm run test:agent-e2e` |
| Self-host env generator | fourth repo | `corepack pnpm run selfhost:init` |
| Compose lifecycle wrapper | fourth repo | delegate to `repos/platform/deploy/*` |
| Published-image smoke wrapper | fourth repo | delegate to `repos/platform` public-stack smoke |
| Operator onboarding contract | fourth repo | `operator:onboarding:check` keeps public-stack, brand-site, and runbooks aligned |
| Public stack deploy manifests | `repos/platform` | existing `deploy/public-stack` |
| Billing admin read model | `repos/platform` | admin-only tenant, balance, recharge, and ledger endpoints |
| Runtime console | `repos/client` and `repos/platform` | status, logs, settings, approvals |
| Brand explanation | `repos/brand-site` | deployability narrative and quick-start entry |

## 7. Security Defaults

Required baseline:

- generated `TOKEN_SECRET`, `PLATFORM_ADMIN_API_KEY`, and console bootstrap secrets
- warning or failure when default `change-me` secrets remain
- no public stack "ready" verdict without admin secret and bootstrap secret
- explicit local/public boundary in docs
- health checks that do not leak secrets
- logs/status commands that help debug without dumping `.env`

## 8. Success Metrics

- A fresh checkout can run `selfhost:init`, `selfhost:status`, `dev:doctor`,
  `test:agent-e2e`, `published-image:plan`, and `operator:onboarding:check`.
- Platform billing operators have an admin-only API for tenant setup, balance
  inspection, manual recharge capture, and ledger browsing, while end-user
  billing remains outside the ready verdict.
- PRD, runbooks, README, and brand-site copy use the same named profiles.
- Fourth-repo CI remains green after adding orchestration helpers.
- Brand-site build remains green after messaging updates.

## 9. Milestones

### M1: Management spine

- Add PRDs.
- Add self-host env/lifecycle helper.
- Update daily runbooks and readiness docs.
- Update brand-site copy to explain the new deployment philosophy.

### M2: One-command profile launcher

- Add profile-specific `up/down/logs/status` wrappers.
- Add smoke checks per profile.
- Add explicit failure messages for unsafe secrets.

### M3: Console management parity

- Make runtime status, logs, approval policy, adapter health, and billing readiness visible in console surfaces.
- Add operator-first public-stack onboarding checks.
- Add a platform-owned billing admin read model before exposing client-facing
  billing workflows.
- Keep public-stack `/console/`, gateway session flow, and brand-site Operator
  Onboarding narrative aligned.

### M4: Production hardening

- Add backup/restore, rotation, audit export, and public-stack security review gates.
- Published-image smoke is first connected as a fourth-repo wrapper; formal
  image build, publish, and release gates remain owned by `repos/platform`.
