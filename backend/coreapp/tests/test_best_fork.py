from django.urls import reverse
from rest_framework import status

from coreapp.models.scratch import Scratch
from coreapp.serializers import TerseScratchSerializer
from coreapp.tests.common import BaseTestCase
from coreapp.views.scratch import update_scratch_score
from coreapp.wrapper_result import DiffResult


class BestForkTests(BaseTestCase):
    def create_best_fork_scratch(self) -> Scratch:
        return self.create_scratch(
            {
                "platform": "dummy",
                "compiler": "dummy",
                "context": "",
                "target_asm": "jr $ra\nli $v0,2",
                "source_code": "int func() { return 2; }",
            }
        )

    def create_fork(self, parent: Scratch) -> Scratch:
        self.client.post(reverse("current-user"), {})
        response = self.client.post(
            reverse("scratch-fork", kwargs={"pk": parent.slug}),
            {
                "compiler": "dummy",
                "platform": "dummy",
                "source_code": "int func() { return 2; }",
                "context": "",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return Scratch.objects.get(slug=response.json()["slug"])

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
