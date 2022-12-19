import hashlib
import io
import json
import logging
import re
import zipfile
from datetime import datetime
from typing import Any, Dict, Optional

import django_filters
from django.http import HttpResponse, QueryDict
from rest_framework import filters, mixins, serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.viewsets import GenericViewSet

from coreapp import compilers, platforms
from ..compiler_wrapper import CompilationResult, CompilerWrapper, DiffResult
from ..decompiler_wrapper import DecompilerWrapper
from ..compilers import Language

from ..decorators.django import condition

from ..diff_wrapper import DiffWrapper
from ..error import CompilationError
from ..middleware import Request
from ..models.github import GitHubRepo, GitHubRepoBusyException
from ..models.project import Project, ProjectFunction
from ..models.scratch import Asm, Scratch
from ..platforms import Platform
from ..serializers import (
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


def compile_scratch(scratch: Scratch) -> CompilationResult:
    try:
        return CompilerWrapper.compile_code(
            compilers.from_id(scratch.compiler_config.compiler),
            scratch.compiler_config.assembler_flags,
            scratch.compiler_config.compiler_flags,
            scratch.source_code,
            scratch.context,
            scratch.diff_label,
        )
    except CompilationError as e:
        return CompilationResult(b"", str(e))


def diff_compilation(scratch: Scratch, compilation: CompilationResult) -> DiffResult:
    return DiffWrapper.diff(
        scratch.target_assembly,
        platforms.from_id(scratch.compiler_config.platform),
        scratch.diff_label,
        bytes(compilation.elf_object),
        diff_flags=scratch.compiler_config.diff_flags,
    )


def update_scratch_score(scratch: Scratch, diff: DiffResult) -> None:
    """
    Given a scratch and a diff, update the scratch's score
    """

    score = diff.get("current_score", scratch.score)
    max_score = diff.get("max_score", scratch.max_score)
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
        try:
            # Attempt to process just the target asm so we can populate max_score
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

    platform: Optional[Platform] = None
    given_platform = data.get("platform")
    if given_platform:
        platform = platforms.from_id(given_platform)

    compiler = compilers.from_id(data["compiler"])
    project = data.get("project")
    rom_address = data.get("rom_address")

    if platform:
        if compiler.platform != platform:
            raise APIException(
                f"Compiler {compiler.id} is not compatible with platform {platform.id}",
                str(status.HTTP_400_BAD_REQUEST),
            )
    else:
        platform = compiler.platform

    if not platform:
        raise serializers.ValidationError("Unknown compiler")

    target_asm: str = data["target_asm"]
    context: str = data["context"]
    diff_label: str = data.get("diff_label", "")

    assert isinstance(target_asm, str)
    assert isinstance(context, str)
    assert isinstance(diff_label, str)

    asm = get_db_asm(target_asm)

    assembly = CompilerWrapper.assemble_asm(platform, asm)

    source_code = data.get("source_code")
    if not source_code:
        default_source_code = f"void {diff_label or 'func'}(void) {{\n    // ...\n}}\n"
        source_code = DecompilerWrapper.decompile(
            default_source_code, platform, asm.data, context, compiler
        )

    compiler_flags = data.get("compiler_flags", "")
    compiler_flags = CompilerWrapper.filter_compiler_flags(compiler_flags)

    diff_flags = data.get("diff_flags", [])

    preset = data.get("preset", "")
    if preset and not compilers.preset_from_name(preset):
        raise serializers.ValidationError("Unknown preset:" + preset)

    name = data.get("name", diff_label) or "Untitled"

    if allow_project and (project or rom_address):
        assert isinstance(project, str)
        assert isinstance(rom_address, int)

        project_obj: Optional[Project] = Project.objects.filter(slug=project).first()
        if not project_obj:
            raise serializers.ValidationError("Unknown project")

        repo: GitHubRepo = project_obj.repo
        if repo.is_pulling:
            raise GitHubRepoBusyException()

        project_function = ProjectFunction.objects.filter(
            project=project_obj, rom_address=rom_address
        ).first()
        if not project_function:
            raise serializers.ValidationError(
                "Function with given rom address does not exist in project"
            )
    else:
        project_function = None

    ser = ScratchSerializer(
        data={
            "name": name,
            "compiler": compiler.id,
            "compiler_flags": compiler_flags,
            "diff_flags": diff_flags,
            "preset": preset,
            "context": context,
            "diff_label": diff_label,
            "source_code": source_code,
        }
    )
    ser.is_valid(raise_exception=True)
    scratch = ser.save(
        target_assembly=assembly,
        platform=platform.id,
        project_function=project_function,
    )

    compile_scratch_update_score(scratch)

    return scratch


class ScratchPagination(CursorPagination):
    ordering = "-last_updated"
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class ScratchViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,
):
    queryset = Scratch.objects.all()
    pagination_class = ScratchPagination
    filter_fields = ["platform", "compiler"]
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
    ]
    search_fields = ["name", "diff_label"]

    def get_serializer_class(self) -> type[serializers.HyperlinkedModelSerializer]:
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
            ScratchSerializer(scratch, context={"request": request}).data,
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
        if scratch.owner != request.profile:
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
        if request.method == "POST":
            # TODO: use a serializer w/ validation
            if "compiler" in request.data:
                scratch.compiler_config.compiler = request.data["compiler"]
            if "assembler_flags" in request.data:
                scratch.compiler_config.assembler_flags = request.data[
                    "assembler_flags"
                ]
            if "compiler_flags" in request.data:
                scratch.compiler_config.compiler_flags = request.data["compiler_flags"]
            if "diff_flags" in request.data:
                scratch.compiler_config.diff_flags = request.data["diff_flags"]
            if "diff_label" in request.data:
                scratch.diff_label = request.data["diff_label"]
            if "source_code" in request.data:
                scratch.source_code = request.data["source_code"]
            if "context" in request.data:
                scratch.context = request.data["context"]

        compilation = compile_scratch(scratch)
        diff = diff_compilation(scratch, compilation)

        if request.method == "GET":
            update_scratch_score(scratch, diff)

        return Response(
            {
                "diff_output": diff,
                "compiler_output": compilation.errors,
                "success": compilation.elf_object is not None
                and len(compilation.elf_object) > 0,
            }
        )

    @action(detail=True, methods=["POST"])
    def decompile(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()
        context = request.data.get("context", "")
        compiler = compilers.from_id(
            request.data.get("compiler", scratch.compiler_config.compiler)
        )

        platform = platforms.from_id(scratch.compiler_config.platform)

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

        if not scratch.is_claimable():
            return Response({"success": False})

        profile = request.profile

        logger.debug(f"Granting ownership of scratch {scratch} to {profile}")

        scratch.owner = profile
        scratch.save()

        return Response({"success": True})

    @action(detail=True, methods=["POST"])
    def fork(self, request: Request, pk: str) -> Response:
        parent: Scratch = self.get_object()

        # TODO Needed for test_fork_scratch test?
        if isinstance(request.data, QueryDict):  # type: ignore
            request_data = request.data.dict()  # type: ignore
        else:
            request_data = request.data

        parent_data = ScratchSerializer(parent, context={"request": request}).data
        fork_data = {**parent_data, **request_data}

        ser = ScratchSerializer(data=fork_data, context={"request": request})
        ser.is_valid(raise_exception=True)
        new_scratch = ser.save(
            parent=parent,
            target_assembly=parent.target_assembly,
            platform=parent.compiler_config.platform,
            project_function=parent.project_function,
        )

        compile_scratch_update_score(new_scratch)

        return Response(
            ScratchSerializer(new_scratch, context={"request": request}).data,
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
            zip_f.writestr("target.s", scratch.target_assembly.source_asm.data)
            zip_f.writestr("target.o", scratch.target_assembly.elf_object)

            language = compilers.from_id(scratch.compiler_config.compiler).language
            src_ext = Language(language).get_file_extension()
            zip_f.writestr(f"code.{src_ext}", scratch.source_code)
            if scratch.context:
                zip_f.writestr(f"ctx.{src_ext}", scratch.context)

        # Prevent possible header injection attacks
        safe_name = re.sub(r"[^a-zA-Z0-9_:]", "_", scratch.name)[:64]

        return HttpResponse(
            zip_bytes.getvalue(),
            headers={
                "Content-Type": "application/zip",
                "Content-Disposition": f"attachment; filename={safe_name}.zip",
            },
        )

    @staticmethod
    def family_etag(request: Request, pk: Optional[str] = None) -> Optional[str]:
        scratch: Optional[Scratch] = Scratch.objects.filter(slug=pk).first()
        if scratch:
            family = Scratch.objects.filter(
                compiler_config__target_assembly=scratch.target_assembly,
                compiler_config__compiler=scratch.compiler_config.compiler_flags,
            )

            return str(hash((family, request.headers.get("Accept"))))
        else:
            return None

    @action(detail=True)
    @condition(etag_func=family_etag)
    def family(self, request: Request, pk: str) -> Response:
        scratch: Scratch = self.get_object()

        family = Scratch.objects.filter(
            compiler_config__target_assembly=scratch.target_assembly,
            compiler_config__compiler=scratch.compiler_config.compiler,
        ).order_by("creation_time")

        return Response(
            TerseScratchSerializer(family, many=True, context={"request": request}).data
        )


router = DefaultRouter(trailing_slash=False)
router.register(r"scratch", ScratchViewSet)
