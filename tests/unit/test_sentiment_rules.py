"""Unit tests for Sentiment heuristic rules, urgency scoring, and trend detection."""

import pytest
from app.core.schemas import Urgency
from app.sentiment.rules import (
    check_escalation_signals,
    compute_urgency,
    detect_human_request,
    compute_trend,
)


def test_escalation_keywords():
    signals = check_escalation_signals("I demand a full refund or I will go to consumer court!")
    assert any("refund" in s for s in signals)
    assert any("consumer court" in s for s in signals)


def test_human_request_detection():
    assert detect_human_request("Please transfer me to a real person right now") is True
    assert detect_human_request("I need to speak to a supervisor") is True
    assert detect_human_request("I really love your customer service team") is False


def test_trend_computation():
    assert compute_trend(["positive", "neutral", "negative"]) == "declining"
    assert compute_trend(["negative", "neutral", "positive"]) == "improving"
    assert compute_trend(["neutral", "neutral"]) == "stable"


def test_urgency_scoring():
    critical = compute_urgency(
        emotion="anger",
        emotion_score=0.9,
        signals=["keyword:lawsuit", "keyword:refund"],
        trend="declining",
    )
    assert critical in [Urgency.CRITICAL, Urgency.HIGH]

    low = compute_urgency(
        emotion="joy",
        emotion_score=0.9,
        signals=[],
        trend="stable",
    )
    assert low == Urgency.LOW
