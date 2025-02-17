from typing import TYPE_CHECKING, Any, Dict, List, Optional

from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from html_json_forms.serializers import JSONFormSerializer
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework.fields import SerializerMethodField
from rest_framework.relations import HyperlinkedRelatedField, SlugRelatedField
from rest_framework.reverse import reverse

from coreapp import platforms

from . import compilers
from .flags import LanguageFlagSet
from .libraries import Library
from .middleware import Request
from .models.github import GitHubUser
from .models.preset import Preset
from .models.profile import Profile
from .models.project import Project, ProjectMember
from .models.scratch import Scratch


def serialize_profile(profile: Profile) -> Dict[str, Any]:
    if profile.user is None:
        return {
            "is_anonymous": True,
            "id": profile.id,
            "is_online": profile.is_online(),
            "is_admin": False,
            "username": f"{profile.pseudonym} (anon)",
            "frog_color": profile.get_frog_color(),
        }
    else:
        user = profile.user

        gh_user: Optional[GitHubUser] = GitHubUser.objects.filter(user=user).first()

        return {
            "is_anonymous": False,
            "id": profile.id,
            "is_online": profile.is_online(),
            "is_admin": user.is_staff,
            "username": user.username,
            "github_id": gh_user.github_id if gh_user else None,
        }


if TYPE_CHECKING:
    ProfileFieldBaseClass = serializers.RelatedField[Profile, str, Dict[str, Any]]
else:
    ProfileFieldBaseClass = serializers.RelatedField


class ProfileField(ProfileFieldBaseClass):
    def to_representation(self, profile: Profile) -> Dict[str, Any]:
        return serialize_profile(profile)


class LibrarySerializer(serializers.Serializer[Library]):
    name = serializers.CharField()
    version = serializers.CharField()


class PresetSerializer(serializers.ModelSerializer[Preset]):
    libraries = serializers.ListField(child=LibrarySerializer(), default=list)
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
        return Scratch.objects.filter(preset=preset).count()

    def validate_platform(self, platform: str) -> str:
        try:
            platforms.from_id(platform)
        except:
            raise serializers.ValidationError(f"Unknown platform: {platform}")
        return platform

    def validate_compiler(self, compiler: str) -> str:
        try:
            compilers.from_id(compiler)
        except:
            raise serializers.ValidationError(f"Unknown compiler: {compiler}")
        return compiler

    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        compiler = compilers.from_id(data["compiler"])
        platform = platforms.from_id(data["platform"])

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
    diff_flags = serializers.JSONField(required=False)
    preset = serializers.PrimaryKeyRelatedField(
        required=False, queryset=Preset.objects.all()
    )
    source_code = serializers.CharField(allow_blank=True, required=False)
    target_asm = serializers.CharField(allow_blank=True, required=False)
    target_obj = serializers.FileField(allow_null=True, required=False)
    context = serializers.CharField(allow_blank=True)  # type: ignore
    diff_label = serializers.CharField(allow_blank=True, required=False)
    libraries = serializers.ListField(child=LibrarySerializer(), default=list)

    project = serializers.CharField(allow_blank=False, required=False)
    rom_address = serializers.IntegerField(required=False)

    def validate_platform(self, platform: str) -> str:
        try:
            platforms.from_id(platform)
        except:
            raise serializers.ValidationError(f"Unknown platform: {platform}")
        return platform

    def validate_compiler(self, compiler: str) -> str:
        try:
            compilers.from_id(compiler)
        except:
            raise serializers.ValidationError(f"Unknown compiler: {compiler}")
        return compiler

    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if "preset" in data:
            preset: Preset = data["preset"]
            # Preset dictates platform
            data["platform"] = platforms.from_id(preset.platform)

            if "compiler" not in data or not data["compiler"]:
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


class ScratchSerializer(serializers.ModelSerializer[Scratch]):
    slug = serializers.SlugField(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(read_only=True)  # type: ignore
    owner = ProfileField(read_only=True)
    source_code = serializers.CharField(allow_blank=True, trim_whitespace=False)
    context = serializers.CharField(allow_blank=True, trim_whitespace=False)  # type: ignore
    language = serializers.SerializerMethodField()
    libraries = serializers.ListField(child=LibrarySerializer(), default=list)
    preset = serializers.PrimaryKeyRelatedField(
        required=False, allow_null=True, queryset=Preset.objects.all()
    )
    target_assembly_source_asm = serializers.CharField(
        source="target_assembly.source_asm.data", read_only=True
    )

    class Meta:
        model = Scratch
        exclude = [
            "claim_token",
            "target_assembly",
        ]
        read_only_fields = [
            "parent",
            "owner",
            "last_updated",
            "creation_time",
            "platform",
        ]

    def get_language(self, scratch: Scratch) -> Optional[str]:
        """
        Strategy for extracting a scratch's language:
        - If the scratch's compiler has a LanguageFlagSet in its flags, attempt to match a language flag against that
        - Otherwise, fallback to the compiler's default language
        """
        compiler = compilers.from_id(scratch.compiler)
        language_flag_set = next(
            iter([i for i in compiler.flags if isinstance(i, LanguageFlagSet)]),
            None,
        )

        if language_flag_set:
            language = next(
                iter(
                    [
                        language
                        for (flag, language) in language_flag_set.flags.items()
                        if flag in scratch.compiler_flags
                    ]
                ),
                None,
            )

            if language:
                return language.value

        # If we're here, either the compiler doesn't have a LanguageFlagSet, or the scratch doesn't
        # have a flag within it.
        # Either way: fall back to the compiler default.
        return compiler.language.value


class TerseScratchSerializer(ScratchSerializer):
    owner = ProfileField(read_only=True)

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
        ]


# On initial creation, include the "claim_token" field.
class ClaimableScratchSerializer(ScratchSerializer):
    claim_token = serializers.CharField(read_only=True)

    class Meta(ScratchSerializer.Meta):
        exclude = [
            field for field in ScratchSerializer.Meta.exclude if field != "claim_token"
        ]


class ProjectSerializer(JSONFormSerializer, serializers.ModelSerializer[Project]):
    slug = serializers.SlugField()

    class Meta:
        model = Project
        exclude: List[str] = []

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
