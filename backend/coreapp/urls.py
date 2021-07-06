from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('compile', views.compile, name='compile'),
    path('compiler_configs', views.compiler_configs, name='compiler_configs'),
    path('scratch/', views.scratch, name='scratch'),
    path('scratch/<slug:slug>/', views.scratch, name='scratch'),
]
