#!/usr/bin/env python3

import argparse
import os
import platform
import shutil
import stat
import sys
import tarfile
from dataclasses import dataclass
from pathlib import Path
from zipfile import ZipFile

import requests
from tqdm import tqdm


@dataclass
class OS:
    name: str
    system: str
    n64_gcc_os: str
    ido_pkg: str


MACOS = OS(
    name="MacOS",
    system="darwin",
    n64_gcc_os="mac",
    ido_pkg="macos-latest",
)
LINUX = OS(
    name="Linux",
    system="linux",
    n64_gcc_os="linux",
    ido_pkg="ubuntu-20.04",
)

oses: dict[str, OS] = {
    "darwin": MACOS,
    "linux": LINUX,
}

os_str = platform.system().lower()
if os_str not in oses:
    print(f"Unsupported host os: {os_str}")
    sys.exit(1)

host_os: OS = oses[os_str]

COMPILERS_DIR: Path = Path(os.path.dirname(os.path.realpath(__file__)))
DOWNLOAD_CACHE = COMPILERS_DIR / "download_cache"
DOWNLOAD_CACHE.mkdir(exist_ok=True)


# Downloads a file to the file cache
def download_file(url: str, log_name: str, dest_path: Path):
    if dest_path.exists():
        print(f"Download of {log_name} already exists; skipping download")
        return

    dest_path.parent.mkdir(exist_ok=True, parents=True)

    response = requests.get(url, stream=True)
    total_size_in_bytes = int(response.headers.get("content-length", 0))
    block_size = 1024
    progress_bar = tqdm(
        desc=f"Downloading {log_name}",
        total=total_size_in_bytes,
        unit="B",
        unit_scale=True,
    )

    with open(dest_path, "wb") as f:
        for data in response.iter_content(block_size):
            progress_bar.update(len(data))
            f.write(data)

    progress_bar.close()

    if (
        total_size_in_bytes != 0
        and progress_bar.n != total_size_in_bytes
        and total_size_in_bytes > 1024 * 1024
    ):
        print("ERROR, something went wrong")


# Used for compiler packages
def download_file_wrapper(
    url: str,
    dl_name: str,
    dest_name: str,
    platform_id: str,
    create_subdir: bool,
    log_name: str,
):
    download_file(
        url=url, log_name=log_name, dest_path=DOWNLOAD_CACHE / platform_id / dl_name
    )

    dest_path = COMPILERS_DIR / platform_id
    if create_subdir:
        dest_path = COMPILERS_DIR / platform_id / dest_name

    dest_path.mkdir(exist_ok=True, parents=True)
    return dest_path


def download_tar(
    url: str,
    platform_id: str,
    mode: str = "r:gz",
    dl_name: str = "",
    dest_name: str = "",
    create_subdir: bool = True,
    log_name: str = "",
):
    if not dl_name:
        if dest_name:
            dl_name = dest_name
        else:
            dl_name = url.split("/")[-1]

    if not dest_name:
        dest_name = dl_name

    if not log_name:
        log_name = dest_name

    dest_path = download_file_wrapper(
        url, dl_name, dest_name, platform_id, create_subdir, log_name
    )

    with tarfile.open(DOWNLOAD_CACHE / platform_id / dl_name, mode=mode) as f:
        for member in tqdm(
            desc=f"Extracting {log_name}",
            iterable=f.getmembers(),
            total=len(f.getmembers()),
        ):
            f.extract(member=member, path=dest_path)


def download_zip(
    url: str,
    platform_id: str,
    dl_name: str = "",
    dest_name: str = "",
    create_subdir: bool = False,
    log_name: str = "",
):
    if not dl_name:
        if dest_name:
            dl_name = dest_name
        else:
            dl_name = url.split("/")[-1]

    if not dest_name:
        dest_name = dl_name

    if not log_name:
        log_name = dest_name

    dest_path = download_file_wrapper(
        url, dl_name, dest_name, platform_id, create_subdir, log_name
    )

    with ZipFile(file=DOWNLOAD_CACHE / platform_id / dl_name) as f:
        for file in tqdm(
            desc=f"Extracting {log_name}",
            iterable=f.namelist(),
            total=len(f.namelist()),
        ):
            f.extract(member=file, path=dest_path)


def set_x(file: Path) -> None:
    file.chmod(file.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def download_macosx():
    if host_os != LINUX:
        print("MAC OS X cross compiler unsupported on " + host_os.name)
        return
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc-5370.tar.gz",
        platform_id="macosx",
        dl_name="gcc-5370.tar.gz",
        dest_name="gcc-5370",
    )
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc-5026.tar.gz",
        platform_id="macosx",
        dl_name="gcc-5026.tar.gz",
        dest_name="gcc-5026",
    )
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc-5363.tar.gz",
        platform_id="macosx",
        dl_name="gcc-5363.tar.gz",
        dest_name="gcc-5363",
    )
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc3-1041.tar.gz",
        platform_id="macosx",
        dl_name="gcc3-1041.tar.gz",
        dest_name="gcc3-1041",
    )
    download_file(
        url="https://gist.githubusercontent.com/ChrisNonyminus/ec53837b151a65e4233fa53604de4549/raw/d7c6fc639310b938fa519e68a8f8d4909acba2ad/convert_gas_syntax.py",
        log_name="convert_gas_syntax.py",
        dest_path=DOWNLOAD_CACHE / "macosx" / "convert_gas_syntax.py",
    )
    for compiler in [
        "gcc-5370",
        "gcc-5026",
        "gcc-5363",
        "gcc3-1041",
    ]:
        shutil.copy(
            DOWNLOAD_CACHE / "macosx" / "convert_gas_syntax.py",
            COMPILERS_DIR / "macosx" / compiler / "convert_gas_syntax.py",
        )


def download_gba():
    if host_os != LINUX:
        print("agbcc unsupported on " + host_os.name)
        return

    def download_agbcc(url: str, dest: str):
        dest_dir = COMPILERS_DIR / "gba" / dest
        if dest_dir.exists():
            print(f"{dest} already exists, skipping")
            return

        download_tar(
            url=url,
            platform_id="gba",
            dest_name=dest,
        )

    download_agbcc(
        "https://github.com/pret/agbcc/releases/download/release/agbcc.tar.gz",
        "agbcc",
    )
    download_agbcc(
        "https://github.com/notyourav/agbcc/releases/download/cp/agbcc.tar.gz",
        "agbccpp",
    )


def download_switch():
    def dest_for_version(version: str) -> Path:
        return COMPILERS_DIR / "switch" / f"clang-{version}"

    @dataclass
    class Version:
        version_str: str
        clang_package_name: str
        clang_package_name_macos: str

    versions = [
        Version(
            version_str="4.0.1",
            clang_package_name="linux-gnu-debian8",
            clang_package_name_macos="apple-darwin",
        ),
        Version(
            version_str="3.9.1",
            clang_package_name="linux-gnu-debian8",
            clang_package_name_macos="none",
        ),
        Version(
            version_str="8.0.0",
            clang_package_name="linux-gnu-ubuntu-18.04",
            clang_package_name_macos="apple-darwin",
        ),
    ]

    # 3.9.1 isn't available for mac
    mac_versions = versions.copy()
    mac_versions.pop(1)

    botw_lib_musl_versions = ["4.0.1", "3.9.1", "8.0.0"]

    # Download and extract the compilers
    for version in versions:
        version_str = version.version_str
        if host_os == MACOS and version_str not in mac_versions:
            continue

        log_name = f"clang {version_str}"
        dest_dir = dest_for_version(version_str)
        if dest_dir.exists():
            print(f"{log_name} already exists, skipping")
            continue

        clang_package_name = (
            version.clang_package_name_macos
            if host_os == MACOS
            else version.clang_package_name
        )

        package_name = f"clang+llvm-{version_str}-x86_64-{clang_package_name}"
        url = f"https://releases.llvm.org/{version_str}/{package_name}.tar.xz"

        download_tar(
            url=url,
            platform_id="switch",
            mode="r:xz",
            log_name=log_name,
            create_subdir=False,
        )

        # Somehow the MacOS tar extracts to a directory with a different name, so we have to find it again
        if host_os == MACOS:
            package_name = next(
                (COMPILERS_DIR / "switch").glob(
                    f"clang+llvm-{version_str}-x86_64-*" + os.path.sep
                )
            ).name

        shutil.move(COMPILERS_DIR / "switch" / package_name, dest_dir)

        # 3.9.1 requires ld.lld and doesn't have it, so we copy it from 4.0.1
        if version_str == "3.9.1":
            shutil.copy(
                dest_for_version("4.0.1") / "bin/ld.lld", dest_dir / "bin/ld.lld"
            )

    # Set up musl
    download_zip(
        url="https://github.com/open-ead/botw-lib-musl/archive/25ed8669943bee65a650700d340e451eda2a26ba.zip",
        platform_id="switch",
        log_name="musl",
    )
    musl_name = "botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba"
    musl_dest = COMPILERS_DIR / "switch" / musl_name
    for version_str in botw_lib_musl_versions:
        ver_dest = dest_for_version(version_str)
        if ver_dest.exists():
            shutil.copytree(musl_dest, ver_dest / musl_name, dirs_exist_ok=True)
    shutil.rmtree(musl_dest)


def download_n64():
    def download_gcc(gcc_url: str, binutils_url, dest: str):
        dest_path = COMPILERS_DIR / "n64" / dest
        if dest_path.exists():
            print(f"{dest} already exists, skipping")
        else:
            download_tar(
                url=gcc_url,
                platform_id="n64",
                dest_name=dest,
            )
            download_tar(
                url=binutils_url,
                platform_id="n64",
                dl_name=f"{dest}-binutils",
                dest_name=dest,
            )

    # GCC 2.8.1 (Paper Mario)
    download_gcc(
        gcc_url=f"https://github.com/pmret/gcc-papermario/releases/download/master/{host_os.n64_gcc_os}.tar.gz",
        binutils_url=f"https://github.com/pmret/binutils-papermario/releases/download/master/{host_os.n64_gcc_os}.tar.gz",
        dest="gcc2.8.1pm",
    )

    # GCC 2.7.2 KMC
    download_gcc(
        gcc_url=f"https://github.com/decompals/mips-gcc-2.7.2/releases/download/main/gcc-2.7.2-{host_os.n64_gcc_os}.tar.gz",
        binutils_url=f"https://github.com/decompals/mips-binutils-2.6/releases/download/main/binutils-2.6-{host_os.n64_gcc_os}.tar.gz",
        dest="gcc2.7.2kmc",
    )

    # IDO
    ido_versions = ["5.3", "7.1"]
    for version in ido_versions:
        dest = COMPILERS_DIR / "n64" / f"ido{version}"
        if dest.exists():
            print(f"ido{version} already exists, skipping")
        else:
            download_tar(
                url=f"https://github.com/ethteck/ido-static-recomp/releases/download/v0.5/ido-{version}-recomp-{host_os.ido_pkg}.tar.gz",
                platform_id="n64",
                dest_name=f"ido{version}",
            )

    dest = COMPILERS_DIR / "n64" / "ido6.0"
    if dest.is_dir():
        print(f"{dest} already exists, skipping")
    else:
        dest.mkdir()
        download_tar(
            url="https://github.com/LLONSIT/qemu-irix-helpers/raw/n/qemu/ido6.0.tar.xz",
            platform_id="n64",
            mode="r:xz",
            dl_name="ido6.0" + ".tar.xz",
            dest_name="ido6.0",
        )

    dest = COMPILERS_DIR / "n64" / "ido5.3_c++"
    if dest.is_dir():
        print(f"{dest} already exists, skipping")
    else:
        dest.mkdir()
        download_tar(
            url="https://github.com/LLONSIT/qemu-irix-helpers/raw/n/qemu/ido5.3_c++.tar.xz",
            platform_id="n64",
            mode="r:xz",
            dl_name="ido5.3_c++" + ".tar.xz",
            dest_name="ido5.3_c++",
        )

    dest = COMPILERS_DIR / "n64" / "mips_pro_744"
    if dest.is_dir():
        print(f"{dest} already exists, skipping")
    else:
        dest.mkdir()
        download_tar(
            url="https://github.com/LLONSIT/qemu-irix-helpers/raw/n/qemu/mipspro7.4.4.tar.xz",
            platform_id="n64",
            mode="r:xz",
            dl_name="mips_pro_744" + ".tar.xz",
            dest_name="mips_pro_744",
        )

    # SN
    dest = COMPILERS_DIR / "n64" / "gcc2.7.2sn"
    if dest.is_dir():
        print(f"{dest} already exists, skipping")
    else:
        dest.mkdir()
        download_file(
            url="https://github.com/Mr-Wiseguy/pcsx-redux/releases/download/n64/asn64.exe",
            log_name="asn64.exe",
            dest_path=dest / "asn64.exe",
        )
        download_file(
            url="https://github.com/Mr-Wiseguy/pcsx-redux/releases/download/n64/cc1n64.exe",
            log_name="cc1n64.exe",
            dest_path=dest / "cc1n64.exe",
        )
        download_file(
            url="https://github.com/Mr-Wiseguy/pcsx-redux/releases/download/n64/psyq-obj-parser",
            log_name="psyq-obj-parser",
            dest_path=dest / "psyq-obj-parser",
        )
        # TODO: upload +x'd version of this
        set_x(dest / "psyq-obj-parser")

    # SN
    dest = COMPILERS_DIR / "n64" / "gcc2.7.2snew"
    if dest.is_dir():
        print(f"{dest} already exists, skipping")
    else:
        dest.mkdir()
        download_tar(
            url="https://github.com/decompals/SN64-gcc/releases/download/gcc-2.7.2-970404/SN64-gcc-2.7.2-970404-linux.tar.gz",
            platform_id="n64",
            dest_name="gcc2.7.2snew",
        )
        download_file(
            url="https://github.com/RocketRet/modern-asn64/releases/download/main-release/modern-asn64.py",
            log_name="modern-asn64.py",
            dest_path=dest / "modern-asn64.py",
        )

    # SN
    dest = COMPILERS_DIR / "n64" / "gcc2.8.1sn"
    if dest.is_dir():
        print(f"{dest} already exists, skipping")
    else:
        dest.mkdir()
        download_file(
            url="https://github.com/marijnvdwerf/sn64/releases/download/1%2C0%2C0%2C2/asn64.exe",
            log_name="asn64.exe",
            dest_path=dest / "asn64.exe",
        )
        download_file(
            url="https://github.com/marijnvdwerf/sn64/releases/download/1%2C0%2C0%2C2/cc1n64.exe",
            log_name="cc1n64.exe",
            dest_path=dest / "cc1n64.exe",
        )
        download_file(
            url="https://github.com/marijnvdwerf/sn64/releases/download/1%2C0%2C0%2C2/cc1pln64.exe",
            log_name="cc1pln64.exe",
            dest_path=dest / "cc1pln64.exe",
        )
        download_file(
            url="https://github.com/Mr-Wiseguy/pcsx-redux/releases/download/n64/psyq-obj-parser",
            log_name="psyq-obj-parser",
            dest_path=dest / "psyq-obj-parser",
        )
        # NOTE: github strips the +x flag
        set_x(dest / "psyq-obj-parser")

    # iQue
    dest = COMPILERS_DIR / "n64" / "egcs_1.1.2-4"
    if dest.is_dir():
        print(f"{dest} already exists, skipping")
    else:
        dest.mkdir()
        download_tar(
            url="https://github.com/AngheloAlf/egcs_1.1.2-4/releases/download/latest/egcs_1.1.2-4.tar.gz",
            platform_id="n64",
            dest_name="egcs_1.1.2-4",
        )

    # libdragon
    dest = COMPILERS_DIR / "n64" / "gcc4.4.0-mips64-elf"
    if dest.is_dir():
        print(f"{dest} already exists, skipping")
    else:
        dest.mkdir()
        download_tar(
            url="https://github.com/devwizard64/gcc4.4.0-mips64-elf/releases/download/latest/gcc4.4.0-mips64-elf.tar.gz",
            platform_id="n64",
            dest_name="gcc4.4.0-mips64-elf",
        )


def download_ps1():
    if host_os != LINUX:
        print("ps1 compilers unsupported on " + host_os.name)
        return

    compilers_path = COMPILERS_DIR / "ps1" / "psyq-compilers"

    download_tar(
        url="https://github.com/Xeeynamo/wine-psyq/releases/download/psyq-binaries/psyq-msdos.tar.gz",
        platform_id="ps1",
        dest_name="psyq-msdos-compilers",
    )

    download_tar(
        url="https://github.com/mkst/esa/releases/download/psyq-binaries/psyq-compilers.tar.gz",
        platform_id="ps1",
        dest_name="psyq-compilers",
    )

    download_file(
        url="https://github.com/mkst/pcsx-redux/releases/download/rodata-rodata/psyq-obj-parser",
        log_name="psyq-obj-parser",
        dest_path=compilers_path / "psyq",
    )

    # transfer MS-DOS compilers into the same directory of their Win32 counterpart
    shutil.move(
        COMPILERS_DIR / "ps1" / "psyq-msdos-compilers/psyq3.3",
        COMPILERS_DIR / "ps1" / "psyq-compilers",
    )
    shutil.move(
        COMPILERS_DIR / "ps1" / "psyq-msdos-compilers/psyq3.5",
        COMPILERS_DIR / "ps1" / "psyq-compilers",
    )
    shutil.move(
        COMPILERS_DIR / "ps1" / "psyq-msdos-compilers/psyq3.6",
        COMPILERS_DIR / "ps1" / "psyq-compilers",
    )
    shutil.rmtree(COMPILERS_DIR / "ps1" / "psyq-msdos-compilers/")

    psyq_to_gcc = {
        "3.3": "2.6.0",
        "3.5": "2.6.0",
        "3.6": "2.6.3",
        "4.0": "2.7.2",
        "4.1": "2.7.2",
        "4.3": "2.8.1",
        "4.5": "2.91.66",
        "4.6": "2.95.2",
    }

    for version in psyq_to_gcc.keys():
        dest = COMPILERS_DIR / "ps1" / f"psyq{version}"
        if not dest.exists():
            shutil.move(compilers_path / f"psyq{version}", COMPILERS_DIR / "ps1")
        psyq_obj_parser = dest / "psyq-obj-parser"
        shutil.copy(
            compilers_path / "psyq",
            psyq_obj_parser,
        )
        set_x(psyq_obj_parser)

        # +x exes
        for file in dest.glob("*.exe"):
            set_x(file)
        for file in dest.glob("*.EXE"):
            set_x(file)

    # vanilla gcc + maspsx patch

    old_gcc_base_url = "https://github.com/decompals/old-gcc/releases/download/0.3"
    old_gcc_urls = {
        "gcc2.6.3-psx": f"{old_gcc_base_url}/gcc-2.6.3-psx.tar.gz",
        "gcc2.6.3": f"{old_gcc_base_url}/gcc-2.6.3.tar.gz",
        "gcc2.7.1": f"{old_gcc_base_url}/gcc-2.7.1.tar.gz",
        "gcc2.7.2": f"{old_gcc_base_url}/gcc-2.7.2.tar.gz",
        "gcc2.7.2.1": f"{old_gcc_base_url}/gcc-2.7.2.1.tar.gz",
        "gcc2.7.2.2": f"{old_gcc_base_url}/gcc-2.7.2.2.tar.gz",
        "gcc2.7.2.3": f"{old_gcc_base_url}/gcc-2.7.2.3.tar.gz",
        "gcc2.8.0": f"{old_gcc_base_url}/gcc-2.8.0.tar.gz",
        "gcc2.8.1": f"{old_gcc_base_url}/gcc-2.8.1.tar.gz",
        "gcc2.91.66": f"{old_gcc_base_url}/gcc-2.91.66.tar.gz",
        "gcc2.95.2": f"{old_gcc_base_url}/gcc-2.95.2.tar.gz",
    }
    old_gcc_ids = {
        "gcc2.6.3-psx": "gcc2.6.3-psx",
        "gcc2.6.3": "gcc2.6.3-mipsel",
        "gcc2.7.1": "gcc2.7.1-mipsel",
        "gcc2.7.2": "gcc2.7.2-mipsel",
        "gcc2.7.2.1": "gcc2.7.2.1-mipsel",
        "gcc2.7.2.2": "gcc2.7.2.2-mipsel",
        "gcc2.7.2.3": "gcc2.7.2.3-mipsel",
        "gcc2.8.0": "gcc2.8.0-mipsel",
        "gcc2.8.1": "gcc2.8.1-mipsel",
        "gcc2.91.66": "gcc2.91.66-mipsel",
        "gcc2.95.2": "gcc2.95.2-mipsel",
    }

    maspsx_hash = "44f8a152e5b49e56640fd3cfc20d6bf428e1205e"
    download_zip(
        url=f"https://github.com/mkst/maspsx/archive/{maspsx_hash}.zip",
        platform_id="ps1",
        dl_name="maspsx",
        dest_name=compilers_path,
        create_subdir=True,
    )

    download_file(
        url="https://raw.githubusercontent.com/Decompollaborate/rabbitizer/3d0221687b587497ed60b1cf1f207a873ade7cf9/docs/r3000gte/gte_macros.s",
        dest_path=compilers_path / "gte_macros.s",
        log_name="gte_macros.s",
    )

    for gcc_name, url in old_gcc_urls.items():
        gcc_id = old_gcc_ids[gcc_name]
        gcc_dir = COMPILERS_DIR / "ps1" / f"{gcc_id}"
        if gcc_dir.exists():
            print(f"{gcc_dir} already exists, skipping download.")
        else:
            download_tar(
                url=url,
                platform_id="ps1",
                dl_name=f"{gcc_name}.tar.gz",
                dest_name=f"{gcc_id}",
            )

        # always copy in maspsx
        shutil.copytree(
            compilers_path / f"maspsx-{maspsx_hash}",
            gcc_dir / "maspsx",
            dirs_exist_ok=True,
        )
        with open(gcc_dir / "as", "w") as f:
            f.write("#!/bin/bash\n")
            f.write(
                "python3 $(dirname -- $0)/maspsx/maspsx.py --run-assembler -I${COMPILER_DIR} $@\n"
            )
        set_x(gcc_dir / "as")

        # always copy in macros
        shutil.copy(
            compilers_path / "gte_macros.s",
            gcc_dir,
        )
        with open(gcc_dir / "macro.inc", "w") as f:
            f.write('.include "gte_macros.s"\n')

    shutil.rmtree(compilers_path)


def download_saturn():
    if host_os != LINUX:
        print("saturn compilers unsupported on " + host_os.name)
        return

    src = COMPILERS_DIR / "saturn" / "saturn-compilers-main"
    if src.is_dir():
        shutil.rmtree(src)

    dest = COMPILERS_DIR / "saturn" / "cygnus-2.7-96Q3"
    if dest.is_dir():
        shutil.rmtree(dest)

    download_zip(
        url="https://github.com/sozud/saturn-compilers/archive/refs/heads/main.zip",
        platform_id="saturn",
    )

    shutil.move(
        f"{COMPILERS_DIR}/saturn/saturn-compilers-main/cygnus-2.7-96Q3-bin",
        f"{COMPILERS_DIR}/saturn/cygnus-2.7-96Q3",
    )

    shutil.rmtree(f"{COMPILERS_DIR}/saturn/saturn-compilers-main")


def download_ps2():
    if host_os != LINUX:
        print("ps2 compilers unsupported on " + host_os.name)
        return

    ps2_compilers = {
        "ee-gcc2.9-990721": "https://cdn.discordapp.com/attachments/1067192766918037536/1067306679806464060/ee-gcc2.9-990721.tar.xz",
        "ee-gcc2.9-991111": "https://cdn.discordapp.com/attachments/1067192766918037536/1120445542279954482/ee-gcc2.9-991111.tar.xz",
        "ee-gcc2.9-991111a": "https://cdn.discordapp.com/attachments/1067192766918037536/1120445479797395506/ee-gcc2.9-991111a.tar.xz",
        "ee-gcc2.9-991111-01": "https://cdn.discordapp.com/attachments/1067192766918037536/1119832299400331314/ee-gcc2.9-991111-01.tar.xz",
        "ee-gcc2.96": "https://cdn.discordapp.com/attachments/1067192766918037536/1067306680179752990/ee-gcc2.96.tar.xz",
        "ee-gcc3.2-040921": "https://cdn.discordapp.com/attachments/1067192766918037536/1067306680548855908/ee-gcc3.2-040921.tar.xz",
    }

    for name, url in ps2_compilers.items():
        download_tar(
            url=url,
            platform_id="ps2",
            mode="r:xz",
            dl_name=name + ".tar.xz",
            dest_name=name,
            create_subdir=True,
        )

    # Extra compiler collection
    download_tar(
        url="https://cdn.discordapp.com/attachments/1067192766918037536/1120445708516995118/ps2_compilers.tar.xz",
        platform_id="ps2",
        mode="r:xz",
        dl_name="ps2_compilers.tar.xz",
        create_subdir=False,
    )


def download_nds():
    compiler_groups = {
        "1.2": {
            "base": "mwcc_20_72",
            "sp2": "mwcc_20_79",
            "sp2p3": "mwcc_20_82",
            "sp3": "mwcc_20_84",
            "sp4": "mwcc_20_87",
        },
        "2.0": {
            "base": "mwcc_30_114",
            "sp1": "mwcc_30_123",
            "sp1p2": "mwcc_30_126",
            "sp1p5": "mwcc_30_131",
            "sp1p6": "mwcc_30_133",
            "sp1p7": "mwcc_30_134",
            "sp2": "mwcc_30_136",
            "sp2p2": "mwcc_30_137",
            "sp2p3": "mwcc_30_138",
            "sp2p4": "mwcc_30_139",
        },
        "dsi": {
            "1.1": "mwcc_40_1018",
            "1.1p1": "mwcc_40_1024",
            "1.2": "mwcc_40_1026",
            "1.2p1": "mwcc_40_1027",
            "1.2p2": "mwcc_40_1028",
            "1.3": "mwcc_40_1034",
            "1.3p1": "mwcc_40_1036",
            "1.6sp1": "mwcc_40_1051",
        },
    }

    download_zip(
        url="https://cdn.discordapp.com/attachments/698589325620936736/845499146982129684/mwccarm.zip",
        platform_id="nds_arm9",
    )

    # Organize dirs, copy license
    for group_id, group in compiler_groups.items():
        mwccarm_dir = COMPILERS_DIR / "nds_arm9" / "mwccarm" / group_id
        license_path = COMPILERS_DIR / "nds_arm9" / "mwccarm" / "license.dat"
        for ver, compiler_id in group.items():
            compiler_dir = COMPILERS_DIR / "nds_arm9" / compiler_id
            if not compiler_dir.exists():
                shutil.move(mwccarm_dir / ver, compiler_dir)

            shutil.copy(license_path, compiler_dir / "license.dat")

            # Rename dll to uppercase
            lowercase_lmgr = compiler_dir / "lmgr8c.dll"
            if lowercase_lmgr.exists():
                shutil.move(lowercase_lmgr, compiler_dir / "LMGR8C.dll")

            set_x(compiler_dir / "mwccarm.exe")

    shutil.rmtree(COMPILERS_DIR / "nds_arm9" / "mwccarm")


def download_gc_wii():
    compiler_groups = {
        "GC": {
            "1.0": "mwcc_233_144",
            "1.1": "mwcc_233_159",
            "1.2.5": "mwcc_233_163",
            "1.2.5e": "mwcc_233_163e",
            "1.2.5n": "mwcc_233_163n",
            "1.3.2": "mwcc_242_81",
            "2.0": "mwcc_247_92",
            "2.5": "mwcc_247_105",
            "2.6": "mwcc_247_107",
            "2.7": "mwcc_247_108",
            "3.0": "mwcc_41_60831",
            "3.0a3": "mwcc_41_60126",
        },
        "Wii": {
            "1.0": "mwcc_42_142",
            "1.1": "mwcc_43_151",
            "1.3": "mwcc_43_172",
            "1.7": "mwcc_43_213",
        },
    }

    single_compilers = {
        "1.3.2r": [
            "mwcc_242_81r",
            "https://cdn.discordapp.com/attachments/598600200084258822/1136883349642825728/MWCCEPPC_1.3.2r.zip",
        ]
    }

    download_zip(
        url="https://cdn.discordapp.com/attachments/727918646525165659/1129759991696457728/GC_WII_COMPILERS.zip",
        platform_id="gc_wii",
    )

    for group_id, group in compiler_groups.items():
        for ver, compiler_id in group.items():
            compiler_dir = COMPILERS_DIR / "gc_wii" / compiler_id
            if not compiler_dir.exists():
                shutil.move(COMPILERS_DIR / "gc_wii" / group_id / ver, compiler_dir)

            # Rename dll to uppercase - WSL is case sensitive without wine
            lowercase_lmgr = compiler_dir / "lmgr326b.dll"
            if lowercase_lmgr.exists():
                shutil.move(lowercase_lmgr, compiler_dir / "LMGR326B.dll")

            lowercase_lmgr = compiler_dir / "lmgr8c.dll"
            if lowercase_lmgr.exists():
                shutil.move(lowercase_lmgr, compiler_dir / "LMGR8C.dll")

            set_x(compiler_dir / "mwcceppc.exe")

            (compiler_dir / "license.dat").touch()

        shutil.rmtree(COMPILERS_DIR / "gc_wii" / group_id)

    # copy single compilers over
    for ver, info in single_compilers.items():
        compiler_id = info[0]
        url = info[1]

        # download zip to COMPILERS_DIR
        download_zip(
            url=url,
            platform_id="gc_wii",
        )

        compiler_dir = COMPILERS_DIR / "gc_wii" / compiler_id

        # move version dir to compiler dir
        if not compiler_dir.exists():
            shutil.move(COMPILERS_DIR / "gc_wii" / ver, compiler_dir)

        # Rename dll to uppercase - WSL is case sensitive without wine
        lowercase_lmgr = compiler_dir / "lmgr326b.dll"
        if lowercase_lmgr.exists():
            shutil.move(lowercase_lmgr, compiler_dir / "LMGR326B.dll")

        lowercase_lmgr = compiler_dir / "lmgr8c.dll"
        if lowercase_lmgr.exists():
            shutil.move(lowercase_lmgr, compiler_dir / "LMGR8C.dll")

        set_x(compiler_dir / "mwcceppc.exe")

        (compiler_dir / "license.dat").touch()

        if (COMPILERS_DIR / "gc_wii" / ver).exists():
            shutil.rmtree(COMPILERS_DIR / "gc_wii" / ver)

    # copy in clean 1.2.5 for frank
    shutil.copy(
        COMPILERS_DIR / "gc_wii" / "mwcc_233_163" / "mwcceppc.exe",
        COMPILERS_DIR / "gc_wii" / "mwcc_233_163e" / "mwcceppc.125.exe",
    )
    download_file(
        url="https://raw.githubusercontent.com/doldecomp/melee/master/tools/frank.py",
        log_name="frank",
        dest_path=COMPILERS_DIR / "gc_wii" / "mwcc_233_163e" / "frank.py",
    )

    # copy contents of _142 to _127 to prepare for patched version
    if not os.path.exists(COMPILERS_DIR / "gc_wii" / "mwcc_42_127"):
        shutil.copytree(
            COMPILERS_DIR / "gc_wii" / "mwcc_42_142",
            COMPILERS_DIR / "gc_wii" / "mwcc_42_127",
        )
        os.remove(COMPILERS_DIR / "gc_wii" / "mwcc_42_127" / "mwcceppc.exe")

    exe_path = COMPILERS_DIR / "gc_wii" / "mwcc_42_127" / "mwcceppc.exe"
    download_file(
        url="https://cdn.discordapp.com/attachments/804212941054279722/954854566304833567/mwcceppc_PATCHED.exe",
        log_name="mwcc_42_127",
        dest_path=exe_path,
    )
    set_x(exe_path)


def download_n3ds():
    compiler_groups = {
        "4.0": {
            "b771": "armcc_40_771",
            "b821": "armcc_40_821",
        },
        "4.1": {
            "b561": "armcc_41_561",
            "b713": "armcc_41_713",
            "b791": "armcc_41_791",
            "b894": "armcc_41_894",
            "b921": "armcc_41_921",
            "b1049": "armcc_41_1049",
            "b1440": "armcc_41_1440",
            "b1454": "armcc_41_1454",
        },
        "5.04": {
            "b82": "armcc_504_82",
        },
    }
    download_zip(
        url="https://cdn.discordapp.com/attachments/710646040792924172/1148006502980927528/armcc.zip",
        platform_id="n3ds",
    )
    for group_id, group in compiler_groups.items():
        for ver, compiler_id in group.items():
            compiler_dir = COMPILERS_DIR / "n3ds" / compiler_id
            if not compiler_dir.exists():
                shutil.move(COMPILERS_DIR / "n3ds" / group_id / ver, compiler_dir)

            # Set +x to allow WSL without wine
            set_x(compiler_dir / "bin/armcc.exe")
        shutil.rmtree(COMPILERS_DIR / "n3ds" / group_id)


def download_msdos():
    # Download some custom tools needed for watcom object format.
    download_tar(
        url="https://github.com/OmniBlade/binutils-gdb/releases/download/omf-build/omftools.tar.gz",
        platform_id="msdos",
        dest_name="i386_tools",
    )

    tools_dir = COMPILERS_DIR / "msdos" / "i386_tools"
    set_x(tools_dir / "jwasm")
    set_x(tools_dir / "omf-objdump")
    set_x(tools_dir / "omf-nm")

    for compiler in [
        "wcc10.5",
        "wcc10.5a",
        "wcc10.6",
        "wcc11.0",
    ]:
        url = (
            "https://github.com/OmniBlade/decomp.me/releases/download/wcc10.5/"
            + compiler
            + ".tar.gz"
        )
        download_tar(
            url=url,
            platform_id="msdos",
            dest_name=compiler,
        )


def download_win9x():
    for compiler in [
        "msvc6.0",
        "msvc6.3",
        "msvc6.4",
        "msvc6.5",
        "msvc6.5pp",
        "msvc6.6",
        "msvc7.0",
    ]:
        # This is actually msvc 7.1.
        if compiler == "msvc7.0":
            dest_compiler = "msvc7.1"
        else:
            dest_compiler = compiler

        compiler_path = COMPILERS_DIR / "win9x" / dest_compiler
        if compiler_path.exists():
            print(f"{compiler_path} already exists, skipping")
            continue

        url = (
            "https://github.com/OmniBlade/decomp.me/releases/download/msvcwin9x/"
            + compiler
            + ".tar.gz"
        )

        download_tar(
            url=url,
            platform_id="win9x",
            dest_name=dest_compiler,
        )

    # Download Visual C/C++ 2002 (MSVC 7.0). Note that this toolchain, unlike
    # the others, also contains the PlatformSDK and DirectX 8
    download_tar(
        url="https://github.com/roblabla/MSVC-7.0-Portable/releases/download/release/msvc7.0.tar.gz",
        platform_id="win9x",
        dest_name="msvc7.0",
    )

    # For the repo these compilers are stored in they need a few location adjustments for neatness, and permissions set to executable
    download_zip(
        url="https://github.com/itsmattkc/MSVC400/archive/refs/heads/master.zip",
        platform_id="win9x",
        dest_name="msvc40",
    )

    if os.path.exists(
        COMPILERS_DIR / "win9x" / "MSVC400-master"
    ) and not os.path.exists(COMPILERS_DIR / "win9x" / "msvc4.0/MSVC400-master"):
        shutil.move(
            COMPILERS_DIR / "win9x" / "MSVC400-master",
            COMPILERS_DIR / "win9x" / "msvc4.0",
        )
    if os.path.exists(COMPILERS_DIR / "win9x" / "msvc4.0/BIN"):
        shutil.move(
            COMPILERS_DIR / "win9x" / "msvc4.0/BIN",
            COMPILERS_DIR / "win9x" / "msvc4.0/Bin",
        )
    set_x(COMPILERS_DIR / "win9x" / "msvc4.0/Bin/CL.EXE")

    download_zip(
        url="https://github.com/itsmattkc/MSVC420/archive/refs/heads/master.zip",
        platform_id="win9x",
        dest_name="msvc42",
    )

    if os.path.exists(
        COMPILERS_DIR / "win9x" / "MSVC420-master"
    ) and not os.path.exists(COMPILERS_DIR / "win9x" / "msvc4.2/MSVC420-master"):
        shutil.move(
            COMPILERS_DIR / "win9x" / "MSVC420-master",
            COMPILERS_DIR / "win9x" / "msvc4.2",
        )
    if os.path.exists(COMPILERS_DIR / "win9x" / "msvc4.2/bin"):
        shutil.move(
            COMPILERS_DIR / "win9x" / "msvc4.2/bin",
            COMPILERS_DIR / "win9x" / "msvc4.2/Bin",
        )
    set_x(COMPILERS_DIR / "win9x" / "msvc4.2/Bin/CL.EXE")


def main(args):
    def should_download(platform):
        # assume enabled unless explicitly disabled
        return (
            os.environ.get(f"ENABLE_{platform.upper()}_SUPPORT", "YES").upper() != "NO"
        )

    if should_download("gba"):
        download_gba()
    if should_download("macosx"):
        download_macosx()
    if should_download("n64"):
        download_n64()
    if should_download("nds"):
        download_nds()
    if should_download("ps1"):
        download_ps1()
    if should_download("saturn"):
        download_saturn()
    if should_download("ps2"):
        download_ps2()
    if should_download("switch"):
        download_switch()
    if should_download("gc_wii"):
        download_gc_wii()
    if should_download("n3ds"):
        download_n3ds()
    if should_download("msdos"):
        download_msdos()
    if should_download("win9x"):
        download_win9x()

    print("Compilers finished downloading!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download decomp.me compilers")
    main(parser.parse_args())
