#!/usr/bin/env python3

import asyncio
import logging

from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

# Load environment variables from .env file before importing other modules
from dotenv import load_dotenv

import tornado.web

from .handlers.assemble import AssembleHandler
from .handlers.compile import CompileHandler
from .handlers.decompile import DecompileHandler
from .handlers.diff import DiffHandler

from .handlers.handlers import (
    CompilerHandler,
    LibrariesHandler,
    PlatformHandler,
    HealthHandler,
)

from .config import CromperConfig


def make_app(config: CromperConfig) -> tornado.web.Application:
    """Create and configure the Tornado application."""

    process_executor = ProcessPoolExecutor(max_workers=config.num_processes)
    thread_executor = ThreadPoolExecutor(max_workers=config.num_processes)

    return tornado.web.Application(
        [
            (r"/health", HealthHandler, dict(config=config, executor=thread_executor)),
            (
                r"/platform(?:/([^/]+))?",
                PlatformHandler,
                dict(config=config, executor=thread_executor),
            ),
            (
                r"/compiler(?:/([^/]+))?(?:/([^/]+))?",
                CompilerHandler,
                dict(config=config, executor=thread_executor),
            ),
            (
                r"/library",
                LibrariesHandler,
                dict(config=config, executor=thread_executor),
            ),
            # cpu-bound handlers
            (
                r"/compile",
                CompileHandler,
                dict(config=config, executor=process_executor),
            ),
            (
                r"/assemble",
                AssembleHandler,
                dict(config=config, executor=process_executor),
            ),
            (r"/diff", DiffHandler, dict(config=config, executor=process_executor)),
            (
                r"/decompile",
                DecompileHandler,
                dict(config=config, executor=process_executor),
            ),
        ],
        debug=config.debug,
    )


def main():
    """Main application entry point."""

    load_dotenv()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    logger = logging.getLogger(__name__)

    config = CromperConfig()

    logger.info(f"Starting cromper service on port {config.port}")
    logger.info(f"Debug mode: {config.debug}")
    logger.info(f"Use sandbox jail: {config.use_sandbox_jail}")
    logger.info(f"Compiler base path: {config.compiler_base_path}")

    app = make_app(config)
    app.listen(config.port)

    logger.info("cromper service started successfully")

    ioloop = tornado.ioloop.IOLoop.current()
    ioloop.start()


if __name__ == "__main__":
    asyncio.run(main())
