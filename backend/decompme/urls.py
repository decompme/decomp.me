from django.contrib import admin
from django.urls import include, path

from rest_framework import routers

from coreapp import views

router = routers.DefaultRouter()
router.register(r"compilers", views.CompilerViewSet)

urlpatterns = [
    # path('', include(router.urls)),
    path('', include('coreapp.urls')),
    path('admin/', admin.site.urls),
]
