"""
Pydantic schemas for LLM Model Gateway requests and responses.
"""

from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


class LLMRequest(BaseModel):
    system_prompt: str = ""
    user_prompt: str
    response_schema: Optional[Dict[str, Any]] = None
    temperature: float = 0.3
    max_tokens: int = 1024
    task_type: Literal["sentiment_review", "response_fast", "response_strong"] = "response_fast"


class LLMResponse(BaseModel):
    content: str
    parsed: Optional[Dict[str, Any]] = None
    model_used: str
    latency_ms: float = 0.0
    tokens_used: int = 0
