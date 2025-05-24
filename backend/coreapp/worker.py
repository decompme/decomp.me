import datetime
import logging
import multiprocessing
from enum import Enum
from typing import NamedTuple
from multiprocessing.queues import Queue

from rest_framework.exceptions import APIException
from django.conf import settings

from .error import CompilationError
from .models.scratch import Scratch
from .compiler_wrapper import CompilationResult, CompilerWrapper
from .decompiler_wrapper import DecompilerWrapper, DecompileRequest

import coreapp.compilers as compilers


logger = logging.getLogger(__name__)


class JobAction(str, Enum):
    COMPILE = "compile"
    DECOMPILE = "decompile"


class Job(NamedTuple):
    action: str
    creation_time: datetime.datetime
    payload: Scratch | DecompileRequest
    result_pipe: multiprocessing.connection.Connection


def worker_loop(worker_id: int, job_queue: Queue["Job"]) -> None:
    while True:
        job: Job = job_queue.get()

        start_time = datetime.datetime.now(datetime.timezone.utc)

        queue_duration_seconds = (start_time - job.creation_time).total_seconds()
        if queue_duration_seconds > 1:
            logger.warning(
                "Work item was queued for %f seconds", queue_duration_seconds
            )

        logger.info(
            f"Worker %i received a '%s' request",
            worker_id,
            job.action,
        )

        result: CompilationResult | str

        if job.action == JobAction.COMPILE:
            assert isinstance(
                job.payload, Scratch
            ), "Expected Scratch for compile action"
            scratch: Scratch = job.payload
            try:
                result = CompilerWrapper.compile_code(
                    compilers.from_id(scratch.compiler),
                    scratch.compiler_flags,
                    scratch.source_code,
                    scratch.context,
                    scratch.diff_label,
                    tuple(scratch.libraries),
                )
            except (CompilationError, APIException) as e:
                result = CompilationResult(b"", str(e))

        elif job.action == JobAction.DECOMPILE:
            assert isinstance(
                job.payload, DecompileRequest
            ), "Expected DecompileRequest for decompile action"
            decompile_request: DecompileRequest = job.payload
            try:
                result = DecompilerWrapper.decompile(
                    decompile_request.default_source_code,
                    decompile_request.platform,
                    decompile_request.asm,
                    decompile_request.context,
                    decompile_request.compiler,
                )
            except Exception as e:
                result = "Unexpected decompile error"  # You might want a better error class here

        else:
            raise ValueError(f"Unknown job action {job.action}")

        job.result_pipe.send(result)
        job.result_pipe.close()


class WorkerPool:
    def __init__(self, num_workers: int):
        self.job_queue: multiprocessing.Queue[Job] = multiprocessing.Queue()
        self.workers = []
        for i in range(num_workers):
            p = multiprocessing.Process(
                target=worker_loop, args=(i + 1, self.job_queue), daemon=True
            )
            p.start()
            self.workers.append(p)

    def submit_compile(self, scratch: Scratch) -> CompilationResult:
        parent_conn, child_conn = multiprocessing.Pipe()
        job = Job(
            action="compile",
            payload=scratch,
            creation_time=datetime.datetime.now(datetime.timezone.utc),
            result_pipe=child_conn,
        )
        self.job_queue.put(job)

        timeout = settings.COMPILATION_TIMEOUT_SECONDS * 1.1
        if not parent_conn.poll(timeout=timeout):
            raise TimeoutError("Compilation timed out")

        result = parent_conn.recv()
        parent_conn.close()
        return result

    def submit_decompile(self, decompile_request: DecompileRequest) -> str:
        parent_conn, child_conn = multiprocessing.Pipe()
        job = Job(
            action="decompile",
            payload=decompile_request,
            creation_time=datetime.datetime.now(datetime.timezone.utc),
            result_pipe=child_conn,
        )
        self.job_queue.put(job)

        timeout = settings.COMPILATION_TIMEOUT_SECONDS * 1.1
        if not parent_conn.poll(timeout=timeout):
            raise TimeoutError("Decompilation timed out")

        result = parent_conn.recv()
        parent_conn.close()
        return result


WORKER_POOL = WorkerPool(settings.NUM_WORKER_PROCESSES)
