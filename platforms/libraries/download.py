#!/usr/bin/env python3

import argparse
import datetime
import functools
import logging
import os
import shutil
import subprocess

from pathlib import Path

from multiprocessing import Pool

import yaml

logger = logging.getLogger(__name__)


def download_git(library_name, library_version, library_dir, git_download_info, force):
    # Download with git. Get url and ref, and download using git clone.
    url = git_download_info["url"]
    branch = str(git_download_info["branch"])
    logger.debug("Using git to download library at %s branch %s", url, branch)

    # Recreate repository if force is set.
    if force and library_dir.exists():
        shutil.rmtree(library_dir)
        library_dir.mkdir()

    # Make sure the git repo is initialized. If it already exists, this is
    # essentially a noop.
    subprocess.run(["git", "init", "-b", branch, str(library_dir)], check=True)

    # Fetch the ref we want to download, and git reset --hard to it.
    subprocess.run(
        ["git", "-C", str(library_dir), "fetch", url, f"refs/heads/{branch}"],
        check=True,
    )
    subprocess.run(
        ["git", "-C", str(library_dir), "reset", "--hard", "FETCH_HEAD"], check=True
    )


def get_library(
    platform,
    library_name,
    library_version,
    download_info,
    libraries_dir=Path("/tmp"),
    force=False,
):
    logger.info("Processing %s %s (%s)", library_name, library_version, platform)

    library_dir = libraries_dir / platform / library_name / library_version
    library_dir.mkdir(parents=True, exist_ok=True)

    if "git" in download_info:
        download_git(
            library_name, library_version, library_dir, download_info["git"], force
        )
    else:
        logger.error(
            f"No supported download methods for library {library_name} {library_version}"
        )
        return False

    include_dir = library_dir / "include"
    if not include_dir.is_dir():
        logger.error(
            f"Failed to download {library_name} {library_version}: {include_dir} does not exist or isn't a directory."
        )
        return False

    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--force",
        help="Force (re)downloading of libraries",
        action="store_true",
    )
    parser.add_argument(
        "--libraries-dir",
        type=Path,
        default=None,
        help="Directory where libraries will be stored",
    )
    parser.add_argument(
        "--platforms", type=str, nargs="+", help="Only run for these platforms"
    )
    parser.add_argument(
        "--threads", type=int, default=4, help="Number of download threads to use"
    )
    parser.add_argument("--verbose", action="store_true", help="Enable DEBUG log level")
    args = parser.parse_args()

    if args.verbose:
        logger.setLevel("DEBUG")

    if args.libraries_dir == None:
        args.libraries_dir = Path(os.path.dirname(os.path.realpath(__file__)))

    libraries_yaml = (
        Path(os.path.dirname(os.path.realpath(__file__))) / f"libraries.yaml"
    )
    libraries_config = yaml.safe_load(libraries_yaml.open())

    to_download = []
    for platform_id, libraries in libraries_config.items():
        if args.platforms is not None:
            platform_enabled = platform_id in args.platforms
        else:
            platform_enabled = True

        if platform_enabled:
            for libname, versions in libraries.items():
                for versionname, download_info in versions.items():
                    to_download.append(
                        (platform_id, libname, versionname, download_info)
                    )

    if len(to_download) == 0:
        logger.warning("No libraries to download")
        return

    start = datetime.datetime.now()
    with Pool(processes=args.threads) as pool:
        results = pool.starmap(
            functools.partial(
                get_library,
                libraries_dir=args.libraries_dir,
                force=args.force,
            ),
            to_download,
        )
    end = datetime.datetime.now()

    libraries_downloaded = len(list(filter(lambda x: x, results)))
    logger.info(
        "Updated %i / %i libraries in %.2f second(s)",
        libraries_downloaded,
        len(to_download),
        (end - start).total_seconds(),
    )


if __name__ == "__main__":
    logging.basicConfig(
        handlers=[logging.StreamHandler()],
        level=logging.INFO,
        format=("%(asctime)s.%(msecs)03d %(levelname)s %(funcName)s %(message)s"),
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    main()
