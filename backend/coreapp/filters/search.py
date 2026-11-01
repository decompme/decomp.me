from rest_framework.filters import SearchFilter
from rest_framework.request import Request
from rest_framework.serializers import ValidationError

MIN_SEARCH_QUERY_LENGTH = 3
MAX_SEARCH_QUERY_LENGTH = 64


def validate_search_query(query: str) -> str:
    stripped_query = query.strip()
    if 0 < len(stripped_query) < MIN_SEARCH_QUERY_LENGTH:
        raise ValidationError(
            {"search": f"Must be at least {MIN_SEARCH_QUERY_LENGTH} characters."}
        )

    if len(query) > MAX_SEARCH_QUERY_LENGTH:
        raise ValidationError(
            {"search": f"Must be at most {MAX_SEARCH_QUERY_LENGTH} characters."}
        )

    return query


class NonEmptySearchFilter(SearchFilter):
    # Skip empty values to avoid LIKE "%%" clauses
    def get_search_terms(self, request: Request) -> list[str]:
        validate_search_query(request.query_params.get(self.search_param, ""))

        params = super().get_search_terms(request)
        return [term for term in params if term.strip() != ""]
