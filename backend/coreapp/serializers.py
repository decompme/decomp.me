from rest_framework import serializers
from rest_framework.reverse import reverse
from typing import Optional, TYPE_CHECKING

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

        small_obj = {
            "url": reverse("user-detail", args=[user.username], request=request),
            "is_you": user == request.user, # TODO(#245): remove
            "is_anonymous": False,
            "id": user.id,
            "username": user.username,
        }

        if small:
            return small_obj

        github: Optional[GitHubUser] = GitHubUser.objects.filter(user=user).first()
        github_details = github.details() if github else None

        return {
            **small_obj,
            "email": user.email,
            "name": github_details.name if github_details else user.username,
            "avatar_url": github_details.avatar_url if github_details else None,
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

class ScratchCreateSerializer(serializers.Serializer[None]):
    name = serializers.CharField(allow_blank=True, required=False)
    compiler = serializers.CharField(allow_blank=True, required=True)
    platform = serializers.CharField(allow_blank=True, required=False)
    compiler_flags = serializers.CharField(allow_blank=True, required=False)
    source_code = serializers.CharField(allow_blank=True, required=False)
    target_asm = serializers.CharField(allow_blank=True)
    # TODO: `context` should be renamed; it conflicts with Field.context
    context = serializers.CharField(allow_blank=True) # type: ignore
    diff_label = serializers.CharField(allow_blank=True, required=False)

class ScratchSerializer(serializers.ModelSerializer[Scratch]):
    url = serializers.HyperlinkedIdentityField(view_name="scratch-detail")
    owner = ProfileField(read_only=True)
    parent = serializers.HyperlinkedRelatedField( # type: ignore
        read_only=True,
        view_name="scratch-detail",
        lookup_field="slug",
    )

    class Meta:
        model = Scratch
        exclude = []
        read_only_fields = ["slug", "parent", "owner"]
