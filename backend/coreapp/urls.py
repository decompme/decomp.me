from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('scratch', views.scratch, name='scratch'),
    path('scratch/<slug:slug>', views.scratch, name='scratch'),
    path('scratch/<slug:slug>/compile', views.compile, name='compile_scratch'),
]
