import os
from pathlib import Path

from cromper import libraries

# Load environment variables for tests
from dotenv import load_dotenv

load_dotenv()

# Set up compiler base path for tests
compiler_base_path = Path(os.getenv("COMPILER_BASE_PATH", "./compilers"))

# Set up library base path
library_base_path = Path(os.getenv("LIBRARY_BASE_PATH", "./libraries"))

# Import cromper modules after environment setup
# Set up library base path
libraries.set_library_base_path(library_base_path)

collect_ignore = [
    "compilers",
    "libraries",
]
