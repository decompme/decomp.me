from coreapp.models import Assembly, Compilation
import logging

from asm_differ.diff import run_objdump, Display

logger = logging.getLogger(__name__)

class AsmDifferWrapper:
    def diff(target_assembly: Assembly, compilation: Compilation):
        # basedump = run_objdump(basecmd, config, project)
        # mydump = run_objdump(mycmd, config, project)
        # display = Display(basedump, mydump, config)

        # return display.run_diff()
        return "meow this is a diff"
