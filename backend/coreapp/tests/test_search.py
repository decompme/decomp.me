from django.urls import reverse
from rest_framework import status

from coreapp.models.scratch import Assembly, Scratch
from coreapp.tests.common import BaseTestCase


class SearchTests(BaseTestCase):
    def create_search_scratch(self, name: str) -> Scratch:
        assembly = Assembly.objects.create(
            hash=f"{name}-assembly",
            arch="dummy",
        )
        return Scratch.objects.create(
            name=name,
            compiler="dummy",
            platform="dummy",
            target_assembly=assembly,
        )

    def test_rejects_long_query(self) -> None:
        response = self.client.get(reverse("search"), {"search": "a" * 65})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accepts_max_length_query(self) -> None:
        response = self.client.get(reverse("search"), {"search": "a" * 64})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_long_list_filter_query(self) -> None:
        response = self.client.get(reverse("scratch-list"), {"search": "a" * 65})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_non_integer_page_size(self) -> None:
        response = self.client.get(
            reverse("search"), {"search": "test", "page_size": "abc"}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_non_positive_page_size(self) -> None:
        response = self.client.get(
            reverse("search"), {"search": "test", "page_size": "0"}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accepts_large_page_size(self) -> None:
        response = self.client.get(
            reverse("search"), {"search": "test", "page_size": "999"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_prioritizes_exact_scratch_name_matches(self) -> None:
        self.create_search_scratch("match extra")
        exact_match = self.create_search_scratch("match")
        self.create_search_scratch("another match")

        response = self.client.get(
            reverse("search"), {"search": "match", "page_size": "1"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0]["item"]["slug"], exact_match.slug)
        self.assertEqual(
            {result["item"]["name"] for result in results},
            {"match extra", "match", "another match"},
        )

    def test_returns_up_to_three_times_page_size_scratches(self) -> None:
        scratches = [
            self.create_search_scratch(f"search result {index}") for index in range(6)
        ]

        response = self.client.get(
            reverse("search"), {"search": "search", "page_size": "2"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 6)
        self.assertEqual(
            {result["item"]["slug"] for result in response.json()},
            {scratch.slug for scratch in scratches},
        )
