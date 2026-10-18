# Docker

## Prerequisites

You will need to have at least 4GB RAM available, ideally 6GB+.

### Docker

You will need [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/). Follow the instructions for your distro.

## Development

There is a `docker-compose.yaml` file to help you spin up a dev instance quickly.

**Run in foreground:**

```bash
docker compose up --build
```

The processes will run in the foreground until you CTRL+C to trigger a shutdown.

Navigate to [http://localhost:80](http://localhost:80) in your browser.


**Run daemonised:**

```bash
docker compose up -d && docker compose logs -f
```
You can CTRL+C to stop tailing logs. If you want to stop the processes then running `docker compose down` will shut everything down.

**Note:** The first time you bring up the containers can take a minute or so - Docker has to pull/build images, grab Node dependencies, apply database migrations etc. Subsequent runs will be significantly faster to spin up.


## Configuration

By default, the Docker `backend` container is configured with the Switch platform disabled (due to the size of the Clang compilers).

Platforms can be enabled by changing the `ENABLE_<PLATFORM>_SUPPORT` variables to `YES` in the `docker-compose.yaml` and re-running the `docker compose up` command.

E.g. to enable `SWITCH` platform:

```yaml
  backend:
    build:
      context: backend
    environment:
      - ENABLE_SWITCH_SUPPORT=YES
```


### Backend request limit

`CROMPER_REQUEST_LIMIT` defaults to `15` in `backend/decompme/settings.py` and
can be overridden in the backend's environment file. It limits concurrent
requests that may wait for Cromper **per ASGI worker process**, including scratch
creation, updates, compilation, decompilation, forks, and exports. Excess requests
receive HTTP 429 with `Retry-After: 1` before session or profile database access.
Ordinary reads bypass the limit.

Budget `CROMPER_REQUEST_LIMIT × total backend workers` below Postgres's connection
limit, leaving headroom for other requests and database clients. Include workers
in both slots during overlapping blue/green deployments. This setting does not
limit concurrent ordinary requests.

Cromper also returns HTTP 429 with `Retry-After: 1` when its tool executor is
full. The backend distinguishes this from HTTP 503 or transport failures and
does not automatically retry. Scratch compile/decompile responses retain their
existing response shape and include a friendly busy message.

## Debugging the backend

The `backend` container exposes port `5678` for the VS Code **Debug Backend**
launch configuration (`.vscode/launch.json`). Debugpy is off by default; enable it
by setting `BACKEND_DEBUGPY` in the environment when starting the stack:

```bash
BACKEND_DEBUGPY=1 docker compose up -d backend
```

Then attach using the **Debug Backend** configuration. While debug mode is on the
backend runs the ASGI server without autoreload, so restart it after code changes.

## Connecting from a different host

If you wish to run decomp.me on one machine and connect from a *different* one (e.g. to test the site on your phone) please edit `./backend/docker.dev.env` to add your `hostname` to the `ALLOWED_HOSTS` environment variable.

E.g. if your hostname is `mylaptop`:

```bash
ALLOWED_HOSTS="backend,localhost,127.0.0.1,mylaptop"
```

## Production

Production uses `docker-compose.prod.yaml` with blue/green backend and frontend slots. See [PRODUCTION.md](PRODUCTION.md) for the deployment runbook.

Create a `docker.prod.env` and set the necessary configuration options.

```bash
nano docker.prod.env
```

Follow the [production runbook](PRODUCTION.md) to configure the image tags and start the services.

Deploy an app image tag with the blue/green deploy script.

```bash
python3 deploy.py deploy githash
```

Use the migration flow for deploys that require database maintenance.

```bash
python3 deploy.py migrate githash
```

### SSL Certificates Bootstrap

In order to bring up nginx we need to have SSL certificates. In order to do that we need to get nginx to run only on port 80, then run certbot to fetch the certs.

1. Modify `nginx/production/default.conf` to comment out the whole HTTPS server block between `{{HTTPS_SERVER_BLOCK_START}}` and `{{HTTPS_SERVER_BLOCK_END}}`.

2. Bring up nginx

```bash
docker compose -f docker-compose.prod.yaml up -d nginx
```

3. Run certbot:

```bash
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d decomp.me -d www.decomp.me \
  --email you@your-email.com \
  --agree-tos \
  --no-eff-email
```

4. Uncomment the 443 block and then send a reload trigger to nginx

```bash
docker compose exec nginx nginx -t # sanity check configuration OK
docker compose exec nginx nginx -s reload
```
