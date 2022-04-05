import logging

from django.db import models
from django.utils.crypto import get_random_string

from .profile import Profile

logger = logging.getLogger(__name__)


def gen_scratch_id() -> str:
    ret = get_random_string(length=5)

    if Scratch.objects.filter(slug=ret).exists():
        return gen_scratch_id()

    return ret


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


class CompilerConfig(models.Model):
    # TODO: validate compiler and platform
    compiler = models.CharField(max_length=100)
    platform = models.CharField(max_length=100)
    compiler_flags = models.TextField(max_length=1000, default="", blank=True)
    diff_flags = models.JSONField(default=str, blank=True)


class Scratch(models.Model):
    slug = models.SlugField(primary_key=True, default=gen_scratch_id)
    name = models.CharField(max_length=512, default="Untitled", blank=False)
    description = models.TextField(max_length=5000, default="", blank=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    compiler = models.CharField(max_length=100)  # TODO: reference a CompilerConfig
    platform = models.CharField(
        max_length=100, blank=True
    )  # TODO: reference a CompilerConfig
    compiler_flags = models.TextField(
        max_length=1000, default="", blank=True
    )  # TODO: reference a CompilerConfig
    diff_flags = models.JSONField(
        default=str, blank=True
    )  # TODO: reference a CompilerConfig
    preset = models.CharField(max_length=100, blank=True, null=True)
    target_assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    source_code = models.TextField(blank=True)
    context = models.TextField(blank=True)
    diff_label = models.CharField(max_length=512, blank=True, null=True)
    score = models.IntegerField(default=-1)
    max_score = models.IntegerField(default=-1)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)
    owner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)
    project_function = models.ForeignKey(
        "ProjectFunction", null=True, blank=True, on_delete=models.SET_NULL
    )  # The function, if any, that this scratch is an attempt of

    class Meta:
        ordering = ["-creation_time"]
        verbose_name_plural = "Scratches"

    def __str__(self):
        return self.slug

    # hash for etagging
    def __hash__(self):
        return hash((self.slug, self.last_updated))

    def get_url(self) -> str:
        return "/scratch/" + self.slug

    def get_html_url(self) -> str:
        return "/scratch/" + self.slug

    def is_claimable(self) -> bool:
        return self.owner is None
