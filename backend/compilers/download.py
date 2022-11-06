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
from typing import Optional
from zipfile import ZipFile

import requests
from tqdm import tqdm


@dataclass
class OS:
    name: str
    system: str
    clang_package_name: str
    n64_gcc_os: str
    ido_os: str


MACOS = OS(
    name="MacOS",
    system="darwin",
    clang_package_name="apple-darwin",
    n64_gcc_os="mac",
    ido_os="macos",
)
LINUX = OS(
    name="Linux",
    system="linux",
    clang_package_name="linux-gnu-debian8",
    n64_gcc_os="linux",
    ido_os="ubuntu",
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
def download_file(url: str, log_name: str, dest_path: Path) -> Optional[Path]:
    if dest_path.exists():
        print(f"Download of {log_name} already exists; skipping download")
        return

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
    url: str, dl_name: str, dest_name: str, create_subdir: bool, log_name: str
):
    download_file(url=url, log_name=log_name, dest_path=DOWNLOAD_CACHE / dl_name)

    if create_subdir:
        dest_path = COMPILERS_DIR / dest_name
        dest_path.mkdir(exist_ok=True)
    else:
        dest_path = COMPILERS_DIR

    return dest_path


def download_tar(
    url: str,
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

    dest_path = download_file_wrapper(url, dl_name, dest_name, create_subdir, log_name)

    with tarfile.open(DOWNLOAD_CACHE / dl_name, mode=mode) as f:
        for member in tqdm(
            desc=f"Extracting {log_name}",
            iterable=f.getmembers(),
            total=len(f.getmembers()),
        ):
            f.extract(member=member, path=dest_path)


def download_zip(
    url: str,
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

    dest_path = download_file_wrapper(url, dl_name, dest_name, create_subdir, log_name)

    with ZipFile(file=DOWNLOAD_CACHE / dl_name) as f:
        for file in tqdm(
            desc=f"Extracting {log_name}",
            iterable=f.namelist(),
            total=len(f.namelist()),
        ):
            f.extract(member=file, path=dest_path)


def set_x(file: Path) -> None:
    file.chmod(file.stat().st_mode | stat.S_IEXEC)


def download_ppc_darwin():
    if host_os != LINUX:
        print("MAC OS X cross compiler unsupported on " + host_os.name)
        return
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc-5370.tar.gz",
        dl_name="gcc-5370.tar.gz",
        dest_name="gcc-5370",
    )
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc-5370.tar.gz",
        dl_name="gcc-5370-cpp.tar.gz",
        dest_name="gcc-5370-cpp",
    )
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc-5026.tar.gz",
        dl_name="gcc-5026.tar.gz",
        dest_name="gcc-5026",
    )
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc-5026.tar.gz",
        dl_name="gcc-5026-cpp.tar.gz",
        dest_name="gcc-5026-cpp",
    )
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc-5363.tar.gz",
        dl_name="gcc-5363.tar.gz",
        dest_name="gcc-5363",
    )
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc-5363.tar.gz",
        dl_name="gcc-5363-cpp.tar.gz",
        dest_name="gcc-5363-cpp",
    )
    download_tar(
        url="https://github.com/ChrisNonyminus/powerpc-darwin-cross/releases/download/initial/gcc3-1041.tar.gz",
        dl_name="gcc3-1041.tar.gz",
        dest_name="gcc3-1041",
    )
    download_file(
        url="https://gist.githubusercontent.com/ChrisNonyminus/ec53837b151a65e4233fa53604de4549/raw/d7c6fc639310b938fa519e68a8f8d4909acba2ad/convert_gas_syntax.py",
        log_name="convert_gas_syntax.py",
        dest_path=DOWNLOAD_CACHE / "convert_gas_syntax.py",
    )
    for compiler in [
        "gcc-5370",
        "gcc-5370-cpp",
        "gcc-5026",
        "gcc-5026-cpp",
        "gcc-5363",
        "gcc-5363-cpp",
        "gcc3-1041",
    ]:
        shutil.copy(
            DOWNLOAD_CACHE / "convert_gas_syntax.py",
            COMPILERS_DIR / compiler / "convert_gas_syntax.py",
        )


def download_codewarrior():
    download_zip(
        url="https://github.com/simdecomp/sims1_mac_decomp/files/8766562/MWCPPC_COMPILERS.zip",
        dl_name="codewarrior_compilers.zip",
        dest_name="codewarrior",
        create_subdir=True,
    )
    download_file(
        url="https://gist.githubusercontent.com/ChrisNonyminus/e530faed7fb6b1af213ef6be3994b3a9/raw/4474a194aa42fd62c719c6b234a5f2b9bfaec817/convert_gas_syntax.py",
        log_name="convert_gas_syntax.py",
        dest_path=DOWNLOAD_CACHE / "convert_gas_syntax_macos9.py",
    )
    compiler_dir = COMPILERS_DIR / "codewarrior" / "compilers"
    for ver in ["Pro5", "Pro6"]:
        lowercase_lmgr = compiler_dir / ver / "lmgr326b.dll"
        if lowercase_lmgr.exists():
            shutil.move(lowercase_lmgr, compiler_dir / ver / "LMGR326B.dll")

        lowercase_lmgr = compiler_dir / ver / "lmgr8c.dll"
        if lowercase_lmgr.exists():
            shutil.move(lowercase_lmgr, compiler_dir / ver / "LMGR8C.dll")

        set_x(compiler_dir / ver / "MWCPPC.exe")
        set_x(compiler_dir / ver / "MWLinkPPC.exe")
        shutil.copy(
            DOWNLOAD_CACHE / "convert_gas_syntax_macos9.py",
            compiler_dir / ver / "convert_gas_syntax.py",
        )

    try:
        shutil.move(compiler_dir / "Pro5", COMPILERS_DIR / "mwcppc_23")
        shutil.move(compiler_dir / "Pro6", COMPILERS_DIR / "mwcppc_24")
    except shutil.Error:
        pass


def download_gba():
    if host_os != LINUX:
        print("agbcc unsupported on " + host_os.name)
        return

    def download_agbcc(url: str, dest: str):
        dest_dir = COMPILERS_DIR / dest
        if dest_dir.exists():
            print(f"{dest} already exists, skipping")
            return

        download_tar(url=url, dest_name=dest)

    download_agbcc(
        "https://github.com/ethteck/agbcc/releases/download/master/agbcc.tar.gz",
        "agbcc",
    )
    download_agbcc(
        "https://github.com/notyourav/agbcc/releases/download/cp/agbcc.tar.gz",
        "agbccpp",
    )


def download_switch():
    def dest_for_version(version: str) -> Path:
        return COMPILERS_DIR / f"clang-{version}"

    versions = ["4.0.1", "3.9.1"]

    # 3.9.1 isn't available for mac
    mac_versions = versions.copy()
    mac_versions.remove("3.9.1")

    botw_lib_musl_versions = ["4.0.1", "3.9.1"]

    # Download and extract the compilers
    for version in versions:
        if host_os == MACOS and version not in mac_versions:
            continue

        log_name = f"clang {version}"
        dest_dir = dest_for_version(version)
        if dest_dir.exists():
            print(f"{log_name} already exists, skipping")
            continue

        package_name = f"clang+llvm-{version}-x86_64-{host_os.clang_package_name}"
        url = f"https://releases.llvm.org/{version}/{package_name}.tar.xz"

        download_tar(url=url, mode="r:xz", log_name=log_name, create_subdir=False)

        # Somehow the MacOS tar extracts to a directory with a different name, so we have to find it again
        if host_os == MACOS:
            package_name = next(
                COMPILERS_DIR.glob(f"clang+llvm-{version}-x86_64-*" + os.path.sep)
            ).name

        shutil.move(COMPILERS_DIR / package_name, dest_dir)

        # 3.9.1 requires ld.lld and doesn't have it, so we copy it from 4.0.1
        if version == "3.9.1":
            shutil.copy(
                dest_for_version("4.0.1") / "bin/ld.lld", dest_dir / "bin/ld.lld"
            )

    # Set up musl
    download_zip(
        url="https://github.com/open-ead/botw-lib-musl/archive/25ed8669943bee65a650700d340e451eda2a26ba.zip",
        log_name="musl",
    )
    musl_name = "botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba"
    musl_dest = COMPILERS_DIR / musl_name
    for version in botw_lib_musl_versions:
        ver_dest = dest_for_version(version)
        if ver_dest.exists():
            shutil.copytree(musl_dest, ver_dest / musl_name, dirs_exist_ok=True)
    shutil.rmtree(musl_dest)


def download_n64():
    def download_gcc(gcc_url: str, binutils_url, dest: str):
        dest_path = COMPILERS_DIR / dest
        if dest_path.exists():
            print(f"{dest} already exists, skipping")
        else:
            download_tar(
                url=gcc_url,
                dest_name=dest,
            )
            download_tar(
                url=binutils_url,
                dl_name=f"{dest}-binutils",
                dest_name=dest,
            )

    # GCC 2.8.1
    download_gcc(
        gcc_url=f"https://github.com/pmret/gcc-papermario/releases/download/master/{host_os.n64_gcc_os}.tar.gz",
        binutils_url=f"https://github.com/pmret/binutils-papermario/releases/download/master/{host_os.n64_gcc_os}.tar.gz",
        dest="gcc2.8.1",
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
        dest = COMPILERS_DIR / f"ido{version}"
        if dest.exists():
            print(f"ido{version} already exists, skipping")
        else:
            download_tar(
                url=f"https://github.com/ethteck/ido-static-recomp/releases/download/v0.2/ido-{version}-recomp-{host_os.ido_os}-latest.tar.gz",
                dest_name=f"ido{version}",
            )

    # SN
    dest = COMPILERS_DIR / "gcc2.7.2sn"
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
        psyq_obj_parser = dest / "psyq-obj-parser"
        psyq_obj_parser.chmod(
            psyq_obj_parser.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
        )
        set_x(psyq_obj_parser)

    # SN
    dest = COMPILERS_DIR / "gcc2.7.2snew"
    if dest.is_dir():
        print(f"{dest} already exists, skipping")
    else:
        dest.mkdir()
        download_tar(
            url="https://github.com/decompals/SN64-gcc/releases/download/gcc-2.7.2-970404/SN64-gcc-2.7.2-970404-linux.tar.gz",
            dest_name="gcc2.7.2snew",
        )
        download_file(
            url="https://github.com/RocketRet/modern-asn64/releases/download/main-release/modern-asn64.py",
            log_name="modern-asn64.py",
            dest_path=dest / "modern-asn64.py",
        )

    # SN
    dest = COMPILERS_DIR / "gcc2.8.1sn"
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
        # TODO: upload +x'd version of this
        psyq_obj_parser = dest / "psyq-obj-parser"
        psyq_obj_parser.chmod(
            psyq_obj_parser.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
        )


def download_ps1():
    if host_os != LINUX:
        print("ps1 compilers unsupported on " + host_os.name)
        return

    compilers_path = COMPILERS_DIR / "psyq-compilers"

    download_zip(
        url="https://github.com/decompals/old-gcc/releases/download/release/gcc-2.6.3.zip",
        dl_name="gcc2.6.3-mispel.zip",
        dest_name="gcc2.6.3-mispel",
        create_subdir=True,
    )

    download_tar(
        url="https://github.com/mkst/esa/releases/download/psyq-binaries/psyq-compilers.tar.gz",
        dest_name="psyq-compilers",
    )

    # TODO: remove psyq-obj-parser from psyq-compilers.tar.gz
    download_file(
        url="https://github.com/mkst/pcsx-redux/releases/download/matching-relocs/psyq-obj-parser",
        log_name="psyq-obj-parser",
        dest_path=compilers_path / "psyq",
    )

    psyq_to_gcc = {
        "4.0": "2.7.2",
        "4.1": "2.7.2",
        "4.3": "2.8.1",
        "4.5": "2.91.66",
        "4.6": "2.95.2",
    }

    for version in psyq_to_gcc.keys():
        dest = COMPILERS_DIR / f"psyq{version}"
        if not dest.exists():
            shutil.move(compilers_path / f"psyq{version}", COMPILERS_DIR)
        psyq_obj_parser = dest / "psyq-obj-parser"
        shutil.copy(
            compilers_path / "psyq",
            psyq_obj_parser,
        )
        psyq_obj_parser.chmod(
            psyq_obj_parser.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
        )
        set_x(psyq_obj_parser)

        # +x exes
        for file in dest.glob("*.exe"):
            set_x(file)
        for file in dest.glob("*.EXE"):
            set_x(file)

    shutil.rmtree(compilers_path)


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
    )

    # Organize dirs, copy license
    for group_id, group in compiler_groups.items():
        mwccarm_dir = COMPILERS_DIR / "mwccarm" / group_id
        license_path = COMPILERS_DIR / "mwccarm" / "license.dat"
        for ver, compiler_id in group.items():
            compiler_dir = COMPILERS_DIR / compiler_id
            if not compiler_dir.exists():
                shutil.move(mwccarm_dir / ver, compiler_dir)

            shutil.copy(license_path, compiler_dir / "license.dat")

            # Rename dll to uppercase
            lowercase_lmgr = compiler_dir / "lmgr8c.dll"
            if lowercase_lmgr.exists():
                shutil.move(lowercase_lmgr, compiler_dir / "LMGR8C.dll")

            set_x(compiler_dir / "mwccarm.exe")

    shutil.rmtree(COMPILERS_DIR / "mwccarm")


def download_wii_gc():
    compiler_groups = {
        "GC": {
            "1.0": "mwcc_233_144",
            "1.1": "mwcc_233_159",
            "1.2.5": "mwcc_233_163",
            "1.2.5e": "mwcc_233_163e",
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

    download_zip(
        url="https://cdn.discordapp.com/attachments/727918646525165659/917185027656286218/GC_WII_COMPILERS.zip",
    )

    for group_id, group in compiler_groups.items():
        for ver, compiler_id in group.items():
            compiler_dir = COMPILERS_DIR / compiler_id
            if not compiler_dir.exists():
                shutil.move(COMPILERS_DIR / group_id / ver, compiler_dir)

            # Rename dll to uppercase - WSL is case sensitive without wine
            lowercase_lmgr = compiler_dir / "lmgr326b.dll"
            if lowercase_lmgr.exists():
                shutil.move(lowercase_lmgr, compiler_dir / "LMGR326B.dll")

            lowercase_lmgr = compiler_dir / "lmgr8c.dll"
            if lowercase_lmgr.exists():
                shutil.move(lowercase_lmgr, compiler_dir / "LMGR8C.dll")

            set_x(compiler_dir / "mwcceppc.exe")

            (compiler_dir / "license.dat").touch()

        shutil.rmtree(COMPILERS_DIR / group_id)

    # copy in clean 1.2.5 for frank
    shutil.copy(
        COMPILERS_DIR / "mwcc_233_163" / "mwcceppc.exe",
        COMPILERS_DIR / "mwcc_233_163e" / "mwcceppc.125.exe",
    )
    download_file(
        url="https://raw.githubusercontent.com/projectPiki/pikmin/main/tools/frank.py",
        log_name="frank",
        dest_path=COMPILERS_DIR / "mwcc_233_163e" / "frank.py",
    )

    # copy contents of _142 to _127 to prepare for patched version
    if not os.path.exists(COMPILERS_DIR / "mwcc_42_127"):
        shutil.copytree(COMPILERS_DIR / "mwcc_42_142", COMPILERS_DIR / "mwcc_42_127")
        os.remove(COMPILERS_DIR / "mwcc_42_127" / "mwcceppc.exe")

    exe_path = COMPILERS_DIR / "mwcc_42_127" / "mwcceppc.exe"
    download_file(
        url="https://cdn.discordapp.com/attachments/804212941054279722/954854566304833567/mwcceppc_PATCHED.exe",
        log_name="mwcc_42_127",
        dest_path=exe_path,
    )
    set_x(exe_path)


def download_3ds():
    compiler_groups = {
        "4.0": {
            "b771": "armcc_40_771",
            "b821": "armcc_40_821",
        },
        "4.1": {
            "b561": "armcc_41_561",
            "b713": "armcc_41_713",
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
        url="http://al.littun.co/dl/armcc.zip",
    )
    for group_id, group in compiler_groups.items():
        for ver, compiler_id in group.items():
            compiler_dir = COMPILERS_DIR / compiler_id
            if not compiler_dir.exists():
                shutil.move(COMPILERS_DIR / group_id / ver, compiler_dir)

            # Set +x to allow WSL without wine
            exe_path = compiler_dir / "bin/armcc.exe"
            exe_path.chmod(exe_path.stat().st_mode | stat.S_IEXEC)
        shutil.rmtree(COMPILERS_DIR / group_id)


def main(args):
    def should_download(platform):
        # assume enabled unless explicitly disabled
        return (
            os.environ.get(f"ENABLE_{platform.upper()}_SUPPORT", "YES").upper() != "NO"
        )

    if should_download("gba"):
        download_gba()
    if should_download("macosx"):
        download_ppc_darwin()
    if should_download("macos9"):
        download_codewarrior()
    if should_download("n64"):
        download_n64()
    if should_download("nds"):
        download_nds()
    if should_download("ps1"):
        download_ps1()
    if should_download("switch"):
        download_switch()
    if should_download("wii_gc"):
        download_wii_gc()
    if should_download("n3ds"):
        download_3ds()

    print("Compilers finished downloading!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download decomp.me compilers")
    main(parser.parse_args())
