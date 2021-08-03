# Docker

There is a `docker-compose.yaml` file to help you spin up an instance quickly.

## Prerequisites:

### Docker

You will need [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/). Follow the instructions for your distro.

### Directories

You will need to create a directory for the `postgres` data:

```sh
mkdir -p postgres
```

**Note:** This directory will get owned by 'postgres' user when postgres first starts up!

## Quickstart

```sh
docker-compose up -d && docker-compose logs -f
```

You can CTRL+C to stop tailing logs. If you want to stop the processes then running `docker-compose down` will shut everything down.

**Note:** The first time you bring up the containers can take a minute or so - Docker has to pull/build images, grab node dependencies, apply database migrations etc. Subsequent runs will be significantly faster to spin up.

### Re-building Images

If the Docker images become stale (e.g. updates are made to `requirements.txt`), then you can run the following to build the images before they are spin up:

```sh
docker-compose up -d --build
```
