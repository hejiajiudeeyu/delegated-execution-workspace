# T-403 OPC #0 Findings

Status: completed with recorded public-docs violations and follow-up findings.

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
- The third formal public-docs rehearsal on 2026-06-14 found another path-prefix blocker after Responder startup: `delexec-ops start` launched the responder runtime, but the runtime heartbeat dropped `/platform` and tried to parse brand-site HTML. Client commit `a595f64610a536abfe3b3bf860d66c32aebc0dde` fixed URL joining in responder runtime, caller controller, ops supervisor, and relay-http transport helpers, added a prefixed-platform heartbeat regression test, and bumped `@delexec/ops` to `0.1.4`. Local targeted tests, full responder-controller and ops-cli integration tests, `npm test`, and `npm run test:packages` passed. GitHub CI run `27478077929` passed; publish run `27478151923` published `@delexec/ops@0.1.4`. `npm view @delexec/ops version dist.integrity dist.tarball --json` returned version `0.1.4`, and real rehearsal startup in `/tmp/delexec-opc0-20260613T200916Z` updated public catalog heartbeat through `https://callanything.xyz/platform`.
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
| fixed during manual run attempt | blocker | Responder Runtime / Platform Heartbeat | The third rehearsal installed and registered `@delexec/ops@0.1.3`, submitted a paid Hotline, and passed operator approval, but `delexec-ops start` exposed that responder-runtime heartbeat still used absolute-path URL joining. It dropped `/platform`, hit brand-site HTML, and could not keep public availability healthy. | Evidence directory `/tmp/delexec-opc0-20260613T200916Z` contains `responder-start.log` with `Unexpected token '<'` during heartbeat. RED `npx vitest run --config tests/config/vitest.integration.config.mjs tests/integration/responder-controller.integration.test.js -t "preserves platform path prefixes when sending heartbeat"` failed on `heartbeat_not_sent`; client commit `a595f64610a536abfe3b3bf860d66c32aebc0dde` fixed URL joining in runtime/controller/supervisor relay helpers and bumped `@delexec/ops` to `0.1.4`. Local targeted tests, full related integration tests, `npm test`, and `npm run test:packages` passed. CI run `27478077929` and publish run `27478151923` passed. Rehearsal restart with `@delexec/ops@0.1.4` updated `last_heartbeat_at` to `2026-06-13T20:29:55.419Z` through the public `/platform` proxy. | `repos/client` |

## Rehearsal Metadata

Fill these during the manual run.

| Field | Value |
| --- | --- |
| Run started at | 2026-06-13T20:09:16Z |
| Run finished at | 2026-06-13T20:40:24Z |
| Operator | hejiajiudeeyu via production admin API using Aliyun `.env`; secrets not recorded in this file |
| Responder machine / environment | macOS local temp evidence dir `/tmp/delexec-opc0-20260613T200916Z`, temp npm global prefix, `@delexec/ops@0.1.4`, Node 22 |
| Caller machine / environment | same macOS host but isolated public curl flow and separate production Caller identity; `CALLER_API_KEY` stored only in `/tmp/delexec-opc0-20260613T200916Z/*.secret` |
| Hotline ID | `opc0.summary-20260613t200916z.v1` |
| Hotline display name | OPC0 Public Docs Summary Tool |
| Pricing hint / expected price | fixed price, `PTS`, `fixed_price_cents: 50`, `max_total_cents: 50`, `trust_tier: untrusted` |
| Caller tenant ID | `user_935cc176060749138e584684c79d9936` |
| Final request ID | `req_opc0_20260613t203700z` |
| Final ledger entries checked | recharge `01KV1AW5F5RAT5KVXTXH0435ZM`; final hold `01KV1B97FA257YD4853FC57GN0`; final debit `01KV1BDP71T08TW6K1Q9JH7VK7` |

## Step Log

Record timestamps, commands used from public docs, observed output, and friction.

### 1. Responder Public-Docs Install

- Public page used: `https://callanything.xyz/docs/quick-start-responder/?rehearsal=20260613T200916Z`
- Commands copied: `npm install -g @delexec/ops`, then production Platform block using `PLATFORM="https://callanything.xyz/platform"`.
- Result: `@delexec/ops@0.1.3` installed first; after runtime-prefix blocker fix, upgraded to `@delexec/ops@0.1.4`.
- Time spent: about 31 minutes including the 0.1.4 blocker fix/publish.
- Friction: public docs did not mention public relay transport env needed for production task consumption.
- Evidence: `/tmp/delexec-opc0-20260613T200916Z/public-docs/*`, `responder-install.log`, `responder-installed-version-014.log`, `responder-start-014-public-relay-nohup-2.log`.

### 2. Responder Capability Packaging

- Public page used: Responder quick start production rehearsal block.
- Capability selected: small process summarizer for T-403 rehearsal text.
- Adapter type: `process`.
- Command or endpoint shape: `delexec-ops add-hotline --type process --hotline-id opc0.summary-20260613t200916z.v1 --cmd "node ./my-tool/index.js" --fixed-price-cents 50 --currency PTS --billing-disclosure-url ...`.
- Result: local draft created with input/output schemas and fixed-price `pricing_hint`.
- Time spent: under 5 minutes after install.
- Friction: temporary adapter initially read only top-level input; runtime passed `payload`, so the first paid result was technically successful but not useful. The adapter was adjusted in `/tmp` before the final call.
- Evidence: `responder-production-flow.log`, `responder-home/hotline-registration-drafts/opc0.summary-20260613t200916z.v1.registration.json`, `responder-work/my-tool/index.js`.

### 3. Submit Review

- Public page used: Responder quick start production rehearsal block.
- Command copied: `delexec-ops submit-review --hotline-id opc0.summary-20260613t200916z.v1`.
- Result: submitted `responder_0f5343b85aa6` / `opc0.summary-20260613t200916z.v1`; review status pending, catalog visibility hidden.
- Time spent: under 1 minute.
- Friction: none after 0.1.4 prefix fix.
- Evidence: `responder-production-flow.log`.

### 4. Operator Review And Enable

- Public / console page used: public docs pointed to `https://callanything.xyz/console/`, but the public console route is static; operator used production admin API with Aliyun `.env` admin key.
- Review decision: approved responder and hotline.
- Enable result: `responder.status=enabled`, `hotline.status=enabled`, `catalog_visibility=public`.
- Marketplace visibility result: `https://callanything.xyz/marketplace/hotlines` showed the Hotline; public catalog detail returned pricing and public key.
- Time spent: about 5 minutes.
- Friction: operator workflow was not doable from the public static console page alone.
- Evidence: `admin-reviews-before.json`, `admin-approve-responder.json`, `admin-approve-hotline.json`, `marketplace-after-approval.json`, `catalog-after-approval.json`.

### 5. Caller Recharge

- Public / console page used: Caller quick start production rehearsal block; operator used admin billing API because public console was static.
- Recharge amount: 1000 PTS.
- Balance before: `/v1/tenants/me/balance` returned `ERR_BILLING_NOT_ENABLED`.
- Balance after: `credit_balance_cents: 1000`.
- Time spent: about 2 minutes.
- Friction: public docs correctly say to hand off to operator, but the public console path did not provide a working operator UI in this deployment.
- Evidence: `caller-register.json`, `admin-create-caller-tenant.json`, `admin-recharge-caller.json`, `caller-balance-after-recharge.json`, `caller-ledger-after-recharge.json`.

### 6. Caller Public-Docs Install

- Public page used: `https://callanything.xyz/docs/quick-start-caller/?rehearsal=20260613T200916Z`.
- Commands copied: production Caller registration and billing/token curl blocks.
- Result: created Caller `user_935cc176060749138e584684c79d9936`, received API key, created task tokens with billing claims.
- Time spent: about 5 minutes.
- Friction: public docs stop at token/events/ledger checks and do not show the transport delivery command needed to invoke a public relay-backed Hotline.
- Evidence: `caller-register.json`, `caller-token-request-body-2.json`, `caller-task-token-response-2.json`, `caller-delivery-meta-response-2.json`.

### 7. Paid Call

- Public page used: Caller quick start plus platform API spec/source after public docs proved incomplete for transport delivery.
- Hotline selected: `opc0.summary-20260613t200916z.v1`.
- Request payload: `"T-403 final paid call: public docs install worked, marketplace approval worked, caller recharge worked, and this summary proves the useful process hotline executed through public relay."`
- Request ID: `req_opc0_20260613t203700z`.
- Result status: `ok`.
- Signed result observed: yes, result package includes `signature_algorithm: Ed25519`, matching `signer_public_key_pem`, and `signature_base64: TK5lR0XmXJUqHVeSuuzEskX105YdoMB/5sfvhWfd88RUczj2AU8kzfbv0Ms3oyPBf9TufZsZM2xlsseZzjiADQ==`.
- Time spent: about 10 minutes after the relay transport gap was identified.
- Friction: required private/source knowledge to set `TRANSPORT_TYPE=relay_http`, `TRANSPORT_BASE_URL=https://callanything.xyz/relay`, call `/v1/requests/{id}/delivery-meta`, and send a relay envelope.
- Evidence: `caller-dispatch-envelope-2.secret.json`, `caller-relay-send-response-2.json`, `caller-result-poll-final-2-after-restart.json`, `caller-request-events-final-2-after-restart.json`.

### 8. Billing Reconciliation

- Caller balance before: 950 PTS before final request; 1000 after recharge and 950 after the first paid call.
- Caller balance after: 900 PTS after final request.
- Ledger rows: hold `01KV1B97FA257YD4853FC57GN0` for `-50`; debit `01KV1BDP71T08TW6K1Q9JH7VK7` recorded settlement for final request; recharge `01KV1AW5F5RAT5KVXTXH0435ZM` created initial 1000 PTS balance.
- Platform console `/billing` evidence: production admin billing API evidence captured; public `/console/` was static, so no browser billing-page screenshot was available.
- Expected delta: -50 PTS for final fixed-price call.
- Actual delta: -50 PTS; balance 950 -> 900.
- Match?: yes.
- Friction: ledger records the prepaid hold as the balance-changing row and final debit as amount `0` after hold capture; this is internally consistent but should be explained in public billing docs.

## Rule Violations

Record every time the run needed private knowledge.

| Step | Violation | Why it happened | Owning repo for fix | Severity |
| --- | --- | --- | --- | --- |
| Operator Review And Enable | Used Aliyun SSH/admin API instead of a working public operator console flow. | Public docs pointed to `/console/`, but the production route available to this rehearsal was a static console/prototype page, not a complete operator review/billing workflow. | `repos/platform` + `repos/brand-site` | major |
| Paid Call | Used platform spec/source knowledge for `delivery-meta` and relay message shape. | Public Caller quick start covered token issuance and evidence checks, but did not show the concrete transport dispatch command required to invoke a public relay-backed Hotline. | `repos/brand-site` + `repos/client` | major |
| Responder Runtime | Used `TRANSPORT_TYPE=relay_http` and `TRANSPORT_BASE_URL=https://callanything.xyz/relay` outside the current public Responder quick start. | The public Responder production block submitted review but did not explain how to keep a Responder online against the public relay transport. | `repos/brand-site` + `repos/client` | major |

## Findings

Use these severities:

- `blocker`: prevents first paid call completion.
- `major`: call can complete only with private help or confusing workaround.
- `minor`: call completes from public docs, but the experience is rough.

| Severity | Step | Finding | Evidence | Owning repo | Proposed follow-up |
| --- | --- | --- | --- | --- | --- |
| blocker fixed during run | Responder runtime heartbeat | `@delexec/ops@0.1.3` fixed CLI registration prefixes but responder runtime, caller controller, supervisor, and relay-http helpers still dropped path prefixes. | `responder-start.log`; client commit `a595f64610a536abfe3b3bf860d66c32aebc0dde`; CI `27478077929`; publish `27478151923`; `@delexec/ops@0.1.4`. | `repos/client` | Keep prefixed-base-url tests for every public Platform/Relay helper and avoid absolute-path URL joins. |
| major | Public production transport docs | Public docs let the Responder submit and the Caller request a token, but did not provide an end-to-end public relay dispatch recipe. The paid call completed only after using source/spec knowledge for `delivery-meta`, relay receiver parsing, relay send, and `TRANSPORT_TYPE=relay_http`. | `caller-delivery-meta-response-2.json`, `caller-relay-send-response-2.json`, rule violations above. | `repos/brand-site` + `repos/client` | Add a production relay invocation appendix or CLI command that performs token + delivery-meta + relay dispatch + result polling from public docs. |
| major | Operator UI surface | Public docs route operator to `/console/`, but this deployment required admin API calls via Aliyun `.env` for review and billing. | `admin-approve-*.json`, `admin-recharge-caller.json`; no working public console billing UI evidence. | `repos/platform` + `repos/brand-site` | Expose or document a real operator console/gateway flow for review, enable, tenant creation, recharge, and ledger evidence. |
| minor | Responder long-running command ergonomics | Starting `delexec-ops start` from a short-lived shell background killed the process after shell exit; `nohup` was needed during rehearsal. | `responder-start-014-public-relay.log` vs `responder-start-014-public-relay-nohup*.log`. | `repos/client` + `repos/brand-site` | Document foreground/daemon options for keeping a public Responder online, or add a CLI service/daemon mode with clear lifecycle output. |

## Completion Checklist

- [x] A real Responder was installed using public docs, with recorded violations for runtime transport gaps.
- [x] A real useful Hotline was packaged without writing new product code for the product repositories; only the temp rehearsal adapter under `/tmp` was adjusted.
- [x] Hotline review was submitted to production.
- [x] Operator approved and enabled the Hotline.
- [x] Marketplace showed the Hotline.
- [x] Caller was recharged.
- [x] A clean Caller identity invoked the Hotline through the public Platform and Relay path, with recorded violations for missing public transport docs.
- [x] The call returned a signed result.
- [x] Caller balance and ledger matched the expected price.
- [x] Production billing/admin API evidence showed the transaction; the public console billing UI remains a follow-up gap.
- [x] All public-docs rule violations were recorded.
- [x] All follow-up defects have owning repositories.

## Final Outcome

Leave this section blank until the manual run ends.

- Outcome: real production paid call completed. Final useful request `req_opc0_20260613t203700z` returned signed `status: ok` result through public relay and settled billing at 50 PTS.
- Completion decision: T-403 is complete as a production proof, but not clean as a public-docs-only onboarding experience. The remaining work is follow-up hardening/documentation, not another blocker to proving the first real paid call happened.
- Follow-up bundle or cards: CHG-2026-157 for client `@delexec/ops@0.1.4` runtime prefix fix; follow-up docs/product work for public relay invocation, operator console/billing flow, and long-running Responder lifecycle.
