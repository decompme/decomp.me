# This image intentionally targets amd64 because the bundled
# compiler/binutils artifacts are x86 Linux binaries.
FROM --platform=linux/amd64 ubuntu:26.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    python-is-python3 \
    python3 \
    python3-pip \
    python3.12-dev \
    python3.12-venv \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

FROM base AS python314

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python-is-python3 \
    python3 \
    python3.14-dev \
    python3.14-venv \
    && rm -rf /var/lib/apt/lists/*

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
COPY housekeeping.py /backend

COPY decompme /backend/decompme
COPY libraries /backend/libraries
COPY compilers /backend/compilers

COPY coreapp /backend/coreapp

COPY docker_prod_entrypoint.sh /backend/docker_prod_entrypoint.sh

ENTRYPOINT ["/backend/docker_prod_entrypoint.sh"]
