# Production

## Prerequisites

Create `.deploy.env` with the desired image tags.

```bash
cat <<EOF > .deploy.env
NGINX_TAG=8ca8d5b59b50
EOF
```

Create the runtime nginx config files.

```bash
cp ./nginx/production/runtime/geo.conf.example ./nginx/production/runtime/geo.conf
cp ./nginx/production/runtime/upstream.conf.example ./nginx/production/runtime/upstream.conf
cp ./nginx/production/runtime/cromper-upstream.conf.example ./nginx/production/runtime/cromper-upstream.conf
```

Start the active Cromper slot before its proxy and public nginx.

```bash
docker compose -f docker-compose.prod.yaml --env-file .deploy.env up -d postgres cromper-orange
docker compose -f docker-compose.prod.yaml --env-file .deploy.env up -d cromper-proxy nginx certbot
```

## Blue/Green deployment

We support blue/green deployments when running decomp.me in production. This allows us to release the majority of our changes with zero downtime.

`deploy.py` deploys the requested image tag to the inactive backend and frontend slots, waits for them to become healthy, smoke-tests the inactive slot from nginx, then reloads nginx to switch traffic.

If a tag is omitted, the script pulls the mutable `latest` image tag, reads its
`org.opencontainers.image.revision` label, and deploys that immutable commit tag.
An explicitly provided `latest` remains the mutable tag.

### Standard deployments

```bash
python3 deploy.py deploy
```

The old slot is left running after a successful deploy so rollback remains quick.

### Cromper deployments

Cromper can be deployed independently to orange/purple slots. The internal
`cromper-proxy` nginx service routes app and public requests to the active slot.

```bash
python3 deploy.py deploy-cromper
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
python3 deploy.py migrate
```

### Status

```bash
python3 deploy.py status
```

## Health checks

Production backend containers use `GET /api/healthz`. This verifies Django can connect to the database without doing user-facing work.

Production frontend containers use `GET /healthz`. This verifies the Next.js server is responding without rendering the homepage.
