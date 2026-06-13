# T-403 OPC #0 Findings

Status: draft; manual production rehearsal pending.

Created: 2026-06-13

This file is the evidence log for the first real OPC #0 rehearsal. Do not mark T-403 complete until the manual rehearsal sections below are filled with actual production evidence.

## Rule Of The Run

- Use only public documentation on `https://callanything.xyz`.
- Do not read source code, fourth-repo scripts, private runbooks, or internal notes during the manual rehearsal.
- If the operator must break the rule, record the exact step, reason, and source consulted under "Rule Violations".
- Do not fix issues during the rehearsal. Record them here and open follow-up cards in the owning repository after the run.

## Preflight Evidence

Agent-owned preflight before manual run:

- Public docs golden path was deployed and verified in T-203.
- Public stack and marketplace API were deployed and verified in T-401/T-402.
- `@delexec/ops@0.1.1` is published and clean npm paid-pricing smoke verified.
- Formal public-docs rehearsal on 2026-06-14 found that `npm install -g @delexec/ops@0.1.1` failed before Responder setup on macOS Node 22. The failure was recorded as a blocker below. Client commit `9d8823dd569c72cdd2d1d31f1491e28209e9feb8` fixed global tarball installation and bumped `@delexec/ops` to `0.1.2`. GitHub CI run `27477010891` passed on rerun; GitHub Actions publish run `27477110081` passed `npm test`, `npm run test:packages`, and `npm publish --workspace @delexec/ops --access public`. `npm view @delexec/ops version dist.integrity dist.tarball --json` returned version `0.1.2`, and real global install smoke in `/tmp/delexec-ops-012-global-smoke-20260613T194557Z` ran `npm install -g @delexec/ops@0.1.2`, `delexec-ops setup`, and `delexec-ops doctor` successfully.
- Restarted formal public-docs rehearsal on 2026-06-14 then found that `delexec-ops auth register --platform https://callanything.xyz/platform --email ...` dropped the `/platform` proxy prefix and attempted to parse brand-site HTML as JSON. The failure was recorded as a blocker below. Client commit `2035cd1cb92d37b1b2f937b3a350bcfe75c77e9b` fixed prefixed platform URL joining and bumped `@delexec/ops` to `0.1.3`. GitHub CI run `27477477188` passed; GitHub Actions publish run `27477549634` passed `npm test`, `npm run test:packages`, and `npm publish --workspace @delexec/ops --access public`. `npm view @delexec/ops version dist.integrity dist.tarball --json` returned version `0.1.3`, and real smoke in `/tmp/delexec-ops-013-prefix-smoke-20260613T200400Z` installed `@delexec/ops@0.1.3` globally and registered against `https://callanything.xyz/platform` successfully.
- 2026-06-13 paid-Hotline CLI preflight found that `@delexec/ops@0.1.0` could not declare/submit a paid fixed-price `pricing_hint` from the public Responder flow. Client commit `159658dcf79b5d45c6ec5cf8fc386dc8bfa120f8` fixed the CLI/draft/submit path and bumped `@delexec/ops` to `0.1.1`. GitHub Actions publish run `27467409186` published it successfully; `npm view @delexec/ops version dist.integrity dist.tarball --json` returned version `0.1.1`.
- Clean install smoke from `/tmp/delexec-ops-011-smoke-ksax3s` verified the published `@delexec/ops@0.1.1` CLI generates a draft `pricing_hint` with `pricing_model: fixed_price`, `currency: PTS`, `fixed_price_cents: 50`, `max_total_cents: 50`, `trust_tier: untrusted`, and `billing_disclosure_url`.
- Brand-site commit `5b4bcd24159bd57fc421888c9695dd1c752612aa` added `--fixed-price-cents`, `--currency`, and `--billing-disclosure-url` to the Chinese and English Responder production rehearsal docs. Deployed to Aliyun after backup `/home/admin/site-backups/html.20260613T130316Z.tgz`; public checks with `deploycheck=20260613T130316Z` confirmed the markers are live.
- 2026-06-13 public preflight:
  - `npm view @delexec/ops version dist.integrity --json` returned version `0.1.0`.
  - `https://callanything.xyz/healthz` returned `200` with body `ok`.
  - `https://callanything.xyz/platform/healthz` returned `{"ok":true,"service":"platform-api"}`.
  - `https://callanything.xyz/relay/healthz` returned `{"ok":true,"service":"transport-relay"}`.
  - `https://callanything.xyz/gateway/healthz` returned `{"ok":true,"service":"platform-console-gateway"}`.
  - `https://callanything.xyz/marketplace/hotlines` returned `{"items":[]}`.
  - `https://callanything.xyz/docs/`, Caller quick start, Responder quick start, and `llms.txt` all returned `200` and included the npm bootstrap golden path.
  - `https://callanything.xyz/console/` returned `200 text/html`.
- Required public entrypoints for the manual run:
  - Responder quick start: `https://callanything.xyz/docs/quick-start-responder/`
  - Caller quick start: `https://callanything.xyz/docs/quick-start-caller/`
  - Marketplace: `https://callanything.xyz/marketplace/`
  - Docs overview: `https://callanything.xyz/docs/`
  - LLM index: `https://callanything.xyz/llms.txt`

## Pre-Run Public-Docs Risks And Fixes

These are pre-run issues discovered before the formal manual rehearsal. They do not complete T-403 by themselves; they reduce public-docs friction before the operator starts the run.

| Status | Severity candidate | Step | Observation | Evidence | Owning repo |
| --- | --- | --- | --- | --- | --- |
| fixed before manual run | major | Responder Capability Packaging / Submit Review | The public Responder quick start started with the package-first `npm install -g @delexec/ops` golden path, but later advanced examples for `enable-responder`, `add-example-hotline`, `add-hotline`, `submit-review`, and `status` still used `npm run ops -- ...`. A package-only unknown Responder could be pushed back toward a source checkout before they could submit a production review. | Verified `@delexec/ops@0.1.0` help exposes the needed global commands. Brand-site commit `7c8688877c031f4598bf9bb975c8d6c19e2333b1` switched Chinese and English Responder quick starts to `delexec-ops ...`, added content-smoke assertions, and was deployed to Aliyun after backup `/home/admin/site-backups/html.20260613T050235Z.tgz`. Public checks with `deploycheck=20260613T050235Z` confirmed both Responder pages return `200`, include `delexec-ops auth register`, `delexec-ops add-hotline`, `delexec-ops submit-review`, and `delexec-ops status`, and omit old `npm run ops -- ...` variants for those steps. | `repos/brand-site` |
| fixed before manual run | major | Production Rehearsal / Operator Handoff / Paid Call | Public Caller and Responder quick starts were still local-first and self-host/hosted-platform generic. They did not give an unknown user enough public-only instructions for the production rehearsal: public Platform endpoint, Marketplace API visibility, operator approval and recharge handoff, caller registration, billing consent, paid task-token issuance, balance checks, ledger checks, and request-event checks. | Brand-site commit `a8a293d0a7c1b468b2f788fa81a2cf9f5cbb6213` added OPC #0 production rehearsal appendices to Chinese and English Caller/Responder quick starts and expanded content smoke assertions. Verification passed `npm run smoke:first-real-call-content` with 87 checks, targeted eslint on the four quick-start pages plus the smoke script, and `npm run build`. Deployed to Aliyun after backup `/home/admin/site-backups/html.20260613T122409Z.tgz`, preserving `/boids*`. Public checks with `deploycheck=20260613T122409Z` confirmed all four quick-start pages include the production rehearsal markers, and `/healthz`, `/platform/healthz`, and `/marketplace/hotlines` remained healthy. | `repos/brand-site` |
| fixed before manual run | blocker | Responder Capability Packaging / Paid Review | The published `@delexec/ops@0.1.0` package could add a Hotline draft but provided no public CLI path to declare a fixed-price `pricing_hint`, and the submit-review body dropped draft `pricing_hint` before platform review. A public unknown Responder therefore could not create the paid Hotline required for the first real paid call using only the published package. | Clean public-package dry check reproduced the gap: generated draft pricing was absent/null. TDD in `repos/client` then added fixed-price flags, draft preservation, submit-review forwarding, and assertions that platform catalog receives `pricing_hint`. The first targeted test failed on missing `draft.pricing_hint`; after implementation, targeted test, full ops CLI integration, `npm test`, and `npm run test:packages` passed. Client commit `159658dcf79b5d45c6ec5cf8fc386dc8bfa120f8` was pushed and `@delexec/ops` was bumped to `0.1.1`. GitHub Actions publish run `27467409186` passed and npm registry now returns `@delexec/ops@0.1.1`. Clean install smoke verified the published package writes the expected paid `pricing_hint`. Brand-site commit `5b4bcd24159bd57fc421888c9695dd1c752612aa` and Aliyun deployment `20260613T130316Z` made the required pricing flags visible in public Responder docs. | `repos/client` + `repos/brand-site` |
| fixed during manual run attempt | blocker | Responder Public-Docs Install | The first formal public-docs rehearsal attempt failed on the first command from the Responder quick start: `npm install -g @delexec/ops@0.1.1`. On macOS Node 22, npm global install failed inside `better-sqlite3` because the published tarball could not provide a usable `prebuild-install` command during lifecycle scripts, leaving a broken `delexec-ops` bin symlink. A package-local `npm install @delexec/ops@0.1.1` succeeded, proving the gap was specific to the public global install path. | Evidence directory `/tmp/delexec-opc0-20260613T131437Z` contains the public docs snapshots and failed install logs. RED global-prefix tarball test reproduced the issue in `repos/client` after stripping workspace `.bin` from `PATH`. Client commit `9d8823dd569c72cdd2d1d31f1491e28209e9feb8` fixes pack staging by clearing stale staged `node_modules`, sanitizing vendored workspace manifests, bundling `prebuild-install` and its dependency closure, and adding the global install regression test. Local targeted test, full ops CLI integration, `npm test`, and `npm run test:packages` passed. CI run `27477010891` passed on rerun; publish run `27477110081` published `@delexec/ops@0.1.2`. Real `npm install -g @delexec/ops@0.1.2` smoke passed in `/tmp/delexec-ops-012-global-smoke-20260613T194557Z`. | `repos/client` |
| fixed during manual run attempt | blocker | Responder Public-Docs Install / Platform Registration | The restarted public-docs rehearsal could install `@delexec/ops@0.1.2`, but `delexec-ops auth register --platform https://callanything.xyz/platform --email ...` failed with `Unexpected token '<'` because CLI URL joining dropped the `/platform` prefix. The CLI requested the brand-site path `https://callanything.xyz/v1/users/register` instead of the platform proxy path `https://callanything.xyz/platform/v1/users/register`, then tried to parse returned HTML as JSON. | Evidence directory `/tmp/delexec-opc0-20260613T195234Z` contains the public docs snapshots, failed `responder-production-flow.log`, direct curl proof that `/platform/v1/users/register` returned `201 application/json`, and CLI repro output. RED prefixed-platform integration test reproduced the issue in `repos/client`; client commit `2035cd1cb92d37b1b2f937b3a350bcfe75c77e9b` fixes URL joining and adds the regression test. Local targeted test, full ops CLI integration, `npm test`, and `npm run test:packages` passed. CI run `27477477188` passed; publish run `27477549634` published `@delexec/ops@0.1.3`. Real smoke `/tmp/delexec-ops-013-prefix-smoke-20260613T200400Z` installed globally and registered against `https://callanything.xyz/platform` successfully. | `repos/client` |

## Rehearsal Metadata

Fill these during the manual run.

| Field | Value |
| --- | --- |
| Run started at |  |
| Run finished at |  |
| Operator |  |
| Responder machine / environment |  |
| Caller machine / environment |  |
| Hotline ID |  |
| Hotline display name |  |
| Pricing hint / expected price |  |
| Caller tenant ID |  |
| Final request ID |  |
| Final ledger entries checked |  |

## Step Log

Record timestamps, commands used from public docs, observed output, and friction.

### 1. Responder Public-Docs Install

- Public page used:
- Commands copied:
- Result:
- Time spent:
- Friction:
- Evidence:

### 2. Responder Capability Packaging

- Public page used:
- Capability selected:
- Adapter type:
- Command or endpoint shape:
- Result:
- Time spent:
- Friction:
- Evidence:

### 3. Submit Review

- Public page used:
- Command copied:
- Result:
- Time spent:
- Friction:
- Evidence:

### 4. Operator Review And Enable

- Public / console page used:
- Review decision:
- Enable result:
- Marketplace visibility result:
- Time spent:
- Friction:
- Evidence:

### 5. Caller Recharge

- Public / console page used:
- Recharge amount:
- Balance before:
- Balance after:
- Time spent:
- Friction:
- Evidence:

### 6. Caller Public-Docs Install

- Public page used:
- Commands copied:
- Result:
- Time spent:
- Friction:
- Evidence:

### 7. Paid Call

- Public page used:
- Hotline selected:
- Request payload:
- Request ID:
- Result status:
- Signed result observed:
- Time spent:
- Friction:
- Evidence:

### 8. Billing Reconciliation

- Caller balance before:
- Caller balance after:
- Ledger rows:
- Platform console `/billing` evidence:
- Expected delta:
- Actual delta:
- Match?:
- Friction:

## Rule Violations

Record every time the run needed private knowledge.

| Step | Violation | Why it happened | Owning repo for fix | Severity |
| --- | --- | --- | --- | --- |

## Findings

Use these severities:

- `blocker`: prevents first paid call completion.
- `major`: call can complete only with private help or confusing workaround.
- `minor`: call completes from public docs, but the experience is rough.

| Severity | Step | Finding | Evidence | Owning repo | Proposed follow-up |
| --- | --- | --- | --- | --- | --- |

## Completion Checklist

- [ ] A real Responder was installed using only public docs.
- [ ] A real useful Hotline was packaged without writing new product code for the rehearsal.
- [ ] Hotline review was submitted to production.
- [ ] Operator approved and enabled the Hotline.
- [ ] Marketplace showed the Hotline.
- [ ] Caller was recharged.
- [ ] A clean Caller environment invoked the Hotline through the public path.
- [ ] The call returned a signed result.
- [ ] Caller balance and ledger matched the expected price.
- [ ] Platform console `/billing` showed the transaction.
- [ ] All public-docs rule violations were recorded.
- [ ] All follow-up defects have owning repositories.

## Final Outcome

Leave this section blank until the manual run ends.

- Outcome:
- Completion decision:
- Follow-up bundle or cards:
