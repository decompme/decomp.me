FROM --platform=linux/amd64 ubuntu:26.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    netcat-traditional \
    python-is-python3 \
    python3 \
    python3.14-dev \
    python3.14-venv \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.9.11 /uv /bin/uv

WORKDIR /backend


FROM base AS dev

USER ubuntu

ENTRYPOINT ["/backend/docker_entrypoint.sh"]


FROM base AS uv-install

USER ubuntu

COPY pyproject.toml uv.lock /backend/

RUN uv sync --locked --no-dev


FROM base AS prod

COPY --from=uv-install /backend/.venv /backend/.venv

COPY manage.py db_housekeeping.py /backend/
COPY decompme /backend/decompme
COPY coreapp /backend/coreapp
COPY docker_prod_entrypoint.sh /backend/docker_prod_entrypoint.sh

USER ubuntu

ENTRYPOINT ["/backend/docker_prod_entrypoint.sh"]
