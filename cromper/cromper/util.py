import hashlib
from typing import Any


def gen_hash(*args: Any) -> str:
    """Generate a hash from the given arguments."""
    return hashlib.sha256("".join(str(arg) for arg in args).encode()).hexdigest()
