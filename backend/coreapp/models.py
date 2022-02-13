from django.utils.crypto import get_random_string
from django.db import models, transaction
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from typing import Any, Optional, List
from pathlib import Path
import json
import subprocess

from decompme.settings import FRONTEND_BASE

def gen_scratch_id() -> str:
    ret = get_random_string(length=5)

    if Scratch.objects.filter(slug=ret).exists():
        return gen_scratch_id()

    return ret

class Profile(models.Model):
    creation_date = models.DateTimeField(auto_now_add=True)
    last_request_date = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
        null=True,
    )

    def is_anonymous(self) -> bool:
        return self.user is None

    def __str__(self):
        if self.user:
            return self.user.username
        else:
            return str(self.id)

    def get_html_url(self) -> Optional[str]:
        if self.user:
            return f"{FRONTEND_BASE}/u/{self.user.username}"
        else:
            # No URLs for anonymous profiles
            return None

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

class Project(models.Model):
    slug = models.SlugField(primary_key=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    repo = models.OneToOneField("GithubRepo", on_delete=models.PROTECT)
    icon_url = models.URLField(blank=False)

    def __str__(self):
        return self.slug

    def get_html_url(self) -> str:
        return f"{FRONTEND_BASE}/{self.slug}"

    def run_script(self, args: List[str]):
        repo_dir = self.repo.get_dir()
        script: Path = repo_dir / "tools" / "decompme"

        # TODO: sandbox
        return json.loads(subprocess.check_output([str(script), *args], cwd=repo_dir))

    @transaction.atomic
    def update_functions(self):
        nonmatching_list = self._run_script(["list", "--json"])
        assert isinstance(nonmatching_list, list)

        # Mark all ProjectFunctions for this project as matched. If we don't see them
        # later in nonmatching_list (where they will be marked as unmatched), they are considered matched.
        ProjectFunction.objects.filter(project=self).update(is_matched_in_repo=True)

        # Update or create ProjectFunctions for each nonmatching
        for data in nonmatching_list:
            display_name = data.get("display_name")
            assert isinstance(display_name, str)

            rom_address = data.get("rom_address")
            assert isinstance(rom_address, int)

            project_function = ProjectFunction.objects.filter(project=self, rom_address=rom_address).first()
            if project_function:
                project_function.display_name = display_name
                project_function.is_matched_in_repo = False
            else:
                project_function = ProjectFunction(
                    project=self,
                    rom_address=rom_address,
                    display_name=display_name,
                    is_matched_in_repo=False,
                )
            project_function.save()

class Scratch(models.Model):
    slug = models.SlugField(primary_key=True, default=gen_scratch_id)
    name = models.CharField(max_length=512, default="Untitled", blank=False)
    description = models.TextField(max_length=5000, default="", blank=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    compiler = models.CharField(max_length=100)
    platform = models.CharField(max_length=100, blank=True)
    compiler_flags = models.TextField(max_length=1000, default="", blank=True)
    target_assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    source_code = models.TextField(blank=True)
    context = models.TextField(blank=True)
    diff_label = models.CharField(max_length=512, blank=True, null=True)
    score = models.IntegerField(default=-1)
    max_score = models.IntegerField(default=-1)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)
    owner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)
    project_function = models.ForeignKey("ProjectFunction", null=True, blank=True, on_delete=models.SET_NULL) # The function, if any, that this scratch is an attempt of

    class Meta:
        ordering = ['-creation_time']
        verbose_name_plural = "Scratches"

    def __str__(self):
        return self.slug

    # hash for etagging
    def __hash__(self):
        return hash((self.slug, self.last_updated))

    def get_html_url(self) -> str:
        return FRONTEND_BASE + "/scratch/" + self.slug

    def is_claimable(self) -> bool:
        return self.owner is None

class ProjectFunction(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    rom_address = models.IntegerField()
    creation_time = models.DateTimeField(auto_now_add=True)
    display_name = models.CharField(max_length=128, blank=False)
    is_matched_in_repo = models.BooleanField(default=False)
    #complexity = models.IntegerField()

    class Meta:
        constraints = [
            # ProjectFunctions are identified uniquely by (project, rom_address)
            models.UniqueConstraint(fields=["project", "rom_address"], name="unique_project_function_addr"),
        ]

    def get_html_url(self) -> str:
        return f"{self.project.get_html_url()}/{self.rom_address:X}"

    def __str__(self):
        return f"{self.display_name} ({self.project})"

    def create_scratch(self) -> Scratch:
        from .views.scratch import create_scratch

        data = self.project.run_script(["new", str(self.rom_address), "--dry-run"])
        return create_scratch(data)
