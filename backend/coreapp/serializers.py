from coreapp.models import CompilerConfiguration, Scratch
from rest_framework import serializers

class CompilerConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompilerConfiguration
        fields = ["id", "shortname", "flags"]

class ScratchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scratch
        fields = ["slug", "compiler_config", "target_asm", "source_code", "parent", "owner"]
