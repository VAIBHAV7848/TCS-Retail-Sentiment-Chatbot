"""
Tier-2 LLM Sentiment Review using Groq API (llama-3.3-70b-versatile).
Evaluates complex, ambiguous, or low-confidence interactions asynchronously.
"""

from __future__ import annotations

import json
import os
from typing import Dict, List, Optional
import httpx
import structlog

from app.core.config import get_settings
from app.model_gateway.router import call_llm
from app.model_gateway.schemas import LLMRequest

logger = structlog.get_logger(__name__)


def should_trigger_tier2(tier1_result: dict, recent_turns: Optional[List[str]] = None) -> bool:
    """
    Decide whether to trigger Tier-2 LLM sentiment review.
    Triggers when:
    - Polarity is negative
    - Tier-1 confidence is below threshold (< 0.70)
    - Disagreement between polarity and emotion (e.g. positive polarity but anger emotion)
    - Short ambiguous text with multiple previous turns
    """
    settings = get_settings()
    threshold = settings.tier2_confidence_threshold

    polarity = tier1_result.get("polarity", {}).get("label") or tier1_result.get("label", "neutral")
    confidence = tier1_result.get("confidence", 1.0)
    emotion = tier1_result.get("emotion", {}).get("label") or tier1_result.get("emotion", "neutral")

    # Low confidence
    if confidence < threshold:
        return True

    # Negative polarity
    if polarity == "negative":
        return True

    # Disagreement: positive with negative emotions
    if polarity == "positive" and emotion in ["anger", "disgust", "sadness", "fear"]:
        return True

    # Neutral with strong anger or joy
    if polarity == "neutral" and emotion in ["anger", "joy"]:
        return True

    # Ambiguity in ongoing conversation
    if recent_turns and len(recent_turns) >= 2 and confidence < 0.8:
        return True

    return False


async def llm_sentiment_review(
    masked_text: str,
    tier1_result: dict,
    recent_turns: Optional[List[str]] = None,
) -> Optional[Dict]:
    """
    Call Groq API using llama-3.3-70b-versatile to perform structured sentiment review.

    Returns dict with keys:
        polarity, polarity_scores, emotion, emotion_scores, intent, topic, reason, confidence
    Or None if the request fails or cannot be parsed.
    """
    system_prompt = (
        "You are an expert retail sentiment and customer psychology analyst. "
        "Analyze the customer's masked message carefully considering retail context. "
        "Respond ONLY with a valid JSON object matching this schema:\n"
        "{\n"
        '  "polarity": "positive" | "neutral" | "negative",\n'
        '  "confidence": <float between 0.0 and 1.0>,\n'
        '  "emotion": "anger" | "disgust" | "fear" | "joy" | "neutral" | "sadness" | "surprise",\n'
        '  "intent": "<short intent like refund_request, product_inquiry, complaint, feedback>",\n'
        '  "topic": "<short topic like delivery, product_quality, billing, customer_service>",\n'
        '  "reason": "<one sentence explanation of your assessment>",\n'
        '  "evidence_spans": ["<quoted phrase from text indicating sentiment>"]\n'
        "}"
    )

    context_str = ""
    if recent_turns:
        context_str = "\nPrevious turns in session:\n" + "\n".join(f"- {turn}" for turn in recent_turns[-3:])

    user_prompt = (
        f"Customer message:\n\"{masked_text}\"\n"
        f"{context_str}\n\n"
        f"Initial Tier-1 analysis: {tier1_result}\n\n"
        "Provide your nuanced sentiment evaluation in the specified JSON format."
    )

    try:
        req = LLMRequest(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema={"type": "json_object"},
            temperature=0.1,
            max_tokens=1500,
            task_type="sentiment_review",
        )
        resp = await call_llm(req)
        if resp and resp.parsed and resp.model_used != "fallback-template":
            result = resp.parsed
            logger.info(
                "tier2_review_success",
                model=resp.model_used,
                polarity=result.get("polarity"),
                confidence=result.get("confidence"),
            )
            return result
        return None
    except Exception as e:
        logger.error("tier2_review_failed", error=str(e))
        return None
