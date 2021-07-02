from django.http import HttpResponse
from django.http.response import Http404
from django.shortcuts import get_object_or_404

from coreapp.models import Function, Project

def index(request):
    return HttpResponse("This is the index page.")

def project(request, project_slug):
    p = get_object_or_404(Project, slug=project_slug)
    functions = Function.objects.filter(project=p)

    body = f"Project page for project {p.name}:<br><br>"
    body += "Functions:<br>"
    for function in functions:
        body += function.name + "<br>"

    return HttpResponse(body)

def function(request, project_slug, function_name):
    p = get_object_or_404(Project, slug=project_slug)
    f = get_object_or_404(Function, project=p, name=function_name)

    f.visits += 1
    f.save()

    body = f"Function {f.name}:<br><br>"
    body += f"Project: {p.name}<br>"
    body += f"asm: {f.fn_text}<br>"
    body += f"visits: {f.visits}<br>"

    return HttpResponse(body)
