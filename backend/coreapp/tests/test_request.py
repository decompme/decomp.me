from coreapp.models.profile import Profile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class RequestTests(APITestCase):
    def test_create_profile(self) -> None:
        """
        Ensure that we create a profile for a normal request
        """

        response = self.client.get(reverse("stats"), HTTP_USER_AGENT="browser")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 1)

    def test_node_fetch_request(self) -> None:
        """
        Ensure that we don't create profiles for node-fetch requests (SSR)
        """

        response = self.client.get(reverse("stats"), HTTP_USER_AGENT="node-fetch")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 0)

