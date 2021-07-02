from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path("project/<str:project_slug>/", views.project, name="project"),
    path("project/<str:project_slug>/<str:function_name>", views.function, name="function")
]