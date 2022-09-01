from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("", include("coreapp.urls")),
    path("api/", include("coreapp.urls_api")),
    path("admin/", admin.site.urls),
]
