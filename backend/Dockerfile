FROM ubuntu:20.04 as base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3 \
    python-is-python3 \
    python3.9-venv \
    python3.9-dev


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
    binutils-mips-linux-gnu \
    binutils-powerpc-linux-gnu \
    binutils-aarch64-linux-gnu \
    curl \
    gcc-mips-linux-gnu \
    git \
    libnl-route-3-200 \
    libprotobuf-dev \
    netcat \
    unzip \
    wget \
    libtinfo5 \
    libc6-dev-i386 \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/install-poetry.py | \
  POETRY_VERSION=1.3.1 POETRY_HOME=/etc/poetry python3.9 -

COPY --from=nsjail /nsjail/nsjail /bin/nsjail

COPY --from=ghcr.io/decompals/wibo:0.2.4 /usr/local/sbin/wibo /usr/bin/

# windows compilers need i386 wine
ARG ENABLE_NDS_SUPPORT
ARG ENABLE_PS1_SUPPORT
ARG ENABLE_WII_GC_SUPPORT
RUN if [ "${ENABLE_NDS_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_PS1_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_WII_GC_SUPPORT}" = "YES" ]; then \
    dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y -o APT::Immediate-Configure=false \
        wine; \
    fi

# ps1 specifics
RUN if [ "${ENABLE_PS1_SUPPORT}" = "YES" ] ; then \
    apt-get update && \
    apt-get install -y -o APT::Immediate-Configure=false \
        dos2unix software-properties-common && \
    add-apt-repository -y ppa:dosemu2/ppa && \
    apt-get update && \
    apt-get install -y dosemu2; \
    fi

# gc/wii specifics
COPY --from=devkitpro/devkitppc:20210726 /opt/devkitpro/devkitPPC/bin/powerpc* /usr/bin/

# nds specifics
COPY --from=devkitpro/devkitarm:20210726 /opt/devkitpro/devkitARM/bin/arm* /usr/bin/

# download compilers
COPY compilers/download.py /compilers/

ARG ENABLE_GBA_SUPPORT
ARG ENABLE_N64_SUPPORT
ARG ENABLE_SWITCH_SUPPORT

ENV ENABLE_GBA_SUPPORT=${ENABLE_GBA_SUPPORT}
ENV ENABLE_WII_GC_SUPPORT=${ENABLE_WII_GC_SUPPORT}
ENV ENABLE_N64_SUPPORT=${ENABLE_N64_SUPPORT}
ENV ENABLE_NDS_SUPPORT=${ENABLE_NDS_SUPPORT}
ENV ENABLE_PS1_SUPPORT=${ENABLE_PS1_SUPPORT}
ENV ENABLE_SWITCH_SUPPORT=${ENABLE_SWITCH_SUPPORT}

RUN python3.9 -m pip install requests tqdm \
    && python3.9 /compilers/download.py \
    && rm -rf /compilers/download_cache/

RUN mkdir -p /etc/fonts

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
       [ "${ENABLE_WII_GC_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_NDS_SUPPORT}" = "YES" ]; then \
    wineboot --init; \
    fi

ENV PATH="$PATH:/etc/poetry/bin"

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
