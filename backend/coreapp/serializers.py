from typing import TYPE_CHECKING, Any

from django.contrib.auth.models import User
from html_json_forms.serializers import JSONFormSerializer
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework.relations import PKOnlyObject, SlugRelatedField

from coreapp import platforms

from . import compilers
from .libraries import Library
from .models.best_fork import BestFork
from .models.github import GitHubUser
from .models.preset import Preset
from .models.profile import Profile
from .models.project import Project, ProjectMember
from .models.scratch import Context, Scratch


def serialize_profile(profile: Profile, num_scratches: bool = False) -> dict[str, Any]:
    if profile.user is None:
        return {
            "is_anonymous": True,
            "is_ephemeral": profile.id is None,
            "id": profile.id,
            "is_online": profile.is_online(),
            "is_admin": False,
            "username": f"{profile.pseudonym} (anon)",
            "frog_color": profile.get_frog_color() if profile.id else (0, 0.5, 0.5),
        }
    else:
        user = profile.user

        gh_user: GitHubUser | None = getattr(user, "github", None)
        if not gh_user:
            # NOTE: All models with an "owner" should fetch related "owner__user__github"
            # in order to avoid N+1 queries when a Profile is serialized for each object.
            gh_user = GitHubUser.objects.filter(user=user).first()

        res = {
            "is_anonymous": False,
            "id": profile.id,
            "is_online": profile.is_online(),
            "is_admin": user.is_staff,
            "username": user.username,
            "github_id": gh_user.github_id if gh_user else None,
        }

        if num_scratches:
            res["num_scratches"] = Scratch.objects.filter(owner__user=user).count()
            res["num_presets"] = Preset.objects.filter(owner__user=user).count()

        return res


if TYPE_CHECKING:
    ProfileFieldBaseClass = serializers.RelatedField[Profile, str, dict[str, Any]]
else:
    ProfileFieldBaseClass = serializers.RelatedField


class ProfileField(ProfileFieldBaseClass):
    def to_representation(self, value: Profile | PKOnlyObject) -> dict[str, Any]:
        if isinstance(value, Profile):
            return serialize_profile(value)
        # fallback
        return super().to_representation(value)


class LibrarySerializer(serializers.Serializer[Library]):
    name = serializers.CharField()
    version = serializers.CharField()


class DiffFlagsField(serializers.ListField):
    child = serializers.CharField(allow_blank=True)

    def to_internal_value(self, data: Any) -> list[str]:
        flags = super().to_internal_value(data)
        return [flag for flag in flags if flag]


class TinyPresetSerializer(serializers.ModelSerializer[Preset]):
    class Meta:
        model = Preset
        fields = ["id", "name"]


class PresetSerializer(serializers.ModelSerializer[Preset]):
    libraries = serializers.ListField(child=LibrarySerializer(), default=list)
    diff_flags = DiffFlagsField(required=False)
    num_scratches = serializers.SerializerMethodField()
    owner = ProfileField(read_only=True)

    class Meta:
        model = Preset
        fields = [
            "id",
            "name",
            "platform",
            "compiler",
            "assembler_flags",
            "compiler_flags",
            "diff_flags",
            "decompiler_flags",
            "libraries",
            "num_scratches",
            "owner",
        ]
        read_only_fields = [
            "creation_time",
            "last_updated",
            "owner",
        ]

    def get_num_scratches(self, preset: Preset) -> int:
        annotated_count = getattr(preset, "num_scratches", None)
        if annotated_count is not None:
            return int(annotated_count)
        return Scratch.objects.filter(preset=preset).count()

    def validate_platform(self, platform: str) -> str:
        try:
            platforms.from_id(platform)
        except Exception:
            raise serializers.ValidationError(f"Unknown platform: {platform}")
        return platform

    def validate_compiler(self, compiler: str) -> str:
        try:
            compilers.from_id(compiler)
        except Exception:
            raise serializers.ValidationError(f"Unknown compiler: {compiler}")
        return compiler

    def validate(self, data: dict[str, Any]) -> dict[str, Any]:
        if self.instance is not None:
            invalid_fields = set(data) - {"compiler_flags"}
            if invalid_fields:
                raise serializers.ValidationError(
                    "Only compiler_flags can be edited on an existing preset."
                )

        compiler_id = data.get("compiler")
        platform_id = data.get("platform")

        if compiler_id is None and self.instance is not None:
            compiler_id = self.instance.compiler
        if platform_id is None and self.instance is not None:
            platform_id = self.instance.platform
        if not isinstance(compiler_id, str) or not isinstance(platform_id, str):
            raise serializers.ValidationError("Compiler and platform are required.")

        compiler = compilers.from_id(compiler_id)
        platform = platforms.from_id(platform_id)

        if compiler.platform != platform:
            raise serializers.ValidationError(
                f"Compiler {compiler.id} is not compatible with platform {platform.id}"
            )
        return data


class ScratchCreateSerializer(serializers.Serializer[None]):
    name = serializers.CharField(allow_blank=True, required=False)
    compiler = serializers.CharField(allow_blank=True, required=False)
    platform = serializers.CharField(allow_blank=True, required=False)
    compiler_flags = serializers.CharField(allow_blank=True, required=False)
    diff_flags = DiffFlagsField(required=False)
    preset = serializers.PrimaryKeyRelatedField(
        required=False, queryset=Preset.objects.all()
    )
    source_code = serializers.CharField(allow_blank=True, required=False)
    target_asm = serializers.CharField(allow_blank=True, required=False)
    target_obj = serializers.FileField(allow_null=True, required=False)
    context = serializers.CharField(
        allow_blank=True,
        default="",
        required=False,
    )  # type: ignore
    diff_label = serializers.CharField(allow_blank=True, required=False)
    libraries = serializers.JSONField(default=list)  # type: ignore

    project = serializers.CharField(allow_blank=False, required=False)
    rom_address = serializers.IntegerField(required=False)

    def validate_platform(self, platform: str) -> str:
        try:
            platforms.from_id(platform)
        except Exception:
            raise serializers.ValidationError(f"Unknown platform: {platform}")
        return platform

    def validate_compiler(self, compiler: str) -> str:
        try:
            compilers.from_id(compiler)
        except Exception:
            raise serializers.ValidationError(f"Unknown compiler: {compiler}")
        return compiler

    def validate_libraries(
        self, libraries: list[dict[str, str]]
    ) -> list[dict[str, str]]:
        for library in libraries:
            for key in ["name", "version"]:
                if key not in library:
                    raise serializers.ValidationError(
                        f"Library {library} is missing '{key}' key"
                    )
        return libraries

    def validate(self, data: dict[str, Any]) -> dict[str, Any]:
        if "preset" in data:
            preset: Preset = data["preset"]
            # Preset dictates platform and compiler.
            data["platform"] = platforms.from_id(preset.platform)
            data["compiler"] = preset.compiler

            if "compiler_flags" not in data or not data["compiler_flags"]:
                data["compiler_flags"] = preset.compiler_flags

            if "diff_flags" not in data or not data["diff_flags"]:
                data["diff_flags"] = preset.diff_flags

            if "libraries" not in data or not data["libraries"]:
                data["libraries"] = preset.libraries
        else:
            if "compiler" not in data or not data["compiler"]:
                raise serializers.ValidationError(
                    "Compiler must be provided when preset is omitted"
                )

            try:
                compiler = compilers.from_id(data["compiler"])
            except APIException:
                raise serializers.ValidationError(
                    f"Unknown compiler: {data['compiler']}"
                )

            if "platform" not in data or not data["platform"]:
                data["platform"] = compiler.platform
            else:
                try:
                    platform = platforms.from_id(data["platform"])
                except APIException:
                    raise serializers.ValidationError(
                        f"Unknown platform: {data['platform']}"
                    )

                if compiler.platform != platform:
                    raise serializers.ValidationError(
                        f"Compiler {compiler.id} is not compatible with platform {platform.id}"
                    )
                data["platform"] = platform
        return data


class ScratchCompileSerializer(serializers.Serializer[None]):
    compiler = serializers.CharField(required=False)
    compiler_flags = serializers.CharField(allow_blank=True, required=False)
    diff_flags = DiffFlagsField(required=False)
    diff_label = serializers.CharField(allow_blank=True, required=False)
    source_code = serializers.CharField(
        allow_blank=True, required=False, trim_whitespace=False
    )
    context = serializers.CharField(
        allow_blank=True, required=False, trim_whitespace=False
    )  # type: ignore[assignment]
    libraries = serializers.ListField(child=LibrarySerializer(), required=False)
    include_objects = serializers.BooleanField(default=False, required=False)

    def validate_compiler(self, compiler: str) -> str:
        try:
            compilers.from_id(compiler)
        except Exception:
            raise serializers.ValidationError(f"Unknown compiler: {compiler}")
        return compiler

    def validate(self, data: dict[str, Any]) -> dict[str, Any]:
        scratch = self._context.get("scratch")
        compiler_id = data.get("compiler")
        if scratch is None or compiler_id is None:
            return data

        compiler = compilers.from_id(compiler_id)
        platform = platforms.from_id(scratch.platform)
        if compiler.platform != platform:
            raise serializers.ValidationError(
                f"Compiler {compiler.id} is not compatible with platform {platform.id}"
            )
        return data


class ScratchDecompileSerializer(serializers.Serializer[None]):
    compiler = serializers.CharField(required=False)
    context = serializers.CharField(allow_blank=True, required=False)  # type: ignore[assignment]

    def validate_compiler(self, compiler: str) -> str:
        try:
            compilers.from_id(compiler)
        except Exception:
            raise serializers.ValidationError(f"Unknown compiler: {compiler}")
        return compiler

    def validate(self, data: dict[str, Any]) -> dict[str, Any]:
        scratch = self._context.get("scratch")
        compiler_id = data.get("compiler")
        if scratch is None or compiler_id is None:
            return data

        compiler = compilers.from_id(compiler_id)
        platform = platforms.from_id(scratch.platform)
        if compiler.platform != platform:
            raise serializers.ValidationError(
                f"Compiler {compiler.id} is not compatible with platform {platform.id}"
            )
        return data


class ScratchSerializer(serializers.ModelSerializer[Scratch]):
    slug = serializers.SlugField(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(read_only=True)  # type: ignore
    owner = ProfileField(read_only=True)
    source_code = serializers.CharField(allow_blank=True, trim_whitespace=False)
    context = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )  # type: ignore[assignment]
    context_text = serializers.SerializerMethodField(read_only=True)
    language = serializers.SerializerMethodField()
    libraries = serializers.ListField(child=LibrarySerializer(), default=list)
    diff_flags = DiffFlagsField(required=False)
    preset = serializers.PrimaryKeyRelatedField(
        required=False, allow_null=True, queryset=Preset.objects.all()
    )

    class Meta:
        model = Scratch
        exclude = [
            "target_assembly",
            "context_fk",
        ]
        read_only_fields = [
            "parent",
            "owner",
            "last_updated",
            "creation_time",
            "platform",
            "context_fk",
            "family",
            "score",
            "max_score",
        ]

    def get_context_text(self, instance: Scratch) -> str:
        return instance.context_fk.text if instance.context_fk else ""

    def to_representation(self, instance: Scratch) -> dict[str, Any]:
        data = super().to_representation(instance)
        if "context_text" in data:
            data["context"] = data.pop("context_text")
        return data

    def create(self, validated_data: dict[str, Any]) -> Scratch:
        context_text = validated_data.pop("context", "")
        validated_data["context_fk"] = Context.get_or_create_from_text(context_text)
        return super().create(validated_data)

    def update(self, instance: Scratch, validated_data: dict[str, Any]) -> Scratch:
        if "context" in validated_data:
            context_text = validated_data.pop("context", "")
            instance.context_fk = Context.get_or_create_from_text(context_text)
        return super().update(instance, validated_data)

    def validate_compiler(self, compiler: str) -> str:
        try:
            compilers.from_id(compiler)
        except Exception:
            raise serializers.ValidationError(f"Unknown compiler: {compiler}")
        return compiler

    def validate(self, data: dict[str, Any]) -> dict[str, Any]:
        compiler_id = data.get("compiler")
        if compiler_id is None:
            return data

        compiler = compilers.from_id(compiler_id)
        platform_id = self.instance.platform if self.instance else data.get("platform")
        if platform_id is None:
            return data

        platform = platforms.from_id(platform_id)
        if compiler.platform != platform:
            raise serializers.ValidationError(
                f"Compiler {compiler.id} is not compatible with platform {platform.id}"
            )
        return data

    def get_language(self, scratch: Scratch) -> str:
        """
        Strategy for extracting a scratch's language:
        - If the scratch's compiler has a LanguageFlagSet in its flags, attempt to match a language flag against that
        - Otherwise, fallback to the compiler's default language
        """
        compiler = compilers.from_id(scratch.compiler)
        return compiler.get_language(scratch.compiler_flags).get_display_name()


class TerseScratchSerializer(ScratchSerializer):
    owner = ProfileField(read_only=True)
    best_fork = serializers.SerializerMethodField()

    class Meta:
        model = Scratch
        fields = [
            "slug",
            "owner",
            "last_updated",
            "creation_time",
            "platform",
            "compiler",
            "preset",
            "name",
            "score",
            "max_score",
            "match_override",
            "parent",
            "preset",
            "libraries",
            "best_fork",
        ]

    def get_best_fork(self, scratch: Scratch) -> dict[str, Any] | None:
        try:
            best_fork: BestFork = scratch.best_fork
        except BestFork.DoesNotExist:
            return None

        fork = best_fork.fork
        return {
            "slug": fork.slug,
            "owner": serialize_profile(fork.owner) if fork.owner else None,
            "score": best_fork.score,
            "max_score": best_fork.max_score,
            "is_match": best_fork.is_match,
            "updated_at": best_fork.updated_at,
        }


# On initial creation, include the "claim_token" field.
class ClaimableScratchSerializer(ScratchSerializer):
    claim_token = serializers.CharField(read_only=True)

    def to_representation(self, instance: Scratch) -> dict[str, Any]:
        data = super().to_representation(instance)
        data["claim_token"] = instance.claim_token
        return data


class ProjectSerializer(JSONFormSerializer, serializers.ModelSerializer[Project]):
    slug = serializers.SlugField()

    class Meta:
        model = Project
        exclude: list[str] = []

    def create(self, validated_data: Any) -> Project:
        project = Project.objects.create(**validated_data)
        return project

    def update(self, instance: Project, validated_data: Any) -> Project:
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ProjectMemberSerializer(serializers.ModelSerializer[ProjectMember]):
    username = SlugRelatedField(
        source="user",
        slug_field="username",
        queryset=User.objects.all(),
    )

    class Meta:
        model = ProjectMember
        fields = ["username"]
