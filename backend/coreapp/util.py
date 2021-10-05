import hashlib
import logging
import time
from typing import Tuple

logger = logging.getLogger(__name__)

_startup_time = int(time.time())
logger.info('Startup time: %s', _startup_time)

def gen_hash(key: Tuple[str, ...]) -> str:
    return hashlib.sha256(str(key + (_startup_time,)).encode('utf-8')).hexdigest()
