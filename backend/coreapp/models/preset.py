from datetime import datetime

from django import forms
from django.contrib import admin
from django.db import models
from django.db.models import Count, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from django.utils.timezone import now
from rest_framework.request import Request

from coreapp.models.scratch import LibrariesField, Scratch

from .profile import Profile

boot_time = now()


def num_scratches_annotation() -> Coalesce:
    # Correlated subquery so we only count scratches for the presets in the result,
    # instead of joining and aggregating every scratch in the database.
    scratch_count = (
        Scratch.objects.filter(preset=OuterRef("pk"))
        .order_by()
        .values("preset")
        .annotate(count=Count("*"))
        .values("count")
    )
    return Coalesce(
        Subquery(scratch_count, output_field=IntegerField()),
        Value(0),
    )


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


class PresetAdminForm(forms.ModelForm):  # type: ignore[type-arg]
    class Meta:
        model = Preset
        fields = "__all__"


class PresetAdmin(admin.ModelAdmin[Preset]):
    form = PresetAdminForm
    autocomplete_fields = ["owner"]
