FROM ubuntu:22.04 as base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3 \
    python-is-python3 \
    python3.10-venv \
    python3.10-dev


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
    binutils-arm-none-eabi \
    binutils-djgpp \
    binutils-mips-linux-gnu \
    binutils-powerpc-linux-gnu \
    binutils-sh-elf \
    ca-certificates \
    curl \
    dos2unix \
    gcc-mips-linux-gnu \
    git \
    iptables \
    libc6-dev-i386 \
    libdevmapper1.02.1 \
    libgpgme11 \
    libnl-route-3-200 \
    libprotobuf-dev \
    libtinfo5 \
    netcat \
    software-properties-common \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://install.python-poetry.org/ | \
  POETRY_VERSION=1.6.1 POETRY_HOME=/etc/poetry python3.10 -

COPY --from=nsjail /nsjail/nsjail /bin/nsjail

COPY --from=ghcr.io/decompals/wibo:0.6.4 /usr/local/sbin/wibo /usr/bin/

# windows compilers need i386 wine

ARG ENABLE_MSDOS_SUPPORT
ARG ENABLE_NDS_ARM9_SUPPORT
ARG ENABLE_N3DS_SUPPORT
ARG ENABLE_PS2_SUPPORT
ARG ENABLE_WIN9X_SUPPORT
RUN if [ "${ENABLE_MSDOS_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_N3DS_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_NDS_ARM9_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_PS2_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_WIN9X_SUPPORT}" = "YES" ]; then \
    dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y -o APT::Immediate-Configure=false \
        wine; \
    fi

ARG ENABLE_SATURN_SUPPORT
# install dosemu2 for saturn
RUN if [ "${ENABLE_SATURN_SUPPORT}" = "YES" ]; then \
    add-apt-repository -y ppa:dosemu2/ppa && \
    apt-get update && \
    apt-get install -y dosemu2; \
    fi

# msdos specific
RUN if [ "${ENABLE_MSDOS_SUPPORT}" = "YES" ]; then \
    wget "https://github.com/OmniBlade/binutils-gdb/releases/download/omf-build/omftools.tar.gz" && \
    tar xvzf omftools.tar.gz -C /usr/bin jwasm omf-nm omf-objdump && \
    rm omftools.tar.gz; \
    fi

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
RUN if [ "${ENABLE_MSDOS_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_N3DS_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_NDS_ARM9_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_PS2_SUPPORT}" = "YES" ] || \
       [ "${ENABLE_WIN9X_SUPPORT}" = "YES" ]; then \
    wineboot --init; \
    fi

ENV PATH="$PATH:/etc/poetry/bin"

# no special dependencies required for these platforms
ARG ENABLE_GBA_SUPPORT
ARG ENABLE_GC_WII_SUPPORT
ARG ENABLE_MACOSX_SUPPORT
ARG ENABLE_N64_SUPPORT
ARG ENABLE_PS1_SUPPORT
ARG ENABLE_SWITCH_SUPPORT

ENV ENABLE_GBA_SUPPORT=${ENABLE_GBA_SUPPORT}
ENV ENABLE_GC_WII_SUPPORT=${ENABLE_GC_WII_SUPPORT}
ENV ENABLE_MACOSX_SUPPORT=${ENABLE_MACOSX_SUPPORT}
ENV ENABLE_MSDOS_SUPPORT=${ENABLE_MSDOS_SUPPORT}
ENV ENABLE_N3DS_SUPPORT=${ENABLE_N3DS_SUPPORT}
ENV ENABLE_N64_SUPPORT=${ENABLE_N64_SUPPORT}
ENV ENABLE_NDS_ARM9_SUPPORT=${ENABLE_NDS_ARM9_SUPPORT}
ENV ENABLE_PS1_SUPPORT=${ENABLE_PS1_SUPPORT}
ENV ENABLE_PS2_SUPPORT=${ENABLE_PS2_SUPPORT}
ENV ENABLE_SATURN_SUPPORT=${ENABLE_SATURN_SUPPORT}
ENV ENABLE_SWITCH_SUPPORT=${ENABLE_SWITCH_SUPPORT}
ENV ENABLE_WIN9X_SUPPORT=${ENABLE_WIN9X_SUPPORT}

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
