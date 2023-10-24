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
from .models.project import Project, ProjectFunction, ProjectMember
from .models.scratch import Scratch


def serialize_profile(
    request: Request, profile: Profile, small: bool = False
) -> Dict[str, Any]:
    if profile.user is None:
        return {
            "url": None,
            "html_url": None,
            "is_you": profile == request.profile,  # TODO(#245): remove
            "is_anonymous": True,
            "id": profile.id,
            "is_online": profile.is_online(),
            "is_admin": False,
            "username": f"{profile.pseudonym} (anon)",
            "frog_color": profile.get_frog_color(),
        }
    else:
        user = profile.user

        github: Optional[GitHubUser] = GitHubUser.objects.filter(user=user).first()
        github_details = github.details() if github else None

        small_obj = {
            "url": reverse("user-detail", args=[user.username], request=request),
            "html_url": profile.get_html_url(),
            "is_you": user == request.user,  # TODO(#245): remove
            "is_anonymous": False,
            "id": profile.id,
            "is_online": profile.is_online(),
            "is_admin": user.is_staff,
            "username": user.username,
            "avatar_url": github_details.avatar_url if github_details else None,
        }

        if small:
            return small_obj

        return {
            **small_obj,
            "email": user.email,
            "name": github_details.name if github_details else user.username,
            "github_api_url": github_details.url if github_details else None,
            "github_html_url": github_details.html_url if github_details else None,
        }


if TYPE_CHECKING:
    ProfileFieldBaseClass = serializers.RelatedField[Profile, str, Dict[str, Any]]
else:
    ProfileFieldBaseClass = serializers.RelatedField


class ProfileField(ProfileFieldBaseClass):
    def to_representation(self, profile: Profile) -> Dict[str, Any]:
        return serialize_profile(self.context["request"], profile)


class TerseProfileField(ProfileField):
    def to_representation(self, profile: Profile) -> Dict[str, Any]:
        return serialize_profile(self.context["request"], profile, small=True)


class UrlField(serializers.HyperlinkedIdentityField):
    """
    Read-only field that takes the value returned by the model's get_url method.
    get_url should return a path relative to API_BASE that can be used to retrieve the model from the API.
    """

    def __init__(self, **kwargs: Any):
        kwargs["view_name"] = "__unused__"
        self.target_field = kwargs.pop("target_field", "")
        super().__init__(**kwargs)

    def get_url(
        self, value: Any, view_name: str, request: Any, format: Any
    ) -> Optional[str]:
        if self.target_field:
            value = getattr(value, self.target_field)
        if not value:
            return None
        if hasattr(value, "get_url"):
            return value.get_url()

        raise ImproperlyConfigured("UrlField does not support this type of model")


class HtmlUrlField(UrlField):
    """
    Read-only field that takes the value returned by the model's get_html_url method.
    get_html_url should return a path relative to the frontend that can be used to look at the HTML page for the model.
    """

    def get_url(self, value: Any, view_name: str, request: Any, format: Any) -> str:
        if hasattr(value, "get_html_url"):
            return value.get_html_url()

        raise ImproperlyConfigured("HtmlUrlField does not support this type of model")


class LibrarySerializer(serializers.Serializer[Library]):
    name = serializers.CharField()
    version = serializers.CharField()


class PresetSerializer(serializers.ModelSerializer[Preset]):
    libraries = serializers.ListField(child=LibrarySerializer(), default=list)

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
        ]
        read_only_fields = [
            "creation_time",
            "last_updated",
        ]

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
    target_asm = serializers.CharField(allow_blank=True)
    context = serializers.CharField(allow_blank=True)  # type: ignore
    diff_label = serializers.CharField(allow_blank=True, required=False)
    libraries = serializers.ListField(child=LibrarySerializer(), default=list)

    # ProjectFunction reference
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
            # TODO don't overwrite if already set
            data["platform"] = preset.platform
            data["compiler"] = preset.compiler
            data["compiler_flags"] = preset.compiler_flags
            data["diff_flags"] = preset.diff_flags
            data["libraries"] = preset.libraries
        else:
            if "compiler" not in data:
                raise serializers.ValidationError("compiler is required")

            compiler = compilers.from_id(data["compiler"])

            if "platform" not in data:
                data["platform"] = compiler.platform
            else:
                platform = platforms.from_id(data["platform"])

                if compiler.platform != platform:
                    raise serializers.ValidationError(
                        f"Compiler {compiler.id} is not compatible with platform {platform.id}"
                    )
        return data


class ScratchSerializer(serializers.HyperlinkedModelSerializer):
    slug = serializers.SlugField(read_only=True)
    url = UrlField()
    html_url = HtmlUrlField()
    parent = UrlField(target_field="parent")  # type: ignore
    owner = ProfileField(read_only=True)
    source_code = serializers.CharField(allow_blank=True, trim_whitespace=False)
    context = serializers.CharField(allow_blank=True, trim_whitespace=False)  # type: ignore
    project = serializers.SerializerMethodField()
    project_function = serializers.SerializerMethodField()
    language = serializers.SerializerMethodField()
    libraries = serializers.ListField(child=LibrarySerializer(), default=list)
    # preset = serializers.PrimaryKeyRelatedField(
    #     required=False, queryset=Preset.objects.all()
    # )

    class Meta:
        model = Scratch
        exclude = ["target_assembly"]
        read_only_fields = [
            "url",
            "html_url",
            "parent",
            "owner",
            "last_updated",
            "creation_time",
            "platform",
        ]

    def get_project(self, scratch: Scratch) -> Optional[str]:
        if (
            hasattr(scratch, "project_function")
            and scratch.project_function is not None
        ):
            return reverse(
                "project-detail",
                args=[scratch.project_function.project.slug],
                request=self.context["request"],  # type: ignore
            )
        return None

    def get_project_function(self, scratch: Scratch) -> Optional[str]:
        if (
            hasattr(scratch, "project_function")
            and scratch.project_function is not None
        ):
            return reverse(
                "projectfunction-detail",
                args=[
                    scratch.project_function.project.slug,
                    scratch.project_function.id,
                ],
                request=self.context["request"],  # type: ignore
            )
        return None

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
    owner = TerseProfileField(read_only=True)

    class Meta:
        model = Scratch
        fields = [
            "url",
            "html_url",
            "slug",
            "owner",
            "last_updated",
            "creation_time",
            "platform",
            "compiler",
            "language",
            "name",
            "score",
            "max_score",
            "match_override",
            "project",
            "project_function",
            "parent",
            "preset",
            "libraries",
        ]


class ProjectSerializer(JSONFormSerializer, serializers.ModelSerializer[Project]):
    slug = serializers.SlugField()
    url = UrlField()
    html_url = HtmlUrlField()
    unmatched_function_count = SerializerMethodField()

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

    def get_unmatched_function_count(self, project: Project) -> int:
        return ProjectFunction.objects.filter(
            is_matched_in_repo=False, project=project
        ).count()


class ProjectFunctionSerializer(serializers.ModelSerializer[ProjectFunction]):
    url = SerializerMethodField()
    html_url = HtmlUrlField()
    project = HyperlinkedRelatedField(view_name="project-detail", read_only=True)  # type: ignore
    attempts_count = SerializerMethodField()

    class Meta:
        model = ProjectFunction
        exclude = ["id", "import_config"]
        read_only_fields = ["creation_time"]

    def get_url(self, fn: ProjectFunction) -> str:
        return reverse(
            "projectfunction-detail",
            args=[fn.project.slug, fn.id],
            request=self.context["request"],
        )

    def get_attempts_count(self, fn: ProjectFunction) -> int:
        return Scratch.objects.filter(project_function=fn).count()


class ProjectMemberSerializer(serializers.ModelSerializer[ProjectMember]):
    url = UrlField()
    username = SlugRelatedField(
        source="user",
        slug_field="username",
        queryset=User.objects.all(),
    )

    class Meta:
        model = ProjectMember
        fields = ["url", "username"]
