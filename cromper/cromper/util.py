import hashlib
import random
import string
from typing import Any


def gen_hash(*args: Any) -> str:
    """Generate a hash from the given arguments."""
    return hashlib.sha256("".join(str(arg) for arg in args).encode()).hexdigest()


def random_string(size=6, chars=string.ascii_lowercase + string.digits):
    return "".join(random.choice(chars) for _ in range(size))
