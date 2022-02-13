from rest_framework.exceptions import APIException
from coreapp.error import CompilationError, DiffError
from coreapp.asm_diff_wrapper import AsmDifferWrapper
from coreapp.compiler_wrapper import CompilationResult, CompilerWrapper, DiffResult
from coreapp.decompiler_wrapper import DecompilerWrapper
from django.http import HttpResponse, QueryDict
from rest_framework import serializers, status, mixins, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import GenericViewSet
from rest_framework.routers import DefaultRouter
from rest_framework.pagination import CursorPagination

import django_filters

import hashlib
import io
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional, Tuple
import zipfile
import re

from ..models import Asm, Scratch
from ..middleware import Request
from ..decorators.django import condition
from ..serializers import TerseScratchSerializer, ScratchCreateSerializer, ScratchSerializer

logger = logging.getLogger(__name__)

def get_db_asm(request_asm) -> Asm:
    h = hashlib.sha256(request_asm.encode()).hexdigest()
    asm, _ = Asm.objects.get_or_create(hash=h, defaults={
        "data": request_asm,
    })
    return asm

def compile_scratch(scratch: Scratch) -> CompilationResult:
    return CompilerWrapper.compile_code(scratch.compiler, scratch.compiler_flags, scratch.source_code, scratch.context)

def diff_compilation(scratch: Scratch, compilation: CompilationResult) -> DiffResult:
    return AsmDifferWrapper.diff(scratch.target_assembly, scratch.platform, scratch.diff_label, compilation.elf_object)

def update_scratch_score(scratch: Scratch, diff: DiffResult):
    """
    Given a scratch and a diff, update the scratch's score
    """

    score = diff.get("current_score", scratch.score)
    max_score = diff.get("max_score", scratch.max_score)
    if score != scratch.score or max_score != scratch.max_score:
        scratch.score = score
        scratch.max_score = max_score
        scratch.save()

def compile_scratch_update_score(scratch: Scratch) -> None:
    """
    Initialize the scratch's score and ignore errors should they occur
    """

    try:
        compilation = compile_scratch(scratch)
        diff = diff_compilation(scratch, compilation)
        update_scratch_score(scratch, diff)
    except (DiffError, CompilationError):
        pass

def scratch_last_modified(request: Request, pk: Optional[str] = None) -> Optional[datetime]:
    scratch: Optional[Scratch] = Scratch.objects.filter(slug=pk).first()
    if scratch:
        return scratch.last_updated
    else:
        return None

def scratch_etag(request: Request, pk: Optional[str] = None) -> Optional[str]:
    scratch: Optional[Scratch] = Scratch.objects.filter(slug=pk).first()
    if scratch:
        # We hash the Accept header too to avoid the following situation:
        # - DEBUG is enabled
        # - Developer visits /api/scratch/:slug manually, seeing the DRF HTML page
        # - **Browsers caches the page**
        # - Developer visits /scratch/:slug
        # - The frontend JS fetches /api/scratch/:slug
        # - The fetch mistakenly returns the cached HTML instead of returning JSON (oops!)
        return str(hash((scratch, request.headers.get("Accept"))))
    else:
        return None

scratch_condition = condition(last_modified_func=scratch_last_modified, etag_func=scratch_etag)

def family_etag(request: Request, pk: Optional[str] = None) -> Optional[str]:
    scratch: Optional[Scratch] = Scratch.objects.filter(slug=pk).first()
    if scratch:
        family = Scratch.objects.filter(
            target_assembly=scratch.target_assembly,
            compiler=scratch.compiler,
        )

        return str(hash((family, request.headers.get("Accept"))))
    else:
        return None

def update_needs_recompile(partial: Dict[str, Any]) -> bool:
    recompile_params = ["compiler", "compiler_flags", "source_code", "context"]

    for param in recompile_params:
        if param in partial:
            return True

    return False

class ScratchPagination(CursorPagination):
    ordering="-last_updated"
    page_size=10
    page_size_query_param="page_size"
    max_page_size=100

class ScratchViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,
):
    queryset = Scratch.objects.all()
    pagination_class = ScratchPagination
    filter_fields = ['platform', 'compiler']
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'diff_label']

    def get_serializer_class(self):
        if self.action == "list":
            return TerseScratchSerializer
        else:
            return ScratchSerializer

    @scratch_condition
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        create_ser = ScratchCreateSerializer(data=request.data)
        create_ser.is_valid(raise_exception=True)
        data = create_ser.validated_data

        platform = data.get("platform")
        compiler = data.get("compiler")

        if platform:
            if CompilerWrapper.platform_from_compiler(compiler) != platform:
                raise APIException(f"Compiler {compiler} is not compatible with platform {platform}", str(status.HTTP_400_BAD_REQUEST))
        else:
            platform = CompilerWrapper.platform_from_compiler(compiler)

        if not platform:
            raise serializers.ValidationError("Unknown compiler")

        target_asm = data["target_asm"]
        context = data["context"]
        diff_label = data.get("diff_label", "")

        assert isinstance(target_asm, str)
        assert isinstance(context, str)
        assert isinstance(diff_label, str)

        asm = get_db_asm(target_asm)

        assembly = CompilerWrapper.assemble_asm(platform, asm)

        source_code = data.get("source_code")
        if not source_code:
            default_source_code = f"void {diff_label or 'func'}(void) {{\n    // ...\n}}\n"
            source_code = DecompilerWrapper.decompile(default_source_code, platform, asm.data, context, compiler)

        compiler_flags = data.get("compiler_flags", "")
        if compiler and compiler_flags:
            compiler_flags = CompilerWrapper.filter_compiler_flags(compiler, compiler_flags)

        name = data.get("name", diff_label) or "Untitled"

        ser = ScratchSerializer(data={
            "name": name,
            "compiler": compiler,
            "compiler_flags": compiler_flags,
            "context": context,
            "diff_label": diff_label,
            "source_code": source_code,
        })
        ser.is_valid(raise_exception=True)
        scratch = ser.save(target_assembly=assembly, platform=platform)

        compile_scratch_update_score(scratch)

        return Response(
            ScratchSerializer(scratch, context={ 'request': request }).data,
            status=status.HTTP_201_CREATED,
        )

    # TODO: possibly move this logic into ScratchSerializer.save method
    def update(self, request, *args, **kwargs):
        # Check permission
        scratch = self.get_object()
        if scratch.owner != request.profile:
            response = self.retrieve(request, *args, **kwargs)
            response.status_code = status.HTTP_403_FORBIDDEN
            return response

        response = super().update(request, *args, **kwargs)

        if update_needs_recompile(request.data):
            scratch = self.get_object()
            compile_scratch_update_score(scratch)
            return Response(ScratchSerializer(scratch, context={ 'request': request }).data)

        return response

    # POST on compile takes a partial and does not update the scratch's compilation status
    @action(detail=True, methods=['GET', 'POST'])
    def compile(self, request, pk):
        scratch: Scratch = self.get_object()

        # Apply partial
        if request.method == "POST":
            # TODO: use a serializer w/ validation
            if "compiler" in request.data:
                scratch.compiler = request.data["compiler"]
            if "compiler_flags" in request.data:
                scratch.compiler_flags = request.data["compiler_flags"]
            if "source_code" in request.data:
                scratch.source_code = request.data["source_code"]
            if "context" in request.data:
                scratch.context = request.data["context"]

        compilation = compile_scratch(scratch)
        diff = diff_compilation(scratch, compilation)

        if request.method == "GET":
            update_scratch_score(scratch, diff)

        return Response({
            "diff_output": diff,
            "errors": compilation.errors,
        })

    @action(detail=True, methods=['POST'])
    def decompile(self, request, pk):
        scratch: Scratch = self.get_object()
        context = request.data.get("context", "")
        compiler = request.data.get("compiler", scratch.compiler)

        decompilation = DecompilerWrapper.decompile("", scratch.platform, scratch.target_assembly.source_asm.data, context, compiler)

        return Response({
            "decompilation": decompilation
        })

    @action(detail=True, methods=['POST'])
    def claim(self, request, pk):
        scratch: Scratch = self.get_object()

        if not scratch.is_claimable():
            return Response({ "success": False })

        profile = request.profile

        logger.debug(f"Granting ownership of scratch {scratch} to {profile}")

        scratch.owner = profile
        scratch.save()

        return Response({ "success": True })

    @action(detail=True, methods=['POST'])
    def fork(self, request, pk):
        parent_scratch: Scratch = self.get_object()

        request_data = request.data.dict() if isinstance(request.data, QueryDict) else request.data
        parent_data = ScratchSerializer(parent_scratch, context={ "request": request }).data
        fork_data = { **parent_data, **request_data }

        ser = ScratchSerializer(data=fork_data, context={ "request": request })
        ser.is_valid(raise_exception=True)
        new_scratch = ser.save(
            parent=parent_scratch,
            target_assembly=parent_scratch.target_assembly,
            platform=parent_scratch.platform,
        )

        compile_scratch_update_score(new_scratch)

        return Response(
            ScratchSerializer(new_scratch, context={ "request": request }).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True)
    @scratch_condition
    def export(self, request: Request, pk):
        scratch: Scratch = self.get_object()

        metadata = ScratchSerializer(scratch, context={ "request": request }).data
        metadata.pop("source_code")
        metadata.pop("context")

        zip_bytes = io.BytesIO()
        with zipfile.ZipFile(zip_bytes, mode='w', compression=zipfile.ZIP_DEFLATED) as zip_f:
            zip_f.writestr("metadata.json", json.dumps(metadata, indent=4))
            zip_f.writestr("target.s", scratch.target_assembly.source_asm.data)
            zip_f.writestr("target.o", scratch.target_assembly.elf_object)
            zip_f.writestr("code.c", scratch.source_code)
            if scratch.context:
                zip_f.writestr("ctx.c", scratch.context)

        # Prevent possible header injection attacks
        safe_name = re.sub(r"[^a-zA-Z0-9_:]", "_", scratch.name)[:64]

        return HttpResponse(
            zip_bytes.getvalue(),
            headers = {
                "Content-Type": "application/zip",
                "Content-Disposition": f"attachment; filename={safe_name}.zip",
            }
        )

    @action(detail=True)
    @condition(etag_func=family_etag)
    def family(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()

        family = Scratch.objects.filter(
            target_assembly=scratch.target_assembly,
            compiler=scratch.compiler,
        ).order_by("creation_time")

        return Response(TerseScratchSerializer(family, many=True, context={ 'request': request }).data)

router = DefaultRouter(trailing_slash=False)
router.register(r'scratch', ScratchViewSet)
