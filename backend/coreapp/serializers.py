from coreapp.models import CompilerConfiguration
from rest_framework import serializers

class CompilerConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompilerConfiguration
        fields = ["id", "shortname", "flags"]
