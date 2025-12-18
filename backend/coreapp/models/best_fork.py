from django.contrib import admin
from django.db import models

from .scratch import Scratch


class BestFork(models.Model):
    scratch = models.OneToOneField(
        Scratch,
        on_delete=models.CASCADE,
        related_name="best_fork",
    )
    fork = models.ForeignKey(
        Scratch,
        on_delete=models.CASCADE,
        related_name="+",
    )
    score = models.IntegerField(default=-1)
    max_score = models.IntegerField(default=-1)
    is_match = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self) -> str:
        return f"{self.scratch_id} improved by {self.fork_id}"


def scratch_improves(original: Scratch, candidate: Scratch) -> bool:
    if original.pk == candidate.pk:
        return False

    if not candidate.has_usable_result:
        return False

    if original.is_match:
        return (
            candidate.is_match
            and candidate.has_score
            and (not original.has_score or candidate.score < original.score)
        )

    if candidate.is_match:
        return True

    if not original.has_score:
        return True

    return candidate.score < original.score


def candidate_beats_record(candidate: Scratch, record: BestFork | None) -> bool:
    if record is None:
        return True

    if candidate.is_match != record.is_match:
        return candidate.is_match

    # If both are considered matches, prefer the lowest real score. A match
    # override with no score should not beat a real score.
    if not candidate.has_score:
        return False

    if record.score < 0:
        return True

    return candidate.score < record.score


def candidate_beats_candidate(candidate: Scratch, current: Scratch | None) -> bool:
    if current is None:
        return True

    if candidate.is_match != current.is_match:
        return candidate.is_match

    if not candidate.has_score:
        return False

    if not current.has_score:
        return True

    return candidate.score < current.score


def scratch_descends_from(
    candidate: Scratch,
    original: Scratch,
    scratches_by_id: dict[str, Scratch],
) -> bool:
    parent_id = candidate.parent_id
    seen: set[str] = set()

    while parent_id and parent_id not in seen:
        if parent_id == original.pk:
            return True

        seen.add(parent_id)
        parent = scratches_by_id.get(parent_id)
        if parent is None:
            return False

        parent_id = parent.parent_id

    return False


def find_best_fork_for_original(original: Scratch) -> Scratch | None:
    if not original.family_id:
        return None

    family = list(
        Scratch.objects.filter(family_id=original.family_id).only(
            "slug",
            "family_id",
            "parent_id",
            "score",
            "max_score",
            "match_override",
        )
    )
    scratches_by_id = {scratch.pk: scratch for scratch in family}
    scratches_by_id[original.pk] = original

    best: Scratch | None = None
    for candidate in family:
        if candidate.pk == original.pk or not candidate.has_usable_result:
            continue

        if (
            scratch_descends_from(candidate, original, scratches_by_id)
            and scratch_improves(original, candidate)
            and candidate_beats_candidate(candidate, best)
        ):
            best = candidate

    return best


def save_best_fork(original: Scratch, fork: Scratch) -> None:
    BestFork.objects.update_or_create(
        scratch=original,
        defaults={
            "fork": fork,
            "score": fork.score,
            "max_score": fork.max_score,
            "is_match": fork.is_match,
        },
    )


def refresh_best_fork_for_original(original: Scratch, *, force: bool = False) -> None:
    try:
        record = original.best_fork
    except BestFork.DoesNotExist:
        record = None

    if record and not force and scratch_improves(original, record.fork):
        return

    if record is None and not original.children.exists():
        return

    best = find_best_fork_for_original(original)
    if best:
        save_best_fork(original, best)
    elif record:
        record.delete()


def update_best_forks_for_scratch(scratch: Scratch) -> None:
    refresh_best_fork_for_original(scratch, force=True)

    parent = scratch.parent
    seen: set[str] = set()
    while parent and parent.pk not in seen:
        seen.add(parent.pk)

        try:
            record = parent.best_fork
        except BestFork.DoesNotExist:
            record = None

        if scratch_improves(parent, scratch):
            if record and record.fork_id == scratch.pk:
                refresh_best_fork_for_original(parent, force=True)
            elif candidate_beats_record(scratch, record):
                save_best_fork(parent, scratch)
        elif record and record.fork_id == scratch.pk:
            refresh_best_fork_for_original(parent)

        parent = parent.parent


class BestForkAdmin(admin.ModelAdmin[BestFork]):
    list_display = ["updated_at", "scratch", "fork", "score", "is_match"]
    list_filter = ["is_match", "updated_at"]
    raw_id_fields = ["scratch", "fork"]
