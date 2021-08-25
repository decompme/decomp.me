from coreapp.asm_diff_wrapper import AsmDifferWrapper
from coreapp.m2c_wrapper import M2CWrapper
from coreapp.compiler_wrapper import CompilerWrapper
from coreapp.serializers import ScratchCreateSerializer, ScratchSerializer
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
import logging

import hashlib

from .models import Profile, Asm, Scratch
from coreapp.models import gen_scratch_id


def get_db_asm(request_asm) -> Asm:
    h = hashlib.sha256(request_asm.encode()).hexdigest()
    asm, _ = Asm.objects.get_or_create(hash=h, defaults={
        "data": request_asm,
    })
    return asm


@api_view(["GET", "POST", "PATCH"])
def scratch(request, slug=None):
    """
    Get, create, or update a scratch
    """

    if request.method == "GET":
        if not slug:
            return Response("Missing slug", status=status.HTTP_400_BAD_REQUEST)

        db_scratch = get_object_or_404(Scratch, slug=slug)

        if not db_scratch.owner:
            # Give ownership to this profile
            profile = Profile.objects.filter(id=request.session.get("profile", None)).first()

            if not profile:
                profile = Profile()
                profile.save()
                request.session["profile"] = profile.id

            logging.debug(f"Granting ownership of scratch {db_scratch} to {profile}")

            db_scratch.owner = profile
            db_scratch.save()

        return Response({
            "scratch": ScratchSerializer(db_scratch).data,
            "is_yours": db_scratch.owner.id == request.session.get("profile", None),
        })

    elif request.method == "POST":
        if slug:
            return Response({"error": "Not allowed to POST with slug"}, status=status.HTTP_400_BAD_REQUEST)

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

        asm = get_db_asm(target_asm)

        as_opts = ""
        assembly, err = CompilerWrapper.assemble_asm(arch, as_opts, asm)
        if not assembly:
            error_msg = f"Error when assembling target asm: {err}"
            logging.error(error_msg)
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        source_code = data.get("source_code")
        if not source_code:
            source_code = "void func() {}\n"
            if arch == "mips":
                source_code = M2CWrapper.decompile(asm.data, context) or source_code

        cc_opts = ""
        compile_command = data.get("compile_command")
        if compiler and compile_command:
            cc_opts = CompilerWrapper.cc_opts_from_command(compiler, compile_command)

        scratch_data = {
            "slug": gen_scratch_id(),
            "arch": arch,
            "compiler": compiler,
            "cc_opts": cc_opts,
            "as_opts": as_opts,
            "context": context,
            "source_code": source_code,
            "target_assembly": assembly.pk,
        }

        serializer = ScratchSerializer(data=scratch_data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    elif request.method == "PATCH":
        if not slug:
            return Response({"error": "Missing slug"}, status=status.HTTP_400_BAD_REQUEST)

        required_params = ["compiler", "cc_opts", "source_code", "context"]

        for param in required_params:
            if param not in request.data:
                return Response({"error": f"Missing parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        db_scratch = get_object_or_404(Scratch, slug=slug)

        if db_scratch.owner and db_scratch.owner.id != request.session.get("profile", None):
            return Response(status=status.HTTP_403_FORBIDDEN)

        # TODO validate
        db_scratch.compiler = request.data["compiler"]
        db_scratch.cc_opts = request.data["cc_opts"]
        db_scratch.source_code = request.data["source_code"]
        db_scratch.context = request.data["context"]
        db_scratch.save()
        return Response(status=status.HTTP_202_ACCEPTED)


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

    diff_output = ""
    if compilation:
        diff_output = AsmDifferWrapper.diff(scratch.target_assembly, compilation)

    response_obj = {
        "diff_output": diff_output,
        "errors": errors,
    }

    return Response(response_obj)

@api_view(["POST"])
def fork(request, slug):
    required_params = ["compiler", "cc_opts", "source_code", "context"]

    for param in required_params:
        if param not in request.data:
            return Response({"error": f"Missing parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

    parent_scratch = Scratch.objects.filter(slug=slug).first()

    if not parent_scratch:
        return Response({"error": "Parent scratch does not exist"}, status=status.HTTP_400_BAD_REQUEST)

    # TODO validate
    compiler = request.data["compiler"]
    cc_opts = request.data["cc_opts"]
    code = request.data["source_code"]
    context = request.data["context"]

    new_scratch = Scratch(
        compiler=compiler,
        cc_opts=cc_opts,
        target_assembly=parent_scratch.target_assembly,
        source_code=code,
        context=context,
        original_context=parent_scratch.original_context,
        parent=parent_scratch,
    )
    new_scratch.save()
    return Response(ScratchSerializer(new_scratch).data, status=status.HTTP_201_CREATED)
