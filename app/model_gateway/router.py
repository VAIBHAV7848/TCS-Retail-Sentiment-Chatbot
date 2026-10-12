"""
LLM Router directing generation tasks to GroqProvider with automatic failover to templates.
"""

from __future__ import annotations

import time
import structlog

from app.core.config import get_settings
from app.model_gateway.fallback import get_fallback_json, get_fallback_response
from app.model_gateway.providers import GroqProvider, OllamaProvider
from app.model_gateway.schemas import LLMRequest, LLMResponse

logger = structlog.get_logger(__name__)
settings = get_settings()


async def call_llm(request: LLMRequest) -> LLMResponse:
    """
    Route LLM request to local OllamaProvider or cloud GroqProvider.
    On failure: try fallback provider, then template-based responses.
    Logs model used, latency, and tokens.
    """
    start_time = time.perf_counter()

    # Determine primary and secondary provider
    if settings.llm_provider == "ollama":
        primary = OllamaProvider()
        secondary = GroqProvider() if settings.groq_api_key else None
    else:
        primary = GroqProvider() if settings.groq_api_key else OllamaProvider()
        secondary = OllamaProvider() if settings.groq_api_key else None

    # Try primary provider
    try:
        response = await primary.generate(request)
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
            "llm_call_primary_failed_trying_secondary",
            task_type=request.task_type,
            error=str(exc),
        )

    # Try secondary provider if available
    if secondary is not None:
        try:
            response = await secondary.generate(request)
            logger.info(
                "llm_call_secondary_success",
                task_type=request.task_type,
                model=response.model_used,
                latency_ms=response.latency_ms,
                tokens=response.tokens_used,
            )
            return response
        except Exception as exc:
            logger.error(
                "llm_call_secondary_failed_using_fallback",
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
