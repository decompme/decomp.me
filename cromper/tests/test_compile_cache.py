import json
import unittest
from concurrent.futures import Future
from unittest.mock import patch

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from cromper.config import CromperConfig
from cromper.handlers.compile import CompileHandler
from cromper.handlers.compile_cache import CompilationCache, compilation_cache_key
from cromper.handlers.metrics import OperationResult


class InlineExecutor:
    def submit(self, function, *args):
        future = Future()
        try:
            future.set_result(function(*args))
        except Exception as error:
            future.set_exception(error)
        return future


class CompilationCacheTests(unittest.TestCase):
    def test_key_normalizes_line_endings_and_includes_compile_inputs(self):
        request = {
            "compiler_id": "compiler",
            "code": "int f() {\r\nreturn 1;\r\n}",
            "context": "extern int x;\r\n",
        }
        normalized_request = {
            **request,
            "code": "int f() {\nreturn 1;\n}",
            "context": "extern int x;\n",
        }

        self.assertEqual(
            compilation_cache_key(request),
            compilation_cache_key(normalized_request),
        )
        changed_flags = {**request, "compiler_flags": "-O2"}
        self.assertNotEqual(
            compilation_cache_key(request),
            compilation_cache_key(changed_flags),
        )

    def test_cache_returns_success_and_marks_work_as_cached(self):
        cache = CompilationCache()
        result = OperationResult(
            response={"success": True, "elf_object": "b2Jq", "errors": ""},
            duration_ms=12,
            attributes={"compiler_id": "compiler"},
            sizes={},
        )

        cache.put("key", result)
        cached = cache.get("key")

        self.assertIsNotNone(cached)
        assert cached is not None
        self.assertEqual(cached.response, result.response)
        self.assertEqual(cached.duration_ms, 0)
        self.assertEqual(result.duration_ms, 12)

    def test_cache_does_not_store_failed_compilations(self):
        cache = CompilationCache()
        result = OperationResult(
            response={"success": False, "error": "compile failed"},
            duration_ms=12,
            attributes={"compiler_id": "compiler"},
            sizes={},
        )

        cache.put("key", result)

        self.assertIsNone(cache.get("key"))


class CompileHandlerCacheTests(AsyncHTTPTestCase):
    def get_app(self):
        options = {"config": CromperConfig(), "executor": InlineExecutor()}
        return tornado.web.Application(
            [(r"/compile", CompileHandler, options)],
            compile_cache=CompilationCache(),
        )

    def post_compile(self):
        return self.fetch(
            "/compile",
            method="POST",
            body=json.dumps(
                {
                    "compiler_id": "compiler",
                    "compiler_flags": "-O2",
                    "code": "int f() { return 1; }",
                    "context": "",
                }
            ),
            headers={"Content-Type": "application/json"},
        )

    def test_successful_compile_is_cached_in_parent(self):
        result = OperationResult(
            response={"success": True, "elf_object": "b2Jq", "errors": ""},
            duration_ms=12,
            attributes={
                "compiler_id": "compiler",
                "platform": "test",
                "outcome": "success",
            },
            sizes={},
        )
        with (
            patch(
                "cromper.handlers.compile.compile", return_value=result
            ) as compile_fn,
            patch("cromper.handlers.compile.record_operation_metrics") as metrics,
        ):
            first = self.post_compile()
            second = self.post_compile()

        self.assertEqual(first.code, 200)
        self.assertEqual(second.code, 200)
        self.assertEqual(first.body, second.body)
        self.assertEqual(compile_fn.call_count, 1)
        self.assertEqual(
            [
                call.kwargs["attributes"]["cache_status"]
                for call in metrics.call_args_list
            ],
            ["miss", "hit"],
        )

    def test_failed_compile_is_not_cached(self):
        result = OperationResult(
            response={"success": False, "error": "compile failed"},
            duration_ms=12,
            attributes={
                "compiler_id": "compiler",
                "platform": "test",
                "outcome": "compilation_error",
            },
            sizes={},
        )
        with patch(
            "cromper.handlers.compile.compile", return_value=result
        ) as compile_fn:
            self.post_compile()
            self.post_compile()

        self.assertEqual(compile_fn.call_count, 2)
