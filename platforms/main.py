import asyncio
import logging
import os
import concurrent
import sys

from pathlib import Path

import tornado
from tornado.options import parse_command_line, options as settings

from src.handlers.compile import CompileHandler
from src.handlers.assemble import AssembleHandler
from src.handlers.objdump import ObjdumpHandler

from src.settings import define


logger = logging.getLogger(__file__)


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")


def main():

    define("PORT", default=9000, type=int)
    define("MAX_WORKERS", default=32, type=int)

    define("DEBUG", default=True, type=bool)

    define("SUPPORTED_PLATFORMS", default=None, type=str)

    define("USE_SANDBOX_JAIL", default=True, type=bool)
    define("SANDBOX_CHROOT_PATH", default=Path("/sandbox"), type=Path)
    define("SANDBOX_TMP_PATH", default=Path("/sandbox/tmp"), type=Path)
    define("SANDBOX_NSJAIL_BIN_PATH", default=Path("/bin/nsjail"), type=Path)
    define("SANDBOX_DISABLE_PROC", default=True, type=bool)

    define("WINEPREFIX", default=Path("/tmp/wine"), type=Path)

    define("COMPILER_BASE_PATH", default=Path("/backend/compilers"), type=Path)
    define("LIBRARY_BASE_PATH", default=Path("/backend/libraries"), type=Path)

    define("COMPILATION_TIMEOUT_SECONDS", default=30, type=int)
    define("ASSEMBLY_TIMEOUT_SECONDS", default=30, type=int)
    define("OBJDUMP_TIMEOUT_SECONDS", default=30, type=int)

    parse_command_line()

    logging.basicConfig(
        handlers=[logging.StreamHandler()],
        level=logging.DEBUG if settings.DEBUG else logging.INFO,
        format=(
            "%(asctime)s.%(msecs)03d %(levelname)s %(filename)s "
            + "%(funcName)s %(message)s"
        ),
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handlers = [
        (r"/", MainHandler),
        (r"/compile", CompileHandler),
        (r"/assemble", AssembleHandler),
        (r"/objdump", ObjdumpHandler),
    ]

    ioloop = tornado.ioloop.IOLoop.current()
    ioloop.set_default_executor(
        concurrent.futures.ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)
    )

    # start
    try:
        webapp = tornado.web.Application([*handlers])
        server = tornado.httpserver.HTTPServer(webapp)
        server_port = settings.PORT
        logger.info("Plaform Server starting on port: %i", server_port)
        if settings.SUPPORTED_PLATFORMS:
            logger.info("Supported platforms: %s", settings.SUPPORTED_PLATFORMS)

        server.listen(server_port)
        ioloop.start()
    except KeyboardInterrupt:
        logger.info("CTRL+C detected. Exiting...")
        sys.exit(0)
    except Exception as e:
        logger.fatal("Unhandled Exception raised: %s. Exiting...", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
