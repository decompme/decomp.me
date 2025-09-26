from django.urls import path

from rest_framework.routers import DefaultRouter

from coreapp.views import (
    library,
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
    path("library", library.LibraryDetail.as_view(), name="library"),
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
    path("libraries", library.LibraryDetail.as_view(), name="libraries"),
]
