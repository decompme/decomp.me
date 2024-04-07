import asyncio
import logging
import os

import tornado

from src.handlers.compile import CompileHandler
from src.handlers.assemble import AssembleHandler
from src.handlers.objdump import ObjdumpHandler

logger = logging.getLogger(__file__)


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")


def make_app():
    return tornado.web.Application(
        [
            (r"/", MainHandler),
            (r"/compile", CompileHandler),
            (r"/assemble", AssembleHandler),
            (r"/objdump", ObjdumpHandler),
        ],
        debug=True,
    )


async def main(port):
    app = make_app()
    app.listen(port)
    await asyncio.Event().wait()


if __name__ == "__main__":
    logging.basicConfig(
        handlers=[logging.StreamHandler()],
        level=logging.DEBUG,
        format=(
            "%(asctime)s.%(msecs)03d %(levelname)s %(filename)s "
            + "%(funcName)s %(message)s"
        ),
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    listen_port = int(os.getenv("PORT", "9000"))
    logger.info("Starting platforms/main.py on port %i", listen_port)
    logger.info("SUPPORTED_PLATFORMS: %s", os.getenv("SUPPORTED_PLATFORMS"))
    asyncio.run(main(listen_port))
