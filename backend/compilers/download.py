import argparse
from dataclasses import dataclass
import os
from pathlib import Path
import platform
import shutil
import sys
import tarfile
from zipfile import ZipFile
from tqdm import tqdm
from typing import Optional

import requests


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

    if total_size_in_bytes != 0 and progress_bar.n != total_size_in_bytes:
        print("ERROR, something went wrong")


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

    download_dest_path = DOWNLOAD_CACHE / dl_name

    if not log_name:
        log_name = dl_name

    download_file(url, log_name, download_dest_path)

    if create_subdir:
        dest_path = COMPILERS_DIR / dest_name
        dest_path.mkdir(exist_ok=True)
    else:
        dest_path = COMPILERS_DIR

    with tarfile.open(download_dest_path, mode=mode) as f:
        for memeber in tqdm(
            desc=f"Extracting {log_name}",
            iterable=f.getmembers(),
            total=len(f.getmembers()),
        ):
            f.extract(member=memeber, path=dest_path)


def download_zip(url: str, dest_name: str = "", log_name: str = ""):
    if not dest_name:
        dest_name = url.split("/")[-1]

    dest_path = DOWNLOAD_CACHE / dest_name

    if not log_name:
        log_name = dest_name

    download_file(url, log_name, dest_path)

    with ZipFile(file=dest_path) as f:
        for file in tqdm(
            desc=f"Extracting {log_name}",
            iterable=f.namelist(),
            total=len(f.namelist()),
        ):
            f.extract(member=file, path=COMPILERS_DIR)


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

        dest_dir = dest_for_version(version)
        if dest_dir.exists():
            print(f"{version} already exists, skipping")
            continue

        package_name = f"clang+llvm-{version}-x86_64-{OS.clang_package_name}"
        url = f"https://releases.llvm.org/{version}/{package_name}.tar.xz"
        print(f"\n{version} : {url}")

        download_tar(url=url, mode="r:xz", log_name=version, create_subdir=False)

        shutil.move(COMPILERS_DIR / package_name, dest_dir)

        # 3.9.1 requires ld.lld and doesn't have it, so we copy it from 4.0.1
        if version == "3.9.1":
            shutil.copy(
                dest_for_version("4.0.1") / "bin/ld.lld", dest_dir / "bin/ld.lld"
            )

    # Set up musl
    download_zip(
        "https://github.com/open-ead/botw-lib-musl/archive/25ed8669943bee65a650700d340e451eda2a26ba.zip",
        shortname="musl",
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

    # TODO MIGRATION FROM gcc2.7kmc to this
    # TODO config for this compiler
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
                url=f"https://github.com/ethteck/ido-static-recomp/releases/download/master/ido-{version}-recomp-{host_os.ido_os}-latest.tar.gz",
                dest_name=f"ido{version}",
            )
    pass


def download_ps1():
    pass


def download_nds():
    compilers_12 = {
        "base": "mwcc_20_72",
        "sp2": "mwcc_20_79",
        "sp2p3": "mw22_20_82",
        "sp3": "mwcc_20_84",
        "sp4": "mwcc_20_87",
    }

    compilers_20 = {
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
    }

    compilers_dsi = {
        "1.1": "mwcc_40_1018",
        "1.1p1": "mwcc_40_1024",
        "1.2": "mwcc_40_1026",
        "1.2p1": "mwcc_40_1027",
        "1.2p2": "mwcc_40_1028",
        "1.3": "mwcc_40_1034",
        "1.3p1": "mwcc_40_1036",
        "1.6sp1": "mwcc_40_1051",
    }

    compiler_groups = {
        "1.2": compilers_12,
        "2.0": compilers_20,
        "dsi": compilers_dsi
    }

    download_zip(
        url="https://cdn.discordapp.com/attachments/698589325620936736/845499146982129684/mwccarm.zip",
        dest_name="mwccarm",
    )

    for group_id, group in compiler_groups.items():
        mwccarm_dir = COMPILERS_DIR / "mwccarm" / group_id
        license_path = COMPILERS_DIR / "mwccarm" / "license.dat"
        for ver, compiler_id in group.items():
            compiler_dir = COMPILERS_DIR / compiler_id
            shutil.move(mwccarm_dir / ver, compiler_dir)
            shutil.copy(license_path, compiler_dir / "license.dat")

    pass


def main(args):
    # download_gba()
    # download_switch()
    # download_n64()
    # download_ps1()
    download_nds()
    print("\nCompilers finsished downloading!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download decomp.me compilers")
    main(parser.parse_args())
