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

COPY --from=ghcr.io/astral-sh/uv:0.9.11 /uv /bin/uv

FROM base AS nsjail

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
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
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

RUN git clone "https://github.com/google/nsjail" \
    --recursive --branch 3.4 /nsjail \
    && cd /nsjail \
    && make


FROM base AS binutils

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    bzip2 \
    libarchive-tools \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /binutils

WORKDIR /binutils

# Patched mips binutils
RUN wget "https://github.com/decompals/binutils-mips-ps2-decompals/releases/download/v0.8/binutils-mips-ps2-decompals-linux-x86-64.tar.gz" \
    && tar xvzf binutils-mips-ps2-decompals-linux-x86-64.tar.gz mips-ps2-decompals-as mips-ps2-decompals-nm mips-ps2-decompals-objdump \
    && rm binutils-mips-ps2-decompals-linux-x86-64.tar.gz \
    && chmod +x mips-ps2-decompals-*

# Patched PowerPC binutils
RUN curl -sSL "https://github.com/encounter/gc-wii-binutils/releases/download/2.42-2/linux-x86_64.zip" | \
    bsdtar -xvf- \
    && chmod +x powerpc-eabi-*

# Xbox 360 (Xenon) PowerPC binutils
RUN curl -sSL "https://github.com/encounter/xbox360-binutils/releases/download/2.45.1-1/linux-x86_64.zip" | \
    bsdtar -xvf- \
    && chmod +x powerpc-xenon-pe-*

# MSDOS specific
RUN wget "https://github.com/OmniBlade/binutils-gdb/releases/download/omf-build/omftools.tar.gz" \
    && tar xvzf omftools.tar.gz jwasm \
    && rm omftools.tar.gz
RUN wget "https://github.com/decompals/binutils-omf/releases/download/v0.4/omftools-linux-x86_64.tar.gz" \
    && tar xvzf omftools-linux-x86_64.tar.gz omf-nm omf-objdump \
    && rm omftools-linux-x86_64.tar.gz

# Android binutils
RUN wget "https://github.com/decompme/compilers/releases/download/compilers/android-ndk-r8e-linux-x86_64.tar.bz2" \
    && bash -c 'tar xjvf android-ndk-r8e-linux-x86_64.tar.bz2 --strip-components=5 toolchains/x86-4.7/prebuilt/linux-x86_64/bin/i686-linux-android-{as,nm,objdump}' \
    && rm android-ndk-r8e-linux-x86_64.tar.bz2


FROM base AS dependencies

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
    binutils-mipsel-linux-gnu \
    binutils-powerpc-linux-gnu \
    binutils-sh-elf \
    binutils-x86-64-linux-gnu \
    cpp \
    dj64 \
    dos2unix \
    dosemu2 \
    gcc-mips-linux-gnu \
    iptables \
    libc6-dev-i386 \
    libdevmapper1.02.1 \
    libgpgme11 \
    libnl-route-3-200 \
    libprotobuf-dev \
    libtinfo6 \
    netcat-traditional \
    wget \
    wine \
    wine32:i386 \
    && rm -rf /var/lib/apt/lists/*

RUN wget http://security.ubuntu.com/ubuntu/pool/universe/n/ncurses/libtinfo5_6.3-2ubuntu0.1_amd64.deb \
    && apt install ./libtinfo5_6.3-2ubuntu0.1_amd64.deb \
    && rm libtinfo5_6.3-2ubuntu0.1_amd64.deb

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

COPY --from=nsjail /nsjail/nsjail /bin/nsjail

COPY --from=binutils /binutils/ /usr/bin/

COPY --from=ghcr.io/decompals/wibo:1.0.1 /usr/local/bin/wibo /usr/bin/

WORKDIR /backend


FROM dependencies AS dev

ENTRYPOINT ["/backend/docker_entrypoint.sh"]


FROM base AS uv-install

USER ubuntu

WORKDIR /backend

COPY pyproject.toml uv.lock /backend/

RUN uv sync --locked


FROM dependencies AS prod

COPY --from=uv-install /backend/.venv /backend/.venv

COPY manage.py /backend
COPY housekeeping.py /backend

COPY wine /backend/wine
COPY decompme /backend/decompme
COPY libraries /backend/libraries
COPY compilers /backend/compilers

COPY coreapp /backend/coreapp

COPY docker_prod_entrypoint.sh /backend/docker_prod_entrypoint.sh

ENTRYPOINT ["/backend/docker_prod_entrypoint.sh"]
