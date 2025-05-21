import logging

from typing import Any

from django.apps.registry import Apps

from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


logger = logging.getLogger(__name__)


def set_family_field(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    Scratch = apps.get_model("coreapp", "Scratch")

    cache: dict[str, Any] = {}

    def find_root(scratch: Any) -> Any:
        """Returns the top-most ancestor and caches results."""
        if scratch.slug in cache:
            return cache[scratch.slug]
        visited = []
        current = scratch
        while current.parent is not None:
            visited.append(current)
            current = current.parent
            if current.slug in cache:
                current = cache[current.slug]
                break
        root = current
        for s in visited:
            cache[s.slug] = root
        return root

    updates = []

    scratches = Scratch.objects.select_related("parent").all()

    for i, scratch in enumerate(scratches, 1):
        if i % 1000 == 0:
            logger.info(f"Processed {i} scratches...")

        if scratch.parent is None:
            if scratch.family_id != scratch.slug:
                scratch.family = scratch
                updates.append(scratch)
        else:
            top = find_root(scratch)
            if scratch.family_id != top.slug:
                scratch.family = top
                updates.append(scratch)

    Scratch.objects.bulk_update(updates, ["family"])


class Migration(migrations.Migration):

    dependencies = [
        ("coreapp", "0059_scratch_family_alter_scratch_parent"),
    ]

    operations = [
        migrations.RunPython(set_family_field),
    ]
