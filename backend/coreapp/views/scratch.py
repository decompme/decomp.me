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
from django.core.files import File
from django.db.models import F, FloatField, When, Case, Value
from django.db.models.functions import Cast
from django.db.models.query import QuerySet

from django.http import HttpResponse, QueryDict
from rest_framework import filters, mixins, serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from ..compiler_utils import CompilationResult, DiffResult, filter_compiler_flags
from ..cromper_client import get_cromper_client
from ..decorators.django import condition
from ..error import CompilationError, DiffError
from ..filters.search import NonEmptySearchFilter
from ..middleware import Request
from ..models.preset import Preset
from ..models.scratch import Asm, Assembly, Scratch, Library
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


def cache_object(platform_arch: str, file: File[Any]) -> Assembly:
    # Validate file size
    if file.size > MAX_FILE_SIZE:
        raise serializers.ValidationError(
            f"Object must be less than {MAX_FILE_SIZE} bytes"
        )

    # Check if ELF, Mach-O, or PE
    obj_bytes = file.read()
    is_elf = obj_bytes[:4] == b"\x7fELF"
    is_macho = obj_bytes[:4] == b"\xcf\xfa\xed\xfe"
    is_coff = obj_bytes[:2] in (b"\x4c\x01", b"\x64\x86")
    if not (is_elf or is_macho or is_coff):
        raise serializers.ValidationError("Object must be an ELF, Mach-O, or COFF file")

    assembly, _ = Assembly.objects.get_or_create(
        hash=hashlib.sha256(obj_bytes).hexdigest(),
        defaults={
            "arch": platform_arch,
            "elf_object": obj_bytes,
        },
    )
    return assembly


def compile_scratch(scratch: Scratch) -> CompilationResult:
    try:
        libraries = [
            l.to_json() if isinstance(l, Library) else l for l in scratch.libraries
        ]
        cromper_client = get_cromper_client()
        result = cromper_client.compile_code(
            compiler_id=scratch.compiler,
            compiler_flags=scratch.compiler_flags,
            code=scratch.source_code,
            context=scratch.context,
            libraries=libraries,
        )
        return CompilationResult(result["elf_object"], result["errors"])
    except (CompilationError, APIException) as e:
        return CompilationResult(b"", str(e))


def diff_compilation(scratch: Scratch, compilation: CompilationResult) -> DiffResult:
    try:
        cromper_client = get_cromper_client()
        result = cromper_client.diff(
            platform_id=scratch.platform,
            target_elf=scratch.target_assembly.elf_object,
            compiled_elf=compilation.elf_object,
            diff_label=scratch.diff_label,
            diff_flags=scratch.diff_flags,
        )
        return DiffResult(result["result"], result["errors"])
    except (CompilationError, DiffError) as e:
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

    compilation = compile_scratch(scratch)
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


scratch_condition = condition(last_modified_func=scratch_last_modified)


def is_contentful_asm(asm: Optional[Asm]) -> bool:
    if asm is None:
        return False

    asm_text = asm.data.strip()

    if asm_text == "" or asm_text == "nop":
        return False

    return True


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

    cromper_client = get_cromper_client()
    compiler = cromper_client.get_compiler_by_id(data["compiler"])
    platform = data.get("platform", compiler.platform)

    target_asm: str = data.get("target_asm", "")
    target_obj: File[Any] | None = data.get("target_obj")
    context: str = data["context"]
    diff_label: str = data.get("diff_label", "")

    if target_obj:
        asm = None
        assembly = cache_object(platform.arch, target_obj)
    else:
        asm = get_db_asm(target_asm)
        cromper_client = get_cromper_client()
        asm_result = cromper_client.assemble_asm(platform.id, asm)

        # Create Assembly object from cromper response
        assembly, _ = Assembly.objects.get_or_create(
            hash=asm_result["hash"],
            defaults={
                "arch": asm_result["arch"],
                "elf_object": asm_result["elf_object"],
            },
        )

    source_code = data.get("source_code")
    if asm and not source_code:
        default_source_code = f"void {diff_label or 'func'}(void) {{\n    // ...\n}}\n"
        cromper_client = get_cromper_client()
        source_code = cromper_client.decompile(
            platform_id=platform.id,
            compiler_id=compiler.id,
            asm=asm.data,
            default_source_code=default_source_code,
            context=context,
        )

    compiler_flags = data.get("compiler_flags", "")
    compiler_flags = filter_compiler_flags(compiler_flags)

    diff_flags = data.get("diff_flags", [])

    preset_id: Optional[str] = None
    if data.get("preset"):
        preset: Preset = data["preset"]
        preset_id = str(preset.id)

    name = data.get("name", diff_label) or "Untitled"

    libraries = data["libraries"]

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

    queryset = (
        Scratch.objects.all()
        .select_related("owner__user__github")
        .annotate(match_percent=match_percent)
    )
    pagination_class = ScratchPagination
    filterset_fields = ["platform", "compiler", "preset"]
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        NonEmptySearchFilter,
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
                scratch.libraries = request.data["libraries"]
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
            response["left_object"] = base64.b64encode(
                scratch.target_assembly.elf_object
            ).decode("utf-8")
            response["right_object"] = base64.b64encode(compilation.elf_object).decode(
                "utf-8"
            )

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
        compiler_id = request.data.get("compiler", scratch.compiler)

        cromper_client = get_cromper_client()
        decompilation = cromper_client.decompile(
            platform_id=scratch.platform,
            compiler_id=compiler_id,
            asm=scratch.target_assembly.source_asm.data,
            default_source_code="",
            context=context,
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

        libraries = ser.validated_data["libraries"]
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

            src_ext = scratch.get_language().get_file_extension()
            zip_f.writestr(f"code.{src_ext}", scratch.source_code)
            if scratch.context:
                zip_f.writestr(f"ctx.{src_ext}", scratch.context)

            if request.GET.get("target_only") != "1":
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
    def family(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()

        subqueries: list[QuerySet["Scratch"]] = []

        if is_contentful_asm(scratch.target_assembly.source_asm):
            assert scratch.target_assembly.source_asm is not None
            subqueries.append(
                Scratch.objects.filter(
                    target_assembly__source_asm__hash=scratch.target_assembly.source_asm.hash
                )
            )
        elif (
            scratch.target_assembly.elf_object is not None
            and len(scratch.target_assembly.elf_object) > 0
        ):
            subqueries.append(
                Scratch.objects.filter(
                    target_assembly__hash=scratch.target_assembly.hash,
                    diff_label=scratch.diff_label,
                )
            )
        else:
            subqueries.append(Scratch.objects.filter(slug=scratch.slug))

        if scratch.family_id is not None:
            subqueries.append(Scratch.objects.filter(family_id=scratch.family_id))

        if scratch.parent_id is not None:
            subqueries.append(Scratch.objects.filter(parent_id=scratch.parent_id))

        # Avoid 'ORDER BY not allowed in subqueries of compound statements.'
        subqueries = [sq.order_by() for sq in subqueries]

        if len(subqueries) == 1:
            family = subqueries[0]
        else:
            family = subqueries[0].union(*subqueries[1:])

        family = family.order_by("creation_time")

        return Response(
            TerseScratchSerializer(family, many=True, context={"request": request}).data
        )
