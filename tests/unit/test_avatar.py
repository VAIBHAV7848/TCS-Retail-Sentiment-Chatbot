"""Unit tests for Avatar controller and Escalation engine."""

import pytest
from app.core.schemas import (
    AvatarDirective,
    EscalationDecision,
    EscalationLevel,
    Polarity,
    SentimentOutput,
    Urgency,
)
from app.agents.avatar_controller import compute_avatar
from app.agents.escalation import decide_escalation


def test_avatar_joy_positive():
    sentiment = SentimentOutput(
        polarity=Polarity.POSITIVE,
        emotion="joy",
        confidence=0.92,
        urgency=Urgency.LOW,
    )
    escalation = EscalationDecision(decision=EscalationLevel.NONE)
    avatar = compute_avatar(sentiment, escalation)
    assert avatar.expression == "warm_smile"
    assert avatar.voice_tone == "friendly"


def test_avatar_angry_negative_never_cheerful():
    sentiment = SentimentOutput(
        polarity=Polarity.NEGATIVE,
        emotion="anger",
        confidence=0.88,
        urgency=Urgency.CRITICAL,
    )
    escalation = EscalationDecision(decision=EscalationLevel.URGENT_HANDOFF)
    avatar = compute_avatar(sentiment, escalation)
    # Critical rule: NEVER show cheerful smile to angry/escalated customer
    assert avatar.expression in ["serious", "composed", "concerned"]
    assert avatar.expression != "warm_smile"


def test_escalation_on_human_request():
    sentiment = SentimentOutput(
        polarity=Polarity.NEGATIVE,
        emotion="neutral",
        confidence=0.75,
        urgency=Urgency.MEDIUM,
    )
    dec = decide_escalation(
        sentiment=sentiment,
        masked_text="I want to speak with a human agent please",
        recent_turns=[],
    )
    assert dec.decision == EscalationLevel.URGENT_HANDOFF
    assert any("human" in t for t in dec.triggers)
