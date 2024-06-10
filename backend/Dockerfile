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
    binutils-mingw-w64-i686 \
    ca-certificates \
    curl \
    dos2unix \
    gcc-mips-linux-gnu \
    git \
    iptables \
    libarchive-tools \
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
    POETRY_VERSION=1.8.3 POETRY_HOME=/etc/poetry python3.10 -

COPY --from=nsjail /nsjail/nsjail /bin/nsjail

COPY --from=ghcr.io/decompals/wibo:0.6.12 /usr/local/sbin/wibo /usr/bin/

RUN add-apt-repository -y ppa:dosemu2/ppa && \
    add-apt-repository -y ppa:stsp-0/dj64 && \
    apt-get update && \
    apt-get install -y dosemu2 dj64

# windows compilers need i386 wine

ARG ENABLE_MSDOS_SUPPORT
ARG ENABLE_PS2_SUPPORT
ARG ENABLE_WIN32_SUPPORT
ARG ENABLE_DREAMCAST_SUPPORT
RUN if [ "${ENABLE_MSDOS_SUPPORT}" = "YES" ] || \
    [ "${ENABLE_PS2_SUPPORT}" = "YES" ] || \
    [ "${ENABLE_DREAMCAST_SUPPORT}" = "YES" ] || \
    [ "${ENABLE_WIN32_SUPPORT}" = "YES" ]; then \
    dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y -o APT::Immediate-Configure=false \
    wine; \
    fi

ARG ENABLE_PSP_SUPPORT

# Patched mips binutils
RUN if [ "${ENABLE_PS2_SUPPORT}" = "YES" ] || [ "${ENABLE_PSP_SUPPORT}" = "YES" ]; then \
    wget "https://github.com/decompals/binutils-mips-ps2-decompals/releases/download/v0.4/binutils-mips-ps2-decompals-linux-x86-64.tar.gz" && \
    tar xvzf binutils-mips-ps2-decompals-linux-x86-64.tar.gz -C /usr/bin mips-ps2-decompals-as mips-ps2-decompals-nm mips-ps2-decompals-objdump && \
    rm binutils-mips-ps2-decompals-linux-x86-64.tar.gz && \
    chmod +x /usr/bin/mips-ps2-decompals-*; \
    fi

# msdos specific
RUN if [ "${ENABLE_MSDOS_SUPPORT}" = "YES" ]; then \
    wget "https://github.com/OmniBlade/binutils-gdb/releases/download/omf-build/omftools.tar.gz" && \
    tar xvzf omftools.tar.gz -C /usr/bin jwasm omf-nm omf-objdump && \
    rm omftools.tar.gz; \
    fi

# Patched PowerPC binutils
ARG ENABLE_GC_WII_SUPPORT
RUN if [ "${ENABLE_GC_WII_SUPPORT}" = "YES" ]; then \
    curl -sSL https://github.com/encounter/gc-wii-binutils/releases/download/2.42-1/linux-`uname -m`.zip | \
    bsdtar -xvf- -C /usr/bin && \
    chmod +x /usr/bin/powerpc-eabi-*; \
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
    [ "${ENABLE_NDS_ARM9_SUPPORT}" = "YES" ] || \
    [ "${ENABLE_PS2_SUPPORT}" = "YES" ] || \
    [ "${ENABLE_DREAMCAST_SUPPORT}" = "YES" ] || \
    [ "${ENABLE_WIN32_SUPPORT}" = "YES" ]; then \
    wineboot --init; \
    fi

ENV PATH="$PATH:/etc/poetry/bin"

# no special dependencies required for these platforms
ARG ENABLE_GBA_SUPPORT
ARG ENABLE_MACOSX_SUPPORT
ARG ENABLE_N3DS_SUPPORT
ARG ENABLE_DREAMCAST_SUPPORT
ARG ENABLE_N64_SUPPORT
ARG ENABLE_NDS_ARM9_SUPPORT
ARG ENABLE_PS1_SUPPORT
ARG ENABLE_SATURN_SUPPORT
ARG ENABLE_SWITCH_SUPPORT

ENV ENABLE_GBA_SUPPORT=${ENABLE_GBA_SUPPORT}
ENV ENABLE_GC_WII_SUPPORT=${ENABLE_GC_WII_SUPPORT}
ENV ENABLE_MACOSX_SUPPORT=${ENABLE_MACOSX_SUPPORT}
ENV ENABLE_MSDOS_SUPPORT=${ENABLE_MSDOS_SUPPORT}
ENV ENABLE_N3DS_SUPPORT=${ENABLE_N3DS_SUPPORT}
ENV ENABLE_DREAMCAST_SUPPORT=${ENABLE_DREAMCAST_SUPPORT}
ENV ENABLE_N64_SUPPORT=${ENABLE_N64_SUPPORT}
ENV ENABLE_NDS_ARM9_SUPPORT=${ENABLE_NDS_ARM9_SUPPORT}
ENV ENABLE_PS1_SUPPORT=${ENABLE_PS1_SUPPORT}
ENV ENABLE_PS2_SUPPORT=${ENABLE_PS2_SUPPORT}
ENV ENABLE_PSP_SUPPORT=${ENABLE_PSP_SUPPORT}
ENV ENABLE_SATURN_SUPPORT=${ENABLE_SATURN_SUPPORT}
ENV ENABLE_SWITCH_SUPPORT=${ENABLE_SWITCH_SUPPORT}
ENV ENABLE_WIN32_SUPPORT=${ENABLE_WIN32_SUPPORT}

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
