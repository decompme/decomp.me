from django.urls import reverse
from rest_framework import status

from coreapp.tests.common import BaseTestCase


class SearchTests(BaseTestCase):
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
