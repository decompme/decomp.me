import json
import logging
from typing import TYPE_CHECKING, Any, Sequence

from attr import dataclass
from django.db import models
from django.contrib import admin
from django.utils.crypto import get_random_string

if TYPE_CHECKING:
    from coreapp.cromper_client import Language

from .profile import Profile

logger = logging.getLogger(__name__)


# FIXME: duplcated in coreapp.serializers due to circular import error
@dataclass(frozen=True)
class Library:
    name: str
    version: str
    def to_json(self):
        return {
            "name": self.name,
            "version": self.version,
        }

def gen_scratch_id() -> str:
    ret = get_random_string(length=5)

    if Scratch.objects.filter(slug=ret).exists():
        return gen_scratch_id()

    return ret


def gen_claim_token() -> str:
    return get_random_string(length=32)


class Asm(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    data = models.TextField()

    def __str__(self) -> str:
        return self.data if len(self.data) < 20 else self.data[:17] + "..."


class Assembly(models.Model):
    hash = models.CharField(max_length=64, primary_key=True)
    time = models.DateTimeField(auto_now_add=True)
    arch = models.CharField(max_length=100)
    source_asm = models.ForeignKey(Asm, on_delete=models.CASCADE, null=True)
    elf_object = models.BinaryField(blank=True)


class AssemblyAdmin(admin.ModelAdmin[Assembly]):
    raw_id_fields = ["source_asm"]


class LibrariesField(models.JSONField):
    def __init__(self, **kwargs: Any):
        class MyEncoder(json.JSONEncoder):
            def default(self, obj: Any) -> Any:
                if isinstance(obj, Library):
                    return {"name": obj.name, "version": obj.version}
                else:
                    return super().default(obj)

        kwargs.pop("encoder", None)
        return super().__init__(encoder=MyEncoder, **kwargs)

    def deconstruct(self) -> tuple[str, str, Sequence[Any], dict[str, Any]]:
        name, path, args, kwargs = super().deconstruct()
        # remove encoder from the generated migrations. If we don't do this,
        # makemigrations generates invalid migrations that try to access the
        # local MyEncoder...
        kwargs.pop("encoder", None)
        return name, path, args, kwargs

    def to_python(self, value: Any) -> list[Library]:
        res = super().to_python(value)
        return [Library(name=lib["name"], version=lib["version"]) for lib in res]

    def from_db_value(self, *args: Any, **kwargs: Any) -> list[Library]:
        res = super().from_db_value(*args, **kwargs)
        if res is None:
            return []
        return [Library(name=lib["name"], version=lib["version"]) for lib in res]


class Scratch(models.Model):
    slug = models.SlugField(primary_key=True, default=gen_scratch_id)
    name = models.CharField(max_length=1024, default="Untitled", blank=False)
    description = models.TextField(max_length=5000, default="", blank=True)
    creation_time = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    compiler = models.CharField(max_length=100)
    platform = models.CharField(max_length=100, blank=True)
    compiler_flags = models.TextField(max_length=1000, default="", blank=True)
    diff_flags = models.JSONField(default=list, blank=True)
    preset = models.ForeignKey(
        "Preset", null=True, blank=True, on_delete=models.SET_NULL
    )
    target_assembly = models.ForeignKey(Assembly, on_delete=models.CASCADE)
    source_code = models.TextField(blank=True)
    context = models.TextField(blank=True)
    diff_label = models.CharField(
        max_length=1024, blank=True
    )  # blank means diff from the start of the file
    score = models.IntegerField(default=-1)
    max_score = models.IntegerField(default=-1)
    match_override = models.BooleanField(default=False)
    libraries = LibrariesField(default=list, blank=True, null=True)
    family = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="family_members",
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )
    owner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL)
    claim_token = models.CharField(
        max_length=64, blank=True, null=True, default=gen_claim_token
    )

    class Meta:
        ordering = ["-creation_time"]
        verbose_name_plural = "Scratches"

    def __str__(self) -> str:
        return self.slug

    # hash for etagging
    def __hash__(self) -> int:
        return hash((self.slug, self.last_updated))

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.family:
            if self.parent and self.parent.family:
                self.family = self.parent.family
            else:
                self.family = self
        super().save(*args, **kwargs)

    def is_claimable(self) -> bool:
        return self.owner is None

    def get_language(self) -> "Language":
        from coreapp.cromper_client import get_cromper_client

        cromper = get_cromper_client()
        compiler = cromper.get_compiler_by_id(self.compiler)

        """
        Strategy for extracting a scratch's language:
        - If the scratch's compiler has a LanguageFlagSet in its flags, attempt to match a language flag against that
        - Otherwise, fallback to the compiler's default language
        """

        # TODO we need a more robust way to do this
        # language_flag_set = next(
        #     iter(
        #         [i for i in compiler.get("flags", []) if isinstance(i, LanguageFlagSet)]
        #     ),
        #     None,
        # )

        # if language_flag_set:
        #     language = next(
        #         iter(
        #             [
        #                 language
        #                 for (flag, language) in language_flag_set.flags.items()
        #                 if flag in self.compiler_flags
        #             ]
        #         ),
        #         None,
        #     )

        #     if language:
        #         return language.value

        # If we're here, either the compiler doesn't have a LanguageFlagSet, or the scratch doesn't
        # have a flag within it.
        # Either way: fall back to the compiler default.
        return compiler.language


class ScratchAdmin(admin.ModelAdmin[Scratch]):
    raw_id_fields = ["owner", "parent", "family"]
    readonly_fields = ["target_assembly"]
