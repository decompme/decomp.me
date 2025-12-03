from rest_framework.filters import SearchFilter
from rest_framework.request import Request


class NonEmptySearchFilter(SearchFilter):
    # Skip empty values to avoid LIKE "%%" clauses
    def get_search_terms(self, request: Request) -> list[str]:
        params = super().get_search_terms(request)
        return [term for term in params if term.strip() != ""]
