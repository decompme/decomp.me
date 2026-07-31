# Production

## Prerequisites

Create `.deploy.env` with the desired `NGINX_TAG`.

```bash
cat <<EOF > .deploy.env
NGINX_TAG=8ca8d5b59b50
EOF
```

Create the runtime nginx config files.

```bash
cp ./nginx/production/runtime/geo.conf.example ./nginx/production/runtime/geo.conf
cp ./nginx/production/runtime/upstream.conf.example ./nginx/production/runtime/upstream.conf
```

Start the shared production services.

```bash
docker compose -f docker-compose.prod.yaml --env-file .deploy.env up -d postgres nginx certbot
```

## Blue/Green deployment

We support blue/green deployments when running decomp.me in production. This allows us to release the majority of our changes with zero downtime.

`deploy.py` deploys the requested image tag to the inactive slot, waits for the backend and frontend containers to become healthy, smoke-tests the inactive slot from nginx, then reloads nginx to switch traffic.

### Standard deployments

```bash
python3 deploy.py deploy githash
```

The old slot is left running after a successful deploy so rollback remains quick.

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
