import json
import logging
import os
import shlex
import subprocess

from typing import List
from pathlib import Path

import tornado

from .compile import PATH

from ..models.platform import Platform
from ..models.requests import ObjdumpRequest

from ..sandbox import Sandbox
from ..settings import settings

logger = logging.getLogger(__file__)


class ObjdumpHandler(tornado.web.RequestHandler):

    @staticmethod
    def get_objdump_target_function_flags(
        sandbox: Sandbox, target_path: Path, platform: Platform, label: str
    ) -> List[str]:
        if not label:
            return ["--start-address=0"]

        if platform.supports_objdump_disassemble:
            return [f"--disassemble={label}"]

        nm_proc = sandbox.run_subprocess(
            [platform.nm_cmd] + [sandbox.rewrite_path(target_path)],
            shell=True,
            env={
                "PATH": PATH,
                "COMPILER_BASE_PATH": sandbox.rewrite_path(settings.COMPILER_BASE_PATH),
            },
            timeout=settings.OBJDUMP_TIMEOUT_SECONDS,
        )

        if nm_proc.stdout:
            # e.g.
            # 00000000 T osEepromRead
            #          U osMemSize
            for line in nm_proc.stdout.splitlines():
                nm_line = line.split()
                if len(nm_line) == 3 and label == nm_line[2]:
                    start_addr = int(nm_line[0], 16)
                    return [f"--start-address={start_addr}"]

        return ["--start-address=0"]

    def post(self):
        try:
            payload = json.loads(self.request.body)
        except Exception as e:
            logger.error("Exception: %s", e)
            return self.write(str(e))

        try:
            objdump_request = ObjdumpRequest.from_dict(payload)
        except Exception as e:
            logger.error("Exception: %s", e)
            return self.write(str(e))

        logger.debug("objdump_request: %s", objdump_request)

        platform = objdump_request.platform

        arch_flags = objdump_request.arch_flags
        flags = objdump_request.flags
        label = objdump_request.label

        if not platform.objdump_cmd:
            error = f"No objdump_cmd for {platform.id}"
            logger.error(error)
            self.set_status(500)
            return self.write(json.dumps(dict(error=error)))

        with Sandbox() as sandbox:
            target_path = sandbox.path / "out.s"
            target_path.write_bytes(objdump_request.target_data)

            # If the flags contain `--disassemble=[symbol]`,
            # use that instead of `--start-address`.
            has_symbol = False
            for flag in flags:
                if flag.startswith("--disassemble="):
                    has_symbol = True
            if not has_symbol:
                if not platform.nm_cmd:
                    msg = f"No nm command for {platform.id}"
                    logger.error(msg)
                    self.set_status(500)
                    return self.write(json.dumps(dict(error=msg)))

                flags.append("--disassemble")

                try:
                    nm_flags = ObjdumpHandler.get_objdump_target_function_flags(
                        sandbox, target_path, platform, label
                    )
                except subprocess.TimeoutExpired as e:
                    logging.debug("Timout expired: %s", e)
                    logger.error(msg)
                    self.set_status(500)
                    return self.write(json.dumps(dict(error="Nm timed out")))
                except subprocess.CalledProcessError as e:
                    msg = e.stdout
                    logger.error("Nm failed: %s", msg)
                    self.set_status(500)
                    return self.write(json.dumps(dict(error=msg)))

                flags += nm_flags

            flags += arch_flags

            try:
                objdump_proc = sandbox.run_subprocess(
                    platform.objdump_cmd.split()
                    + list(map(shlex.quote, flags))
                    + [sandbox.rewrite_path(target_path)],
                    shell=True,
                    env={
                        "PATH": (
                            "/bin:/usr/bin"
                            if settings.USE_SANDBOX_JAIL
                            else os.environ["PATH"]
                        ),
                        "COMPILER_BASE_PATH": sandbox.rewrite_path(
                            settings.COMPILER_BASE_PATH
                        ),
                    },
                    timeout=settings.OBJDUMP_TIMEOUT_SECONDS,
                )
            except subprocess.TimeoutExpired as e:
                logging.debug("Timout expired: %s", e)
                self.set_status(400)
                return self.write(json.dumps(dict(error="Objdump timed out")))
            except subprocess.CalledProcessError as e:
                msg = e.stdout
                logging.warning("Objdump failed: %s", msg)
                self.set_status(500)
                return self.write(json.dumps(dict(error=msg)))

        out = objdump_proc.stdout
        self.write(json.dumps(dict(objdump=out)))
