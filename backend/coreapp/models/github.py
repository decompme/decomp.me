from typing import Optional

import requests
from django.conf import settings
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.db import models, transaction
from django.utils.timezone import now
from github import Github
from requests import RequestException
from rest_framework import status
from rest_framework.exceptions import APIException

from ..middleware import Request
from .profile import Profile
from .scratch import Scratch


class BadOAuthCodeException(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_code = "bad_oauth_code"
    default_detail = "Invalid or expired GitHub OAuth verification code."


class MissingOAuthScopeException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "missing_oauth_scope"


class MalformedGitHubApiResponseException(APIException):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_code = "malformed_github_api_response"
    default_detail = "The GitHub API returned an malformed or unexpected response."


class GitHubUser(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="github",
    )
    github_id = models.PositiveIntegerField(unique=True, editable=False)

    class Meta:
        verbose_name = "GitHub user"
        verbose_name_plural = "GitHub users"

    def __str__(self) -> str:
        return "@" + self.user.username

    @staticmethod
    @transaction.atomic
    def login(request: Request, oauth_code: str) -> "GitHubUser":
        try:
            response = requests.post(
                "https://github.com/login/oauth/access_token",
                json={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": oauth_code,
                },
                headers={"Accept": "application/json"},
            )
        except RequestException:
            raise MalformedGitHubApiResponseException(
                "GitHub API login request failed."
            )

        response_json = response.json()

        error: Optional[str] = response_json.get("error")
        if error == "bad_verification_code":
            raise BadOAuthCodeException()
        elif error:
            raise MalformedGitHubApiResponseException(
                f"GitHub API login sent unknown error '{error}'."
            )

        try:
            scope_str = str(response_json["scope"])
            access_token = str(response_json["access_token"])
        except KeyError:
            raise MalformedGitHubApiResponseException()

        details = Github(access_token).get_user()

        try:
            gh_user = GitHubUser.objects.get(github_id=details.id)
        except GitHubUser.DoesNotExist:
            gh_user = GitHubUser()
            user = request.user

            # make a new user if request.user already has a github account attached
            if (
                user.is_anonymous
                or isinstance(user, User)
                and GitHubUser.objects.filter(user=user).exists()
            ):
                user = User.objects.create_user(
                    username=details.login,
                    email=details.email,
                    password=None,
                )

            assert isinstance(user, User)

            gh_user.user = user
            gh_user.github_id = details.id

        # If the Github username has changed, update the site's username to match it
        if gh_user.user.username != details.login:
            gh_user.user.username = details.login
            gh_user.user.save(update_fields=["username"])

        gh_user.save()

        profile: Profile = (
            Profile.objects.filter(user=gh_user.user).first() or Profile()
        )
        profile.user = gh_user.user
        profile.last_request_date = now()
        profile.save()

        # If the previous profile was anonymous, give its scratches to the logged-in profile
        if request.profile.is_anonymous() and profile.id != request.profile.id:
            Scratch.objects.filter(owner=request.profile).update(owner=profile)
            request.profile.delete()

        login(request, gh_user.user)
        request.profile = profile
        request.session["profile_id"] = profile.id

        return gh_user
