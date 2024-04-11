import concurrent
import logging
import sys
import json

import tornado
from tornado.options import parse_command_line, options as settings

# TODO: make this less jank
import src.settings

from src.handlers.compile import CompileHandler
from src.handlers.assemble import AssembleHandler
from src.handlers.objdump import ObjdumpHandler
from src.compilers import available_platforms, available_compilers

logger = logging.getLogger(__file__)


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")


class PlatformsHandler(tornado.web.RequestHandler):
    def get(self):
        self.write(
            json.dumps([platform.to_json() for platform in available_platforms()])
        )


class CompilersHandler(tornado.web.RequestHandler):
    def get(self):
        self.write(
            json.dumps([compiler.to_json() for compiler in available_compilers()])
        )


def main():

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
        (r"/platforms", PlatformsHandler),
        (r"/compilers", CompilersHandler),
    ]

    ioloop = tornado.ioloop.IOLoop.current()
    ioloop.set_default_executor(
        concurrent.futures.ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)
    )

    # start
    try:
        webapp = tornado.web.Application([*handlers], debug=settings.DEBUG)
        server = tornado.httpserver.HTTPServer(webapp)

        logger.info("Plaform Server starting on port: %i", settings.PORT)
        if settings.SUPPORTED_PLATFORMS:
            logger.info(
                "Supported platform(s): %s", settings.SUPPORTED_PLATFORMS.split(",")
            )
        logger.info(
            "Available platform(s): %s",
            [platform.id for platform in available_platforms()],
        )
        logger.info(
            "Available compiler(s): %s",
            [compilers.id for compilers in available_compilers()],
        )

        server.listen(settings.PORT)
        ioloop.start()
    except KeyboardInterrupt:
        logger.info("CTRL+C detected. Exiting...")
        sys.exit(0)
    except Exception as e:
        logger.fatal("Unhandled Exception raised: %s. Exiting...", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
