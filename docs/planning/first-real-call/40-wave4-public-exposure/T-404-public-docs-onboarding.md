# T-404 Public Docs Onboarding

Status: completed and deployed.

Created: 2026-06-14

## Goal

Turn the T-403 production proof into a cleaner public-docs-only onboarding path. A new Responder and Caller should be able to use public docs to keep a Responder online on the public relay, request a paid task token with billing consent, dispatch through relay, receive a signed result, and reconcile balance, ledger, and request events.

## Scope

- Owning repo: `repos/brand-site`.
- Chinese and English Responder quick starts now document `TRANSPORT_TYPE="relay_http"`, `TRANSPORT_BASE_URL="https://callanything.xyz/relay"`, foreground runtime startup, and `nohup` long-running startup.
- Chinese and English Caller quick starts now document the paid relay flow:
  - register with `delexec-ops auth register --platform https://callanything.xyz/platform`;
  - keep a local Caller runtime online on `relay_http`;
  - request `/v1/tokens/task` with billing consent;
  - fetch `/v1/requests/$REQUEST_ID/delivery-meta`;
  - create a local caller-controller request with expected signer binding;
  - dispatch through caller-controller to public relay;
  - pull `/controller/inbox/pull` and read `/controller/requests/$REQUEST_ID/result`;
  - reconcile `/v1/tenants/me/balance`, `/v1/tenants/me/ledger`, and `/v1/requests/$REQUEST_ID/events`.
- Content smoke now locks the public relay, delivery-meta, relay send shape, caller-controller dispatch, inbox pull, and signed-result polling markers.

## Verification

- `repos/brand-site`: `npm run smoke:first-real-call-content` passed with 117 checks.
- `repos/brand-site`: targeted `npx eslint` passed for the four quick-start pages and content smoke script.
- `repos/brand-site`: `npm run build` passed with the existing large chunk warning.
- Root validation passed:
  - `corepack pnpm run check:submodules`
  - `corepack pnpm run check:boundaries`
  - `corepack pnpm run check:bundles`
  - `corepack pnpm run test:contracts`
  - `corepack pnpm run test:integration`
- Deployed to Aliyun `/var/www/html`.
- Backup created: `/home/admin/site-backups/html.20260614T035633Z.tgz`.
- Public verification with `deploycheck=20260614T035633Z` passed for:
  - Chinese Responder quick start relay markers.
  - Chinese Caller quick start delivery-meta, relay send shape, inbox pull, and result polling markers.
  - English Responder quick start relay markers.
  - English Caller quick start delivery-meta, relay send shape, inbox pull, and result polling markers.
  - `https://callanything.xyz/healthz`
  - `https://callanything.xyz/platform/healthz`
  - `https://callanything.xyz/relay/healthz`
  - `https://callanything.xyz/marketplace/hotlines`

## Remaining Follow-Ups

- `repos/client`: add a first-class public CLI command that wraps paid token issuance, delivery-meta, relay dispatch, caller inbox polling, and result retrieval.
- `repos/platform`: expose or document a real operator console/gateway flow for review, enablement, tenant creation, recharge, and ledger evidence.
- Run the next public-docs-only unknown-user rehearsal against the deployed T-404 docs.
