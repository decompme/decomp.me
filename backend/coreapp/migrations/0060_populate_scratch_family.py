import logging

from typing import Any

from django.apps.registry import Apps

from django.db import migrations, transaction
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


logger = logging.getLogger(__name__)


def set_family_field(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    Scratch = apps.get_model("coreapp", "Scratch")

    cache: dict[str, str] = {}

    def find_root(scratch: Any) -> str:
        """Returns the top-most ancestor and caches results."""
        if scratch.slug in cache:
            return cache[scratch.slug]
        visited = []
        current = scratch
        seen = set()
        while current.parent is not None:
            if current.slug in seen:
                logger.warning(f"Cycle detected starting at {scratch.slug}")
                break
            seen.add(current.slug)
            visited.append(current.slug)
            current = current.parent
            if current.slug in cache:
                root_slug = cache[current.slug]
                break
        else:
            root_slug = current.slug

        for slug in visited:
            cache[slug] = root_slug
        return root_slug

    def commit_updates(updates: list[Any]) -> None:
        if updates:
            with transaction.atomic():
                Scratch.objects.bulk_update(updates, ["family"])
            updates.clear()

    chunk_size = 1000
    updates = []
    processed = 0

    qs = Scratch.objects.select_related("parent").only("slug", "parent_id", "family_id")
    for scratch in qs.iterator(chunk_size=chunk_size):
        processed += 1
        if scratch.parent is None:
            if scratch.family_id != scratch.slug:
                scratch.family = scratch
                updates.append(scratch)
        else:
            root_slug = find_root(scratch)
            if scratch.family_id != root_slug:
                root = Scratch.objects.only("slug").get(slug=root_slug)
                scratch.family = root
                updates.append(scratch)

        if processed % chunk_size == 0:
            commit_updates(updates)
            logger.info(f"Processed {processed:,} scratches...")

    # final batch
    commit_updates(updates)

    logger.info(f"Finished processing {processed:,} scratches")


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0059_scratch_family_alter_scratch_parent"),
    ]

    operations = [
        migrations.RunPython(set_family_field),
    ]
