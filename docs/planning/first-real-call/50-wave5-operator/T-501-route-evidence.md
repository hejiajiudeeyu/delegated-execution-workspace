# T-501 Route Evidence

Generated: 2026-06-18 (agent read-only probes; no secrets recorded)

## Purpose

Verify that `https://callanything.xyz/console/` and `/gateway/*` are served by **platform-console-gateway**, not the brand-site static bundle. This file tracks public URL probes and the remaining manual gateway-session smoke.

## Fourth-Repo Contract Checks (agent)

```bash
corepack pnpm run operator:onboarding:check
# [ok] all 6 operator onboarding contract checks passed

corepack pnpm --silent run deployability:exposure -- --json
# summary.public_exposure_ready: false (local .env PUBLIC_SITE_ADDRESS=localhost — expected for dev workspace)
# route_count: 5, route_ready_count: 5 (/healthz, /platform, /relay, /gateway, /console)
# current_bundle: CHG-2026-165, platform_sha 508d95a…
```

Local workspace blocker `PUBLIC_SITE_ADDRESS=localhost` does **not** affect production Aliyun `.env` (T-401 sets `https://callanything.xyz` on VPS).

## Content Discrimination Criteria

| Signal | Brand-site (wrong for `/console/`) | Gateway console (expected) |
|--------|-----------------------------------|----------------------------|
| `<title>` | `CALL ANYTHING — Agent 调用外部能力的开放协议` | `Platform Console` |
| Root mount | marketing `ld+json`, `/og/home.png`, blog RSS | `<div id="root"></div>` + console JS module |
| JS bundle markers | N/A (marketing HTML) | v0.1.3: `reviews`, `billing`, `LEGACY_CONSOLE`; v0.1.4+: `nav-model`, `human-view`, `shell-markup`, `#sidebar-nav` |
| CSS cache-bust | N/A | `styles.css?v=20260620-sidebar` (v0.1.4 sidebar layout) |
| `/gateway/healthz` body | HTML or 404 | JSON `{"ok":true,"service":"platform-console-gateway"}` |

**Rule:** HTTP 200 alone is insufficient — brand-site `index.html` also returns 200.

## Regression: Console blank page (2026-06-18)

**Symptom:** Browser console error on [https://callanything.xyz/console/](https://callanything.xyz/console/):

```text
main.tsx:1 Failed to load module script: Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "text/html".
```

**Root cause (two bugs in `apps/platform-console/index.html`):**

1. `<script src="/src/main.tsx">` uses an **absolute** path → browser requests `https://callanything.xyz/src/main.tsx`, which nginx routes to **brand-site** HTML (`text/html`), not gateway JS.
2. Mount point mismatch: HTML had `id="root"` (React dev entry) but production static console uses `main.js` targeting `#app`.

**Fix (repos/platform, owning repo):**

- `index.html` → `id="app"`, `./src/main.js`, `./src/styles.css` (relative paths resolve under `/console/` → nginx proxies to gateway).
- Smoke/integration tests assert relative entry + JS MIME type.

**Deploy:** rebuild/push `rsp-gateway` image and roll public-stack on Aliyun (see T-401 runbook). Until deploy, `/console/` remains broken in browser despite HTTP 200 on the HTML shell.

---

## Public URL Probes (2026-06-18, pre-fix deploy)

Commands (safe to re-run; no secrets):

```bash
curl -fsS https://callanything.xyz/console/ | head -n 20
curl -fsS https://callanything.xyz/gateway/healthz
curl -fsS https://callanything.xyz/platform/healthz
curl -fsS https://callanything.xyz/relay/healthz
curl -fsS https://callanything.xyz/healthz
```

### Results summary

| URL | Status | Body characteristic | Pass? |
|-----|--------|---------------------|-------|
| `/console/` | 200 | `<title>Platform Console</title>`, `#root`, module `/src/main.tsx` | ⚠️ **broken in browser** — see §Regression 2026-06-18 |
| `/console/src/main.js` | 200 | ~36 KB JS; contains `reviews`, `billing`, `LEGACY_CONSOLE` | ✅ console app bundle |
| `/gateway/healthz` | 200 | `{"ok":true,"service":"platform-console-gateway"}` | ✅ |
| `/platform/healthz` | 200 | `{"ok":true,"service":"platform-api"}` | ✅ regression |
| `/relay/healthz` | 200 | `{"ok":true,"service":"transport-relay"}` | ✅ regression |
| `/healthz` | 200 | plain `ok` | ✅ |
| `/` (brand root) | 200 | `<title>CALL ANYTHING — …</title>` | ✅ marketing site unchanged |

### Session endpoint (unauthenticated probe)

```bash
curl -fsS -X POST https://callanything.xyz/gateway/session/setup \
  -H 'content-type: application/json' -d '{}'
# HTTP 403 — gateway reachable; rejects empty bootstrap (expected)
```

## Local Upstream Templates (for `[人工]` on Aliyun ECS)

Run on server after SSH (`aliyun-ecs` / `admin@116.62.4.213`):

```bash
cd /home/admin/apps/delegated-execution-public-stack
docker compose ps
curl -fsS http://127.0.0.1:28085/ | head -n 20   # console at upstream root (not /console/)
curl -fsS http://127.0.0.1:28085/healthz          # gateway health on upstream
curl -fsS http://127.0.0.1:28080/platform/healthz
curl -fsS https://callanything.xyz/console/ | head -n 20
curl -fsS https://callanything.xyz/gateway/healthz
```

Expected local upstream: same JSON/HTML characteristics as public probes above.

## nginx Alignment with T-401

T-401 plan requires (before catch-all `location /`):

- `location ^~ /gateway/` → `proxy_pass http://127.0.0.1:28085/;`
- `location ^~ /console/` → `proxy_pass http://127.0.0.1:28085/;`

**Agent assessment:** Public probes match T-401 intended behavior. No nginx diff suggested unless server-local upstream fails while public URLs pass (would indicate stale CDN cache only — unlikely given distinct bodies).

If `/console/` ever returns brand-site HTML again, check:

1. Missing or mis-ordered `location ^~ /console/` (must precede `location /` with `try_files`)
2. `platform-console-gateway` down on `127.0.0.1:28085`
3. nginx not reloaded after compose recovery

## Compose / Platform Repo

- `repos/platform/deploy/public-stack/docker-compose.yml` includes `platform-console-gateway` (image `rsp-gateway`).
- Aliyun override: `docker-compose.aliyun-nginx.override.yml` (see T-401) publishes `127.0.0.1:28085`.
- `tests/smoke/public-stack-smoke.mjs` already covers gateway session setup, credential persist, and proxied `/gateway/proxy/v2/admin/hotlines`.

**No compose or service gap identified** from read-only review.

## Production Deploy Evidence (2026-06-18)

**Actions taken on Aliyun (`aliyun-ecs`):**

- Rolled `platform-console-gateway` → `ghcr.io/hejiajiudeeyu/rsp-gateway:v0.1.3`
- Kept `platform-api` / `relay` at `v0.1.2` (`IMAGE_TAG` in `.env`); `v0.1.3` platform-api crashes without bundled service-resolution contracts
- Pinned gateway image in `docker-compose.aliyun-nginx.override.yml` so future `compose up` does not downgrade gateway

**Post-deploy public probes:**

| URL | Result |
|-----|--------|
| `/console/` | ✅ `id="app"`, `src="./src/main.js"` |
| `/console/src/main.js` | ✅ `content-type: text/javascript` |
| `/gateway/healthz` | ✅ `platform-console-gateway` |
| `/platform/healthz` | ✅ `platform-api` (after api rollback) |
| `/relay/healthz` | ✅ `transport-relay` |

**Gateway bootstrap smoke (existing encrypted store):**

- `POST /gateway/session/setup` → **409** `AUTH_SECRET_STORE_EXISTS` (expected; store already initialized from T-401)
- Proxy path requires **browser login** with production console passphrase (not in `.env`)

**Browser step remaining:** open `https://callanything.xyz/console/`, unlock with operator passphrase, confirm Reviews + Billing load.

---

## Production Deploy Evidence (2026-06-21) — gateway v0.1.4 sidebar UI

**Actions taken on Aliyun (`aliyun-ecs`):**

- Rolled **only** `platform-console-gateway` → `ghcr.io/hejiajiudeeyu/rsp-gateway:v0.1.4` (platform commit `38dfeea`, tag `v0.1.4`)
- Updated pin in `docker-compose.aliyun-nginx.override.yml` (`v0.1.3` → `v0.1.4`); backup saved alongside override
- **Did not** change `IMAGE_TAG` — `platform-api` / `relay` remain `v0.1.2`
- Fourth-repo bundle: `CHG-2026-168.yaml` (platform SHA `38dfeea`)

**Commands:**

```bash
cd /home/admin/apps/delegated-execution-public-stack
sed -i 's|rsp-gateway:v0.1.3|rsp-gateway:v0.1.4|g' docker-compose.aliyun-nginx.override.yml
sudo docker compose -f docker-compose.yml -f docker-compose.aliyun-nginx.override.yml pull platform-console-gateway
sudo docker compose -f docker-compose.yml -f docker-compose.aliyun-nginx.override.yml up -d platform-console-gateway
```

**Post-deploy probes (agent, 2026-06-21):**

| URL | Result |
|-----|--------|
| `/console/` | ✅ `Platform Console`, `styles.css?v=20260620-sidebar`, `#app` |
| `/console/src/main.js` | ✅ imports `./nav-model.js`, `./human-view.js`, `./shell-markup.js`; `#sidebar-nav` |
| `/gateway/healthz` | ✅ `{"ok":true,"service":"platform-console-gateway"}` |
| `/platform/healthz` | ✅ `platform-api` (unchanged) |
| `/relay/healthz` | ✅ `transport-relay` (unchanged) |
| `/healthz` | ✅ plain `ok` |

**Local upstream note:** gateway container listens on `127.0.0.1:28085`; console HTML is at **`/`** on the upstream (nginx `location ^~ /console/` strips the prefix). Use `curl http://127.0.0.1:28085/` not `…/console/` when probing upstream directly. Gateway health JSON is at upstream `/healthz` (public path remains `/gateway/healthz` via nginx).

**Browser step remaining:** unlock with production operator passphrase → confirm sidebar nav (Overview / Reviews / Billing / …) and human-readable panels load data.

---

## Acceptance Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `/gateway/healthz` → gateway JSON | ✅ |
| 2 | `/console/` → platform-console UI | ✅ v0.1.4 sidebar layout live; browser unlock + data panels pending passphrase |
| 3 | Gateway session + admin proxy smoke | ⏳ setup=409 (existing store); proxy needs browser session |
| 4 | `/platform/healthz`, `/relay/healthz` regression | ✅ |
| 5 | Platform tests | ✅ local `public-stack-smoke` passed |
