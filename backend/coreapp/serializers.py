from coreapp.models import Compiler
from rest_framework import serializers

class CompilerSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Compiler
        fields = ["shortname", "name"]