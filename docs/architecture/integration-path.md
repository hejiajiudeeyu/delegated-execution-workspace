# Integration Path

<!-- TODO: Add detailed integration flow diagrams and troubleshooting for each step. -->

## Overview

Source integration is the baseline integration path required for fourth-repo certification.

## Integration Components

1. **Platform** — `repos/platform` starts `deploy/platform`
2. **Relay** — `repos/platform` starts standalone relay
3. **Client** — `repos/client` runs source `delexec-ops`
4. **Transport** — client uses `relay_http` pointed at platform relay

## Commands

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
corepack pnpm run dev:client:status
corepack pnpm run dev:approve-example
corepack pnpm run test:integration
```

## Certification Criteria

The fourth-repo certifies that a specific protocol/client/platform SHA combination completes the source integration path without errors.
