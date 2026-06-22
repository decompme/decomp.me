import base64
import binascii

from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from coreapp import compilers, platforms

from ..compiler_wrapper import CompilerWrapper
from ..diff_wrapper import DiffWrapper
from ..error import CompilationError, DiffError
from ..libraries import Library
from ..models.scratch import Assembly
from ..serializers import LibrarySerializer
from ..wrapper_result import CompilationResult, DiffResult


def to_base64(obj: bytes) -> str:
    return base64.b64encode(obj).decode("utf-8")


def from_base64(value: str) -> bytes:
    try:
        return base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError):
        raise serializers.ValidationError("Expected a base64-encoded object")


class CompileSerializer(serializers.Serializer[None]):
    compiler_id = serializers.CharField()
    compiler_flags = serializers.CharField(allow_blank=True, required=False, default="")
    code = serializers.CharField(allow_blank=True, trim_whitespace=False)
    context = serializers.CharField(  # type: ignore[assignment]
        allow_blank=True, required=False, default="", trim_whitespace=False
    )
    function = serializers.CharField(allow_blank=True, required=False, default="")
    libraries = serializers.ListField(child=LibrarySerializer(), required=False)

    def validate_compiler_id(self, compiler_id: str) -> str:
        try:
            compilers.from_id(compiler_id)
        except Exception:
            raise serializers.ValidationError(f"Unknown compiler: {compiler_id}")
        return compiler_id


class DiffSerializer(serializers.Serializer[None]):
    platform_id = serializers.CharField()
    diff_label = serializers.CharField(allow_blank=True, required=False, default="")
    diff_flags = serializers.ListField(child=serializers.CharField(), required=False)
    target_elf = serializers.CharField(allow_blank=True)
    compiled_elf = serializers.CharField(allow_blank=True, required=False, default="")

    def validate_platform_id(self, platform_id: str) -> str:
        try:
            platforms.from_id(platform_id)
        except Exception:
            raise serializers.ValidationError(f"Unknown platform: {platform_id}")
        return platform_id

    def validate(self, data: dict[str, object]) -> dict[str, object]:
        target_elf = data["target_elf"]
        compiled_elf = data.get("compiled_elf", "")
        assert isinstance(target_elf, str)
        assert isinstance(compiled_elf, str)

        data["target_elf"] = from_base64(target_elf)
        data["compiled_elf"] = from_base64(compiled_elf)
        return data


class CompileView(APIView):
    def post(self, request: Request) -> Response:
        ser = CompileSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            compilation = CompilerWrapper.compile_code(
                compilers.from_id(data["compiler_id"]),
                data.get("compiler_flags", ""),
                data["code"],
                data.get("context", ""),
                data.get("function", ""),
                tuple(Library(**lib) for lib in data.get("libraries", [])),
            )
        except (CompilationError, serializers.ValidationError) as e:
            compilation = CompilationResult(b"", str(e))

        return Response(
            {
                "success": True,
                "elf_object": to_base64(compilation.elf_object),
                "errors": compilation.errors,
            }
        )


class DiffView(APIView):
    def post(self, request: Request) -> Response:
        ser = DiffSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        platform = platforms.from_id(data["platform_id"])
        target_assembly = Assembly(
            hash="",
            arch=platform.arch,
            elf_object=data["target_elf"],
        )

        try:
            diff = DiffWrapper.diff(
                target_assembly,
                platform,
                data.get("diff_label", ""),
                data.get("compiled_elf", b""),
                diff_flags=data.get("diff_flags", []),
            )
        except DiffError as e:
            diff = DiffResult(None, str(e))

        return Response(
            {
                "success": True,
                "result": diff.result,
                "errors": diff.errors,
            }
        )
