from django.http import HttpResponse
from django.http.response import Http404
from django.shortcuts import get_object_or_404

from coreapp.models import Function, Project

def index(request):
    return HttpResponse("This is the index page.")

def project(request, project_slug):
    p = get_object_or_404(Project, slug=project_slug)
    
    return HttpResponse(f"Project page for project {p.name}")

def function(request, project_slug, function_name):
    p = get_object_or_404(Project, slug=project_slug)
    f = get_object_or_404(Function, project=p, name=function_name)
    
    return HttpResponse(f"Function page for function {f.name} in project {p.name}")
