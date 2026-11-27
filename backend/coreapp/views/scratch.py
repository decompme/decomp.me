import base64
import hashlib
import io
import json
import logging
import re
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import django_filters
from adrf.mixins import (
    CreateModelMixin,
    DestroyModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
)
from adrf.viewsets import GenericViewSet
from asgiref.sync import sync_to_async
from django.core.files import File
from django.db.models import Case, F, FloatField, Value, When
from django.db.models.functions import Cast
from django.db.models.query import QuerySet
from django.http import HttpResponse, QueryDict
from django.utils import timezone
from django.utils.cache import get_conditional_response
from django.utils.decorators import method_decorator
from django.utils.http import http_date
from rest_framework import filters, serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.response import Response

from ..compiler_utils import Compiler, Platform, filter_compiler_flags
from ..cromper_client import (
    CromperBusyError,
    CromperError,
    CromperTimeoutError,
    CromperUnavailableError,
    get_cromper_client,
)
from ..decorators.cache import globally_cacheable
from ..decorators.django import condition
from ..filters.scratch import ScratchFilter
from ..filters.search import NonEmptySearchFilter
from ..middleware import Request
from ..models.best_fork import update_best_forks_for_scratch
from ..models.preset import Preset
from ..models.scratch import Asm, Assembly, Library, Scratch
from ..pagination import SafeCursorPagination
from ..serializers import (
    ClaimableScratchSerializer,
    ScratchCompileSerializer,
    ScratchCreateSerializer,
    ScratchDecompileSerializer,
    ScratchSerializer,
    TerseScratchSerializer,
)
from ..wrapper_result import AssemblyResult, CompilationResult, DiffResult

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
    is_coff = obj_bytes[:2] in (b"\x4c\x01", b"\x64\x86", b"\xf2\x01")
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


# Snapshot lazy ORM relations in sync helpers before calling Cromper asynchronously.
@dataclass(frozen=True)
class CompileInputs:
    compiler_id: str
    compiler_flags: str
    source_code: str
    context: str
    diff_label: str
    libraries: list[dict[str, str]]


def get_compile_inputs(scratch: Scratch, context: str | None = None) -> CompileInputs:
    scratch_context = (
        scratch.context_fk.text if context is None and scratch.context_fk else context
    ) or ""
    return CompileInputs(
        compiler_id=scratch.compiler,
        compiler_flags=scratch.compiler_flags,
        source_code=scratch.source_code,
        context=scratch_context,
        diff_label=scratch.diff_label,
        libraries=[lib.to_json() for lib in scratch.libraries],
    )


async def compile_scratch(
    scratch: Scratch, context: str | None = None
) -> CompilationResult:
    inputs = await sync_to_async(get_compile_inputs)(scratch, context)
    try:
        return await get_cromper_client().compile_code(
            compiler_id=inputs.compiler_id,
            compiler_flags=inputs.compiler_flags,
            code=inputs.source_code,
            context=inputs.context,
            function=inputs.diff_label,
            libraries=inputs.libraries,
        )
    except (CromperError, APIException) as e:
        if isinstance(e, CromperBusyError):
            return CompilationResult(b"", e.detail)
        if isinstance(e, (CromperUnavailableError, CromperTimeoutError)):
            return CompilationResult(
                b"",
                "The compiler service is unavailable. Please try again in a moment.",
            )
        return CompilationResult(b"", str(e))


@dataclass(frozen=True)
class DiffInputs:
    platform_id: str
    target_elf: bytes
    diff_label: str
    diff_flags: list[str]


def get_diff_inputs(scratch: Scratch) -> DiffInputs:
    return DiffInputs(
        platform_id=scratch.platform,
        target_elf=bytes(scratch.target_assembly.elf_object),
        diff_label=scratch.diff_label,
        diff_flags=scratch.diff_flags,
    )


async def diff_compilation(
    scratch: Scratch,
    compilation: CompilationResult,
) -> DiffResult:
    inputs = await sync_to_async(get_diff_inputs)(scratch)
    try:
        return await get_cromper_client().diff(
            platform_id=inputs.platform_id,
            target_elf=inputs.target_elf,
            compiled_elf=compilation.elf_object,
            diff_label=inputs.diff_label,
            diff_flags=inputs.diff_flags,
        )
    except CromperError as e:
        if isinstance(e, CromperBusyError):
            return DiffResult(None, e.detail)
        if isinstance(e, (CromperUnavailableError, CromperTimeoutError)):
            return DiffResult(
                None, "The diff service is unavailable. Please try again in a moment."
            )
        return DiffResult(None, str(e))


def update_scratch_score(
    scratch: Scratch,
    diff: DiffResult,
) -> None:
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
        update_best_forks_for_scratch(scratch)


async def compile_scratch_update_score(
    scratch: Scratch,
) -> None:
    """
    Initialize the scratch's score and ignore errors should they occur
    """

    compilation = await compile_scratch(scratch)
    try:
        diff = await diff_compilation(scratch, compilation)
        await sync_to_async(update_scratch_score)(scratch, diff)
    except Exception:
        logger.exception("Failed to compile and score scratch")


def scratch_last_modified(
    request: Request,
    pk: str | None = None,
    partial: bool | None = False,
) -> datetime | None:
    scratch: Scratch | None = Scratch.objects.filter(slug=pk).first()
    if scratch:
        return scratch.last_updated
    else:
        return None


scratch_condition = condition(last_modified_func=scratch_last_modified)


def conditional_response(
    request: Request,
    last_modified: datetime | None,
) -> HttpResponse | None:
    """Avoid condition()'s synchronous ORM callback by using a loaded timestamp."""
    if last_modified is None:
        return None

    if not timezone.is_aware(last_modified):
        last_modified = timezone.make_aware(last_modified, UTC)
    timestamp = int(last_modified.timestamp())

    response = get_conditional_response(request, last_modified=timestamp)
    if response is not None:
        response.headers["Last-Modified"] = http_date(timestamp)
    return response


def is_contentful_asm(asm: Asm | None) -> bool:
    if asm is None:
        return False

    asm_text = asm.data.strip()

    return not (asm_text == "" or asm_text == "nop")


def update_needs_recompile(partial: dict[str, Any]) -> bool:
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


@dataclass(frozen=True)
class CreateScratchInputs:
    compiler: Compiler
    platform: Platform
    target_asm: str
    target_obj: File[Any] | None
    context: str
    diff_label: str
    source_code: str | None
    compiler_flags: str
    diff_flags: list[str]
    preset_id: str | None
    name: str
    libraries: list[Library]


def validate_create_request(data: dict[str, Any]) -> CreateScratchInputs:
    """Run serializer and metadata validation in the sync thread."""
    create_ser = ScratchCreateSerializer(data=data)
    create_ser.is_valid(raise_exception=True)
    validated = create_ser.validated_data

    try:
        compiler = get_cromper_client().get_compiler_by_id(validated["compiler"])
    except ValueError as e:
        raise APIException(str(e))

    platform: Platform = validated.get("platform", compiler.platform)
    diff_label: str = validated.get("diff_label", "")

    preset_id: str | None = None
    if validated.get("preset"):
        preset: Preset = validated["preset"]
        preset_id = str(preset.id)

    return CreateScratchInputs(
        compiler=compiler,
        platform=platform,
        target_asm=validated.get("target_asm", ""),
        target_obj=validated.get("target_obj"),
        context=validated["context"],
        diff_label=diff_label,
        source_code=validated.get("source_code"),
        compiler_flags=filter_compiler_flags(validated.get("compiler_flags", "")),
        diff_flags=validated.get("diff_flags", []),
        preset_id=preset_id,
        name=validated.get("name", diff_label) or "Untitled",
        libraries=[
            Library(**lib) if isinstance(lib, dict) else lib
            for lib in validated["libraries"]
        ],
    )


def get_or_create_assembly(asm: Asm | None, asm_result: AssemblyResult) -> Assembly:
    assembly, _ = Assembly.objects.get_or_create(
        hash=asm_result.hash,
        defaults={
            "arch": asm_result.arch,
            "elf_object": asm_result.elf_object,
            "source_asm": asm,
        },
    )
    return assembly


def save_new_scratch(
    inputs: CreateScratchInputs, assembly: Assembly, source_code: str | None
) -> Scratch:
    ser = ScratchSerializer(
        data={
            "name": inputs.name,
            "compiler": inputs.compiler.id,
            "compiler_flags": inputs.compiler_flags,
            "diff_flags": inputs.diff_flags,
            "preset": inputs.preset_id,
            "context": inputs.context,
            "diff_label": inputs.diff_label,
            "source_code": source_code,
        }
    )
    ser.is_valid(raise_exception=True)
    return ser.save(
        target_assembly=assembly,
        platform=inputs.platform.id,
        libraries=inputs.libraries,
    )


async def create_scratch(data: dict[str, Any]) -> Scratch:
    inputs = await sync_to_async(validate_create_request)(data)

    asm: Asm | None = None
    if inputs.target_obj:
        assembly = await sync_to_async(cache_object)(
            inputs.platform.arch, inputs.target_obj
        )
    else:
        asm = await sync_to_async(get_db_asm)(inputs.target_asm)
        asm_result = await get_cromper_client().assemble_asm(inputs.platform.id, asm)
        assembly = await sync_to_async(get_or_create_assembly)(asm, asm_result)

    source_code = inputs.source_code
    if asm is not None and not source_code:
        default_source_code = (
            f"void {inputs.diff_label or 'func'}(void) {{\n    // ...\n}}\n"
        )
        try:
            source_code = await get_cromper_client().decompile(
                platform_id=inputs.platform.id,
                compiler_id=inputs.compiler.id,
                asm=asm.data,
                default_source_code=default_source_code,
                context=inputs.context,
            )
        except CromperError:
            logger.warning(
                "Failed to decompile assembly when creating scratch; "
                "falling back to default source code",
                exc_info=True,
            )
            source_code = default_source_code

    scratch = await sync_to_async(save_new_scratch)(inputs, assembly, source_code)

    await compile_scratch_update_score(scratch)

    return scratch


def profile_can_own_scratch(request: Request) -> bool:
    return request.profile.id is not None


class ScratchPagination(SafeCursorPagination):
    ordering = "-creation_time"
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


def get_scratch_data(scratch: Scratch, request: Request) -> dict[str, Any]:
    return ScratchSerializer(scratch, context={"request": request}).data


def get_claimable_scratch_data(scratch: Scratch, request: Request) -> dict[str, Any]:
    return ClaimableScratchSerializer(scratch, context={"request": request}).data


@dataclass(frozen=True)
class CompilePartial:
    scratch_context: str | None
    include_objects: bool


def apply_compile_partial(scratch: Scratch, data: Any) -> CompilePartial:
    """Apply overrides without saving the scratch."""
    compile_ser = ScratchCompileSerializer(data=data, context={"scratch": scratch})
    compile_ser.is_valid(raise_exception=True)
    partial = compile_ser.validated_data

    scratch_context = None
    if "compiler" in partial:
        scratch.compiler = partial["compiler"]
    if "compiler_flags" in partial:
        scratch.compiler_flags = partial["compiler_flags"]
    if "diff_flags" in partial:
        scratch.diff_flags = partial["diff_flags"]
    if "diff_label" in partial:
        scratch.diff_label = partial["diff_label"]
    if "source_code" in partial:
        scratch.source_code = partial["source_code"] or ""
    if "context" in partial:
        scratch_context = partial["context"]
    if "libraries" in partial:
        scratch.libraries = partial["libraries"]

    return CompilePartial(
        scratch_context=scratch_context,
        include_objects=partial["include_objects"],
    )


def get_target_elf(scratch: Scratch) -> bytes:
    return bytes(scratch.target_assembly.elf_object)


@dataclass(frozen=True)
class DecompileInputs:
    source_asm: str
    compiler_id: str
    context: str


def get_decompile_inputs(scratch: Scratch, data: Any) -> DecompileInputs | None:
    """Load inputs in the sync thread; return None for object-file targets."""
    source_asm = scratch.target_assembly.source_asm
    if source_asm is None:
        return None

    decompile_ser = ScratchDecompileSerializer(data=data, context={"scratch": scratch})
    decompile_ser.is_valid(raise_exception=True)
    partial = decompile_ser.validated_data

    context = partial.get(
        "context", scratch.context_fk.text if scratch.context_fk else ""
    )
    if not isinstance(context, str):
        context = str(context)

    return DecompileInputs(
        source_asm=source_asm.data,
        compiler_id=partial.get("compiler", scratch.compiler),
        context=context,
    )


def create_fork(
    parent: Scratch, request_data: dict[str, Any], request: Request
) -> Scratch:
    parent_data = ScratchSerializer(parent, context={"request": request}).data
    fork_data = {**parent_data, **request_data}

    ser = ScratchSerializer(data=fork_data, context={"request": request})
    ser.is_valid(raise_exception=True)

    libraries = ser.validated_data["libraries"]
    return ser.save(
        parent=parent,
        owner=request.profile,
        target_assembly=parent.target_assembly,
        platform=parent.platform,
        libraries=libraries,
    )


def resolve_source_extension(compiler_id: str, compiler_flags: str) -> str:
    try:
        compiler = get_cromper_client().get_compiler_by_id(compiler_id)
        return compiler.resolve_language(compiler_flags).extension
    except (CromperError, ValueError):
        logger.warning(
            "Could not resolve language for export; falling back to .c",
            exc_info=True,
        )
        return "c"


def build_export_response(
    scratch: Scratch, request: Request, compiled_object: bytes | None
) -> HttpResponse:
    metadata = ScratchSerializer(scratch, context={"request": request}).data
    metadata.pop("source_code")
    metadata.pop("context")
    src_ext = resolve_source_extension(scratch.compiler, scratch.compiler_flags)

    zip_bytes = io.BytesIO()
    with zipfile.ZipFile(
        zip_bytes, mode="w", compression=zipfile.ZIP_DEFLATED
    ) as zip_f:
        zip_f.writestr("metadata.json", json.dumps(metadata, indent=4))
        source_asm = scratch.target_assembly.source_asm
        if source_asm is not None:
            zip_f.writestr("target.s", source_asm.data)
        zip_f.writestr("target.o", bytes(scratch.target_assembly.elf_object))
        zip_f.writestr(f"code.{src_ext}", scratch.source_code)
        if scratch.context_fk and scratch.context_fk.text:
            zip_f.writestr(f"ctx.{src_ext}", scratch.context_fk.text)
        if compiled_object:
            zip_f.writestr("current.o", compiled_object)

    # Prevent possible header injection attacks
    safe_name = re.sub(r"[^a-zA-Z0-9_:]", "_", scratch.name)[:64]
    response = HttpResponse(
        zip_bytes.getvalue(),
        headers={
            "Content-Type": "application/zip",
            "Content-Disposition": f"attachment; filename={safe_name}.zip",
        },
    )
    if scratch.last_updated is not None:
        response.headers["Last-Modified"] = http_date(
            int(scratch.last_updated.timestamp())
        )
    return response


@method_decorator(globally_cacheable(max_age=5, stale_while_revalidate=1), name="alist")
@method_decorator(globally_cacheable(max_age=1), name="aretrieve")
class ScratchViewSet(
    CreateModelMixin,
    DestroyModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
    ListModelMixin,
    GenericViewSet,
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
        .select_related(
            "owner__user__github",
            "best_fork__fork__owner__user__github",
        )
        .annotate(match_percent=match_percent)
    )
    pagination_class = ScratchPagination
    filterset_class = ScratchFilter
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        NonEmptySearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name", "diff_label"]
    ordering_fields = ["creation_time", "last_updated", "score", "match_percent"]

    def get_serializer_class(self) -> type[serializers.ModelSerializer[Scratch]]:
        if self.action == "alist":
            return TerseScratchSerializer
        else:
            return ScratchSerializer

    def alist(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        # The cache decorators require a sync handler; adrf offloads it to a thread.
        return super().list(request, *args, **kwargs)

    @scratch_condition
    def aretrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().retrieve(request, *args, **kwargs)

    async def acreate(self, request: Any, *args: Any, **kwargs: Any) -> Response:
        scratch = await create_scratch(request.data)

        data = await sync_to_async(get_claimable_scratch_data)(scratch, request)
        return Response(data, status=status.HTTP_201_CREATED)

    async def perform_aupdate(
        self, serializer: serializers.BaseSerializer[Any]
    ) -> None:
        # adrf's default calls asave(); this project uses regular DRF serializers.
        await sync_to_async(serializer.save)()

    # TODO: possibly move this logic into ScratchSerializer.save method
    async def aupdate(self, request: Any, *args: Any, **kwargs: Any) -> Response:
        # Check permission
        scratch = await self.aget_object()
        if scratch.owner != request.profile:
            response = await sync_to_async(self.aretrieve)(request, *args, **kwargs)
            response.status_code = status.HTTP_403_FORBIDDEN
            return response

        match_override_was_enabled = scratch.match_override
        response = await super().aupdate(request, *args, **kwargs)
        scratch = await self.aget_object()

        if match_override_was_enabled != scratch.match_override:
            await sync_to_async(update_best_forks_for_scratch)(scratch)

        if update_needs_recompile(request.data):
            await compile_scratch_update_score(scratch)
            data = await sync_to_async(get_scratch_data)(scratch, request)
            return Response(data)

        return response

    def adestroy(self, request: Any, *args: Any, **kwargs: Any) -> Response:
        # Check permission
        scratch = self.get_object()
        if scratch.owner != request.profile and not request.profile.is_staff():
            response = self.aretrieve(request, *args, **kwargs)
            response.status_code = status.HTTP_403_FORBIDDEN
            return response

        response = super().destroy(request, *args, **kwargs)

        return response

    # POST on compile takes a partial and does not update the scratch's compilation status
    @action(detail=True, methods=["GET", "POST"])  # type: ignore[type-var]
    async def compile(self, request: Request, pk: str) -> Response:
        scratch: Scratch = await self.aget_object()

        # Apply partial
        include_objects = False
        scratch_context = None
        if request.method == "POST":
            partial = await sync_to_async(apply_compile_partial)(scratch, request.data)
            scratch_context = partial.scratch_context
            include_objects = partial.include_objects

        compilation = await compile_scratch(scratch, context=scratch_context)
        diff = await diff_compilation(scratch, compilation)

        if request.method == "GET":
            await sync_to_async(update_scratch_score)(scratch, diff)

        compiler_output = ""
        if compilation.errors:
            compiler_output += compilation.errors + "\n"
        if diff.errors:
            compiler_output += diff.errors + "\n"

        response: dict[str, Any] = {
            "diff_output": diff.result,
            "compiler_output": compiler_output,
            "success": compilation.elf_object is not None
            and len(compilation.elf_object) > 0,
        }

        if include_objects or request.method == "GET":

            def to_base64(obj: bytes) -> str:
                return base64.b64encode(obj).decode("utf-8")

            target_elf = await sync_to_async(get_target_elf)(scratch)
            response["left_object"] = to_base64(target_elf)
            response["right_object"] = to_base64(compilation.elf_object)

        return Response(response)

    @action(detail=True, methods=["POST"])  # type: ignore[type-var]
    async def decompile(self, request: Request, pk: str) -> Response:
        scratch: Scratch = await self.aget_object()
        inputs = await sync_to_async(get_decompile_inputs)(scratch, request.data)
        if inputs is None:
            return Response(
                {
                    "decompilation": "This scratch cannot currently be run through the decompiler because it was created via object file."
                }
            )

        try:
            decompilation = await get_cromper_client().decompile(
                platform_id=scratch.platform,
                compiler_id=inputs.compiler_id,
                asm=inputs.source_asm,
                default_source_code="",
                context=inputs.context,
            )
        except CromperBusyError as e:
            return Response({"decompilation": e.detail})
        except (CromperUnavailableError, CromperTimeoutError):
            return Response(
                {
                    "decompilation": "The compiler service is unavailable. "
                    "Please try again in a moment."
                }
            )
        except CromperError as e:
            logger.warning(
                "Decompilation failed for scratch %s", scratch.slug, exc_info=True
            )
            return Response({"decompilation": f"Decompilation failed: {e}"})

        return Response({"decompilation": decompilation})

    @action(detail=True, methods=["POST"])
    def claim(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()
        token: Any = (
            request.data.get("token") if isinstance(request.data, dict) else None
        )

        if (
            not isinstance(token, str)
            or not scratch.is_claimable()
            or not scratch.verify_claim_token(token)
        ):
            return Response({"success": False})

        if not profile_can_own_scratch(request):
            return Response({"success": False}, status=status.HTTP_403_FORBIDDEN)

        profile = request.profile

        logger.debug(f"Granting ownership of scratch {scratch} to {profile}")

        scratch.owner = profile
        scratch.save()

        return Response({"success": True})

    @action(detail=True, methods=["POST"])  # type: ignore[type-var]
    async def fork(self, request: Request, pk: str) -> Response:
        parent: Scratch = await self.aget_object()

        if not profile_can_own_scratch(request):
            return Response(
                {"detail": "A persistent user profile is required to fork scratches."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # TODO Needed for test_fork_scratch test?
        if isinstance(request.data, QueryDict):
            request_data = request.data.dict()
        elif isinstance(request.data, dict):
            request_data = request.data
        else:
            request_data = {}

        new_scratch = await sync_to_async(create_fork)(parent, request_data, request)

        await compile_scratch_update_score(new_scratch)

        data = await sync_to_async(get_scratch_data)(new_scratch, request)
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True)  # type: ignore[type-var]
    async def export(self, request: Request, pk: str) -> HttpResponse:
        scratch: Scratch = await self.aget_object()

        not_modified = conditional_response(request, scratch.last_updated)
        if not_modified is not None:
            return not_modified

        compiled_object = None
        if request.GET.get("target_only") != "1":
            compilation = await compile_scratch(scratch)
            compiled_object = compilation.elf_object

        return await sync_to_async(build_export_response)(
            scratch, request, compiled_object
        )

    @action(detail=True)
    def family(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()

        subqueries: list[QuerySet[Scratch]] = []

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

        # Materialize the union before the final fetch so Postgres can use slug
        # index lookups instead of planning joins across the full scratch table.
        family_ids = list(family.values_list("slug", flat=True))
        family = ScratchViewSet.queryset.filter(slug__in=family_ids).order_by(
            "creation_time"
        )

        return Response(
            TerseScratchSerializer(family, many=True, context={"request": request}).data
        )
