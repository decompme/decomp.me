# This image intentionally targets amd64 because the bundled
# compiler/binutils artifacts are x86 Linux binaries.
FROM --platform=linux/amd64 ubuntu:26.04 AS base

ENV DEBIAN_FRONTEND=noninteractive


FROM base AS dependencies

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    netcat-traditional \
    python-is-python3 \
    python3 \
    python3-pip \
    python3.12-dev \
    python3.12-venv \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.8.18 /uv /bin/uv


FROM dependencies AS dev

WORKDIR /backend

ENTRYPOINT ["/backend/docker_entrypoint.sh"]


FROM python314 AS uv-install

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

USER ubuntu

WORKDIR /backend

COPY pyproject.toml uv.lock /backend/

RUN uv sync --locked --no-dev


FROM dependencies AS prod

COPY --from=uv-install /backend/.venv /backend/.venv

COPY manage.py /backend
COPY db_housekeeping.py /backend

COPY decompme /backend/decompme

COPY coreapp /backend/coreapp

COPY docker_prod_entrypoint.sh /backend/docker_prod_entrypoint.sh

ENTRYPOINT ["/backend/docker_prod_entrypoint.sh"]
