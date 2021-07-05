from rest_framework.generics import get_object_or_404
from coreapp.serializers import CompilerSerializer
from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404

from rest_framework import viewsets

from .models import Compiler, CompilerConfiguration, Scratch

def index(request):
    return HttpResponse("This is the index page.")

def scratch(request, slug=None):
    db_scratch = None
    
    if slug:
        db_scratch = get_object_or_404(Scratch, slug=slug)
    
    compiler_dict = {c : CompilerConfiguration.objects.filter(compiler=c) for c in Compiler.objects.all()}
    source_code = "int add(int a, int b) {\n\treturn a + b;\n}\n"
    target_asm = "/* target asm */"
    compiled_asm = "/* compiled asm */"

    if db_scratch:
        source_code = db_scratch.source_code
        target_asm = db_scratch.target_asm

    context = {
        "compilers": compiler_dict,
        "source_code": source_code,
        "target_asm": target_asm,
        "compiled_asm": compiled_asm,
    }
    return render(request, "coreapp/scratch.html", context=context)

# Rest API
class CompilerViewSet(viewsets.ModelViewSet):
    queryset = Compiler.objects.all()
    serializer_class = CompilerSerializer
