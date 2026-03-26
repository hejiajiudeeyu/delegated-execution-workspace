# System Overview

## Overview

The delegated execution system is a protocol-driven, multi-party task delegation platform. A **Caller** submits tasks to a **Responder** through a **Hotline** defined in a shared catalog, mediated by a **Platform** API that issues task tokens, routes delivery, and enforces signature-based result verification.

User-facing product language follows the shared terminology mapping in [Terminology Mapping](terminology.md):

- `Caller` — the entity (human operator, AI agent, or automated system) that submits a task
- `Responder` — the entity (service, agent, or automation) that executes the task and returns a signed result
- `Hotline` — a registered, named capability offered by a Responder
- `Call` — a single task request + result exchange session

That mapping now applies to docs, UI, CLI, protocol wire labels, and runtime component naming.

## Repositories

| Repository | Role | Primary Artifact |
|---|---|---|
| `repos/protocol` | Protocol and contract definitions | `@delexec/contracts` (npm) |
| `repos/client` | Client runtime: caller/responder product surfaces, ops CLI | `@delexec/ops` (npm), `delexec-ops` (CLI) |
| `repos/platform` | Self-hosted platform: API, relay, console, deploy configs | GHCR images + Docker Compose |

## Dependency Flow

```
repos/protocol (@delexec/contracts)
       |                  |
       v                  v
  repos/client       repos/platform
```

- Protocol is the upstream truth source for contracts and message shape.
- Client and platform both depend on `@delexec/contracts`.
- Client and platform must **not** depend on each other at runtime.

## Component Map

```
┌───────────────────────────────────────────────────────┐
│                  Operator Environment                  │
│                                                        │
│  ┌─────────────┐    ┌───────────────┐    ┌──────────┐ │
│  │ Platform API │    │ Transport Relay│    │ Platform │ │
│  │  (REST API)  │◄──►│ (local/email) │    │ Console  │ │
│  └──────┬───────┘    └───────────────┘    └──────────┘ │
│         │                                              │
└─────────┼──────────────────────────────────────────────┘
          │  task token + delivery routing
          │
┌─────────┼──────────────────────────────────────────────┐
│  Client │Environment                                   │
│         │                                              │
│  ┌──────▼──────────┐        ┌──────────────────────┐  │
│  │ Caller Controller│        │ Responder Controller  │  │
│  │  (submits tasks) │        │ (executes + signs)    │  │
│  └─────────────────┘        └──────────────────────┘  │
│  ┌─────────────────┐                                   │
│  │ ops CLI / console│  (manages caller+responder local) │
│  └─────────────────┘                                   │
└───────────────────────────────────────────────────────┘
```

## Key Protocol Flows

### Task Request Flow
1. Caller asks Platform API for a task token (`POST /v1/tokens/task`)
2. Platform issues a short-lived JWT binding `caller_id`, `responder_id`, `hotline_id`, `request_id`
3. Caller wraps the contract in a delivery envelope and sends via transport
4. Responder receives, validates token via introspection (`POST /v1/tokens/introspect`)
5. Responder executes task, signs result package with Ed25519 private key
6. Responder returns signed result via transport
7. Caller verifies signature against Responder's registered public key

### Hotline Registration Flow
1. Responder submits hotline registration (`POST /v1/responders/register`)
2. Platform stores `catalogItem` with `input_schema`, `output_schema`, `input_attachments`, `output_attachments`
3. Platform operator reviews and approves (`POST /v1/admin/review`)
4. Hotline becomes visible in Marketplace (`GET /marketplace/hotlines`)
5. Callers fetch template bundle for usage details (`GET /marketplace/hotlines/:id/template-bundle`)

## Shared Support Packages

`@delexec/runtime-utils` and `@delexec/sqlite-store` physically reside in the client repository but are treated as shared support packages that may flow into both client and platform during development.

## Fourth-Repo Role

This orchestration repository (`delegated-execution-dev`) does **not** own any business logic. It:
- Pins verified submodule SHA combinations
- Runs cross-repo integration checks
- Manages change bundles in `changes/`
- Provides local development workspace linking via `workspace:*`

See [Boundary Rules](boundary-rules.md) and [Integration Path](integration-path.md) for details.
