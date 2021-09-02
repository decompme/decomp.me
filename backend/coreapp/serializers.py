from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.request import Request
from typing import Union, Optional

from .models import Profile, Scratch
from .github import GitHubUser

def serialize_user(request: Request, user: Union[User, Profile]):
    if isinstance(user, Profile):
        user: User = user.user

    github: Optional[GitHubUser] = None
    try:
        github = user.github
    except User.github.RelatedObjectDoesNotExist:
        pass
    except AttributeError:
        pass

    if user.is_anonymous:
        return {
            "is_you": user == request.user,
            "is_anonymous": True,
            "id": user.id,
        }
    else:
        return {
            "is_you": user == request.user,
            "is_anonymous": False,
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "name": github.details().name if github else user.username,
            "avatar_url": github.details().avatar_url if github else None,
            "github_api_url": github.details().url if github else None,
            "github_html_url": github.details().html_url if github else None,
        }

class UserField(serializers.RelatedField):
    def to_representation(self, user: Union[User, Profile]):
        return serialize_user(self.context["request"], user)

class ScratchCreateSerializer(serializers.Serializer[None]):
    compiler = serializers.CharField(allow_blank=True, required=False)
    compiler_flags = serializers.CharField(allow_blank=True, required=False)
    source_code = serializers.CharField(allow_blank=True, required=False)
    arch = serializers.CharField(allow_blank=True, required=False)
    target_asm = serializers.CharField(allow_blank=True)
    # TODO: `context` should be renamed; it conflicts with Field.context
    context = serializers.CharField(allow_blank=True) # type: ignore

class ScratchSerializer(serializers.ModelSerializer[Scratch]):
    class Meta:
        model = Scratch
        fields = ["slug", "compiler", "cc_opts", "target_assembly", "source_code", "context"]

    def create(self, validated_data):
        scratch = Scratch.objects.create(**validated_data)

        if scratch.context:
            scratch.original_context = scratch.context

        return scratch

# XXX: ideally we would just use ScratchSerializer, but adding owner and parent breaks creation
class ScratchWithMetadataSerializer(serializers.ModelSerializer[Scratch]):
    owner = UserField(read_only=True)
    parent = serializers.HyperlinkedRelatedField(
        read_only=True,
        view_name="scratch-detail",
        lookup_field="slug",
    )

    class Meta:
        model = Scratch
        fields = ["slug", "compiler", "cc_opts", "source_code", "context", "owner", "parent"]
