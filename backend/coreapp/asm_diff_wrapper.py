from coreapp.models import Assembly, Compilation
import logging

from asm_differ.diff import *

logger = logging.getLogger(__name__)

class AsmDifferWrapper:
    def diff(target_assembly: Assembly, compilation: Compilation):
        return "meow a diff"
