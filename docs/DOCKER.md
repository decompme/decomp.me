# Docker

There is a `docker-compose.yaml` file to help you spin up an instance quickly.

## Prerequisites:

### Docker

You will need [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/). Follow the instructions for your distro.

### Directories

You will need to create a directory for the `postgres` data in the base of the repo:

```sh
mkdir -p postgres
```

**Note:** This directory will get owned by `postgres` user when postgres first starts up!

## Quickstart

**Run in foreground:**

```sh
docker-compose up --build
```

The processes will run in the foreground until you CTRL+C to trigger a shutdown.

Navigate to [http://localhost:80](http://localhost:80) in your browser.


**Run daemonised:**

```sh
docker-compose up -d && docker-compose logs -f
```
You can CTRL+C to stop tailing logs. If you want to stop the processes then running `docker-compose down` will shut everything down.

**Note:** The first time you bring up the containers can take a minute or so - Docker has to pull/build images, grab Node dependencies, apply database migrations etc. Subsequent runs will be significantly faster to spin up.


## Configuration

By default the Docker `backend` image is built without support for all platforms (e.g. PS2, Switch, Saturn). Platforms can be enabled by changing the `ENABLE_<PLATFORM>_SUPPORT` variables to `"YES"` in the `docker-compose.yaml` and re-running the `docker-compose up --build` command.

E.g. to enable `PS2` platform:

```yaml
  backend:
    build:
      context: backend
      args:
        #... <snip>
        ENABLE_PS2_SUPPORT: "YES"
```


## Connecting from a different host

If you wish to run decomp.me on one machine but connect from a different one (e.g. to test the site on your phone) please edit `./backend/docker.dev.env` to add the `hostname` to the `ALLOWED_HOSTS` environment variable.

E.g. if your hostname is `mylaptop`:

```sh
ALLOWED_HOSTS="backend,localhost,127.0.0.1,mylaptop"
```
