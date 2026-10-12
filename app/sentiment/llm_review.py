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

logger = structlog.get_logger(__name__)

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


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
    settings = get_settings()
    api_key = settings.groq_api_key or os.getenv("GROQ_API_KEY", "")
    if not api_key:
        logger.warning("groq_api_key_missing_skipping_tier2")
        return None

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

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": 500,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(GROQ_ENDPOINT, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            result = json.loads(content)
            logger.info("groq_tier2_review_success", polarity=result.get("polarity"), confidence=result.get("confidence"))
            return result
    except Exception as e:
        logger.error("groq_tier2_review_failed", error=str(e))
        return None
