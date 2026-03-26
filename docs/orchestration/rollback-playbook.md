# Rollback Playbook

## Overview

Rollback is performed by returning submodule SHAs to the previous verified bundle, not by rewriting formal repository history. Each verified SHA combination is recorded as a change bundle YAML under `changes/`.

## Prerequisites

- Access to the `changes/` directory for verified bundle history
- Ability to run fourth-repo validation checks
- Git access to update submodule references

## When to Roll Back

- A newly merged SHA combination fails fourth-repo integration tests
- A formal repository release introduced a breaking change that was not caught before merging
- An emergency revert is needed in production while a fix is being prepared

## Steps

### 1. Identify the Target Bundle

```bash
# List change bundles sorted by date (most recent first)
ls -lt changes/
```

Open the most recent **passing** bundle YAML to find its submodule SHAs:

```yaml
# changes/YYYYMMDD-description.yaml
protocol_sha: <sha>
client_sha: <sha>
platform_sha: <sha>
```

### 2. Reset Submodule SHAs

```bash
git -C repos/protocol checkout <protocol_sha>
git -C repos/client checkout <client_sha>
git -C repos/platform checkout <platform_sha>
```

### 3. Verify the Rollback State

```bash
corepack pnpm install
corepack pnpm run check:submodules
corepack pnpm run check:boundaries
corepack pnpm run check:bundles
corepack pnpm run test:contracts
corepack pnpm run test:integration
```

All checks must pass before proceeding.

### 4. Create a Rollback Change Bundle

Create a new bundle YAML under `changes/` documenting the rollback:

```yaml
# changes/YYYYMMDD-rollback-to-<bundle-name>.yaml
bundle_type: rollback
rolled_back_from:
  protocol_sha: <bad_sha>
  client_sha: <bad_sha>
  platform_sha: <bad_sha>
rolled_back_to:
  protocol_sha: <good_sha>
  client_sha: <good_sha>
  platform_sha: <good_sha>
reason: "<brief description of why rollback was necessary>"
```

### 5. Commit and Open a PR

```bash
git add repos/protocol repos/client repos/platform changes/
git commit -m "rollback: revert to <target-bundle> due to <reason>"
```

Open a PR for review. Do **not** fast-forward merge without fourth-repo CI passing.

## After Rollback

Once the rollback is merged:
1. File issues in the affected formal repositories describing the root cause
2. Do not re-introduce the failed SHA combination until the root cause is resolved and a new verified bundle is created
