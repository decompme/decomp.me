from rest_framework.generics import get_object_or_404
from backend.coreapp.decompiler_wrapper import DecompilerWrapper
from coreapp.models import Scratch
from django.utils.timezone import now
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

class Decompile(APIView):
    def post(self, request: Request, slug: str):
        scratch = get_object_or_404(Scratch, slug=slug)
        context = request.data.get("context", "")
        compiler = request.data.get("compiler", scratch.compiler)

        decompilation = DecompilerWrapper.decompile("", scratch.platform, scratch.target_assembly.source_asm, context, compiler)
        return Response({"decompilation": decompilation})
