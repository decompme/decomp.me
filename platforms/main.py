import concurrent
import json
import logging
import sys
import time
import platform

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


def check_backend(last_boot_time):
    url = f"{settings.INTERNAL_API_BASE}/stats"
    try:
        res = requests.get(url, timeout=10)
    except Exception as e:
        logger.warning("Failed to get stats from backend: %s", e)
        return None

    if res.status_code != 200:
        logger.warning("backend returned non-200 status code: %i", res.status_code)
        return None

    try:
        stats = res.json()
    except Exception as e:
        logger.warning("Failed to parse stats JSON: %s", e)
        return None

    boot_time = stats.get("boot_time")
    if boot_time is None:
        logger.warning("No boot_time from backend!")
        return None

    if boot_time != last_boot_time:
        logger.info("New backend boot_time detected: %s", boot_time)

        data = {
            "key": "secret",
            "hostname": platform.node(),
            "port": settings.PORT,
            "platforms": [p.to_json() for p in available_platforms()],
            "compilers": [c.to_json() for c in available_compilers()],
            "libraries": [l.to_json() for l in available_libraries()],
        }
        url = f"{settings.INTERNAL_API_BASE}/register"
        try:
            res = requests.post(url, json=data, timeout=10)
        except Exception as e:
            logger.warning("Failed to send register request to backend %s", e)
            return None

        if res.status_code != 201:
            logger.warning("Error attempting to register with backend: %s", e)
            return None

        logger.info("Successfully registered with backend!")

    return boot_time


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
        # these endpoints are currently only used for testing
        (r"/platforms", PlatformsHandler),
        (r"/compilers", CompilersHandler),
        (r"/libraries", LibrariesHandler),
    ]

    ioloop = tornado.ioloop.IOLoop.current()
    ioloop.set_default_executor(
        concurrent.futures.ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)
    )

    try:
        webapp = tornado.web.Application([*handlers], debug=settings.DEBUG)
        server = tornado.httpserver.HTTPServer(webapp)

        server.listen(settings.PORT)

        def loop_backend_check(backend_checker, last_boot_time):
            new_boot_time = backend_checker(last_boot_time)

            ioloop = tornado.ioloop.IOLoop.current()
            ioloop.add_timeout(
                time.time() + 60,
                lambda: loop_backend_check(backend_checker, new_boot_time),
            )

        ioloop.add_callback(loop_backend_check, check_backend, None)
        ioloop.start()

        logger.info("Platform Served starting on port: %i", settings.PORT)
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

    except KeyboardInterrupt:
        logger.info("CTRL+C detected. Exiting...")
        sys.exit(0)
    except Exception as e:
        logger.fatal("Unhandled Exception raised: %s. Exiting...", e, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
