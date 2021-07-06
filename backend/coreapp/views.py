from coreapp.compilerwrapper import CompilerWrapper
from coreapp.serializers import CompilerConfigurationSerializer, ScratchSerializer
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.utils.crypto import get_random_string
import hashlib

from .models import Assembly, Compiler, CompilerConfiguration, Scratch

def index(request):
    return HttpResponse("This is the index page.")

def get_db_asm(request_asm):
    h = hashlib.sha256(request_asm.encode()).hexdigest()

    db_asm = Assembly.objects.filter(hash=h)

    if not db_asm:
        db_asm = Assembly(hash=h, data=request_asm)
        db_asm.save()
    
    return h

# Rest API
@api_view(["GET"])
def compiler_configs(request):
    """
    Get all compiler configurations in a dict {compiler, [configs]}
    """
    compilers = Compiler.objects.all().order_by('name')
    ret = {}

    for compiler in compilers:
        configs = CompilerConfiguration.objects.filter(compiler=compiler)

        ret[compiler.name] = []

        for config in configs:
            ret[compiler.name].append(CompilerConfigurationSerializer(config).data)

    return Response(ret)

@api_view(["GET", "POST"])
def scratch(request, slug=None):
    """
    Get or create a scratch
    """

    if request.method == "GET":
        db_scratch = get_object_or_404(Scratch, slug=slug)

        return Response(ScratchSerializer(db_scratch).data)
    
    elif request.method == "POST":
        data = request.data

        if "target_asm" not in data:
            return Response({"error": "Missing target_asm"}, status=status.HTTP_400_BAD_REQUEST)

        data["slug"] = get_random_string(length=5)
        data["target_asm"] = get_db_asm(data["target_asm"])

        serializer = ScratchSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
def compile(request):
    if "compiler_config" not in request.data or "code" not in request.data:
        return Response({"error": "Missing compiler_config or code"}, status=status.HTTP_400_BAD_REQUEST)
    
    compiler_config = CompilerConfiguration.objects.get(id=request.data["compiler_config"])
    code = request.data["code"]
        
    return Response(CompilerWrapper.compile_code(compiler_config, code))
