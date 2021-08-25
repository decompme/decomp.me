from coreapp.models import Scratch
from rest_framework import serializers

class ScratchCreateSerializer(serializers.Serializer):
    compiler = serializers.CharField(required=False)
    compile_command = serializers.CharField(required=False)
    source_code = serializers.CharField(required=False)
    arch = serializers.CharField(required=False)
    target_asm = serializers.CharField()
    context = serializers.CharField()


class ScratchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scratch
        fields = ["slug", "compiler", "cc_opts", "target_assembly", "source_code", "context", "parent"]

    def create(self, validated_data):
        scratch = Scratch.objects.create(**validated_data)

        if scratch.context:
            scratch.original_context = scratch.context

        return scratch
