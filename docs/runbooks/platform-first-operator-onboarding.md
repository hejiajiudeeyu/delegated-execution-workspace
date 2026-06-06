# Platform-First Operator Onboarding

This runbook describes the current operator-first onboarding path that is actually supported by the pinned fourth-repo SHA combination.

It is intentionally narrower than a full public product guide. The goal is to show how an operator can bring up the platform side first, then let a client bootstrap into that platform with either automatic approval or a manual approval pause.

## Scope

This runbook covers:

- platform API + PostgreSQL via `repos/platform/deploy/platform`
- standalone relay via `repos/platform`
- source `delexec-ops` bootstrap via `repos/client`
- approval handling for the official example hotline
- public-stack `/console/` + gateway session flow as the public operator
  first-use entry point

This runbook does **not** assume:

- billing or quota enforcement
- email as the default transport path
- image-smoke scripts inside `repos/client`

For public hosts, `deploy/public-stack` now bundles `platform-console` static UI
behind `platform-console-gateway`; use `/console/` for first entry and
`/gateway/*` for credential-backed operator API calls.

## Public Stack First-Use Path

Use this when the operator starts from the public bundle instead of the local
source integration loop.

```bash
corepack pnpm run selfhost:init -- --profile public-stack
corepack pnpm run selfhost:preflight -- --profile public-stack
corepack pnpm run selfhost:up -- --profile public-stack
corepack pnpm run selfhost:smoke -- --profile public-stack
corepack pnpm run published-image:smoke -- --image-tag latest
corepack pnpm run operator:onboarding:check
```

Expected result:

- `/console/` serves the operator UI through `platform-console-gateway`
- `/gateway/session/setup` initializes the gateway local secret store
- `/gateway/credentials/platform-admin` persists the platform admin credential
- `/gateway/proxy/v2/admin/hotlines` proves the authenticated gateway proxy
- `operator:onboarding:check` confirms the platform docs, public-stack route
  contract, brand-site narrative, and source fallback runbook still agree

## Two Supported Operator Branches

The current checkout supports two operator-first branches.

### Branch A: Operator credential already available

Use this when the operator can provide `PLATFORM_ADMIN_API_KEY` to the client bootstrap environment.

Expected outcome:

- `delexec-ops bootstrap --platform ...` completes the approval step automatically
- the example request reaches `SUCCEEDED` in one run

### Branch B: Operator credential not yet available to the client

Use this when the operator does **not** want to inject admin credentials into the client bootstrap environment.

Expected outcome:

- `delexec-ops bootstrap --platform ...` stops at `stage = awaiting_admin_approval`
- operator approves the responder and hotline separately
- client reruns `delexec-ops bootstrap` or `delexec-ops run-example`

Both branches are valid in the current codebase. They represent different trust and setup choices, not different products.

## Prerequisites

From the fourth-repo workspace root:

```bash
corepack pnpm install
cp repos/platform/deploy/platform/.env.example repos/platform/deploy/platform/.env
```

Set at least these platform values in `repos/platform/deploy/platform/.env`:

```env
TOKEN_SECRET=replace-with-a-local-dev-secret
PLATFORM_ADMIN_API_KEY=sk_admin_local_dev
```

## Step 1: Start The Operator Side

Start the platform stack and the standalone relay:

```bash
corepack pnpm run dev:platform
corepack pnpm run dev:relay
```

Verify health:

```bash
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8090/healthz
```

Expected:

- platform API is healthy on `:8080`
- relay is healthy on `:8090`

## Step 2: Choose The Client Bootstrap Branch

### Branch A: Automatic approval path

Run bootstrap with platform access plus admin credentials:

```bash
PLATFORM_ADMIN_API_KEY=sk_admin_local_dev \
ADMIN_API_KEY=sk_admin_local_dev \
TRANSPORT_TYPE=relay_http \
TRANSPORT_BASE_URL=http://127.0.0.1:8090 \
node repos/client/apps/ops/src/cli.js bootstrap \
  --email you@example.com \
  --platform http://127.0.0.1:8080 \
  --text "Summarize this bootstrap request."
```

Expected result:

- `ok = true`
- `status = "SUCCEEDED"`
- steps include:
  - `platform_enabled`
  - `review_submitted`
  - `responder_enabled`
  - `supervisor_started`
  - `responder_approved`
  - `hotline_approved`
  - `catalog_visible`
  - `request_succeeded`

### Branch B: Manual approval pause

Run bootstrap without admin credentials:

```bash
TRANSPORT_TYPE=relay_http \
TRANSPORT_BASE_URL=http://127.0.0.1:8090 \
node repos/client/apps/ops/src/cli.js bootstrap \
  --email you@example.com \
  --platform http://127.0.0.1:8080
```

Expected result:

- `ok = false`
- `stage = "awaiting_admin_approval"`
- `hotline_id = "local.delegated-execution.workspace-summary.v1"`
- steps already include at least:
  - `platform_enabled`
  - `caller_registered`
  - `example_hotline_added`
  - `review_submitted`
  - `responder_enabled`
  - `supervisor_started`

This is a supported stop point, not a failure in the narrow sense.

## Step 3: Manual Approval Options

If you are on Branch B, approve the responder and hotline from the operator side.

### Option 1: Direct admin API calls

```bash
curl -X POST http://127.0.0.1:8080/v2/admin/responders/<responder_id>/approve \
  -H 'Authorization: Bearer sk_admin_local_dev' \
  -H 'Content-Type: application/json' \
  -d '{"reason":"manual integration approval"}'

curl -X POST http://127.0.0.1:8080/v2/admin/hotlines/local.delegated-execution.workspace-summary.v1/approve \
  -H 'Authorization: Bearer sk_admin_local_dev' \
  -H 'Content-Type: application/json' \
  -d '{"reason":"manual integration approval"}'
```

### Option 2: Fourth-repo helper script

```bash
PLATFORM_ADMIN_API_KEY=sk_admin_local_dev \
PLATFORM_API_BASE_URL=http://127.0.0.1:8080 \
node tools/approve-example.mjs <responder_id>
```

## Step 4: Resume The Client Side

After approval, rerun either bootstrap or the example request.

### Resume with bootstrap

```bash
TRANSPORT_TYPE=relay_http \
TRANSPORT_BASE_URL=http://127.0.0.1:8090 \
node repos/client/apps/ops/src/cli.js bootstrap \
  --email you@example.com \
  --platform http://127.0.0.1:8080 \
  --text "Summarize this bootstrap request."
```

### Resume with the example request only

```bash
TRANSPORT_TYPE=relay_http \
TRANSPORT_BASE_URL=http://127.0.0.1:8090 \
node repos/client/apps/ops/src/cli.js run-example \
  --text "Summarize this bootstrap request."
```

Check runtime state:

```bash
node repos/client/apps/ops/src/cli.js status
```

## Success Criteria

Treat the operator-first path as ready for the current checkout only when all of the following are true:

1. platform API and relay are healthy
2. client bootstrap reaches either:
   - `SUCCEEDED` directly, or
   - `awaiting_admin_approval` before manual approval and then `SUCCEEDED` after approval
3. the example hotline becomes visible after approval
4. the example request reaches `SUCCEEDED`
5. `delexec-ops status` shows healthy caller/responder runtime state

## Current Limits

These are still outside the readiness claim for this path:

- billing/quota behavior
- email as the primary operator-first transport path
- broad end-user deployment guarantees for every image/compose profile

## Related Documents

- [Main Readiness](../architecture/main-readiness.md)
- [Integration Path](../architecture/integration-path.md)
- [Local Dev Setup](./local-dev-setup.md)
- [Platform Public Stack Operator Guide](../../repos/platform/docs/current/guides/public-stack-operator-guide.md)
- [Client Source Integration Runbook](../../repos/client/docs/current/guides/source-integration-runbook.md)
