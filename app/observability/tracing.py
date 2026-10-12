"""
Request latency tracing and observability utilities.
"""

from __future__ import annotations

import time
from typing import Dict, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import structlog

logger = structlog.get_logger(__name__)


class RequestTracer:
    """Measures execution latency across pipeline stages."""

    def __init__(self, request_id: Optional[str] = None):
        self.request_id = request_id
        self._starts: Dict[str, float] = {}
        self._latencies: Dict[str, float] = {}
        self.total_start: float = time.perf_counter()

    def start(self, step_name: str) -> None:
        """Begin timing a named pipeline step."""
        self._starts[step_name] = time.perf_counter()

    def end(self, step_name: str) -> float:
        """Finish timing a named pipeline step and record duration in ms."""
        start_time = self._starts.get(step_name)
        if start_time is None:
            return 0.0
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        self._latencies[step_name] = round(duration_ms, 2)
        return self._latencies[step_name]

    def record_duration(self, step_name: str, duration_ms: float) -> None:
        """Directly record an already measured duration."""
        self._latencies[step_name] = round(duration_ms, 2)

    def get_latencies(self) -> Dict[str, float]:
        """Return dict of measured latencies including total elapsed time."""
        result = dict(self._latencies)
        total_ms = (time.perf_counter() - self.total_start) * 1000.0
        result["total_ms"] = round(total_ms, 2)
        return result


class TracingMiddleware(BaseHTTPMiddleware):
    """Middleware that attaches a RequestTracer to request.state and records overall request latency."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
        tracer = RequestTracer(request_id=request_id)
        request.state.tracer = tracer

        tracer.start("http_request")
        response = await call_next(request)
        elapsed_ms = tracer.end("http_request")

        response.headers["X-Response-Time-Ms"] = str(round(elapsed_ms, 2))
        return response
