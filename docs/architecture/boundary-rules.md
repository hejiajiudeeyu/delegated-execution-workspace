# Boundary Rules

<!-- TODO: Expand with detailed boundary governance policies and violation examples. -->

## Overview

Boundary enforcement is managed by the fourth-repo using `tools/project-boundaries.yaml` and Nx project grouping.

## Project Groups

| Group | Packages |
|---|---|
| `protocol/contracts` | `@delexec/contracts` |
| `shared/runtime-support` | `@delexec/runtime-utils`, `@delexec/sqlite-store` |
| `client/runtime` | `@delexec/buyer-controller`, `@delexec/buyer-controller-core`, `@delexec/seller-controller`, `@delexec/seller-runtime-core` |
| `client/transports` | `@delexec/transport-*` |
| `client/ops` | `@delexec/ops` |
| `platform/data` | `@delexec/postgres-store` |
| `platform/api` | `@delexec/platform-api` |
| `platform/relay` | `@delexec/transport-relay` |
| `platform/gateway` | `@delexec/platform-console-gateway` |

## Allowed Dependencies

- `protocol` -> `client`
- `protocol` -> `platform`
- `shared/runtime-support` -> `client`
- `shared/runtime-support` -> `platform`

## Forbidden Dependencies

- `client` -> `platform`
- `platform` -> `client`
