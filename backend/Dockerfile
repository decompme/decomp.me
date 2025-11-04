FROM --platform=linux/amd64 ubuntu:24.04 AS base

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

COPY --from=ghcr.io/astral-sh/uv:0.9.7 /uv /bin/uv


FROM dependencies AS dev

WORKDIR /backend

USER ubuntu

ENTRYPOINT ["/backend/docker_entrypoint.sh"]


FROM dependencies AS uv-install

USER ubuntu

WORKDIR /backend

COPY pyproject.toml uv.lock /backend/

RUN uv sync --locked

FROM dependencies AS prod

COPY --from=uv-install /backend/.venv /backend/.venv

COPY manage.py /backend
COPY db_housekeeping.py /backend

COPY decompme /backend/decompme

COPY coreapp /backend/coreapp

COPY docker_prod_entrypoint.sh /backend/docker_prod_entrypoint.sh

ENTRYPOINT ["/backend/docker_prod_entrypoint.sh"]
