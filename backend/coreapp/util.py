import hashlib
from typing import Tuple

def gen_hash(key: Tuple[str, ...]) -> str:
    return hashlib.sha256(str(key).encode('utf-8')).hexdigest()
