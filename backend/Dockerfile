FROM ubuntu:22.04 as base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3 \
    python-is-python3 \
    python3-venv


FROM base AS nsjail

RUN apt-get -y update && apt-get install -y \
    autoconf \
    bison \
    flex \
    gcc \
    g++ \
    git \
    libprotobuf-dev \
    libnl-route-3-dev \
    libtool \
    make \
    pkg-config \
    protobuf-compiler

RUN git clone "https://github.com/google/nsjail" --recursive --branch 3.1 /nsjail \
    && cd /nsjail \
    && make


FROM base AS build

RUN apt-get -y update && apt-get install -y \
    binutils-aarch64-linux-gnu \
    binutils-mips-linux-gnu \
    binutils-powerpc-linux-gnu \
    curl \
    dos2unix \
    gcc-mips-linux-gnu \
    libc6-dev-i386 \
    libnl-route-3-200 \
    libprotobuf-dev \
    libtinfo5 \
    netcat \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN dpkg --add-architecture i386 && apt-get update \
    && apt-get install -y --no-install-recommends -o APT::Immediate-Configure=false \
      libstdc++6:i386

RUN curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/install-poetry.py | \
  POETRY_VERSION=1.1.13 POETRY_HOME=/etc/poetry python -

COPY --from=nsjail /nsjail/nsjail /bin/nsjail

COPY --from=ghcr.io/decompals/wibo:0.2.3 /usr/local/sbin/wibo /usr/bin/

# gc/wii specifics
COPY --from=devkitpro/devkitppc:20210726 /opt/devkitpro/devkitPPC/bin/powerpc* /usr/bin/

# nds specifics
COPY --from=devkitpro/devkitarm:20210726 /opt/devkitpro/devkitARM/bin/arm* /usr/bin/

# download compilers
COPY compilers/download.py /compilers/

ARG ENABLE_GBA_SUPPORT
ARG ENABLE_N64_SUPPORT
ARG ENABLE_NDS_SUPPORT
ARG ENABLE_PS1_SUPPORT
ARG ENABLE_SWITCH_SUPPORT
ARG ENABLE_WII_GC_SUPPORT

ENV ENABLE_GBA_SUPPORT=${ENABLE_GBA_SUPPORT}
ENV ENABLE_N64_SUPPORT=${ENABLE_N64_SUPPORT}
ENV ENABLE_NDS_SUPPORT=${ENABLE_NDS_SUPPORT}
ENV ENABLE_PS1_SUPPORT=${ENABLE_PS1_SUPPORT}
ENV ENABLE_SWITCH_SUPPORT=${ENABLE_SWITCH_SUPPORT}
ENV ENABLE_WII_GC_SUPPORT=${ENABLE_WII_GC_SUPPORT}

RUN pip install requests tqdm && python3 /compilers/download.py && rm -rf /compilers/download_cache/

WORKDIR /backend

# create a non-root user & /sandbox with correct ownership
RUN useradd --create-home user \
    && mkdir -p /sandbox \
    && chown -R user:user /sandbox

# switch to non-root user
USER user

ENV PATH="$PATH:/etc/poetry/bin"

ENTRYPOINT ["/backend/docker_entrypoint.sh"]

# TODO: nginx server to proxy-pass frontend/backend in order to preserve cookies
