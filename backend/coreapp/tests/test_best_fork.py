from django.urls import reverse
from rest_framework import status

from coreapp.models.scratch import Scratch
from coreapp.serializers import TerseScratchSerializer
from coreapp.tests.common import BaseTestCase, requiresCompiler
from coreapp.tests.mock_cromper_client import IDO71, N64
from coreapp.views.scratch import update_scratch_score
from coreapp.wrapper_result import DiffResult


class BestForkTests(BaseTestCase):
    def create_best_fork_scratch(self) -> Scratch:
        return self.create_scratch(
            {
                "platform": N64.id,
                "compiler": IDO71.id,
                "context": "",
                "target_asm": "jr $ra\nli $v0,2",
                "source_code": "int func() { return 2; }",
            }
        )

    def create_fork(self, parent: Scratch) -> Scratch:
        response = self.client.post(
            reverse("scratch-fork", kwargs={"pk": parent.slug}),
            {
                "compiler": IDO71.id,
                "platform": N64.id,
                "source_code": "int func() { return 2; }",
                "context": "",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return Scratch.objects.get(slug=response.json()["slug"])

    @requiresCompiler(IDO71)
    def test_fork_score_improvement_updates_best_fork(self) -> None:
        parent = self.create_best_fork_scratch()
        parent.score = 200
        parent.max_score = 200
        parent.save(update_fields=["score", "max_score"])

        fork = self.create_fork(parent)
        fork.score = -1
        fork.max_score = 200
        fork.save(update_fields=["score", "max_score"])

        update_scratch_score(
            fork,
            DiffResult({"current_score": 100, "max_score": 200}),
        )

        parent.refresh_from_db()
        self.assertEqual(parent.best_fork.fork, fork)
        self.assertEqual(parent.best_fork.score, 100)
        self.assertFalse(parent.best_fork.is_match)

        data = TerseScratchSerializer(parent).data
        self.assertEqual(data["best_fork"]["slug"], fork.slug)
        self.assertEqual(data["best_fork"]["score"], 100)

    @requiresCompiler(IDO71)
    def test_original_score_improvement_clears_stale_best_fork(self) -> None:
        parent = self.create_best_fork_scratch()
        parent.score = 200
        parent.max_score = 200
        parent.save(update_fields=["score", "max_score"])

        fork = self.create_fork(parent)
        fork.score = -1
        fork.max_score = 200
        fork.save(update_fields=["score", "max_score"])

        update_scratch_score(
            fork,
            DiffResult({"current_score": 100, "max_score": 200}),
        )
        self.assertEqual(parent.best_fork.fork, fork)

        update_scratch_score(
            parent,
            DiffResult({"current_score": 50, "max_score": 200}),
        )

        parent.refresh_from_db()
        self.assertFalse(hasattr(parent, "best_fork"))

    @requiresCompiler(IDO71)
    def test_unscored_fork_does_not_update_best_fork(self) -> None:
        parent = self.create_best_fork_scratch()
        parent.score = 200
        parent.max_score = 200
        parent.save(update_fields=["score", "max_score"])

        fork = self.create_fork(parent)
        fork.score = -1
        fork.max_score = -1
        fork.save(update_fields=["score", "max_score"])

        update_scratch_score(
            fork,
            DiffResult({"current_score": -1, "max_score": 200}),
        )

        parent.refresh_from_db()
        self.assertFalse(hasattr(parent, "best_fork"))

    @requiresCompiler(IDO71)
    def test_matched_override_can_be_improved_by_lower_scoring_match(self) -> None:
        parent = self.create_best_fork_scratch()
        parent.score = 100
        parent.max_score = 200
        parent.match_override = True
        parent.save(update_fields=["score", "max_score", "match_override"])

        fork = self.create_fork(parent)
        fork.score = -1
        fork.max_score = 200
        fork.match_override = True
        fork.save(update_fields=["score", "max_score", "match_override"])

        update_scratch_score(
            fork,
            DiffResult({"current_score": 50, "max_score": 200}),
        )

        parent.refresh_from_db()
        self.assertEqual(parent.best_fork.fork, fork)
        self.assertEqual(parent.best_fork.score, 50)
        self.assertTrue(parent.best_fork.is_match)

    @requiresCompiler(IDO71)
    def test_best_fork_regression_promotes_next_best_fork(self) -> None:
        parent = self.create_best_fork_scratch()
        parent.score = 200
        parent.max_score = 200
        parent.save(update_fields=["score", "max_score"])

        best_fork = self.create_fork(parent)
        next_best_fork = self.create_fork(parent)
        best_fork.score = -1
        best_fork.max_score = 200
        best_fork.save(update_fields=["score", "max_score"])
        next_best_fork.score = -1
        next_best_fork.max_score = 200
        next_best_fork.save(update_fields=["score", "max_score"])

        update_scratch_score(
            best_fork,
            DiffResult({"current_score": 100, "max_score": 200}),
        )
        update_scratch_score(
            next_best_fork,
            DiffResult({"current_score": 150, "max_score": 200}),
        )
        parent.refresh_from_db()
        self.assertEqual(parent.best_fork.fork, best_fork)

        update_scratch_score(
            best_fork,
            DiffResult({"current_score": 175, "max_score": 200}),
        )

        parent.refresh_from_db()
        self.assertEqual(parent.best_fork.fork, next_best_fork)
        self.assertEqual(parent.best_fork.score, 150)

    @requiresCompiler(IDO71)
    def test_original_regression_finds_existing_best_fork(self) -> None:
        parent = self.create_best_fork_scratch()
        parent.score = 100
        parent.max_score = 200
        parent.save(update_fields=["score", "max_score"])

        fork = self.create_fork(parent)
        fork.score = -1
        fork.max_score = 200
        fork.save(update_fields=["score", "max_score"])
        update_scratch_score(
            fork,
            DiffResult({"current_score": 150, "max_score": 200}),
        )
        parent.refresh_from_db()
        self.assertFalse(hasattr(parent, "best_fork"))

        update_scratch_score(
            parent,
            DiffResult({"current_score": 200, "max_score": 200}),
        )

        parent.refresh_from_db()
        self.assertEqual(parent.best_fork.fork, fork)
        self.assertEqual(parent.best_fork.score, 150)

    @requiresCompiler(IDO71)
    def test_recompute_finds_best_fork_below_unscored_intermediate(self) -> None:
        parent = self.create_best_fork_scratch()
        parent.score = 200
        parent.max_score = 200
        parent.save(update_fields=["score", "max_score"])

        direct_fork = self.create_fork(parent)
        intermediate_fork = self.create_fork(parent)
        descendant_fork = self.create_fork(intermediate_fork)

        intermediate_fork.score = -1
        intermediate_fork.max_score = -1
        intermediate_fork.save(update_fields=["score", "max_score"])
        descendant_fork.score = -1
        descendant_fork.max_score = 200
        descendant_fork.save(update_fields=["score", "max_score"])

        update_scratch_score(
            descendant_fork,
            DiffResult({"current_score": 150, "max_score": 200}),
        )
        update_scratch_score(
            direct_fork,
            DiffResult({"current_score": 100, "max_score": 200}),
        )
        parent.refresh_from_db()
        self.assertEqual(parent.best_fork.fork, direct_fork)

        update_scratch_score(
            direct_fork,
            DiffResult({"current_score": 175, "max_score": 200}),
        )

        parent.refresh_from_db()
        self.assertEqual(parent.best_fork.fork, descendant_fork)
        self.assertEqual(parent.best_fork.score, 150)
