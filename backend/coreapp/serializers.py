from typing import Any, List, Optional, TYPE_CHECKING

from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from rest_framework import serializers
from rest_framework.fields import SerializerMethodField
from rest_framework.relations import HyperlinkedIdentityField, HyperlinkedRelatedField
from rest_framework.reverse import reverse

from .middleware import Request
from .models.github import GitHubRepo, GitHubUser

from .models.profile import Profile
from .models.project import Project, ProjectFunction
from .models.scratch import Scratch


def serialize_profile(
    request: Request, profile: Profile, small: bool = False
) -> dict[str, Any]:
    if profile.user is None:
        return {
            "url": None,
            "html_url": None,
            "is_you": profile == request.profile,  # TODO(#245): remove
            "is_anonymous": True,
            "id": profile.id,
            "is_online": profile.is_online(),
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
            "id": user.id,
            "is_online": profile.is_online(),
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
    ProfileFieldBaseClass = serializers.RelatedField[Profile, str, str]
else:
    ProfileFieldBaseClass = serializers.RelatedField


class ProfileField(ProfileFieldBaseClass):
    def to_representation(self, profile: Profile) -> str:
        return str(serialize_profile(self.context["request"], profile))


class TerseProfileField(ProfileField):
    def to_representation(self, profile: Profile) -> str:
        return str(serialize_profile(self.context["request"], profile, small=True))


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


class ScratchCreateSerializer(serializers.Serializer[None]):
    name = serializers.CharField(allow_blank=True, required=False)
    compiler = serializers.CharField(allow_blank=True, required=True)
    platform = serializers.CharField(allow_blank=True, required=False)
    compiler_flags = serializers.CharField(allow_blank=True, required=False)
    diff_flags = serializers.JSONField(required=False)
    preset = serializers.CharField(allow_blank=True, required=False)
    source_code = serializers.CharField(allow_blank=True, required=False)
    target_asm = serializers.CharField(allow_blank=True)
    context = serializers.CharField(allow_blank=True)  # type: ignore
    diff_label = serializers.CharField(allow_blank=True, required=False)

    # ProjectFunction reference
    project = serializers.CharField(allow_blank=False, required=False)
    rom_address = serializers.IntegerField(required=False)


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

    # TODO: Unused
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

    # TODO: Unused
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


class TerseScratchSerializer(ScratchSerializer):
    owner = TerseProfileField(read_only=True)

    class Meta:
        model = Scratch
        fields = [
            "url",
            "html_url",
            "owner",
            "last_updated",
            "creation_time",
            "platform",
            "compiler",
            "name",
            "score",
            "max_score",
            "project",
            "project_function",
            "parent",
        ]


class GitHubRepoSerializer(serializers.ModelSerializer[GitHubRepo]):
    html_url = HtmlUrlField()

    class Meta:
        model = GitHubRepo
        exclude = ["id"]
        read_only_fields = ["last_pulled", "is_pulling"]


class ProjectSerializer(serializers.ModelSerializer[Project]):
    slug = serializers.SlugField(read_only=True)
    url = HyperlinkedIdentityField(view_name="project-detail")
    html_url = HtmlUrlField()
    repo = GitHubRepoSerializer(read_only=True)
    members = SerializerMethodField()

    class Meta:
        model = Project
        exclude: List[str] = []
        depth = 1  # repo

    def get_members(self, project: Project) -> list[str]:
        def get_url(user: User) -> str:
            return reverse(
                "user-detail", args=[user.username], request=self.context["request"]
            )

        return [
            get_url(member.profile.user)
            for member in project.members()
            if member.profile.user is not None
        ]


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
