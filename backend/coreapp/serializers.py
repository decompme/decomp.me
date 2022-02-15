from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from rest_framework import serializers
from rest_framework.fields import SerializerMethodField
from rest_framework.relations import HyperlinkedIdentityField, HyperlinkedRelatedField
from rest_framework.reverse import reverse
from typing import Any, List, Optional, TYPE_CHECKING

from .models import Profile, ProjectFunction, Scratch, Project
from .github import GitHubUser, GitHubRepo
from .middleware import Request

def serialize_profile(request: Request, profile: Profile, small = False):
    if profile.user is None:
        return {
            "url": None,
            "html_url": None,
            "is_you": profile == request.profile, # TODO(#245): remove
            "is_anonymous": True,
            "id": profile.id,
        }
    else:
        user = profile.user

        github: Optional[GitHubUser] = GitHubUser.objects.filter(user=user).first()
        github_details = github.details() if github else None

        small_obj = {
            "url": reverse("user-detail", args=[user.username], request=request),
            "html_url": profile.get_html_url(),
            "is_you": user == request.user, # TODO(#245): remove
            "is_anonymous": False,
            "id": user.id,
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
    def to_representation(self, profile: Profile):
        return serialize_profile(self.context["request"], profile)

class TerseProfileField(ProfileFieldBaseClass):
    def to_representation(self, profile: Profile):
        return serialize_profile(self.context["request"], profile, small=True)

class HtmlUrlField(serializers.HyperlinkedIdentityField):
    """
    A read-only field that represents the frontend identity URL for the object, itself.
    """

    def __init__(self, **kwargs: Any):
        kwargs["view_name"] = "__unused__"
        super().__init__(**kwargs)

    def get_url(self, value, view_name, request, format):
        if hasattr(value, "get_html_url"):
            return value.get_html_url()

        raise ImproperlyConfigured("HtmlUrlField does not support this type of model")

class ScratchCreateSerializer(serializers.Serializer[None]):
    name = serializers.CharField(allow_blank=True, required=False)
    compiler = serializers.CharField(allow_blank=True, required=True)
    platform = serializers.CharField(allow_blank=True, required=False)
    compiler_flags = serializers.CharField(allow_blank=True, required=False)
    source_code = serializers.CharField(allow_blank=True, required=False)
    target_asm = serializers.CharField(allow_blank=True)
    context = serializers.CharField(allow_blank=True) # type: ignore
    diff_label = serializers.CharField(allow_blank=True, required=False)

    # ProjectFunction reference
    project = serializers.CharField(allow_blank=False, required=False)
    rom_address = serializers.IntegerField(required=False)

class ScratchSerializer(serializers.HyperlinkedModelSerializer):
    slug = serializers.SlugField(read_only=True)
    html_url = HtmlUrlField()
    owner = ProfileField(read_only=True)
    source_code = serializers.CharField(allow_blank=True, trim_whitespace=False)
    context = serializers.CharField(allow_blank=True, trim_whitespace=False) # type: ignore
    project = serializers.SerializerMethodField()
    project_function = serializers.SerializerMethodField()

    class Meta:
        model = Scratch
        exclude = ["target_assembly"]
        read_only_fields = ["url", "html_url", "parent", "owner", "last_updated", "creation_time", "platform"]

    def get_project(self, scratch: Scratch):
        if hasattr(scratch, "project_function") and scratch.project_function is not None:
            return reverse("project-detail", args=[scratch.project_function.project.slug], request=self.context["request"]) # type: ignore

    def get_project_function(self, scratch: Scratch):
        if hasattr(scratch, "project_function") and scratch.project_function is not None:
            return reverse("projectfunction-detail", args=[scratch.project_function.project.slug, scratch.project_function.id], request=self.context["request"]) # type: ignore

class TerseScratchSerializer(ScratchSerializer):
    owner = TerseProfileField(read_only=True) # type: ignore

    class Meta:
        model = Scratch
        fields = ["url", "html_url", "owner", "last_updated", "creation_time", "platform", "compiler", "name", "score", "max_score", "project", "project_function"]

class GitHubRepoSerializer(serializers.ModelSerializer[GitHubRepo]):
    html_url = HtmlUrlField()

    class Meta:
        model = GitHubRepo
        exclude = ["id"]
        read_only_fields = ["last_pulled", "is_pulling"]

class ProjectSerializer(serializers.ModelSerializer[Project]):
    url = HyperlinkedIdentityField(view_name="project-detail")
    html_url = HtmlUrlField()
    repo = GitHubRepoSerializer()
    members = SerializerMethodField()

    class Meta:
        model = Project
        exclude: List[str] = []
        depth = 1 # repo

    def get_members(self, project: Project):
        def get_url(user: User):
            return reverse("user-detail", args=[user.username], request=self.context["request"])

        return [get_url(member.profile.user) for member in project.members() if member.profile.user is not None]

class ProjectFunctionSerializer(serializers.ModelSerializer[ProjectFunction]):
    url = SerializerMethodField()
    html_url = HtmlUrlField()
    project = HyperlinkedRelatedField(view_name="project-detail", read_only=True) # type: ignore
    attempts_count = SerializerMethodField()

    class Meta:
        model = ProjectFunction
        exclude = ["id", "import_config"]
        read_only_fields = ["creation_time"]

    def get_url(self, fn: ProjectFunction):
        return reverse("projectfunction-detail", args=[fn.project.slug, fn.id], request=self.context["request"])

    def get_attempts_count(self, fn: ProjectFunction):
        return Scratch.objects.filter(project_function=fn).count()
