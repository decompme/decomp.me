from django.conf import settings
from django.core.cache import cache
from django.db import models, transaction
from django.contrib.auth import login
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.exceptions import APIException

from typing import Optional
from github import Github
from github.NamedUser import NamedUser
from .middleware import Request
import requests

from .models import Profile

API_CACHE_TIMEOUT = 60 * 60 # 1 hour

class BadOAuthCode(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_code = "bad_oauth_code"
    default_detail = "Invalid or expired GitHub OAuth verification code."

class MissingOAuthScope(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "bad_oauth_scope"
    missing_scope: str

    def __init__(self, scope: str):
        super(f"The GitHub OAuth verification code was valid but lacks required scope '{scope}'.")
        self.missing_scope = scope

class MalformedGithubApiResponse(APIException):
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
    access_token = models.CharField(max_length=100)

    class Meta:
        verbose_name = "GitHub user"
        verbose_name_plural = "GitHub users"

    def details(self) -> NamedUser:
        cache_key = f"github_user_details:{self.github_id}"
        cached = cache.get(cache_key)

        if cached:
            return cached

        details = Github(self.access_token).get_user_by_id(self.github_id)

        cache.set(cache_key, details, API_CACHE_TIMEOUT)
        return details

    def __str__(self):
        return "@" + self.details().login

    @staticmethod
    @transaction.atomic
    def login(request: Request, oauth_code: str) -> "GitHubUser":
        response = requests.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": oauth_code,
            },
            headers={ "Accept": "application/json" },
        ).json()

        error: Optional[str] = response.get("error")
        if error == "bad_verification_code":
            raise BadOAuthCode()
        elif error:
            raise MalformedGithubApiResponse(f"GitHub API login sent unknown error '{error}'.")

        try:
            scope_str = str(response["scope"])
            access_token = str(response["access_token"])
        except KeyError:
            raise MalformedGithubApiResponse()

        scopes = scope_str.split(",")
        #if not "public_repo" in scopes:
        #    raise MissingOAuthScope("public_repo")

        details = Github(access_token).get_user()

        try:
            gh_user = GitHubUser.objects.get(github_id=details.id)
        except GitHubUser.DoesNotExist:
            gh_user = GitHubUser()
            user = request.user

            # make a new user if request.user already has a github account attached
            if user.is_anonymous or isinstance(user, User) and GitHubUser.objects.filter(user=user).get() is not None:
                user = User.objects.create_user(
                    username=details.login,
                    email=details.email,
                    password=None,
                )

            assert isinstance(user, User)

            gh_user.user = user
            gh_user.github_id = details.id

        gh_user.access_token = access_token
        gh_user.save()

        login(request, gh_user.user)

        return gh_user
