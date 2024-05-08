import django_filters
from rest_framework.pagination import CursorPagination
from rest_framework import mixins, filters
from rest_framework.viewsets import GenericViewSet
from django.http import HttpResponseForbidden
from ..models.scratch import Scratch
from ..models.comment import Comment


class CommentPagination(CursorPagination):
    ordering = "-creation_time"
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class CommentViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,  # type: ignore
):
    queryset = Comment.objects.all()
    pagination_class = CommentPagination
    filterset_fields = ["scratch"]
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
    ]

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return HttpResponseForbidden()

        # Look up the author we're interested in.
        self.object = self.get_object()
        # Actually record interest somehow here!

        return HttpResponseRedirect(
            reverse("author-detail", kwargs={"pk": self.object.pk})
        )
