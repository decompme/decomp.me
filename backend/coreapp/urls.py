from django.urls import path

from coreapp.views import compilers, scratch, user

urlpatterns = [
    path('compilers', compilers.CompilersDetail.as_view(), name='compilers'),
    path('scratch', scratch.create_scratch, name='scratch'),
    path('scratch/<slug:slug>', scratch.ScratchDetail.as_view(), name='scratch-detail'),
    path('scratch/<slug:slug>/compile', scratch.compile, name='scratch-compile'),
    path('scratch/<slug:slug>/claim', scratch.ScratchClaim.as_view(), name='scratch-claim'),
    path('scratch/<slug:slug>/fork', scratch.fork, name='scratch-fork'),
    path('scratch/<slug:slug>/export', scratch.ScratchExport.as_view(), name='scratch-export'),
    path('user', user.CurrentUser.as_view(), name="current-user"),
    path('users/<slug:username>', user.user, name="user-detail"),
]
