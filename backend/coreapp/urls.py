from django.urls import path

from . import views

urlpatterns = [
    path('scratch', views.scratch, name='scratch'),
    path('scratch/<slug:slug>', views.scratch, name='scratch'),
    path('scratch/<slug:slug>/compile', views.compile, name='compile_scratch'),
    path('scratch/<slug:slug>/fork', views.fork, name='fork_scratch'),
]
