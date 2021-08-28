from coreapp.asm_diff_wrapper import AsmDifferWrapper
from coreapp.m2c_wrapper import M2CWrapper
from coreapp.compiler_wrapper import CompilerWrapper
from coreapp.serializers import ScratchCreateSerializer, ScratchSerializer, ScratchWithMetadataSerializer, ProfileSerializer
from django.shortcuts import get_object_or_404
from django.conf import settings
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
import logging

import hashlib
import requests
from github3api import GitHubAPI

from .models import Profile, Asm, Scratch, GitHubUserChangeException, GitHubUserHasExistingProfileException
from coreapp.models import gen_scratch_id


def get_db_asm(request_asm) -> Asm:
    h = hashlib.sha256(request_asm.encode()).hexdigest()
    asm, _ = Asm.objects.get_or_create(hash=h, defaults={
        "data": request_asm,
    })
    return asm


@api_view(["GET"])
def compilers(request):
    return Response({
        "compiler_ids": CompilerWrapper.available_compilers(),
    })


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
            "scratch": ScratchWithMetadataSerializer(db_scratch).data,
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
            source_code = "void func() {}\n"
            if arch == "mips":
                source_code = M2CWrapper.decompile(asm.data, context) or source_code

        cc_opts = data.get("compiler_flags", "")
        if compiler and cc_opts:
            cc_opts = CompilerWrapper.filter_cc_opts(compiler, cc_opts)

        scratch_data = {
            "slug": gen_scratch_id(),
            "arch": arch,
            "compiler": compiler,
            "cc_opts": cc_opts,
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

@api_view(["GET", "POST"])
def user_current(request, slug=None):
    """
    Get the logged-in user, or sign in with GitHub
    """

    profile = Profile.objects.filter(id=request.session.get("profile", None)).first()

    if not profile:
        profile = Profile()
        profile.save()
        request.session["profile"] = profile.id

    # sign in
    if request.method == "POST":
        if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
            return Response({
                "error": "GitHub sign-in not configured"
            }, status=status.HTTP_501_NOT_IMPLEMENTED)

        required_params = ["code"]

        for param in required_params:
            if param not in request.data:
                return Response({"error": f"Missing parameter: {param}"}, status=status.HTTP_400_BAD_REQUEST)

        logging.debug("Attempting GitHub oauth login")

        response = requests.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": request.data["code"],
            },
            headers={ 'Accept': 'application/json' },
        ).json()

        error = response.get("error")
        if error == None:
            access_token = response["access_token"]

            profile.github_access_token = access_token

            try:
                assert profile.load_fields_from_github(always=True)
                logging.debug("Connected existing profile to new GitHub user")
            except GitHubUserChangeException:
                # The token was for a different user than the one associated with the current profile,
                # so make a new profile for this one.
                profile = Profile()
                profile.github_access_token = access_token
                assert profile.load_fields_from_github(always=True)
                logging.debug("Connected new profile to new GitHub user")
            except GitHubUserHasExistingProfileException as e:
                profile = e.profile

                # This isn't strictly necessary, but we might as well use the renewed access token.
                profile.github_access_token = access_token
                assert profile.load_fields_from_github(always=True)
                logging.debug("Swapped to existing profile for existing GitHub user")

            profile.save()
            request.session["profile"] = profile.id
        elif error == "bad_verification_code":
            return Response({
                "error": "Invalid or expired GitHub OAuth verification code",
            }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            raise Exception(f"Unknown GitHub login error: {error} - {response['error_description']}")

    else:
        profile.load_fields_from_github()
        profile.save()

    return Response({
        "user": ProfileSerializer(profile).data,
    })

@api_view(["GET"])
def user(request, username):
    """
    Gets a user's basic data
    """

    user = get_object_or_404(Profile, username=username)
    return Response(ProfileSerializer(user).data)
