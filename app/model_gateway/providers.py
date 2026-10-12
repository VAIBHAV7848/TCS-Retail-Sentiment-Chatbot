"""
Groq LLM Provider using HTTPX REST client with tenacity retries and JSON parsing.
"""

from __future__ import annotations

import json
import time
from typing import Any, Dict, Optional

import httpx
import structlog
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import get_settings
from app.model_gateway.schemas import LLMRequest, LLMResponse

logger = structlog.get_logger(__name__)
settings = get_settings()

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

# Model mapping
MODEL_STRONG = "llama-3.3-70b-versatile"
MODEL_FAST = "llama-3.1-8b-instant"


class GroqProvider:
    """Provider for calling Groq LLM API with resilience and structured output support."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.groq_api_key or ""
        self.timeout = float(settings.request_timeout_seconds)

    def select_model(self, task_type: str) -> str:
        if task_type in ("response_strong", "sentiment_review"):
            return MODEL_STRONG
        return MODEL_FAST

    @retry(
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=0.5, min=1, max=4),
        reraise=True,
    )
    async def _post_chat_completion(self, payload: dict) -> dict:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(GROQ_ENDPOINT, headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()

    async def generate(self, request: LLMRequest) -> LLMResponse:
        """Call Groq API, compute latency, and parse JSON if schema was requested."""
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not configured")

        model = self.select_model(request.task_type)
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.user_prompt})

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }

        if request.response_schema is not None:
            payload["response_format"] = {"type": "json_object"}
            if "json" not in request.user_prompt.lower() and (
                not request.system_prompt or "json" not in request.system_prompt.lower()
            ):
                payload["messages"][-1]["content"] += "\nPlease reply in valid JSON format."

        start_time = time.perf_counter()
        data = await self._post_chat_completion(payload)
        latency_ms = (time.perf_counter() - start_time) * 1000.0

        choice = data.get("choices", [{}])[0]
        content = choice.get("message", {}).get("content", "").strip()
        usage = data.get("usage", {})
        tokens_used = usage.get("total_tokens", 0)

        parsed_json: Optional[Dict[str, Any]] = None
        if request.response_schema is not None or (content.startswith("{") and content.endswith("}")):
            try:
                parsed_json = json.loads(content)
            except Exception as e:
                logger.warning("groq_json_parse_failed", error=str(e), content=content[:200])

        return LLMResponse(
            content=content,
            parsed=parsed_json,
            model_used=model,
            latency_ms=round(latency_ms, 2),
            tokens_used=tokens_used,
        )
