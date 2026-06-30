# T-401 Aliyun nginx deployment plan

Status: deployed on 2026-06-12.

This plan adapts the generic `T-401-deploy-runbook.md` to the existing Aliyun
ECS host that already serves `callanything.xyz`.

## Observed Server State

Read-only probes on 2026-06-12 found:

- SSH aliases are available:
  - `aliyun-ecs` -> `admin@116.62.4.213`
  - `aliyun-ecs-ops` -> `opsadmin@116.62.4.213`
- Hostname: `iZbp1g92u75ekvu88rzoaqZ`
- OS: Ubuntu 24.04.4 LTS
- Docker and Docker Compose are installed.
- nginx is active and already owns ports `80`, `443`, and `8080`.
- The current production site root is `/var/www/html`.
- `callanything.xyz` is served through nginx with Cloudflare Origin SSL.
- A host Postgres already listens on `127.0.0.1:5432`.
- No Docker compose project for public-stack is currently running.
- Candidate localhost ports are free:
  - `28080` for platform-api
  - `28085` for platform-console-gateway
  - `28090` for relay
  - `25432` for public-stack Postgres
- Current `/healthz`, `/platform/healthz`, `/relay/healthz`, `/gateway/healthz`,
  and `/console/` requests return site HTML, not public-stack health responses.

## Deployment Shape

Reuse the existing nginx edge instead of letting public-stack Caddy bind
`80`/`443`.

```text
Cloudflare
  -> Aliyun nginx :443
      /              -> existing /var/www/html brand site
      /healthz       -> nginx literal "ok"
      /platform/*    -> 127.0.0.1:28080 platform-api
      /relay/*       -> 127.0.0.1:28090 relay
      /gateway/*     -> 127.0.0.1:28085 platform-console-gateway
      /console/*     -> 127.0.0.1:28085 platform-console-gateway
```

Run public-stack without publishing its bundled `edge` service. The production
edge remains `/etc/nginx/sites-available/callanything.xyz`.

## Release State

Release images are now available for the Aliyun rollout:

- `@delexec/contracts@0.1.2` was published from protocol commit
  `ffc028ccb4d1d92fd93b63ce3f715daf84a4ece8`.
- Platform commit `1663da1bd2602d10b306a02decf221250334b1cc` consumes the
  published billing contracts package and fixes public-stack smoke health checks
  so the smoke process exits after cleanup.
- Platform tag `v0.1.1` was pushed and GitHub Actions run `27428828810` passed
  all three image builds plus `published-image-smoke`.
- `docker manifest inspect` passed locally for:
  - `ghcr.io/hejiajiudeeyu/rsp-platform:v0.1.1`
  - `ghcr.io/hejiajiudeeyu/rsp-relay:v0.1.1`
  - `ghcr.io/hejiajiudeeyu/rsp-gateway:v0.1.1`

Production `.env` secrets were generated on the VPS without printing secret
values. The active deployment directory is:

```text
/home/admin/apps/delegated-execution-public-stack
```

nginx backup before the proxy patch:

```text
/etc/nginx/sites-available/callanything.xyz.bak.20260612T164857Z
```

## Compose Override Draft

Create this file on the server next to `docker-compose.yml` as
`docker-compose.aliyun-nginx.override.yml`:

```yaml
services:
  postgres:
    ports: !override
      - "127.0.0.1:${POSTGRES_HOST_PORT:-25432}:5432"

  platform-api:
    ports:
      - "127.0.0.1:${PLATFORM_HOST_PORT:-28080}:${PLATFORM_PORT:-8080}"

  platform-console-gateway:
    ports:
      - "127.0.0.1:${GATEWAY_HOST_PORT:-28085}:${GATEWAY_PORT:-8085}"

  relay:
    ports:
      - "127.0.0.1:${RELAY_HOST_PORT:-28090}:${RELAY_PORT:-8090}"

  edge:
    profiles:
      - caddy-edge-disabled-on-aliyun
```

Use:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.aliyun-nginx.override.yml \
  config
```

This was locally validated with Docker Compose `config`; the rendered config
keeps service-internal ports at `8080`/`8085`/`8090`/`5432` and publishes only:

- `127.0.0.1:28080 -> platform-api:8080`
- `127.0.0.1:28085 -> platform-console-gateway:8085`
- `127.0.0.1:28090 -> relay:8090`
- `127.0.0.1:25432 -> postgres:5432`

and later:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.aliyun-nginx.override.yml \
  up -d postgres relay platform-api platform-console-gateway
```

## Env Draft

Use `/opt/delegated-execution-public-stack/.env` or
`/home/admin/apps/delegated-execution-public-stack/.env`.

Required values:

```dotenv
PUBLIC_SITE_ADDRESS=https://callanything.xyz
IMAGE_REGISTRY=ghcr.io/hejiajiudeeyu
IMAGE_TAG=v0.1.1

PLATFORM_PORT=8080
GATEWAY_PORT=8085
RELAY_PORT=8090
POSTGRES_PORT=5432

PLATFORM_HOST_PORT=28080
GATEWAY_HOST_PORT=28085
RELAY_HOST_PORT=28090
POSTGRES_HOST_PORT=25432

POSTGRES_DB=croc
POSTGRES_USER=croc
POSTGRES_PASSWORD=<strong-secret>
DATABASE_URL=postgresql://croc:<same-postgres-password>@postgres:5432/croc

TOKEN_SECRET=<strong-secret>
TOKEN_TTL_SECONDS=300
PLATFORM_ADMIN_API_KEY=<strong-secret>
PLATFORM_CONSOLE_BOOTSTRAP_SECRET=<strong-secret>
BILLING_ENFORCEMENT=enforced

ENABLE_BOOTSTRAP_RESPONDERS=false
BOOTSTRAP_RESPONDER_ID=
BOOTSTRAP_HOTLINE_ID=
BOOTSTRAP_TASK_DELIVERY_ADDRESS=
BOOTSTRAP_RESPONDER_API_KEY=
BOOTSTRAP_RESPONDER_PUBLIC_KEY_PEM=
BOOTSTRAP_RESPONDER_PRIVATE_KEY_PEM=
```

Do not paste secret values into chat, tickets, screenshots, or logs.

## nginx Patch Draft

Back up `/etc/nginx/sites-available/callanything.xyz` first.

Insert these locations before the catch-all `location /` block in the existing
`server_name callanything.xyz www.callanything.xyz` TLS server:

```nginx
location = /healthz {
    add_header Cache-Control "no-store" always;
    default_type text/plain;
    return 200 "ok\n";
}

location ^~ /platform/ {
    proxy_pass http://127.0.0.1:28080/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_read_timeout 300;
    proxy_send_timeout 300;
}

location ^~ /relay/ {
    proxy_pass http://127.0.0.1:28090/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_read_timeout 300;
    proxy_send_timeout 300;
}

location ^~ /gateway/ {
    proxy_pass http://127.0.0.1:28085/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_read_timeout 300;
    proxy_send_timeout 300;
}

location ^~ /console/ {
    proxy_pass http://127.0.0.1:28085/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_read_timeout 300;
    proxy_send_timeout 300;
}
```

Validate before reload:

```bash
sudo nginx -t
```

Reload only after compose services are healthy:

```bash
sudo systemctl reload nginx
```

## Server Preparation Commands

Run these before copying secrets or reloading nginx:

```bash
export DEPLOY_ROOT=/opt/delegated-execution-public-stack
export STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

sudo install -d -m 0750 -o admin -g admin "$DEPLOY_ROOT"

sudo cp /etc/nginx/sites-available/callanything.xyz \
  "/etc/nginx/sites-available/callanything.xyz.bak.${STAMP}"

sudo nginx -t

sudo ss -ltnp | grep -E ':80 |:443 |:28080 |:28085 |:28090 |:25432 ' || true
docker compose ls || true
docker volume ls | grep -E 'public-stack|delexec|croc|relay|postgres' || true
```

Expected before startup:

- nginx owns `80` and `443`
- no process owns `28080`, `28085`, `28090`, or `25432`
- no existing public-stack compose project is running

## Verification

Server-local checks:

```bash
curl -fsS http://127.0.0.1:28080/healthz
curl -fsS http://127.0.0.1:28090/healthz
curl -fsS http://127.0.0.1:28085/console/ >/dev/null
sudo nginx -t
```

Public checks:

```bash
curl -fsS https://callanything.xyz/healthz
curl -fsS https://callanything.xyz/platform/healthz
curl -fsS https://callanything.xyz/relay/healthz
curl -fsS https://callanything.xyz/gateway/healthz
curl -fsS https://callanything.xyz/console/ >/dev/null
```

Content matters: these checks must not silently pass by returning brand-site
`index.html`.

## Rollback

If any public route breaks:

```bash
sudo cp /etc/nginx/sites-available/callanything.xyz.bak.<timestamp> \
  /etc/nginx/sites-available/callanything.xyz
sudo nginx -t
sudo systemctl reload nginx
```

If the compose stack breaks:

```bash
cd /opt/delegated-execution-public-stack
docker compose \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.aliyun-nginx.override.yml \
  down
```

## Deployment Evidence

- `docker compose config` succeeded with `docker-compose.yml` plus
  `docker-compose.aliyun-nginx.override.yml`.
- `docker compose pull` pulled `rsp-platform:v0.1.1`, `rsp-relay:v0.1.1`,
  `rsp-gateway:v0.1.1`, and `postgres:16-alpine`.
- `docker compose up -d postgres relay platform-api platform-console-gateway`
  started all four services.
- Active bindings:
  - `127.0.0.1:28080 -> platform-api:8080`
  - `127.0.0.1:28085 -> platform-console-gateway:8085`
  - `127.0.0.1:28090 -> relay:8090`
  - `127.0.0.1:25432 -> postgres:5432`
- `nginx -t` passed and nginx reload succeeded.
- Public checks passed:
  - `https://callanything.xyz/` still returns the brand-site HTML.
  - `https://callanything.xyz/healthz` returns `ok`.
  - `https://callanything.xyz/platform/healthz` returns platform-api health.
  - `https://callanything.xyz/relay/healthz` returns transport-relay health.
  - `https://callanything.xyz/gateway/healthz` returns gateway health.
  - `https://callanything.xyz/console/` returns console HTML.
  - Gateway session + credentials + proxy smoke returned statuses
    `201`, `200`, and `200` without printing secret or token values.

## Next Actions

1. Move T-402 from blocked to live-platform verification.
2. Keep the rollback commands below available until T-403 dry run finishes.
3. Perform the OPC #0 production dry run using only public documentation.
