import hashlib
import logging
from typing import Any

from django.db import migrations, transaction, reset_queries
from django.apps.registry import Apps
from django.db.backends.base.schema import BaseDatabaseSchemaEditor

logger = logging.getLogger(__name__)


def deduplicate_contexts(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    Scratch = apps.get_model("coreapp", "Scratch")
    Context = apps.get_model("coreapp", "Context")

    SEEN = set()
    CACHE: dict[bytes, int] = {}  # hash -> Context.id
    SCRATCHES: dict[str, bytes] = {}  # slug -> Context.hash

    def commit_context_updates(updates: list[Any]) -> None:
        if updates:
            with transaction.atomic():
                Context.objects.bulk_create(updates, ignore_conflicts=True)
                # NOTE: bulk_create does not return PKs, so we have to fetch manually
                for c in Context.objects.filter(hash__in=[x.hash for x in updates]):
                    CACHE[bytes(c.hash)] = c.id
            reset_queries()  # cleanup query log cache to avoid OOM
            updates.clear()

    def commit_scratch_updates(updates: list[Any]) -> None:
        if updates:
            with transaction.atomic():
                Scratch.objects.bulk_update(updates, ["context_fk_id"])
            reset_queries()  # cleanup query log cache to avoid OOM
            updates.clear()

    chunk_size = 2_000  # < 8GB RAM utilisation
    context_updates = []
    processed = 0

    skipped = 0

    # 1st Pass: Create all the new Contexts
    qs = Scratch.objects.all().values_list("slug", "context")
    for slug, context in qs.iterator(chunk_size=chunk_size):
        processed += 1

        if not context:
            # skip empty contexts
            skipped += 1
            continue

        h = hashlib.blake2b(context.encode("utf-8"), digest_size=8).digest()
        SCRATCHES[slug] = h

        if h in SEEN:
            # context has already been processed
            continue

        SEEN.add(h)

        context_updates.append(Context(hash=h, text=context))
        if len(context_updates) >= chunk_size:
            commit_context_updates(context_updates)
            logger.info(
                f"[Pass 1] Processed {processed:,} scratches... (skipped: {skipped:,} with empty contexts)"
            )

    commit_context_updates(context_updates)
    logger.info(
        f"[Pass 1] Finished processing {processed:,} scratches... (skipped: {skipped:,} with empty contexts)"
    )

    # 2nd Pass: Update all the Scratches
    processed = 0
    errors = 0
    scratch_updates = []
    for slug, h in SCRATCHES.items():
        processed += 1

        ctx_id = CACHE.get(h)
        if not ctx_id:
            errors += 1
            logger.error("Slug: %s with hash [%s] was missing from the cache", slug, h)
            continue

        scratch_updates.append(Scratch(slug=slug, context_fk_id=ctx_id))

        if len(scratch_updates) >= chunk_size:
            commit_scratch_updates(scratch_updates)
            logger.info(f"[Pass 2] Processed {processed:,} scratches...")

    commit_scratch_updates(scratch_updates)
    logger.info(f"[Pass 2] Finished processing {processed:,} scratches")

    if errors:
        logger.error(f"There were {errors:,} scratches with missing hashes")


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0064_add_context_fk"),
    ]
    operations = [
        migrations.RunPython(deduplicate_contexts),
    ]
