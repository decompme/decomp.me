from coreapp.models import CompilerConfiguration, Scratch
from rest_framework import serializers

class CompilerConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompilerConfiguration
        fields = "__all__"

class ScratchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scratch
        fields = ["slug", "compiler_config", "target_assembly", "source_code", "context", "parent"]
