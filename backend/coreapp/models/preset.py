from datetime import datetime

from coreapp.models.scratch import LibrariesField
from django.contrib import admin
from django.db import models
from django.utils.timezone import now
from rest_framework.request import Request

from .profile import Profile

boot_time = now()


class Preset(models.Model):
    name = models.CharField(max_length=100)
    platform = models.CharField(max_length=100)
    compiler = models.CharField(max_length=100)
    assembler_flags = models.TextField(max_length=1000, default="", blank=True)
    compiler_flags = models.TextField(max_length=1000, default="", blank=True)
    diff_flags = models.JSONField(default=list, blank=True)
    decompiler_flags = models.TextField(max_length=1000, default="", blank=True)
    libraries = LibrariesField(default=list, blank=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(
        Profile, null=True, blank=True, default=None, on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ["-creation_time"]

    def __str__(self) -> str:
        return self.name

    @staticmethod
    def most_recent_updated(request: Request) -> datetime:
        return (
            boot_time
            if not Preset.objects.count()
            else Preset.objects.latest("last_updated").last_updated
        )


class PresetAdmin(admin.ModelAdmin[Preset]):
    raw_id_fields = ["owner"]
