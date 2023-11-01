import logging
from typing import List

from django.contrib.auth.models import User
from django.db import models
from django_resized import ResizedImageField

from .profile import Profile

logger = logging.getLogger(__name__)


def icon_path(instance: "Project", filename: str) -> str:
    return instance.slug + "_" + filename


class Project(models.Model):
    slug = models.SlugField(primary_key=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    icon = ResizedImageField(size=[256, 256], upload_to=icon_path, null=True)
    description = models.TextField(default="", blank=True, max_length=1000)

    def __str__(self) -> str:
        return self.slug

    def is_member(self, profile: Profile) -> bool:
        for member in self.members():
            if member.user.profile == profile:
                return True
        return False

    def members(self) -> List["ProjectMember"]:
        return [m for m in ProjectMember.objects.filter(project=self)]


class ProjectFunction(models.Model):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE
    )  # note: redundant w.r.t. import_config.project
    rom_address = models.IntegerField()

    creation_time = models.DateTimeField(auto_now_add=True)

    display_name = models.CharField(max_length=128, blank=False)
    is_matched_in_repo = models.BooleanField(default=False)
    # complexity = models.IntegerField()

    src_file = models.CharField(max_length=256)
    asm_file = models.CharField(max_length=256)

    class Meta:
        constraints = [
            # ProjectFunctions are identified uniquely by (project, rom_address)
            models.UniqueConstraint(
                fields=["project", "rom_address"], name="unique_project_function_addr"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.display_name} ({self.project})"


class ProjectMember(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "user"], name="unique_project_member"
            ),
        ]

    def __str__(self) -> str:
        return f"({self.project}, {self.user})"
