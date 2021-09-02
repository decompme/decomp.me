from django.conf import settings
from django.core.cache import cache
from django.db import models, transaction
from django.http import HttpRequest
from django.contrib.auth import login
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.exceptions import APIException

from typing import Optional
from github import Github
from github.NamedUser import NamedUser
import requests

from .models import Profile

API_CACHE_TIMEOUT = 60 * 60 # 1 hour

class BadOAuthCode(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Invalid or expired GitHub OAuth verification code."
    default_code = "bad_oauth_code"

class MissingOAuthScope(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "bad_oauth_scope"

    def __init__(self, scope: str):
        super(f"The GitHub OAuth verification code was valid but lacks required scope '{scope}'.")

class GitHubUser(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="github",
    )
    github_id = models.PositiveIntegerField(unique=True, editable=False)
    access_token = models.CharField(max_length=100)

    def details(self, use_cache: bool = True) -> NamedUser:
        cache_key = f"github_user_details:{self.github_id}"
        cached = cache.get(cache_key) if use_cache else None

        if cached:
            return cached

        details = Github(self.access_token).get_user_by_id(self.github_id)

        cache.set(cache_key, details, API_CACHE_TIMEOUT)
        return details

    def __str__(self):
        return "@" + self.details().login

    @staticmethod
    @transaction.atomic
    def login(request: HttpRequest, oauth_code: str) -> "GitHubUser":
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
            raise Exception(f"GitHub login sent unknown error '{error}'")

        scopes = str(response["scope"]).split(",")
        if not "public_repo" in scopes:
            raise MissingOAuthScope("public_repo")

        access_token: str = response["access_token"]

        details = Github(access_token).get_user()

        try:
            gh_user = GitHubUser.objects.get(github_id=details.id)
        except GitHubUser.DoesNotExist:
            gh_user = GitHubUser()
            user = request.user
            new_user = request.user.is_anonymous

            if not new_user:
                try:
                    request.user.github
                    new_user = True
                except User.github.RelatedObjectDoesNotExist:
                    # request.user lacks a github link, so we can attach gh_user to it
                    pass
                except AttributeError:
                    pass

            if new_user:
                user = User.objects.create_user(
                    username=details.login,
                    email=details.email,
                    password=None,
                )

                try:
                    user.profile = request.user.profile
                except AttributeError:
                    profile = Profile()
                    profile.save()
                    user.profile = profile

                user.save()

            gh_user.user = user
            gh_user.github_id = details.id

        gh_user.access_token = access_token
        gh_user.save()

        login(request, gh_user.user)

        return gh_user
