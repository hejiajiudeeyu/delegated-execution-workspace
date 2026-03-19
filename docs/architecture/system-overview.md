# System Overview

<!-- TODO: Document the full system architecture of the delegated execution system. -->

## Overview

The delegated execution system consists of three formal repositories coordinated by the fourth-repo orchestration layer.

## Repositories

| Repository | Role |
|---|---|
| `repos/protocol` | Protocol and contract definitions (`@delexec/contracts`) |
| `repos/client` | Client runtime: buyer/seller controllers, transports, ops CLI |
| `repos/platform` | Self-hosted platform: API, relay, console, deploy configurations |

## Dependency Flow

```
protocol/contracts
       |
       v
  +---------+     +-----------+
  | client   |     | platform  |
  +---------+     +-----------+
```

- Protocol is the upstream truth source for contracts.
- Client and platform both depend on protocol contracts.
- Client and platform must not depend on each other.

## Shared Support Packages

`@delexec/runtime-utils` and `@delexec/sqlite-store` physically reside in the client repository but are treated as shared support packages that may flow into both client and platform.

<!-- TODO: Add detailed architecture diagrams and component descriptions. -->
