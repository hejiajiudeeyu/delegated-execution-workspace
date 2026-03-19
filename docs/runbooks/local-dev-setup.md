# Local Dev Setup

<!-- TODO: Expand with platform-specific instructions and common environment issues. -->

## Prerequisites

- Node.js >= 20
- corepack enabled (`corepack enable`)
- pnpm 10.x (managed via corepack)
- Docker (for platform deployment)
- Git with submodule support

## Setup Steps

1. Clone and initialize submodules:

```bash
git clone <repo-url>
cd delegated-execution-dev
git submodule update --init --recursive
```

2. Install workspace dependencies:

```bash
corepack pnpm install
```

3. Create environment files:

```bash
cp repos/platform/deploy/platform/.env.example repos/platform/deploy/platform/.env
# Edit .env with your local configuration
```

4. Run fourth-repo validation:

```bash
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

5. Start local source integration:

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
corepack pnpm run dev:client:bootstrap
```
