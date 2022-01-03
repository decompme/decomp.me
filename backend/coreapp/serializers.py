from django.core.exceptions import ImproperlyConfigured
from rest_framework import serializers
from rest_framework.relations import HyperlinkedIdentityField
from rest_framework.reverse import reverse
from typing import Any, Optional, TYPE_CHECKING

from .models import Profile, Scratch
from .github import GitHubUser
from .middleware import Request

def serialize_profile(request: Request, profile: Profile, small = False):
    if profile.user is None:
        return {
            "url": None,
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
        if isinstance(value, Scratch):
            return request.build_absolute_uri(f"/scratch/{value.slug}")

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
    owner = TerseProfileField(read_only=True)
    source_code = None
    context = None

    class Meta:
        model = Scratch
        fields = ["url", "html_url", "owner", "last_updated", "creation_time", "platform", "compiler", "name"]
