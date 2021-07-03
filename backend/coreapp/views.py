from coreapp.serializers import CompilerSerializer
from django.http import HttpResponse

from rest_framework import viewsets

from .models import Compiler

def index(request):
    return HttpResponse("This is the index page.")

class CompilerViewSet(viewsets.ModelViewSet):
    queryset = Compiler.objects.all()
    serializer_class = CompilerSerializer