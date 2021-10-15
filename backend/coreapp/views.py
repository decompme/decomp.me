from coreapp.asm_diff_wrapper import AsmDifferWrapper
from coreapp.m2c_wrapper import M2CWrapper
from coreapp.compiler_wrapper import CompilerWrapper
from coreapp.serializers import ScratchCreateSerializer, ScratchSerializer, ScratchWithMetadataSerializer, serialize_profile
from django.shortcuts import get_object_or_404
from django.contrib.auth import logout
from django.utils.timezone import now
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view

import hashlib
import logging
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from .models import Profile, Asm, Scratch, gen_scratch_id
from .github import GitHubUser
from .middleware import Request
from .decorators.django import condition

boot_time = now()

def get_db_asm(request_asm) -> Asm:
    h = hashlib.sha256(request_asm.encode()).hexdigest()
    asm, _ = Asm.objects.get_or_create(hash=h, defaults={
        "data": request_asm,
    })
    return asm

class CompilersDetail(APIView):
    @condition(last_modified_func=lambda request: boot_time)
    def head(self, request: Request):
        return Response()

    @condition(last_modified_func=lambda request: boot_time)
    def get(self, request: Request):
        return Response({
            # compiler_ids is used by the permuter
            "compiler_ids": CompilerWrapper.available_compiler_ids(),
            "compilers": CompilerWrapper.available_compilers(),
            "arches": CompilerWrapper.available_arches(),
        })

def update_scratch_score(scratch: Scratch):
    """
    Compile a scratch and save its score
    """

    # TODO remove check once compiler can't be null
    if scratch.compiler:
        compilation, errors = CompilerWrapper.compile_code(scratch.compiler, scratch.cc_opts, scratch.source_code, scratch.context)

        diff_output: Optional[Dict[str, Any]] = None
        current_score = -1

        if compilation:
            diff_output = AsmDifferWrapper.diff(scratch.target_assembly, compilation, scratch.diff_label)
            current_score = -1 if not diff_output else diff_output.get("current_score", -1)

        scratch.score = current_score
        scratch.save()

class ScratchDetail(APIView):
    # type-ignored due to python/mypy#7778
    def scratch_last_modified(request: Request, slug: str) -> Optional[datetime]: # type: ignore
        scratch: Optional[Scratch] = Scratch.objects.filter(slug=slug).first()
        if scratch:
            return scratch.last_updated
        else:
            return None

    def scratch_etag(request: Request, slug: str) -> Optional[str]: # type: ignore
        scratch: Optional[Scratch] = Scratch.objects.filter(slug=slug).first()
        if scratch:
            return str(hash(scratch))
        else:
            return None

    scratch_condition = condition(last_modified_func=scratch_last_modified, etag_func=scratch_etag)

    @scratch_condition
    def head(self, request: Request, slug: str):
        get_object_or_404(Scratch, slug=slug) # for 404
        return Response()

    @scratch_condition
    def get(self, request: Request, slug: str):
        scratch = get_object_or_404(Scratch, slug=slug)
        response = self.head(request, slug)
        response.data = ScratchWithMetadataSerializer(scratch, context={ "request": request }).data
        return response

    def patch(self, request: Request, slug: str):
        recompile_params = ["compiler", "cc_opts", "source_code", "context"]
        valid_params = ["name", "description", *recompile_params]
        recompile = False

        for param in request.data:
            if param not in valid_params:
                return Response({"error": f"Invalid parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)
            if param in recompile_params:
                recompile = True

        scratch = get_object_or_404(Scratch, slug=slug)

        if scratch.owner and scratch.owner != request.profile:
            response = self.get(request, slug)
            response.status_code = status.HTTP_403_FORBIDDEN
            return response

        for param in request.data:
            if hasattr(scratch, param):
                setattr(scratch, param, request.data[param])
            else:
                Response({"error": f"Invalid parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        scratch.save()

        if recompile:
            update_scratch_score(scratch)

        return self.get(request, slug)

class ScratchClaim(APIView):
    def post(self, request: Request, slug: str):
        scratch = get_object_or_404(Scratch, slug=slug)

        if scratch.owner is not None:
            return Response({ "success": False })

        profile = request.profile

        logging.debug(f"Granting ownership of scratch {scratch} to {profile}")

        scratch.owner = profile
        scratch.save()

        return Response({ "success": True })

@api_view(["POST"])
def create_scratch(request):
    """
    Create a scratch
    """

    ser = ScratchCreateSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    data = ser.validated_data

    arch = data.get("arch")
    compiler = data.get("compiler", "")
    if compiler:
        arch = CompilerWrapper.arch_from_compiler(compiler)
        if not arch:
            raise serializers.ValidationError("Unknown compiler")
    elif not arch:
        raise serializers.ValidationError("arch not provided")

    target_asm = data["target_asm"]
    context = data["context"]
    diff_label = data.get("diff_label")

    assert isinstance(target_asm, str)
    assert isinstance(context, str)
    assert diff_label is None or isinstance(diff_label, str)

    asm = get_db_asm(target_asm)

    assembly, err = CompilerWrapper.assemble_asm(arch, asm)
    if not assembly:
        assert isinstance(err, str)

        errors = []

        for line in err.splitlines():
            if "asm.s:" in line:
                errors.append(line[line.find("asm.s:") + len("asm.s:") :].strip())
            else:
                errors.append(line)

        return Response({
            "error": "as_error",
            "error_description": "Error when assembling target asm",
            "as_errors": errors,
        }, status=status.HTTP_400_BAD_REQUEST)

    source_code = data.get("source_code")
    if not source_code:
        source_code = f"void {diff_label or 'func'}(void) {{\n    // ...\n}}\n"
        if arch in ["mips", "mipsel"]:
            source_code = M2CWrapper.decompile(asm.data, context) or source_code

    cc_opts = data.get("compiler_flags", "")
    if compiler and cc_opts:
        cc_opts = CompilerWrapper.filter_cc_opts(compiler, cc_opts)

    slug = gen_scratch_id()

    name = diff_label if diff_label else ""

    scratch_data = {
        "slug": slug,
        "name": name,
        "compiler": compiler,
        "arch": arch,
        "cc_opts": cc_opts,
        "context": context,
        "diff_label": diff_label,
        "source_code": source_code,
        "target_assembly": assembly.pk,
    }

    serializer = ScratchSerializer(data=scratch_data)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    scratch = Scratch.objects.get(slug=scratch_data["slug"])

    update_scratch_score(scratch)

    return Response(
        ScratchWithMetadataSerializer(scratch, context={ "request": request }).data,
        status=status.HTTP_201_CREATED,
    )

@api_view(["POST"])
def compile(request, slug):
    required_params = ["compiler", "cc_opts", "source_code"]

    for param in required_params:
        if param not in request.data:
            return Response({"error": f"Missing parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

    # TODO validate
    compiler = request.data["compiler"]
    cc_opts = request.data["cc_opts"]
    code = request.data["source_code"]
    context = request.data.get("context", None)

    scratch = Scratch.objects.get(slug=slug)

    # Get the context from the backend if it's not provided
    if not context:
        logging.debug("No context provided, getting from backend")
        context = scratch.context

    compilation, errors = CompilerWrapper.compile_code(compiler, cc_opts, code, context)

    diff_output: Optional[Dict[str, Any]] = None
    if compilation:
        diff_output = AsmDifferWrapper.diff(scratch.target_assembly, compilation, scratch.diff_label)

    return Response({
        "diff_output": diff_output,
        "errors": errors,
    })

@api_view(["POST"])
def fork(request, slug):
    required_params = ["compiler", "arch", "cc_opts", "source_code", "context"]

    for param in required_params:
        if param not in request.data:
            return Response({"error": f"Missing parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

    parent_scratch = Scratch.objects.filter(slug=slug).first()

    if not parent_scratch:
        return Response({"error": "Parent scratch does not exist"}, status=status.HTTP_400_BAD_REQUEST)

    # TODO validate
    compiler = request.data["compiler"]
    arch = request.data["arch"]
    cc_opts = request.data["cc_opts"]
    code = request.data["source_code"]
    context = request.data["context"]

    new_scratch = Scratch(
        compiler=compiler,
        arch=arch,
        cc_opts=cc_opts,
        target_assembly=parent_scratch.target_assembly,
        source_code=code,
        context=context,
        original_context=parent_scratch.original_context,
        diff_label=parent_scratch.diff_label,
        parent=parent_scratch,
    )
    new_scratch.save()

    update_scratch_score(new_scratch)

    return Response(
        ScratchSerializer(new_scratch, context={ "request": request }).data,
        status=status.HTTP_201_CREATED,
    )

class CurrentUser(APIView):
    """
    View to access the current user profile.
    """

    def get(self, request: Request):
        user = serialize_profile(request, request.profile)
        assert user["is_you"] == True
        return Response(user)

    def post(self, request: Request):
        """
        Login if the 'code' parameter is provided. Log out otherwise.
        """

        if "code" in request.data:
            GitHubUser.login(request, request.data["code"])

            return Response(serialize_profile(request, request.profile))
        else:
            logout(request)

            profile = Profile()
            profile.save()
            request.profile = profile
            request.session["profile_id"] = request.profile.id

            return Response(serialize_profile(request, request.profile))

@api_view(["GET"])
def user(request, username):
    """
    Gets a user's basic data
    """

    return Response(serialize_profile(request, get_object_or_404(Profile, user__username=username)))
