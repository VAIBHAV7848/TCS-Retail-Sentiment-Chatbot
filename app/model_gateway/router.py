"""
LLM Router directing generation tasks to GroqProvider with automatic failover to templates.
"""

from __future__ import annotations

import time
import structlog

from app.core.config import get_settings
from app.model_gateway.fallback import get_fallback_json, get_fallback_response
from app.model_gateway.providers import GroqProvider
from app.model_gateway.schemas import LLMRequest, LLMResponse

logger = structlog.get_logger(__name__)
settings = get_settings()


async def call_llm(request: LLMRequest) -> LLMResponse:
    """
    Route LLM request to GroqProvider.
    On failure: retry once, then fall back to template-based responses.
    Logs model used, latency, and tokens.
    """
    provider = GroqProvider()
    start_time = time.perf_counter()

    # Try primary Groq call (GroqProvider already has internal retry for transient errors)
    try:
        response = await provider.generate(request)
        logger.info(
            "llm_call_success",
            task_type=request.task_type,
            model=response.model_used,
            latency_ms=response.latency_ms,
            tokens=response.tokens_used,
        )
        return response
    except Exception as exc:
        logger.warning(
            "llm_call_primary_failed_retrying",
            task_type=request.task_type,
            error=str(exc),
        )

    # Second attempt
    try:
        response = await provider.generate(request)
        logger.info(
            "llm_call_retry_success",
            task_type=request.task_type,
            model=response.model_used,
            latency_ms=response.latency_ms,
            tokens=response.tokens_used,
        )
        return response
    except Exception as exc:
        logger.error(
            "llm_call_failed_using_fallback",
            task_type=request.task_type,
            error=str(exc),
        )

    # Fallback response
    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    fallback_text = get_fallback_response("neutral")
    fallback_parsed = get_fallback_json(request.task_type, "neutral")

    return LLMResponse(
        content=fallback_text,
        parsed=fallback_parsed,
        model_used="fallback-template",
        latency_ms=round(elapsed_ms, 2),
        tokens_used=0,
    )
