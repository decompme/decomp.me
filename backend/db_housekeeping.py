#!/usr/bin/env python

import argparse
import datetime
import os

import django


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Decomp.me database database housekeeping script"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate deletions without applying them",
    )
    parser.add_argument(
        "--cutoff-days",
        type=int,
        default=1,
        help="Threshold in days; only delete items older than this",
    )
    args = parser.parse_args()

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "decompme.settings")
    django.setup()

    from coreapp.housekeeping import HOUSEKEEPING_TASKS

    dry_run: bool = args.dry_run
    cutoff_days: int = args.cutoff_days
    assert cutoff_days >= 1, "--cutoff-days must be >= 1"

    cutoff_datetime = datetime.datetime.now(datetime.UTC) - datetime.timedelta(
        days=cutoff_days
    )

    prefix = "[DRYRUN] " if dry_run else ""

    for text, func in HOUSEKEEPING_TASKS:
        print(f"{prefix}Cleaning up {text}... ", end="")
        deleted = func(cutoff_datetime, dry_run=dry_run)
        if deleted:
            print(f"{deleted:,} entry(s) {'would be ' if dry_run else ''}removed")
        else:
            print("No entries found!")


if __name__ == "__main__":
    main()
