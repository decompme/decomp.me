# Production

## Cromper telemetry

Set `SENTRY_DSN` in `cromper.prod.env` to publish telemetry. `SENTRY_SAMPLE_RATE`
controls trace sampling independently of `SENTRY_METRICS_SAMPLE_RATE`, which
controls sampling of operation metrics for compile, assemble, diff, and decompile.

`SENTRY_METRICS_SAMPLE_RATE` defaults to `1.0` (all requests); `0` disables
operation metrics, and `0.1` records approximately 10% of requests. Each request's
count, durations, and sizes are kept or dropped together. Request counters count
sampled requests and are not extrapolated to total traffic.

## Prerequisites

Create `.deploy.env` with the desired image tags.

```bash
cat <<EOF > .deploy.env
ACTIVE_SLOT=blue
BLUE_TAG=<published-git-hash>
NGINX_TAG=<published-git-hash>
CROMPER_ACTIVE_SLOT=orange
CROMPER_ORANGE_TAG=<published-git-hash>
CROMPER_PROXY_TAG=<published-git-hash>
EOF
```

Create the runtime nginx config files.

```bash
cp ./nginx/production/runtime/geo.conf.example ./nginx/production/runtime/geo.conf
cp ./nginx/production/runtime/upstream.conf.example ./nginx/production/runtime/upstream.conf
cp ./cromper-proxy/production/runtime/cromper-upstream.conf.example ./cromper-proxy/production/runtime/cromper-upstream.conf
```

Start the active Cromper slot, then the app and proxies.

```bash
docker compose -f docker-compose.prod.yaml --env-file .deploy.env up -d postgres cromper-orange
docker compose -f docker-compose.prod.yaml --env-file .deploy.env up -d cromper-proxy backend-blue frontend-blue
docker compose -f docker-compose.prod.yaml --env-file .deploy.env up -d nginx certbot
```

## Blue/Green deployment

We support blue/green deployments when running decomp.me in production. This allows us to release the majority of our changes with zero downtime.

`deploy.py` deploys the requested image tag to the inactive backend and frontend slots, waits for them to become healthy, smoke-tests the inactive slot from nginx, then reloads nginx to switch traffic.

### Standard deployments

`update.sh` fetches and resets the checkout to `origin/main`, updates compilers
and libraries, and deploys the backend and frontend by default:

```bash
./update.sh
./update.sh deploy-cromper
./update.sh deploy-all
./update.sh deploy-cromper abcdef123456
```

`auto` uses the 12-character commit hash of fetched `origin/main` as the image
tag and prompts before proceeding. An explicit image tag can replace `auto`.
Commands can come first with an optional tag; the existing tag-first syntax
(for example, `./update.sh auto deploy-cromper`) is also supported.
`deploy-cromper` deploys only Cromper; `deploy-all` deploys Cromper first, then
the backend and frontend using the same tag. These deployments are sequential:
if the app deployment fails, Cromper remains updated. Compiler/library updates
and the Discord update notification run once per successful wrapper invocation.
The wrapper also accepts `migrate` for maintenance deployments.

To deploy directly without updating the checkout:

```bash
python3 deploy.py deploy githash
```

The old slot is left running after a successful deploy so rollback remains quick.

### Cromper deployments

Cromper can be deployed independently to orange/purple slots. The internal
`cromper-proxy` routes requests to the active slot.

```bash
python3 deploy.py deploy-cromper githash
```

The inactive slot is pulled, started, and checked for health before the proxy
route is switched. The previous slot remains available for rollback:

```bash
python3 deploy.py rollback-cromper
```

### Rollback

```bash
python3 deploy.py rollback
```

### Migrations

Schema-changing deploys may require maintenance time. The migration flow stops both app slots, runs migrations using the new backend image, starts `blue`, then points nginx at `blue`.

```bash
python3 deploy.py migrate githash
```

### Status

```bash
python3 deploy.py status
```

## Health checks

Production backend containers use `GET /api/healthz`. This verifies Django can connect to the database without doing user-facing work.

Production frontend containers use `GET /healthz`. This verifies the Next.js server is responding without rendering the homepage.
