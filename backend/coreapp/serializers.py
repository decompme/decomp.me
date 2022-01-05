from django.core.exceptions import ImproperlyConfigured
from rest_framework import serializers
from rest_framework.fields import SerializerMethodField
from rest_framework.relations import HyperlinkedIdentityField, HyperlinkedRelatedField
from rest_framework.reverse import reverse
from typing import Any, Optional, TYPE_CHECKING

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

class ScratchSerializer(serializers.HyperlinkedModelSerializer):
    slug = serializers.SlugField(read_only=True)
    html_url = HtmlUrlField()
    owner = ProfileField(read_only=True)
    source_code = serializers.CharField(allow_blank=True, trim_whitespace=False)
    context = serializers.CharField(allow_blank=True, trim_whitespace=False) # type: ignore

    class Meta:
        model = Scratch
        exclude = ["target_assembly"]
        read_only_fields = ["url", "html_url", "parent", "owner", "last_updated", "creation_time", "platform"]

class TerseScratchSerializer(ScratchSerializer):
    owner = TerseProfileField(read_only=True) # type: ignore
    source_code = None # type: ignore
    context = None # type: ignore

    class Meta:
        model = Scratch
        fields = ["url", "html_url", "owner", "last_updated", "creation_time", "platform", "compiler", "name", "max_score"]

class GitHubRepoSerializer(serializers.ModelSerializer):
    html_url = HtmlUrlField()
    maintainers = SerializerMethodField()

    class Meta:
        model = GitHubRepo
        exclude = ["id", "gh_user"]
        read_only_fields = ["last_pulled", "is_pulling"]

    def get_maintainers(self, repo: GitHubRepo):
        def get_url(user):
            return reverse("user-detail", args=[user.username], request=self.context["request"])

        return [get_url(gh_user.user) for gh_user in repo.maintainers()]

class ProjectSerializer(serializers.ModelSerializer):
    url = HyperlinkedIdentityField(view_name="project-detail")
    html_url = HtmlUrlField()
    repo = GitHubRepoSerializer()

    class Meta:
        model = Project
        exclude = []
        depth = 1 # repo

class ProjectFunctionSerializer(serializers.ModelSerializer):
    scratch = TerseScratchSerializer()

    class Meta:
        model = ProjectFunction
        exclude = ["project"]
        read_only_fields = ["creation_time"]
