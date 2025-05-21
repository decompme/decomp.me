from django.urls import path

from rest_framework.routers import DefaultRouter

from coreapp.views import (
    compiler,
    library,
    platform,
    preset,
    stats,
    project,
    scratch,
    user,
    search,
)

router = DefaultRouter(trailing_slash=False)
router.register(r"scratch", scratch.ScratchViewSet)
router.register(r"preset", preset.PresetViewSet)
router.register(r"project", project.ProjectViewSet)

urlpatterns = [
    *router.urls,
    path("compiler", compiler.CompilerDetail.as_view(), name="compiler"),
    path(
        "compiler/<str:platform>/<str:compiler>",
        compiler.SingleCompilerDetail.as_view(),
        name="available-compiler",
    ),
    path(
        "compiler/<str:platform>",
        compiler.SingleCompilerDetail.as_view(),
        name="available-compilers",
    ),
    path("library", library.LibraryDetail.as_view(), name="library"),
    path("platform", platform.PlatformDetail.as_view(), name="platform"),
    path(
        "platform/<slug:id>",
        platform.single_platform,
        name="platform-detail",
    ),
    path("stats", stats.StatsDetail.as_view(), name="stats"),
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
    path("search", search.SearchViewSet.as_view(), name="search"),
    # TODO: remove (decomp-permuter still uses /compilers)
    path("compilers", compiler.CompilerDetail.as_view(), name="compilers"),
    path("libraries", library.LibraryDetail.as_view(), name="libraries"),
]
