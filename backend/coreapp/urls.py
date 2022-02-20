from django.urls import path

from coreapp.views import compilers, scratch, user, project

urlpatterns = [
    path("compilers", compilers.CompilersDetail.as_view(), name="compilers"),
    *scratch.router.urls,
    *project.router.urls,
    path("user", user.CurrentUser.as_view(), name="current-user"),
    path(
        "user/scratches",
        user.CurrentUserScratchList.as_view(),
        name="current-user-scratches",
    ),
    path("users/<slug:username>", user.user, name="user-detail"),
    path(
        "users/<slug:username>/scratches",
        user.UserScratchList.as_view(),
        name="user-scratches",
    ),
]
