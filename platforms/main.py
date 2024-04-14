import concurrent
import json
import logging
import sys
import time
import platform
import hashlib

import requests

import tornado
from tornado.options import parse_command_line, options as settings

# TODO: make this less jank
import src.settings

from src.handlers.compile import CompileHandler
from src.handlers.assemble import AssembleHandler
from src.handlers.objdump import ObjdumpHandler
from src.compilers import available_platforms, available_compilers
from src.libraries import available_libraries

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


class LibrariesHandler(tornado.web.RequestHandler):
    def get(self):
        self.write(
            json.dumps(
                [library_version.to_json() for library_version in available_libraries()]
            )
        )


def register_with_backend():
    compilers = [c.to_json() for c in available_compilers()]
    compilers_hash = hashlib.sha256(json.dumps(compilers).encode("utf")).hexdigest()

    libraries = [l.to_json() for l in available_libraries()]
    libraries_hash = hashlib.sha256(json.dumps(libraries).encode("utf")).hexdigest()

    data = {
        "key": "secret",
        "hostname": platform.node(),
        "port": settings.PORT,
        "compilers": compilers,
        "compilers_hash": compilers_hash,
        "libraries": libraries,
        "libraries_hash": libraries_hash,
    }
    try:
        url = f"{settings.INTERNAL_API_BASE}/register"
        res = requests.post(url, json=data, timeout=10)

        assert res.status_code in (200, 201), "status_code should be 200 or 201"

        if res.status_code == 201:
            logger.info("Successfully registered with backend")

    except Exception as e:
        logger.warning("register_with_backend raised exception: %s", e)


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
        (r"/libraries", LibrariesHandler),
    ]

    ioloop = tornado.ioloop.IOLoop.current()
    ioloop.set_default_executor(
        concurrent.futures.ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)
    )

    # start
    try:
        webapp = tornado.web.Application([*handlers], debug=settings.DEBUG)
        server = tornado.httpserver.HTTPServer(webapp)

        server.listen(settings.PORT)

        # TODO: ideally we only register when we start and/or we detect that backend has restarted
        def loop_job(function, *args, **kwargs):
            function(*args, **kwargs)
            ioloop = tornado.ioloop.IOLoop.current()
            ioloop.add_timeout(
                time.time() + 60, lambda: loop_job(function, *args, **kwargs)
            )

        def init_job(function, *args, **kwargs):
            ioloop = tornado.ioloop.IOLoop.current()
            ioloop.add_timeout(
                time.time() + 10, lambda: loop_job(function, *args, **kwargs)
            )

        ioloop.add_callback(init_job, register_with_backend)

        logger.info("Platform Server starting on port: %i", settings.PORT)
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

        ioloop.start()
    except KeyboardInterrupt:
        logger.info("CTRL+C detected. Exiting...")
        sys.exit(0)
    except Exception as e:
        logger.fatal("Unhandled Exception raised: %s. Exiting...", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
