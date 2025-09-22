FROM --platform=linux/amd64 ubuntu:24.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    python-is-python3 \
    python3 \
    python3-pip \
    python3.12-dev \
    python3.12-venv \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/bin/" sh

WORKDIR /backend

USER ubuntu

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
