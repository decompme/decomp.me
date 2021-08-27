from coreapp.models import Profile, Scratch
from rest_framework import serializers

class ProfileSerializer(serializers.ModelSerializer[Profile]):
    class Meta:
        model = Profile
        fields = ["id", "username", "name", "avatar_url"]


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
        fields = ["slug", "compiler", "cc_opts", "target_assembly", "source_code", "context", "parent"]

    def create(self, validated_data):
        scratch = Scratch.objects.create(**validated_data)

        if scratch.context:
            scratch.original_context = scratch.context

        return scratch
