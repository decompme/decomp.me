# Docker

## Prerequisites:

### Docker

You will need [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/). Follow the instructions for your distro.


## Production

0. Create a `docker.prod.env` and set the necessary configuration options (see .env for inspiration).

```bash
nano docker.prod.env
```

1. Bring up postgres & nginx containers

```bash
docker compose -f docker-compose.prod.yaml up -d postgres nginx
```

2. Build and bring up backend

```bash
docker compose -f docker-compose.prod.yaml build backend
docker compose -f docker-compose.prod.yaml up -d backend
```

3. Build and bring up frontend (relies on backend for SSR)

```bash
# NOTE: this can be overridden if needed, i.e. --build-arg INTERNAL_API_BASE=https://decomp.me/api
docker compose -f docker-compose.prod.yaml build frontend
docker compose -f docker-compose.prod.yaml up -d frontend
```


## Development

There is a `docker-compose.yaml` file to help you spin up a dev instance quickly.

**Run in foreground:**

```sh
docker compose up --build
```

The processes will run in the foreground until you CTRL+C to trigger a shutdown.

Navigate to [http://localhost:80](http://localhost:80) in your browser.


**Run daemonised:**

```sh
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


## Connecting from a different host

If you wish to run decomp.me on one machine and connect from a *different* one (e.g. to test the site on your phone) please edit `./backend/docker.dev.env` to add your `hostname` to the `ALLOWED_HOSTS` environment variable.

E.g. if your hostname is `mylaptop`:

```sh
ALLOWED_HOSTS="backend,localhost,127.0.0.1,mylaptop"
```
