"""
Agent 3: Multi-Tier Sentiment & Emotion Analysis Agent
Combines local RoBERTa models (CUDA) with Groq LLM Tier-2 review and heuristic rules.
"""

from __future__ import annotations

import structlog

from app.core.schemas import Polarity, SentimentInput, SentimentOutput, Urgency
from app.sentiment import emotion_model, llm_review, polarity_model, rules

logger = structlog.get_logger(__name__)


def _to_polarity_enum(label: str) -> Polarity:
    """Safely convert label string to Polarity Enum."""
    l = label.lower()
    if "pos" in l:
        return Polarity.POSITIVE
    if "neg" in l:
        return Polarity.NEGATIVE
    return Polarity.NEUTRAL


async def analyze_sentiment(input: SentimentInput) -> SentimentOutput:
    """
    Perform multi-tier sentiment, emotion, and urgency analysis.

    1. Runs local CardiffNLP RoBERTa polarity model on CUDA.
    2. Runs local Hartmann DistilRoBERTa emotion model on CUDA.
    3. Analyzes heuristic escalation signals (keywords, caps, repetition).
    4. Evaluates session sentiment trend.
    5. Computes urgency rating.
    6. Triggers Tier-2 LLM sentiment review if confidence is low, polarity is negative,
       or strong signal conflict is detected.
    7. Synthesizes final sentiment decision.
    """
    text = input.masked_text
    recent_turns = input.recent_turns or []

    # 1. Tier-1 Polarity (Local RoBERTa)
    try:
        t1_polarity = polarity_model.predict_polarity(text)
    except Exception as e:
        logger.error("tier1_polarity_error", error=str(e))
        t1_polarity = {
            "label": "neutral",
            "scores": {"negative": 0.33, "neutral": 0.34, "positive": 0.33},
            "confidence": 0.34,
        }

    # 2. Emotion (Local DistilRoBERTa)
    try:
        t1_emotion = emotion_model.predict_emotion(text)
    except Exception as e:
        logger.error("tier1_emotion_error", error=str(e))
        t1_emotion = {
            "label": "neutral",
            "scores": {"neutral": 1.0},
            "confidence": 1.0,
        }

    # 3. Escalation Signals
    signals = rules.check_escalation_signals(text, recent_turns)

    # 4. Trend Evaluation
    # Note: caller or metadata can provide recent polarities; fallback to turns length
    recent_polarities = input.metadata.get("recent_polarities", [])
    trend = rules.compute_trend(recent_polarities) if recent_polarities else "stable"

    # 5. Urgency Evaluation
    urgency = rules.compute_urgency(
        emotion=t1_emotion["label"],
        emotion_score=t1_emotion["confidence"],
        signals=signals,
        trend=trend,
    )

    # State before Tier-2
    final_polarity_str = t1_polarity["label"]
    final_polarity_scores = t1_polarity["scores"]
    final_emotion = t1_emotion["label"]
    final_emotion_scores = t1_emotion["scores"]
    final_confidence = t1_polarity["confidence"]
    intent = "general_inquiry"
    topic = "general"
    reason = "Evaluated via local RoBERTa models."
    evidence_spans: list[str] = []
    tier_used = 1
    degraded = False

    # 6. Tier-2 Evaluation check
    tier1_bundle = {
        "label": final_polarity_str,
        "polarity": t1_polarity,
        "emotion": t1_emotion,
        "confidence": final_confidence,
    }

    if llm_review.should_trigger_tier2(tier1_bundle, recent_turns):
        logger.info("triggering_tier2_review", session_context=len(recent_turns))
        t2_result = await llm_review.llm_sentiment_review(text, tier1_bundle, recent_turns)

        if t2_result:
            tier_used = 2
            t2_conf = float(t2_result.get("confidence", 0.8))
            # Merge / override if tier-2 provides actionable evaluation
            if t2_conf >= 0.5:
                final_polarity_str = t2_result.get("polarity", final_polarity_str)
                final_emotion = t2_result.get("emotion", final_emotion)
                final_confidence = t2_conf
            intent = t2_result.get("intent", intent)
            topic = t2_result.get("topic", topic)
            reason = t2_result.get("reason", reason)
            evidence_spans = t2_result.get("evidence_spans", [])

            # Re-evaluate urgency with updated emotion
            urgency = rules.compute_urgency(
                emotion=final_emotion,
                emotion_score=final_confidence,
                signals=signals,
                trend=trend,
            )
        else:
            # LLM review was triggered but failed / timed out
            degraded = True
            logger.warning("tier2_fallback_to_tier1")

    return SentimentOutput(
        polarity=_to_polarity_enum(final_polarity_str),
        polarity_scores=final_polarity_scores,
        emotion=final_emotion,
        emotion_scores=final_emotion_scores,
        intent=intent,
        topic=topic,
        urgency=urgency,
        confidence=round(final_confidence, 3),
        trend=trend,
        escalation_signals=signals,
        tier_used=tier_used,
        reason=reason,
        evidence_spans=evidence_spans,
        degraded=degraded,
    )
