import base64
import json
import logging
import os
import re
import subprocess
import time

import tornado
from tornado.options import options as settings

from ..models.requests import CompileRequest
from ..sandbox import Sandbox

logger = logging.getLogger(__file__)


WINE = "wine"
WIBO = "wibo"


class CompileHandler(tornado.web.RequestHandler):
    @staticmethod
    def filter_compile_errors(input: str) -> str:
        filter_strings = [
            r"wine: could not load .*\.dll.*\n?",
            r"wineserver: could not save registry .*\n?",
            r"### .*\.exe Driver Error:.*\n?",
            r"#   Cannot find my executable .*\n?",
            r"### MWCPPC\.exe Driver Error:.*\n?",
        ]

        for str in filter_strings:
            input = re.sub(str, "", input)

        return input.strip()

    def post(self):
        try:
            payload = json.loads(self.request.body)
        except Exception as e:
            logger.error("Exception: %s", e)
            return self.write(str(e))

        try:
            compile_request = CompileRequest.from_dict(payload)
        except Exception as e:
            logger.error("Exception: %s", e)
            return self.write(str(e))

        # logger.debug("compile_request is: %s", compile_request)

        compiler = compile_request.compiler
        if not compiler.available():
            msg = f"Compiler '{compiler.id}' is not available!"
            logger.warning(msg)
            self.set_status(400)
            return self.write(msg)

        with Sandbox() as sandbox:
            context = compile_request.context
            code = compile_request.code
            compiler_flags = compile_request.compiler_flags

            ext = compiler.file_ext
            code_file = f"code.{ext}"
            src_file = f"src.{ext}"
            ctx_file = f"ctx.{ext}"

            code_path = sandbox.path / code_file
            object_path = sandbox.path / "object.o"
            with code_path.open("w") as f:
                f.write(f'#line 1 "{ctx_file}"\n')
                f.write(context)
                f.write("\n")

                f.write(f'#line 1 "{src_file}"\n')
                f.write(code)
                f.write("\n")

            cc_cmd = compiler.cc

            # MWCC requires the file to exist for DWARF line numbers,
            # and requires the file contents for error messages
            if compiler.is_mwcc:
                ctx_path = sandbox.path / ctx_file
                ctx_path.touch()
                with ctx_path.open("w") as f:
                    f.write(context)
                    f.write("\n")

                src_path = sandbox.path / src_file
                src_path.touch()
                with src_path.open("w") as f:
                    f.write(code)
                    f.write("\n")

            # IDO hack to support -KPIC
            if compiler.is_ido and "-KPIC" in compiler_flags:
                cc_cmd = cc_cmd.replace("-non_shared", "")

            if compiler.platform.id != "dummy" and not compiler.path.exists():
                logging.warning("%s does not exist, creating it!", compiler.path)
                compiler.path.mkdir(parents=True)

            # Run compiler
            try:
                st = round(time.time() * 1000)

                libraries_compiler_flags = " ".join(
                    (
                        compiler.library_include_flag
                        + str(lib.get_include_path(compiler.platform.id))
                        for lib in compile_request.libraries
                    )
                )
                compile_proc = sandbox.run_subprocess(
                    cc_cmd,
                    mounts=([compiler.path] if compiler.platform.id != "dummy" else []),
                    shell=True,
                    env={
                        "PATH": (
                            "/bin:/usr/bin"
                            if settings.USE_SANDBOX_JAIL
                            else os.environ["PATH"]
                        ),
                        "WINE": WINE,
                        "WIBO": WIBO,
                        "INPUT": sandbox.rewrite_path(code_path),
                        "OUTPUT": sandbox.rewrite_path(object_path),
                        "COMPILER_DIR": sandbox.rewrite_path(compiler.path),
                        "COMPILER_FLAGS": sandbox.quote_options(
                            compiler_flags + " " + libraries_compiler_flags
                        ),
                        "FUNCTION": compile_request.function,
                        "MWCIncludes": "/tmp",
                        "TMPDIR": "/tmp",
                    },
                    timeout=settings.COMPILATION_TIMEOUT_SECONDS,
                )
                et = round(time.time() * 1000)
                logging.debug(f"Compilation finished in: {et - st} ms")
            except subprocess.CalledProcessError as e:
                # Compilation failed
                msg = e.stdout

                logging.debug("Compilation failed: %s", msg)
                self.set_status(400)
                return self.write(
                    json.dumps(dict(error=CompileHandler.filter_compile_errors(msg)))
                )
            except ValueError as e:
                # Shlex issue?
                logging.debug("Compilation failed: %s", e)
                self.set_status(503)
                return self.write(json.dumps(dict(error=f"ValueError {e}")))
            except subprocess.TimeoutExpired as e:
                logging.debug("Timout expired: %s", e)
                self.set_status(400)
                return self.write(json.dumps(dict(error="Compilation timed out")))

            if not object_path.exists():
                error_msg = (
                    "Compiler did not create an object file: %s" % compile_proc.stdout
                )
                logging.debug(error_msg)
                self.set_status(400)
                return self.write(json.dumps(dict(error=error_msg)))

            object_bytes = base64.b64encode(object_path.read_bytes()).decode("utf")
            compile_errors = CompileHandler.filter_compile_errors(compile_proc.stdout)

            self.write(
                json.dumps(
                    dict(
                        object_bytes=object_bytes,
                        stdout=compile_errors,
                    )
                )
            )
