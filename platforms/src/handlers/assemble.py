import json
import logging

import subprocess
import base64

import tornado

from .compile import PATH

from ..models.requests import AssembleRequest

from ..sandbox import Sandbox
from ..settings import settings

logger = logging.getLogger(__file__)


class AssembleHandler(tornado.web.RequestHandler):
    def post(self):

        # TODO: check platform.id against settings.SUPPORTED_PLATFORMS

        try:
            payload = json.loads(self.request.body)
        except Exception as e:
            logger.warning("Exception: %s", e)
            self.set_status(400)
            return self.write(f"Bad request data: {e}")

        try:
            assemble_request = AssembleRequest.from_dict(payload)
        except Exception as e:
            logger.warning("Exception: %s", e)
            self.set_status(400)
            return self.write(f"Bad request data: {e}")

        platform = assemble_request.platform
        asm = assemble_request.asm

        logger.debug("assemble_request: %s", assemble_request)

        if not platform.assemble_cmd:
            error = f"No assemble_cmd for {platform.id}"
            logger.error(error)
            self.set_status(500)
            return self.write(json.dumps(dict(error=error)))

        with Sandbox() as sandbox:
            asm_prelude_path = sandbox.path / "prelude.s"
            asm_prelude_path.write_text(platform.asm_prelude)

            asm_path = sandbox.path / "asm.s"
            data = asm.replace(".section .late_rodata", ".late_rodata")
            asm_path.write_text(data + "\n")

            object_path = sandbox.path / "object.o"

            # Run assembler
            try:
                assemble_proc = sandbox.run_subprocess(
                    platform.assemble_cmd,
                    mounts=[],
                    shell=True,
                    env={
                        "PATH": PATH,
                        "PRELUDE": sandbox.rewrite_path(asm_prelude_path),
                        "INPUT": sandbox.rewrite_path(asm_path),
                        "OUTPUT": sandbox.rewrite_path(object_path),
                        "COMPILER_BASE_PATH": sandbox.rewrite_path(
                            settings.COMPILER_BASE_PATH
                        ),
                    },
                    timeout=settings.ASSEMBLY_TIMEOUT_SECONDS,
                )
            except subprocess.CalledProcessError as e:
                logging.debug("Compilation failed: %s / %s", e.stdout, e.stderr)

                self.set_status(400)
                return self.write(json.dumps(dict(error=f"{e}")))

            except subprocess.TimeoutExpired as e:
                logging.debug("Timout expired: %s", e)
                self.set_status(400)
                logger.debug("")
                return self.write(json.dumps(dict(error="Assember timed out")))

            # Assembly failed
            if assemble_proc.returncode != 0:
                self.set_status(400)
                return self.write(
                    json.dumps(
                        dict(
                            error=f"Assembler failed with error code {assemble_proc.returncode}"
                        )
                    )
                )

            if not object_path.exists():
                self.set_status(503)
                return self.write(
                    json.dumps(dict(error="Assembler did not create an object file"))
                )

            assembly_bytes = base64.b64encode(object_path.read_bytes()).decode("utf")

        return self.write(json.dumps(dict(assembly_bytes=assembly_bytes)))
