import base64
import hashlib
import io
import json
import logging
import re
import zipfile
from datetime import datetime
from typing import Any, Dict, Optional

import django_filters
from coreapp import compilers, platforms
from django.core.files import File
from django.db.models import F, FloatField, When, Case, Value, Q
from django.db.models.functions import Cast
from django.http import HttpResponse, QueryDict
from rest_framework import filters, mixins, serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.viewsets import GenericViewSet

from ..compiler_wrapper import CompilationResult, CompilerWrapper, DiffResult
from ..decompiler_wrapper import DecompilerWrapper
from ..decorators.django import condition
from ..diff_wrapper import DiffWrapper
from ..error import CompilationError, DiffError
from ..flags import Language
from ..libraries import Library
from ..middleware import Request
from ..models.preset import Preset
from ..models.scratch import Asm, Assembly, Scratch
from ..platforms import Platform
from ..serializers import (
    ClaimableScratchSerializer,
    ScratchCreateSerializer,
    ScratchSerializer,
    TerseScratchSerializer,
)

logger = logging.getLogger(__name__)


class ProjectNotMemberException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be a maintainer of the project to perform this action."


def get_db_asm(request_asm: str) -> Asm:
    h = hashlib.sha256(request_asm.encode()).hexdigest()
    asm, _ = Asm.objects.get_or_create(
        hash=h,
        defaults={
            "data": request_asm,
        },
    )
    return asm


# 1 MB
MAX_FILE_SIZE = 1000 * 1024


def cache_object(platform: Platform, file: File[Any]) -> Assembly:
    # Validate file size
    if file.size > MAX_FILE_SIZE:
        raise serializers.ValidationError(
            f"Object must be less than {MAX_FILE_SIZE} bytes"
        )

    # Check if ELF, Mach-O, or PE
    obj_bytes = file.read()
    if obj_bytes[:4] not in [b"\x7fELF", b"\xcf\xfa\xed\xfe", b"\x4d\x5a\x90\x00"]:
        raise serializers.ValidationError("Object must be an ELF, Mach-O, or PE file")

    assembly, _ = Assembly.objects.get_or_create(
        hash=hashlib.sha256(obj_bytes).hexdigest(),
        defaults={
            "arch": platform.arch,
            "elf_object": obj_bytes,
        },
    )
    return assembly


def compile_scratch(scratch: Scratch) -> CompilationResult:
    try:
        return CompilerWrapper.compile_code(
            compilers.from_id(scratch.compiler),
            scratch.compiler_flags,
            scratch.source_code,
            scratch.context,
            scratch.diff_label,
            tuple(scratch.libraries),
        )
    except (CompilationError, APIException) as e:
        return CompilationResult(b"", str(e))


def diff_compilation(scratch: Scratch, compilation: CompilationResult) -> DiffResult:
    try:
        return DiffWrapper.diff(
            scratch.target_assembly,
            platforms.from_id(scratch.platform),
            scratch.diff_label,
            bytes(compilation.elf_object),
            diff_flags=scratch.diff_flags,
        )
    except DiffError as e:
        return DiffResult(None, str(e))


def update_scratch_score(scratch: Scratch, diff: DiffResult) -> None:
    """
    Given a scratch and a diff, update the scratch's score
    """

    if diff.result is None:
        return
    score = diff.result.get("current_score", scratch.score)
    max_score = diff.result.get("max_score", scratch.max_score)
    if score != scratch.score or max_score != scratch.max_score:
        scratch.score = score
        scratch.max_score = max_score
        scratch.save(update_fields=["score", "max_score"])


def compile_scratch_update_score(scratch: Scratch) -> None:
    """
    Initialize the scratch's score and ignore errors should they occur
    """

    try:
        compilation = compile_scratch(scratch)
    except CompilationError:
        compilation = CompilationResult(b"", "")

    try:
        diff = diff_compilation(scratch, compilation)
        update_scratch_score(scratch, diff)
    except Exception:
        pass


def scratch_last_modified(
    request: Request, pk: Optional[str] = None
) -> Optional[datetime]:
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
        # - Developer visits /api/scratch/:slug manually, seeing the DRF HTML page
        # - **Browsers caches the page**
        # - Developer visits /scratch/:slug
        # - The frontend JS fetches /api/scratch/:slug
        # - The fetch mistakenly returns the cached HTML instead of returning JSON (oops!)
        return str(hash((scratch, request.headers.get("Accept"))))
    else:
        return None


scratch_condition = condition(
    last_modified_func=scratch_last_modified, etag_func=scratch_etag
)


def is_contentful_asm(asm: Optional[Asm]) -> bool:
    if asm is None:
        return False

    asm_text = asm.data.strip()

    if asm_text == "" or asm_text == "nop":
        return False

    return True


def family_etag(request: Request, pk: Optional[str] = None) -> Optional[str]:
    scratch: Optional[Scratch] = Scratch.objects.filter(slug=pk).first()
    if scratch:
        if is_contentful_asm(scratch.target_assembly.source_asm):
            assert scratch.target_assembly.source_asm is not None

            family = Scratch.objects.filter(
                target_assembly__source_asm__hash=scratch.target_assembly.source_asm.hash,
            )
        elif (
            scratch.target_assembly.elf_object is not None
            and len(scratch.target_assembly.elf_object) > 0
        ):
            family = Scratch.objects.filter(
                target_assembly__hash=scratch.target_assembly.hash,
                diff_label=scratch.diff_label,
            )
        else:
            family = Scratch.objects.filter(slug=scratch.slug)

        return str(hash((family, request.headers.get("Accept"))))
    else:
        return None


def update_needs_recompile(partial: Dict[str, Any]) -> bool:
    recompile_params = [
        "compiler",
        "compiler_flags",
        "diff_flags",
        "diff_label",
        "source_code",
        "context",
    ]

    for param in recompile_params:
        if param in partial:
            return True

    return False


def create_scratch(data: Dict[str, Any], allow_project: bool = False) -> Scratch:
    create_ser = ScratchCreateSerializer(data=data)
    create_ser.is_valid(raise_exception=True)
    data = create_ser.validated_data

    platform: Optional[Platform] = data.get("platform")
    compiler = compilers.from_id(data["compiler"])
    project = data.get("project")
    rom_address = data.get("rom_address")

    if not platform:
        platform = compiler.platform

    target_asm: str = data.get("target_asm", "")
    target_obj: File[Any] | None = data.get("target_obj")
    context: str = data["context"]
    diff_label: str = data.get("diff_label", "")

    if target_obj:
        asm = None
        assembly = cache_object(platform, target_obj)
    else:
        asm = get_db_asm(target_asm)
        assembly = CompilerWrapper.assemble_asm(platform, asm)

    source_code = data.get("source_code")
    if asm and not source_code:
        default_source_code = f"void {diff_label or 'func'}(void) {{\n    // ...\n}}\n"
        source_code = DecompilerWrapper.decompile(
            default_source_code, platform, asm.data, context, compiler
        )

    compiler_flags = data.get("compiler_flags", "")
    compiler_flags = CompilerWrapper.filter_compiler_flags(compiler_flags)

    diff_flags = data.get("diff_flags", [])

    preset_id: Optional[str] = None
    if data.get("preset"):
        preset: Preset = data["preset"]
        preset_id = str(preset.id)

    name = data.get("name", diff_label) or "Untitled"

    libraries = [Library(**lib) for lib in data["libraries"]]

    ser = ScratchSerializer(
        data={
            "name": name,
            "compiler": compiler.id,
            "compiler_flags": compiler_flags,
            "diff_flags": diff_flags,
            "preset": preset_id,
            "context": context,
            "diff_label": diff_label,
            "source_code": source_code,
        }
    )
    ser.is_valid(raise_exception=True)
    scratch = ser.save(
        target_assembly=assembly,
        platform=platform.id,
        libraries=libraries,
    )

    compile_scratch_update_score(scratch)

    return scratch


class ScratchPagination(CursorPagination):
    ordering = "-creation_time"
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class ScratchViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,  # type: ignore
):
    match_percent = Case(
        When(max_score__lte=0, then=Value(0.0)),
        When(score__lt=0, then=Value(0.0)),
        When(score__gt=F("max_score"), then=Value(0.0)),
        When(score=0, then=Value(1.0)),
        When(match_override=True, then=Value(1.0)),
        default=1.0 - (F("score") / Cast("max_score", FloatField())),
    )

    queryset = Scratch.objects.all().annotate(match_percent=match_percent)
    pagination_class = ScratchPagination
    filterset_fields = ["platform", "compiler", "preset"]
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name", "diff_label"]
    ordering_fields = ["creation_time", "last_updated", "score", "match_percent"]

    def get_serializer_class(self) -> type[serializers.ModelSerializer[Scratch]]:
        if self.action == "list":
            return TerseScratchSerializer
        else:
            return ScratchSerializer

    @scratch_condition
    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().retrieve(request, *args, **kwargs)

    def create(self, request: Any, *args: Any, **kwargs: Any) -> Response:
        scratch = create_scratch(request.data)

        return Response(
            ClaimableScratchSerializer(scratch, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    # TODO: possibly move this logic into ScratchSerializer.save method
    def update(self, request: Any, *args: Any, **kwargs: Any) -> Response:
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
            return Response(
                ScratchSerializer(scratch, context={"request": request}).data
            )

        return response

    def destroy(self, request: Any, *args: Any, **kwargs: Any) -> Response:
        # Check permission
        scratch = self.get_object()
        if scratch.owner != request.profile and not request.profile.is_staff():
            response = self.retrieve(request, *args, **kwargs)
            response.status_code = status.HTTP_403_FORBIDDEN
            return response

        response = super().destroy(request, *args, **kwargs)

        return response

    # POST on compile takes a partial and does not update the scratch's compilation status
    @action(detail=True, methods=["GET", "POST"])
    def compile(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()

        # Apply partial
        include_objects = False
        if request.method == "POST":
            # TODO: use a serializer w/ validation
            if "compiler" in request.data:
                scratch.compiler = request.data["compiler"]
            if "compiler_flags" in request.data:
                scratch.compiler_flags = request.data["compiler_flags"]
            if "diff_flags" in request.data:
                scratch.diff_flags = request.data["diff_flags"]
            if "diff_label" in request.data:
                scratch.diff_label = request.data["diff_label"]
            if "source_code" in request.data:
                scratch.source_code = request.data["source_code"]
            if "context" in request.data:
                scratch.context = request.data["context"]
            if "libraries" in request.data:
                libs = [Library(**lib) for lib in request.data["libraries"]]
                scratch.libraries = libs
            if "include_objects" in request.data:
                include_objects = request.data["include_objects"]

        compilation = compile_scratch(scratch)
        diff = diff_compilation(scratch, compilation)

        if request.method == "GET":
            update_scratch_score(scratch, diff)

        compiler_output = ""
        if compilation.errors:
            compiler_output += compilation.errors + "\n"
        if diff.errors:
            compiler_output += diff.errors + "\n"

        response = {
            "diff_output": diff.result,
            "compiler_output": compiler_output,
            "success": compilation.elf_object is not None
            and len(compilation.elf_object) > 0,
        }

        if include_objects:

            def to_base64(obj: bytes) -> str:
                return base64.b64encode(obj).decode("utf-8")

            response["left_object"] = to_base64(scratch.target_assembly.elf_object)
            response["right_object"] = to_base64(compilation.elf_object)

        return Response(response)

    @action(detail=True, methods=["POST"])
    def decompile(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()
        if scratch.target_assembly.source_asm is None:
            return Response(
                {
                    "decompilation": "This scratch cannot currently be run through the decompiler because it was created via object file."
                }
            )

        context = request.data.get("context", scratch.context)
        compiler = compilers.from_id(request.data.get("compiler", scratch.compiler))

        platform = platforms.from_id(scratch.platform)

        decompilation = DecompilerWrapper.decompile(
            "",
            platform,
            scratch.target_assembly.source_asm.data,
            context,
            compiler,
        )

        return Response({"decompilation": decompilation})

    @action(detail=True, methods=["POST"])
    def claim(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()
        token = request.data.get("token")

        if not scratch.is_claimable():
            return Response({"success": False})

        if scratch.claim_token and scratch.claim_token != token:
            return Response({"success": False})

        profile = request.profile

        logger.debug(f"Granting ownership of scratch {scratch} to {profile}")

        scratch.owner = profile
        scratch.claim_token = None
        scratch.save()

        return Response({"success": True})

    @action(detail=True, methods=["POST"])
    def fork(self, request: Request, pk: str) -> Response:
        parent: Scratch = self.get_object()

        # TODO Needed for test_fork_scratch test?
        if isinstance(request.data, QueryDict):
            request_data = request.data.dict()
        else:
            request_data = request.data

        parent_data = ScratchSerializer(parent, context={"request": request}).data
        fork_data = {**parent_data, **request_data}

        ser = ScratchSerializer(data=fork_data, context={"request": request})
        ser.is_valid(raise_exception=True)

        libraries = [Library(**lib) for lib in ser.validated_data["libraries"]]
        new_scratch = ser.save(
            parent=parent,
            target_assembly=parent.target_assembly,
            platform=parent.platform,
            libraries=libraries,
        )

        compile_scratch_update_score(new_scratch)

        return Response(
            ClaimableScratchSerializer(new_scratch, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True)
    @scratch_condition
    def export(self, request: Request, pk: str) -> HttpResponse:
        scratch: Scratch = self.get_object()

        metadata = ScratchSerializer(scratch, context={"request": request}).data
        metadata.pop("source_code")
        metadata.pop("context")

        zip_bytes = io.BytesIO()
        with zipfile.ZipFile(
            zip_bytes, mode="w", compression=zipfile.ZIP_DEFLATED
        ) as zip_f:
            zip_f.writestr("metadata.json", json.dumps(metadata, indent=4))
            if scratch.target_assembly.source_asm is not None:
                zip_f.writestr("target.s", scratch.target_assembly.source_asm.data)
            zip_f.writestr("target.o", scratch.target_assembly.elf_object)

            language = compilers.from_id(scratch.compiler).language
            src_ext = Language(language).get_file_extension()
            zip_f.writestr(f"code.{src_ext}", scratch.source_code)
            if scratch.context:
                zip_f.writestr(f"ctx.{src_ext}", scratch.context)

            compilation = compile_scratch(scratch)
            if compilation.elf_object:
                zip_f.writestr("current.o", compilation.elf_object)

        # Prevent possible header injection attacks
        safe_name = re.sub(r"[^a-zA-Z0-9_:]", "_", scratch.name)[:64]

        return HttpResponse(
            zip_bytes.getvalue(),
            headers={
                "Content-Type": "application/zip",
                "Content-Disposition": f"attachment; filename={safe_name}.zip",
            },
        )

    @action(detail=True)
    @condition(etag_func=family_etag)
    def family(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()

        parent_slugs = [p.slug for p in scratch.all_parents()]

        if is_contentful_asm(scratch.target_assembly.source_asm):
            assert scratch.target_assembly.source_asm is not None

            family = Scratch.objects.filter(
                Q(
                    target_assembly__source_asm__hash=scratch.target_assembly.source_asm.hash
                )
                | Q(slug__in=parent_slugs)
            ).order_by("creation_time")
        elif (
            scratch.target_assembly.elf_object is not None
            and len(scratch.target_assembly.elf_object) > 0
        ):
            family = Scratch.objects.filter(
                Q(
                    target_assembly__hash=scratch.target_assembly.hash,
                    diff_label=scratch.diff_label,
                )
                | Q(slug__in=parent_slugs)
            ).order_by("creation_time")
        else:
            family = Scratch.objects.filter(
                Q(slug=scratch.slug) | Q(slug__in=parent_slugs)
            )

        return Response(
            TerseScratchSerializer(family, many=True, context={"request": request}).data
        )


router = DefaultRouter(trailing_slash=False)
router.register(r"scratch", ScratchViewSet)
