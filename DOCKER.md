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


**Run daemonised:**

```sh
docker-compose up -d && docker-compose logs -f
```
You can CTRL+C to stop tailing logs. If you want to stop the processes then running `docker-compose down` will shut everything down.

**Note:** The first time you bring up the containers can take a minute or so - Docker has to pull/build images, grab Node dependencies, apply database migrations etc. Subsequent runs will be significantly faster to spin up.


## Configuration

By default the Docker `backend` image is built without PS1 support. If you wish to enable it, change `ENABLE_PS1_SUPPORT` to `YES` in the `docker-compose.yaml` and re-run the `docker-compose up --build` command.
