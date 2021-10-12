from django.urls import path

from . import views

urlpatterns = [
    path('compilers', views.CompilersDetail.as_view(), name='compilers'),
    path('scratch', views.create_scratch, name='scratch'),
    path('scratch/<slug:slug>', views.ScratchDetail.as_view(), name='scratch-detail'),
    path('scratch/<slug:slug>/compile', views.compile, name='compile_scratch'),
    path('scratch/<slug:slug>/claim', views.ScratchClaim.as_view(), name='scratch-claim'),
    path('scratch/<slug:slug>/fork', views.fork, name='fork_scratch'),
    path('user', views.CurrentUser.as_view(), name="current-user"),
    path('users/<slug:username>', views.user, name="user-detail"),
]
