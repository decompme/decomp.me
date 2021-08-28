from django.utils.crypto import get_random_string
from django.utils.timezone import now
from datetime import timedelta
import logging
from django.db import models

from github3api import GitHubAPI

def gen_scratch_id() -> str:
    ret = get_random_string(length=5)

    if Scratch.objects.filter(slug=ret).exists():
        return gen_scratch_id()

    return ret

class GitHubUserChangeException(Exception):
    """
    The github_access_token is for a different GitHub user than is connected to this Profile.
    Assign it to a new Profile instead.
    """

class GitHubUserHasExistingProfileException(Exception):
    """
    The github_access_token is for a GitHub user who already has a Profile; use that instead.
    """

    def __init__(self, profile: "Profile"):
        super()
        self.profile = profile

class Profile(models.Model):
    github_access_token = models.TextField(blank=True)
    github_load_time = models.DateTimeField(auto_now_add=True)

    # Fields taken from GitHub - don't modify these outside of load_fields_from_github
    github_user_id = models.TextField(null=True)
    username = models.TextField(null=True)
    name = models.TextField(null=True)
    avatar_url = models.TextField(null=True)

    def load_fields_from_github(self, always=False) -> bool:
        if not self.github_access_token:
            return False

        time = self.github_load_time
        delta_time = now() - time
 
        if always or delta_time > timedelta(days=1):
            gh = GitHubAPI(bearer_token=self.github_access_token)
            data = gh.get("/user")

            existing_profile = Profile.objects.filter(github_user_id=data["id"]).first()
            if existing_profile and existing_profile.id != self.id:
                raise GitHubUserHasExistingProfileException(existing_profile)

            github_user_id = str(data["id"])

            if self.github_user_id is not None and github_user_id != self.github_user_id:
                raise GitHubUserChangeException()

            self.github_load_time = now()
            self.github_user_id = github_user_id
            self.username = data["login"]
            self.name = data["name"]
            self.avatar_url = data["avatar_url"]

            logging.debug(f"Loaded fields from GitHub user @{self.username} into profile {self.id}")

            return True
        else:
            return False
    
    def __str__(self):
        return self.username if self.username else str(self.id)

class Asm(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    data = models.TextField()

    def __str__(self):
        return self.data if len(self.data) < 20 else self.data[:17] + "..."

class Assembly(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    time = models.DateTimeField(auto_now_add=True)
    arch = models.CharField(max_length=100)
    source_asm = models.ForeignKey(Asm, on_delete=models.CASCADE)
    elf_object = models.BinaryField(blank=True)

class Compilation(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    time = models.DateTimeField(auto_now_add=True)
    compiler = models.CharField(max_length=100)
    cc_opts = models.TextField(max_length=1000, blank=True, null=True)
    source_code = models.TextField()
    context = models.TextField(blank=True)
    elf_object = models.BinaryField(blank=True)
    stderr = models.TextField(blank=True, null=True)

class Scratch(models.Model):
    slug = models.SlugField(primary_key=True, default=gen_scratch_id)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    compiler = models.CharField(max_length=100, blank=True)
    cc_opts = models.TextField(max_length=1000, blank=True, null=True)
    target_assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    source_code = models.TextField(blank=True)
    context = models.TextField(blank=True)
    original_context = models.TextField(blank=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE)
    owner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.slug
