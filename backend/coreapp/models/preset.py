from django.db import models

from coreapp.models.scratch import LibrariesField


class Preset(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=100)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    platform = models.CharField(max_length=100)
    compiler = models.CharField(max_length=100)
    assembler_flags = models.TextField(max_length=1000, default="", blank=True)
    compiler_flags = models.TextField(max_length=1000, default="", blank=True)
    diff_flags = models.JSONField(default=list)
    libraries = LibrariesField(default=list)

    class Meta:
        ordering = ["-creation_time"]

    def __str__(self) -> str:
        return self.name
