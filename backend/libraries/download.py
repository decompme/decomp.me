#!/usr/bin/env python3

import argparse
import datetime
import functools
import logging
import os
import shutil
import requests
import tempfile
import zipfile
import io

from pathlib import Path

from multiprocessing import Pool

import yaml

logger = logging.getLogger(__name__)


def download_git(
    library_name: str,
    library_version: str,
    library_dir: Path,
    git_download_info: dict[str, str],
    force=False,
):
    logger.debug(
        "Using git to download library at %s (%s)", library_name, library_version
    )

    repo_url = git_download_info["url"]
    branch = git_download_info["branch"]

    zip_url = f"{repo_url}/archive/refs/heads/{branch}.zip"
    local_etag_path = library_dir / ".git_etag"
    headers = {}

    if not force and local_etag_path.exists():
        saved_etag = local_etag_path.read_text().strip()
        if saved_etag:
            headers["If-None-Match"] = saved_etag

    try:
        response = requests.get(zip_url, headers=headers, allow_redirects=True)
    except Exception as e:
        logger.error("Failed to download %s: %s", zip_url, e)
        return False

    if response.status_code == 304:
        logger.debug(
            "%s (%s) is present and up-to-date (ETag match, 304 Not Modified)",
            library_name,
            library_version,
        )
        return None

    if response.status_code != 200:
        logger.error("Failed to download %s: %s", zip_url, response.status_code)
        return False

    remote_etag = response.headers.get("ETag", "")
    if not remote_etag:
        logger.warning(
            "No ETag header found for %s (%s)", library_name, library_version
        )

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
                zip_file.extractall(temp_path)

            for item in library_dir.iterdir():
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()

            roots = list(temp_path.iterdir())
            if len(roots) != 1 or not roots[0].is_dir():
                logger.error(
                    "Unexpected ZIP structure for %s (%s)",
                    library_name,
                    library_version,
                )
                return False

            extracted_root = roots[0]
            for item in extracted_root.iterdir():
                dest = library_dir / item.name
                if item.is_dir():
                    shutil.copytree(item, dest)
                else:
                    shutil.copy2(item, dest)

            if remote_etag:
                local_etag_path.write_text(remote_etag)

    except Exception as e:
        logger.error(
            "Unexpected error occurred processing %s (%s): %s",
            library_name,
            library_version,
            e,
        )
        return False

    logger.info(
        "%s (%s) was successfully downloaded into %s",
        library_name,
        library_version,
        library_dir,
    )

    return True


def get_library(
    platform: str,
    library_name: str,
    library_version: str,
    download_info: dict[str, str],
    libraries_dir=Path("/tmp"),
    force=False,
):
    logger.info("Processing %s %s (%s)", library_name, library_version, platform)

    library_dir = libraries_dir / platform / library_name / library_version
    library_dir.mkdir(parents=True, exist_ok=True)

    if "git" in download_info:
        res = download_git(
            library_name, library_version, library_dir, download_info["git"], force
        )
        if res is False:
            return False
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

    return res


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
        Path(os.path.dirname(os.path.realpath(__file__))) / "libraries.yaml"
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
