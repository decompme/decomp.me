FROM --platform=linux/amd64 ubuntu:24.04 AS base

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

RUN curl -sSL https://install.python-poetry.org/ | \
    POETRY_VERSION=2.2.0 \
    POETRY_HOME=/etc/poetry \
    python3.12 -

ENV POETRY_VIRTUALENVS_PATH=/virtualenvs

ENV PATH="${PATH}:/etc/poetry/bin"

WORKDIR /backend

ENV POETRY_VIRTUALENVS_PATH=/backend/virtualenvs

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
