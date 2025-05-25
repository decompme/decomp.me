import threading
import time
import datetime
import logging
import multiprocessing

from enum import Enum
from typing import NamedTuple, TypeVar, Union
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

        logger.debug(
            f"Worker %i: Received a '%s' request",
            worker_id,
            job.action,
        )

        start_time = datetime.datetime.now(datetime.timezone.utc)
        queue_duration_seconds = (start_time - job.creation_time).total_seconds()
        if queue_duration_seconds > 1:
            logger.warning(
                "Work item was queued for %f seconds", queue_duration_seconds
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
                result = "/* Unexpected decompile error */"

        else:
            raise ValueError(f"Unknown job action {job.action}")

        try:
            job.result_pipe.send(result)
        except BrokenPipeError:
            logger.warning(
                "Worker %i: Pipe closed before worker could respond", worker_id
            )
        finally:
            job.result_pipe.close()


T = TypeVar("T", CompilationResult, str)


class WorkerPool:
    def __init__(self, num_workers: int):
        self.num_workers = num_workers
        self.job_queue: Queue["Job"] = multiprocessing.Queue()
        self.workers: dict[int, multiprocessing.Process] = {}
        self._lock = threading.Lock()

        for i in range(self.num_workers):
            self._start_worker(i)

        self.monitor_interval_seconds = 5
        self.monitor_thread = threading.Thread(
            target=self._monitor_workers, daemon=True
        )
        self.monitor_thread.start()

    def _start_worker(self, worker_id: int) -> None:
        process = multiprocessing.Process(
            target=worker_loop,
            args=(worker_id, self.job_queue),
            daemon=True,
        )
        process.start()
        self.workers[worker_id] = process

    def _monitor_workers(self) -> None:
        while True:
            time.sleep(self.monitor_interval_seconds)
            with self._lock:
                for worker_id, process in self.workers.items():
                    if not process.is_alive():
                        logger.warning("Worker %i died. Restarting...", worker_id)
                        process.join(timeout=1)
                        self._start_worker(worker_id)

    def _submit_job(
        self,
        action: JobAction,
        payload: Union[Scratch, DecompileRequest],
        timeout: float,
        default_result: T,
    ) -> T:
        parent_conn, child_conn = multiprocessing.Pipe()
        job = Job(
            action=action,
            payload=payload,
            creation_time=datetime.datetime.now(datetime.timezone.utc),
            result_pipe=child_conn,
        )
        self.job_queue.put(job)

        try:
            if parent_conn.poll(timeout=timeout):
                if parent_conn.poll(timeout=0.1):
                    result = parent_conn.recv()
                else:
                    logger.warning("Pipe became readable but no data received.")
                    result = default_result
            else:
                result = default_result
        except (EOFError, OSError):
            logger.warning("Worker closed connection before sending result.")
            result = default_result

        parent_conn.close()
        return result

    def submit_compile(self, scratch: Scratch) -> CompilationResult:
        timeout = settings.COMPILATION_TIMEOUT_SECONDS * 1.2
        return self._submit_job(
            JobAction.COMPILE,
            scratch,
            timeout,
            CompilationResult(b"", "Compilation timeout expired"),
        )

    def submit_decompile(self, decompile_request: DecompileRequest) -> str:
        timeout = settings.DECOMPILATION_TIMEOUT_SECONDS * 1.2
        return self._submit_job(
            JobAction.DECOMPILE,
            decompile_request,
            timeout,
            "/* Error: decompilation timed out */",
        )


WORKER_POOL = WorkerPool(settings.NUM_WORKER_PROCESSES)
