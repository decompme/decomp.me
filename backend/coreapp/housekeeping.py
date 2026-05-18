import datetime
from typing import Protocol

from django.apps import apps
from django.db.models import Exists, F, Manager, Model, OuterRef, Q, QuerySet, Subquery


class DjangoModel(Protocol):
    objects: Manager[Model]


def get_model(model_name: str) -> type[DjangoModel]:
    return apps.get_model("coreapp", model_name.capitalize())


ORPHAN_ASSET_DELETE_BATCH_SIZE = 1000


def perform_delete(
    qs: QuerySet[Model], dry_run: bool = False, batch_size: int | None = None
) -> int:
    count = qs.count()
    if dry_run:
        return count

    if batch_size is not None:
        deleted = 0
        while ids := list(qs.values_list("pk", flat=True)[:batch_size]):
            batch_deleted, _ = qs.filter(pk__in=ids).delete()
            deleted += batch_deleted
        return deleted

    deleted, _ = qs.delete()
    return deleted


def remove_ownerless_scratches(
    cutoff_datetime: datetime.datetime, dry_run: bool = False
) -> int:
    Scratch = get_model("Scratch")

    to_delete = Scratch.objects.filter(
        owner__isnull=True, creation_time__lt=cutoff_datetime
    )
    return perform_delete(
        to_delete, dry_run=dry_run, batch_size=ORPHAN_ASSET_DELETE_BATCH_SIZE
    )


def remove_anonymous_profiles(
    cutoff_datetime: datetime.datetime, dry_run: bool = False
) -> int:
    Profile = get_model("Profile")
    Scratch = get_model("Scratch")

    to_delete = Profile.objects.annotate(
        has_scratch=Exists(Scratch.objects.filter(owner=OuterRef("pk")))
    ).filter(user__isnull=True, creation_date__lt=cutoff_datetime, has_scratch=False)
    return perform_delete(
        to_delete, dry_run=dry_run, batch_size=ORPHAN_ASSET_DELETE_BATCH_SIZE
    )


def remove_orphan_contexts(
    cutoff_datetime: datetime.datetime, dry_run: bool = False
) -> int:
    Context = get_model("Context")
    Scratch = get_model("Scratch")

    to_delete = Context.objects.annotate(
        has_scratch=Exists(Scratch.objects.filter(context_fk=OuterRef("pk")))
    ).filter(has_scratch=False)

    return perform_delete(to_delete, dry_run=dry_run)


def remove_orphan_assemblies(
    cutoff_datetime: datetime.datetime, dry_run: bool = False
) -> int:
    Assembly = get_model("Assembly")
    Scratch = get_model("Scratch")

    to_delete = Assembly.objects.annotate(
        has_scratch=Exists(Scratch.objects.filter(target_assembly=OuterRef("pk")))
    ).filter(has_scratch=False)

    return perform_delete(to_delete, dry_run=dry_run)


def remove_orphan_asms(
    cutoff_datetime: datetime.datetime, dry_run: bool = False
) -> int:
    Asm = get_model("Asm")
    Assembly = get_model("Assembly")

    to_delete = Asm.objects.annotate(
        has_assembly=Exists(Assembly.objects.filter(source_asm=OuterRef("pk")))
    ).filter(has_assembly=False)

    return perform_delete(to_delete, dry_run=dry_run)


def unchanged_forks(cutoff_datetime: datetime.datetime) -> QuerySet[Model]:
    Scratch = get_model("Scratch")

    return (
        Scratch.objects.filter(
            parent__isnull=False,
            children__isnull=True,
            last_updated__lt=cutoff_datetime,
        )
        .annotate(
            parent_source=Subquery(
                Scratch.objects.filter(pk=OuterRef("parent_id")).values("source_code")[
                    :1
                ]
            ),
            parent_context=Subquery(
                Scratch.objects.filter(pk=OuterRef("parent_id")).values("context_fk")[
                    :1
                ]
            ),
            parent_compiler=Subquery(
                Scratch.objects.filter(pk=OuterRef("parent_id")).values("compiler")[:1]
            ),
            parent_compiler_flags=Subquery(
                Scratch.objects.filter(pk=OuterRef("parent_id")).values(
                    "compiler_flags"
                )[:1]
            ),
            parent_diff_flags=Subquery(
                Scratch.objects.filter(pk=OuterRef("parent_id")).values("diff_flags")[
                    :1
                ]
            ),
            parent_preset=Subquery(
                Scratch.objects.filter(pk=OuterRef("parent_id")).values("preset")[:1]
            ),
        )
        .filter(
            source_code=F("parent_source"),
            compiler=F("parent_compiler"),
            compiler_flags=F("parent_compiler_flags"),
            diff_flags=F("parent_diff_flags"),
        )
        .filter(
            Q(context_fk_id=F("parent_context"))
            | Q(context_fk__isnull=True, parent_context__isnull=True),
            Q(preset_id=F("parent_preset"))
            | Q(preset__isnull=True, parent_preset__isnull=True),
        )
    )


def remove_unchanged_anonymous_forks(
    cutoff_datetime: datetime.datetime, dry_run: bool = False
) -> int:
    to_delete = unchanged_forks(cutoff_datetime).filter(
        Q(owner__isnull=True) | Q(owner__user__isnull=True)
    )
    return perform_delete(to_delete, dry_run=dry_run)


def remove_unchanged_same_author_forks(
    cutoff_datetime: datetime.datetime, dry_run: bool = False
) -> int:
    Scratch = get_model("Scratch")

    to_delete = (
        unchanged_forks(cutoff_datetime)
        .filter(owner__isnull=False, owner__user__isnull=False)
        .annotate(
            parent_owner=Subquery(
                Scratch.objects.filter(pk=OuterRef("parent_id")).values("owner")[:1]
            ),
        )
        .filter(owner_id=F("parent_owner"))
    )
    return perform_delete(to_delete, dry_run=dry_run)


HOUSEKEEPING_TASKS = [
    ("Owner-less Scratches", remove_ownerless_scratches),
    ("Scratch-less Profiles", remove_anonymous_profiles),
    ("Orphan Contexts", remove_orphan_contexts),
    ("Orphan Assemblies", remove_orphan_assemblies),
    ("Orphan Asms", remove_orphan_asms),
    ("Unchanged Anonymous Forks", remove_unchanged_anonymous_forks),
    ("Unchanged Same-Author Forks", remove_unchanged_same_author_forks),
]
