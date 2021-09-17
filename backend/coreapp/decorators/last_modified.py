from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import APIException

import logging
from datetime import datetime, timezone

from ..middleware import Request

TIME_FORMAT = "%a, %d %b %Y %H:%M:%S GMT"

# Request-handler decorator which:
# - handles the If-Modified-Since header (return 301 if Last-Modified <= If-Modified-Since)
# - attaches the Last-Modified header to responses
#
# Pass a function that returns the last-modified datetime given the request args/kwargs.
#
# See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Modified-Since
def last_modified(get_last_modified: callable):
    def gethandler(get_response: callable):
        def makerequest(*args, **kwargs):
            # Get the request out of args.
            # `handler` could be a class method (self, REQUEST) or just a plain function (REQUEST).
            request = args[1] if isinstance(args[1], Request) else args[0]
            assert isinstance(request, Request)

            # Handle If-Modified-Since
            if_modified_since = request.headers.get("If-Modified-Since")
            if isinstance(if_modified_since, str) and request.method in ["GET", "HEAD"]:
                last_modified = get_last_modified(*args, **kwargs)
                assert isinstance(last_modified, datetime)

                # If-Modified-Since lacks the granularity of microseconds, so we need to floor modify_time
                last_modified = last_modified.replace(microsecond=0)

                try:
                    if_modified_since = datetime.strptime(if_modified_since, TIME_FORMAT)
                except ValueError:
                    raise InvalidIfModifiedSince()

                # strptime above didn't set the timezone to GMT (aka UTC) so we need to do it manually
                # note that the HTTP spec says that all dates must be in GMT
                if_modified_since = if_modified_since.replace(tzinfo=timezone.utc)

                logging.debug(f"Last-Modified: {last_modified}")
                logging.debug(f"If-Modified-Since: {if_modified_since}")

                if if_modified_since >= last_modified:
                    logging.debug("= Not modified, skipping get_response")
                    response = Response(status=status.HTTP_304_NOT_MODIFIED)
                    response.headers["Last-Modified"] = last_modified.strftime(TIME_FORMAT)
                    return response
                else:
                    logging.debug("= Modified")

            # TODO: handle If-Unmodified-Since for post/put/patch/delete methods

            # Set Last-Modified header on response
            response = get_response(*args, **kwargs)
            assert isinstance(response, Response)

            last_modified = get_last_modified(*args, **kwargs)
            assert isinstance(last_modified, datetime)

            response.headers["Last-Modified"] = last_modified.strftime(TIME_FORMAT)

            return response
        return makerequest
    return gethandler

class InvalidIfModifiedSince(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_if_modified_since"
    default_detail = f"Invalid If-Modified-Since header; must match strftime format '{TIME_FORMAT}'"
