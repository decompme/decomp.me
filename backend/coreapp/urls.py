from django.urls import path
from rest_framework.routers import DefaultRouter

from coreapp.views import (
    compiler,
    health,
    library,
    preset,
    project,
    scratch,
    scratch_count,
    search,
    stats,
    user,
)

router = DefaultRouter(trailing_slash=False)
router.register(r"scratch", scratch.ScratchViewSet)
router.register(r"preset", preset.PresetViewSet)
router.register(r"project", project.ProjectViewSet)

urlpatterns = [
    *router.urls,
    path("healthz", health.HealthCheck.as_view(), name="healthz"),
    path("stats", stats.StatsDetail.as_view(), name="stats"),
    path(
        "scratch-count", scratch_count.ScratchCountView.as_view(), name="scratch-count"
    ),
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
    path(
        "users/<slug:username>/presets",
        user.UserPresetList.as_view(),
        name="user-presets",
    ),
    path(
        "users/<slug:username>/stats",
        user.UserScratchStats.as_view(),
        name="user-scratch-stats",
    ),
    path("search", search.SearchViewSet.as_view(), name="search"),
    path("compilers", compiler.CompilerDetail.as_view(), name="compilers"),
    path("libraries", library.LibraryDetail.as_view(), name="libraries"),
]
