from django.urls import path

from . import views

urlpatterns = [
    path('compilers', views.compilers, name='compilers'),
    path('scratch', views.scratch, name='scratch'), # TODO make this into its own view
    path('scratch/<slug:slug>', views.scratch, name='scratch-detail'),
    path('scratch/<slug:slug>/compile', views.compile, name='compile_scratch'),
    path('scratch/<slug:slug>/fork', views.fork, name='fork_scratch'),
    path('user', views.CurrentUser.as_view()),
    path('users/<slug:username>', views.user, name="user-detail"),
]
