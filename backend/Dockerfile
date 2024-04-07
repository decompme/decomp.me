FROM ubuntu:22.04 as base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3 \
    python-is-python3 \
    python3.10-venv \
    python3.10-dev


FROM base AS build

RUN apt-get -y update && apt-get install -y \
    curl \
    git \
    netcat

RUN curl -sSL https://install.python-poetry.org/ | \
    POETRY_VERSION=1.6.1 POETRY_HOME=/etc/poetry python3.10 -

WORKDIR /backend

# create a non-root user & /sandbox with correct ownership
RUN useradd --create-home user \
    && mkdir -p /sandbox \
    && chown -R user:user /sandbox

# switch to non-root user
USER user

ENV PATH="$PATH:/etc/poetry/bin"

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
