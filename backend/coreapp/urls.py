from django.urls import path

from .views.public import index

urlpatterns = [
    path("", index.index)
]
