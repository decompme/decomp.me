from pathlib import Path
from django.conf import settings
from django.core.cache import cache
from django.db import models, transaction
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.utils.timezone import now
from django.dispatch import receiver
from rest_framework import status
from rest_framework.exceptions import APIException

from typing import Optional
from github import Github
from github.NamedUser import NamedUser
from github.Repository import Repository
import requests
import subprocess
import shutil

from decompme.settings import LOCAL_FILE_PATH
from .profile import Profile
from .scratch import Scratch
from .project import Project
from ..middleware import Request
import requests

API_CACHE_TIMEOUT = 60 * 60 # 1 hour

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
            raise BadOAuthCodeException()
        elif error:
            raise MalformedGitHubApiResponseException(f"GitHub API login sent unknown error '{error}'.")

        try:
            scope_str = str(response["scope"])
            access_token = str(response["access_token"])
        except KeyError:
            raise MalformedGitHubApiResponseException()

        scopes = scope_str.split(",")
        if not "public_repo" in scopes:
            raise MissingOAuthScopeException("public_repo")

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

        profile: Profile = Profile.objects.filter(user=gh_user.user).first() or Profile()
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

class GitHubRepoBusyException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This repository is currently being pulled."

class GitHubRepo(models.Model):
    owner = models.CharField(max_length=100)
    repo = models.CharField(max_length=100)
    branch = models.CharField(max_length=100, default="master", blank=False)
    is_pulling = models.BooleanField(default=False)
    last_pulled = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "GitHub repo"
        verbose_name_plural = "GitHub repos"

    def pull(self) -> None:
        if self.is_pulling:
            raise GitHubRepoBusyException()

        self.is_pulling = True
        self.save()

        try:
            repo_dir = self.get_dir()
            remote_url = f"https://github.com/{self.owner}/{self.repo}"

            if repo_dir.exists():
                subprocess.run(["git", "remote", "set-url", "origin", remote_url], cwd=repo_dir)
                subprocess.run(["git", "fetch", "origin", self.branch], cwd=repo_dir)
                subprocess.run(["git", "reset", "--hard", f"origin/{self.branch}"], cwd=repo_dir)
                subprocess.run(["git", "pull"], cwd=repo_dir)
            else:
                repo_dir.mkdir(parents=True)
                subprocess.run([
                    "git", "clone",
                    remote_url,
                    ".",
                    "--depth", "1",
                    "-b", self.branch,
                ], check=True, cwd=repo_dir)

            self.last_pulled = now()
            self.save()

            for project in Project.objects.filter(repo=self):
                project.import_functions()
        finally:
            self.is_pulling = False
            self.save()

    def get_dir(self) -> Path:
        return LOCAL_FILE_PATH / "repos" / str(self.id)

    def details(self, access_token: str) -> Repository:
        cache_key = f"github_repo_details:{self.id}"
        cached = cache.get(cache_key)

        if cached:
            return cached

        details = Github(access_token).get_repo(f"{self.owner}/{self.repo}")

        cache.set(cache_key, details, API_CACHE_TIMEOUT)
        return details

    def __str__(self):
        return f"{self.owner}/{self.repo}#{self.branch} ({self.id})"

    def get_html_url(self):
        return f"https://github.com/{self.owner}/{self.repo}/tree/{self.branch}"

# When a GitHubRepo is deleted, delete its directory
@receiver(models.signals.pre_delete, sender=GitHubRepo)
def delete_local_repo_dir(instance: GitHubRepo, **kwargs):
    dir = instance.get_dir()
    if dir.exists():
        shutil.rmtree(dir)
