import hashlib
import logging
import time
import dill

import django

import multiprocessing
import functools
import platform

from typing import Tuple, TypeVar, Callable, Any, cast
from queue import Queue

logger = logging.getLogger(__name__)

_startup_time = int(time.time())
logger.info("Startup time: %s", _startup_time)


def gen_hash(key: Tuple[str, ...]) -> str:
    return hashlib.sha256(str(key + (_startup_time,)).encode("utf-8")).hexdigest()


F = TypeVar("F", bound=Callable[..., Any])

# Python 3.10+ should allow this to be typed more concretely
# (see https://mypy.readthedocs.io/en/stable/generics.html#declaring-decorators)

# Windows requires multiprocessing processes to be in top-level scope
def worker(queue: Queue[Any], func: bytes, args: Any, kwargs: Any) -> Any:
    try:
        if platform.system() == "Windows":
            # Windows also uses spawn instead of fork.
            # This means while on Linux we inherit a clone of a fully set up environment,
            # on Windows, we have to explicity reinitalize the bare minimum
            # (i.e. the django app registry)
            django.setup()

        ret = dill.loads(func)(*args, **kwargs)
        queue.put(ret)
    except Exception as e:
        queue.put(e)


def exception_on_timeout(timeout_seconds: float) -> Callable[[F], F]:
    def timeout_inner(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # If the timeout is 0 or less, call the function directly without a timeout
            if timeout_seconds <= 0:
                return func(*args, **kwargs)

            queue: Queue[Any] = multiprocessing.Queue()

            # On Windows, multiprocessing uses pickle under the hood to serialize arguments
            # It doesn't play nicely with arbitary functions, so we explicitly use its
            # more versatile cousin (dill) to handle the serialization ourselves
            p = multiprocessing.Process(
                target=worker, args=(queue, dill.dumps(func), args, kwargs)
            )
            p.start()
            p.join(timeout_seconds)

            if p.is_alive():
                # The process has hanged - terminate, and throw an error
                p.terminate()
                p.join()
                raise TimeoutError("Process timed out")
            else:
                ret = queue.get()
                if isinstance(ret, Exception):
                    raise ret
                return ret

        return cast(F, wrapper)

    return timeout_inner
