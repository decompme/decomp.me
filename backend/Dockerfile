FROM ubuntu:21.04 as base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3 \
    python-is-python3


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

# TODO: change this when they tag a release
RUN git clone --recursive --shallow-submodules "https://github.com/google/nsjail" /nsjail \
    && cd /nsjail \
    && git checkout aa0becd547d835ac9b9d63a9536c23530c8d992e \
    && git submodule update \
    && make


FROM base AS build

RUN apt-get -y update && apt-get install -y \
    binutils-mips-linux-gnu \
    curl \
    gcc-mips-linux-gnu \
    libnl-route-3-200 \
    libprotobuf-dev \
    netcat \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /backend/requirements.txt

RUN python -m pip install -r /backend/requirements.txt --no-cache-dir

COPY --from=nsjail /nsjail/nsjail /bin/nsjail

COPY compilers/*.sh /compilers/

RUN bash /compilers/download.sh

# windows compilers need i386 wine
ARG ENABLE_PS1_SUPPORT
ARG ENABLE_GC_WII_SUPPORT
ARG ENABLE_NDS_SUPPORT
RUN if [ "${ENABLE_PS1_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_GC_WII_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_NDS_SUPPORT}" = "YES" ]; then \
    dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y -o APT::Immediate-Configure=false \
        wine; \
    fi

# ps1 specifics
RUN if [ "${ENABLE_PS1_SUPPORT}" = "YES" ] ; then \
    apt-get install -y dos2unix; \
    fi

# gc/wii specifics
COPY --from=devkitpro/devkitppc:20210726 /opt/devkitpro/devkitPPC/bin/powerpc* /usr/bin/
RUN if [ "${ENABLE_GC_WII_SUPPORT}" = "YES" ] ; then \
    bash /compilers/mwccppc.sh; \
    fi

# nds specifics
COPY --from=devkitpro/devkitarm:20210726 /opt/devkitpro/devkitARM/bin/arm* /usr/bin/
RUN if [ "${ENABLE_NDS_SUPPORT}" = "YES" ] ; then \
    bash /compilers/mwccarm.sh; \
    fi

WORKDIR /backend

ENV WINEPREFIX=/tmp/wine

# create a non-root user & /sandbox with correct ownership
RUN useradd --create-home user \
    && mkdir -p /sandbox \
    && chown -R user:user /sandbox \
    && mkdir -p "${WINEPREFIX}" \
    && chown user:user "${WINEPREFIX}"

# switch to non-root user
USER user

# initialize wine files to /home/user/.wine
RUN if [ "${ENABLE_PS1_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_GC_WII_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_NDS_SUPPORT}" = "YES" ]; then \
    wineboot --init; \
    fi

ENTRYPOINT ["/backend/docker_entrypoint.sh"]

# TODO: nginx server to proxy-pass frontend/backend in order to preserve cookies
