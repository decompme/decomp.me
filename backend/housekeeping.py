import argparse
import os
import datetime
from typing import Type

import django
from django.apps import apps
from django.db.models import Exists, OuterRef, Model, QuerySet


def get_model(model_name: str) -> Type[Model]:
    return apps.get_model("coreapp", model_name.capitalize())


def perform_delete(qs: QuerySet[Model], dry_run: bool = False) -> int:
    count = qs.count()
    if dry_run:
        return count

    deleted, _ = qs.delete()
    return deleted


def remove_ownerless_scratches(
    cutoff_datetime: datetime.datetime, dry_run: bool = False
) -> int:
    Scratch = get_model("Scratch")

    to_delete = Scratch.objects.filter(  # type: ignore[attr-defined]
        owner__isnull=True, creation_time__lt=cutoff_datetime
    )
    return perform_delete(to_delete, dry_run=dry_run)


def remove_anonymous_profiles(
    cutoff_datetime: datetime.datetime, dry_run: bool = False
) -> int:
    Profile = get_model("Profile")
    Scratch = get_model("Scratch")

    to_delete = Profile.objects.annotate(  # type: ignore[attr-defined]
        has_scratch=Exists(Scratch.objects.filter(owner=OuterRef("pk")))  # type: ignore[attr-defined]
    ).filter(user__isnull=True, creation_date__lt=cutoff_datetime, has_scratch=False)
    return perform_delete(to_delete, dry_run=dry_run)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Decomp.me database housekeeping script"
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

    dry_run: bool = args.dry_run
    cutoff_days: int = args.cutoff_days
    assert cutoff_days >= 1, "--cutoff-days must be >= 1"

    cutoff_datetime = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
        days=cutoff_days
    )

    prefix = "[DRYRUN] " if dry_run else ""

    for text, func in [
        ("Owner-less Scratches", remove_ownerless_scratches),
        ("Scratch-less Profiles", remove_anonymous_profiles),
    ]:
        print(f"{prefix}Cleaning up {text}... ", end="")
        deleted = func(cutoff_datetime, dry_run=dry_run)
        if deleted:
            print(f"{deleted:,} entry(s) removed")
        else:
            print("No entries found!")


if __name__ == "__main__":
    main()
