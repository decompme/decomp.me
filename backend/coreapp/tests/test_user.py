import responses
from coreapp.models.github import GitHubUser
from coreapp.models.profile import Profile
from coreapp.tests.common import BaseTestCase
from django.contrib.auth.models import User
from django.urls import reverse
from coreapp.tests.mock_cromper_client import mock_cromper
from rest_framework import status

GITHUB_USER = {
    "login": "BowserSlug",
    "id": 89422212,
    "node_id": "MDQ6VXNlcjg5NDIyMjEy",
    "avatar_url": "https://avatars.githubusercontent.com/u/89422212?v=4",
    "gravatar_id": "",
    "followers_url": "https://api.github.com/users/BowserSlug/followers",
    "following_url": "https://api.github.com/users/BowserSlug/following{/other_user}",
    "gists_url": "https://api.github.com/users/BowserSlug/gists{/gist_id}",
    "starred_url": "https://api.github.com/users/BowserSlug/starred{/owner}{/repo}",
    "subscriptions_url": "https://api.github.com/users/BowserSlug/subscriptions",
    "organizations_url": "https://api.github.com/users/BowserSlug/orgs",
    "repos_url": "https://api.github.com/users/BowserSlug/repos",
    "events_url": "https://api.github.com/users/BowserSlug/events{/privacy}",
    "received_events_url": "https://api.github.com/users/BowserSlug/received_events",
    "type": "User",
    "site_admin": False,
    "name": "Bowser Slug",
    "company": None,
    "blog": "",
    "location": None,
    "email": None,
    "hireable": None,
    "bio": None,
    "twitter_username": None,
    "public_repos": 0,
    "public_gists": 0,
    "followers": 0,
    "following": 0,
    "created_at": "2021-08-23T20:56:16Z",
    "updated_at": "2021-08-23T21:00:04Z",
}


class UserTests(BaseTestCase):
    current_user_url: str

    @classmethod
    def setUpClass(cls) -> None:
        super().setUpClass()
        cls.current_user_url = reverse("current-user")

    def test_set_user_profile_middleware(self) -> None:
        """
        Ensure that an anonymous profile is created for requests.
        """

        response = self.client.get(self.current_user_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 1)
        self.assertEqual(User.objects.count(), 0)

    @responses.activate
    def test_github_login(self) -> None:
        """
        Ensure that a user is created upon sign-in with GitHub.
        """

        responses.post(
            "https://github.com/login/oauth/access_token",
            json={
                "access_token": "__mock__",
                "scope": "public_repo",
            },
            status=200,
        )
        responses.get(
            "https://api.github.com:443/user",
            json=GITHUB_USER,
            status=200,
        )
        responses.get(
            f"https://api.github.com:443/user/{GITHUB_USER['id']}",
            json=GITHUB_USER,
            status=200,
        )

        response = self.client.post(
            self.current_user_url,
            {
                "code": "__mock__",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(GitHubUser.objects.count(), 1)

    @responses.activate
    def test_github_login_where_exists_already(self) -> None:
        """
        Ensure that you can log in to an existing user with GitHub.
        """

        responses.post(
            "https://github.com/login/oauth/access_token",
            json={
                "access_token": "__mock__",
                "scope": "public_repo",
            },
            status=200,
        )
        responses.get(
            "https://api.github.com:443/user",
            json=GITHUB_USER,
            status=200,
        )
        responses.get(
            f"https://api.github.com:443/user/{GITHUB_USER['id']}",
            json=GITHUB_USER,
            status=200,
        )

        # log in as the user
        response = self.client.post(
            self.current_user_url,
            {
                "code": "__mock__",
            },
        )

        # log in as the user again
        response = self.client.post(
            self.current_user_url,
            {
                "code": "__mock__",
            },
        )

        # check there is only one user created
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(GitHubUser.objects.count(), 1)

    @responses.activate
    def test_logout(self) -> None:
        """
        Ensure that you can log out with POST /user with no data.
        """

        # log in as the user
        self.test_github_login()

        # verify we are logged in
        response = self.client.get(self.current_user_url)
        self.assertEqual(response.json()["is_anonymous"], False)

        self.assertEqual(Profile.objects.count(), 1)  # logged-in

        # log out
        response = self.client.post(self.current_user_url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["is_anonymous"], True)

        self.assertEqual(Profile.objects.count(), 2)  # logged-out

        for i in range(3):
            # verify we are logged out
            response = self.client.get(self.current_user_url)
            self.assertEqual(response.json()["is_anonymous"], True)

        # all the above GETs should have used the same logged-out profile
        self.assertEqual(Profile.objects.count(), 2)

    @responses.activate
    @mock_cromper
    def test_own_scratch(self) -> None:
        """
        Create a scratch anonymously, claim it, then log in and verify that the scratch owner is your logged-in user.
        Finally, delete the scratch.
        """
        response = self.client.post(
            "/api/scratch",
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": "jr $ra\nnop\n",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        claim_token = response.json()["claim_token"]
        slug = response.json()["slug"]

        self.test_github_login()

        response = self.client.post(
            f"/api/scratch/{slug}/claim", {"token": claim_token}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

        response = self.client.get(f"/api/scratch/{slug}")
        self.assertEqual(response.json()["owner"]["username"], GITHUB_USER["login"])

        # Delete the scratch
        url = reverse("scratch-detail", kwargs={"pk": slug})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    @responses.activate
    @mock_cromper
    def test_cant_delete_scratch(self) -> None:
        """
        Ensure we can't delete a scratch we don't own
        """

        # Create a scratch, log in, and claim it
        response = self.client.post(
            "/api/scratch",
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": "jr $ra\nnop\n",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        claim_token = response.json()["claim_token"]
        slug = response.json()["slug"]

        self.test_github_login()

        response = self.client.post(
            f"/api/scratch/{slug}/claim", {"token": claim_token}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.json())
        self.assertTrue(response.json()["success"])

        response = self.client.get(f"/api/scratch/{slug}")
        self.assertEqual(response.json()["owner"]["username"], GITHUB_USER["login"])

        # Log out
        response = self.client.post(self.current_user_url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.json())
        self.assertEqual(response.json()["is_anonymous"], True)

        # Try to delete the scratch
        url = reverse("scratch-detail", kwargs={"pk": slug})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Log in again
        self.test_github_login()

        # Successfully delete the scratch
        url = reverse("scratch-detail", kwargs={"pk": slug})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
