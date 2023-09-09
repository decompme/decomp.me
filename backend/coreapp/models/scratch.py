import json
import logging

from django.db import models
from django.utils.crypto import get_random_string

from typing import Any, List

from .profile import Profile
from ..libraries import Library

logger = logging.getLogger(__name__)


def gen_scratch_id() -> str:
    ret = get_random_string(length=5)

    if Scratch.objects.filter(slug=ret).exists():
        return gen_scratch_id()

    return ret


class Asm(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    data = models.TextField()

    def __str__(self) -> str:
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
    diff_flags = models.JSONField(default=list)


class LibrariesField(models.JSONField):
    def __init__(self, **kwargs: Any):
        class MyEncoder(json.JSONEncoder):
            def default(self, obj: Any) -> str:
                if isinstance(obj, Library):
                    obj = {"name": obj.name, "version": obj.version}
                return super().default(obj)

        return super().__init__(encoder=MyEncoder, **kwargs)

    def to_python(self, value: Any) -> list[Library]:
        res = super().to_python(value)
        return [Library(name=lib["name"], version=lib["version"]) for lib in res]

    def from_db_value(self, *args: Any, **kwargs: Any) -> list[Library]:
        # We ignore the type error here as this is a bug in the django stubs.
        # CC: https://github.com/typeddjango/django-stubs/issues/934
        res = super().from_db_value(*args, **kwargs)  # type: ignore
        return [Library(name=lib["name"], version=lib["version"]) for lib in res]


class Scratch(models.Model):
    slug = models.SlugField(primary_key=True, default=gen_scratch_id)
    name = models.CharField(max_length=1024, default="Untitled", blank=False)
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
    diff_flags = models.JSONField(default=list)  # TODO: reference a CompilerConfig
    preset = models.CharField(max_length=100, blank=True, null=True)
    target_assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    source_code = models.TextField(blank=True)
    context = models.TextField(blank=True)
    diff_label = models.CharField(
        max_length=1024, blank=True
    )  # blank means diff from the start of the file
    score = models.IntegerField(default=-1)
    max_score = models.IntegerField(default=-1)
    match_override = models.BooleanField(default=False)
    libraries = LibrariesField(default=list)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)
    owner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)
    project_function = models.ForeignKey(
        "ProjectFunction", null=True, blank=True, on_delete=models.SET_NULL
    )  # The function, if any, that this scratch is an attempt of

    class Meta:
        ordering = ["-creation_time"]
        verbose_name_plural = "Scratches"

    def __str__(self) -> str:
        return self.slug

    # hash for etagging
    def __hash__(self) -> int:
        return hash((self.slug, self.last_updated))

    def get_url(self) -> str:
        return "/scratch/" + self.slug

    def get_html_url(self) -> str:
        return "/scratch/" + self.slug

    def is_claimable(self) -> bool:
        return self.owner is None

    def all_parents(self) -> "List[Scratch]":
        if self.parent is None:
            return []
        return [self.parent] + self.parent.all_parents()
