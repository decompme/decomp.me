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

FROM base AS nsjail

RUN apt-get -y update && apt-get install -y \
    autoconf \
    bison \
    flex \
    g++ \
    gcc \
    libnl-route-3-dev \
    libprotobuf-dev \
    libtool \
    make \
    pkg-config \
    protobuf-compiler

RUN git clone "https://github.com/google/nsjail" --recursive --branch 3.4 /nsjail \
    && cd /nsjail \
    && make


FROM base AS developer

RUN dpkg --add-architecture i386 \
    && add-apt-repository -y ppa:dosemu2/ppa \
    && add-apt-repository -y ppa:stsp-0/dj64 \
    && apt-get update \
    && apt-get install -y -o APT::Immediate-Configure=false --no-install-recommends \
    binutils-aarch64-linux-gnu \
    binutils-arm-none-eabi \
    binutils-djgpp \
    binutils-mingw-w64-i686 \
    binutils-mips-linux-gnu \
    binutils-powerpc-linux-gnu \
    binutils-sh-elf \
    cpp \
    dj64 \
    dos2unix \
    dosemu2 \
    gcc-mips-linux-gnu \
    iptables \
    libarchive-tools \
    libc6-dev-i386 \
    libdevmapper1.02.1 \
    libgpgme11 \
    libnl-route-3-200 \
    libprotobuf-dev \
    libtinfo6 \
    netcat-traditional \
    unzip \
    wget \
    wine \
    wine32:i386 \
    && rm -rf /var/lib/apt/lists/*

RUN wget http://security.ubuntu.com/ubuntu/pool/universe/n/ncurses/libtinfo5_6.3-2ubuntu0.1_amd64.deb \
    && apt install ./libtinfo5_6.3-2ubuntu0.1_amd64.deb \
    && rm libtinfo5_6.3-2ubuntu0.1_amd64.deb

COPY --from=nsjail /nsjail/nsjail /bin/nsjail

COPY --from=ghcr.io/decompals/wibo:0.6.16 /usr/local/sbin/wibo /usr/bin/

# Patched mips binutils
RUN wget "https://github.com/decompals/binutils-mips-ps2-decompals/releases/download/v0.4/binutils-mips-ps2-decompals-linux-x86-64.tar.gz" \
    && tar xvzf binutils-mips-ps2-decompals-linux-x86-64.tar.gz -C /usr/bin mips-ps2-decompals-as mips-ps2-decompals-nm mips-ps2-decompals-objdump \
    && rm binutils-mips-ps2-decompals-linux-x86-64.tar.gz \
    && chmod +x /usr/bin/mips-ps2-decompals-*

# Patched PowerPC binutils
RUN curl -sSL "https://github.com/encounter/gc-wii-binutils/releases/download/2.42-1/linux-x86_64.zip" | \
    bsdtar -xvf- -C /usr/bin \
    && chmod +x /usr/bin/powerpc-eabi-*

# MSDOS specific
RUN wget "https://github.com/OmniBlade/binutils-gdb/releases/download/omf-build/omftools.tar.gz" \
    && tar xvzf omftools.tar.gz -C /usr/bin jwasm \
    && rm omftools.tar.gz \
    && wget "https://github.com/decompals/binutils-omf/releases/download/v0.4/omftools-linux-x86_64.tar.gz" \
    && tar xvzf omftools-linux-x86_64.tar.gz -C /usr/bin omf-nm omf-objdump \
    && rm omftools-linux-x86_64.tar.gz

RUN mkdir -p /etc/fonts

ENV WINEPREFIX=/tmp/wine

# Ensure /sandbox and wine dirs have correct ownership
RUN mkdir -p /sandbox \
    && chown -R ubuntu:ubuntu /sandbox \
    && mkdir -p "${WINEPREFIX}" \
    && chown ubuntu:ubuntu "${WINEPREFIX}"

# Switch to non-root user
USER ubuntu

# Initialize wine files to /home/ubuntu/.wine
RUN wineboot --init

WORKDIR /backend


ARG ENABLE_DREAMCAST_SUPPORT
ARG ENABLE_GBA_SUPPORT
ARG ENABLE_GC_WII_SUPPORT
ARG ENABLE_MACOSX_SUPPORT
ARG ENABLE_MSDOS_SUPPORT
ARG ENABLE_N3DS_SUPPORT
ARG ENABLE_N64_SUPPORT
ARG ENABLE_NDS_ARM9_SUPPORT
ARG ENABLE_PS1_SUPPORT
ARG ENABLE_PS2_SUPPORT
ARG ENABLE_PSP_SUPPORT
ARG ENABLE_SATURN_SUPPORT
ARG ENABLE_SWITCH_SUPPORT
ARG ENABLE_WIN32_SUPPORT

ENV ENABLE_DREAMCAST_SUPPORT=${ENABLE_DREAMCAST_SUPPORT}
ENV ENABLE_GBA_SUPPORT=${ENABLE_GBA_SUPPORT}
ENV ENABLE_GC_WII_SUPPORT=${ENABLE_GC_WII_SUPPORT}
ENV ENABLE_MACOSX_SUPPORT=${ENABLE_MACOSX_SUPPORT}
ENV ENABLE_MSDOS_SUPPORT=${ENABLE_MSDOS_SUPPORT}
ENV ENABLE_N3DS_SUPPORT=${ENABLE_N3DS_SUPPORT}
ENV ENABLE_N64_SUPPORT=${ENABLE_N64_SUPPORT}
ENV ENABLE_NDS_ARM9_SUPPORT=${ENABLE_NDS_ARM9_SUPPORT}
ENV ENABLE_PS1_SUPPORT=${ENABLE_PS1_SUPPORT}
ENV ENABLE_PS2_SUPPORT=${ENABLE_PS2_SUPPORT}
ENV ENABLE_PSP_SUPPORT=${ENABLE_PSP_SUPPORT}
ENV ENABLE_SATURN_SUPPORT=${ENABLE_SATURN_SUPPORT}
ENV ENABLE_SWITCH_SUPPORT=${ENABLE_SWITCH_SUPPORT}
ENV ENABLE_WIN32_SUPPORT=${ENABLE_WIN32_SUPPORT}

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
