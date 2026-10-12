"""
Escalation Decision Engine and Handoff Package Builder.
Evaluates human agent escalation thresholds and prepares context packages.
"""

from __future__ import annotations

from typing import List, Optional

from app.core.schemas import (
    EscalationDecision,
    EscalationLevel,
    HandoffPackage,
    Polarity,
    SentimentOutput,
    Urgency,
)
from app.sentiment.rules import CRITICAL_KEYWORDS, detect_human_request


def decide_escalation(
    sentiment: SentimentOutput,
    masked_text: str,
    recent_turns: Optional[List[str]] = None,
) -> EscalationDecision:
    """
    Decide escalation level based on sentiment signals, urgency, and customer requests.

    Levels:
    - URGENT_HANDOFF: Critical urgency, legal/safety threats, or direct human representative request.
    - HUMAN_REVIEW: High urgency, repeated unresolved issues, or persistent negative trajectory.
    - FOLLOW_UP: Medium urgency or declining sentiment trend.
    - NONE: Positive or neutral sentiment handled comfortably by the AI agent.
    """
    triggers: List[str] = list(sentiment.escalation_signals)
    recent_turns = recent_turns or []

    has_human_req = detect_human_request(masked_text) or "human_agent_requested" in triggers
    if has_human_req and "human_agent_requested" not in triggers:
        triggers.append("human_agent_requested")

    has_critical_keyword = any(
        s.startswith("keyword:") and s.split(":", 1)[1] in CRITICAL_KEYWORDS
        for s in triggers
    )

    # 1. Urgent Human Handoff
    if sentiment.urgency == Urgency.CRITICAL or has_critical_keyword or has_human_req:
        reasons = []
        if has_human_req:
            reasons.append("Customer requested human representative")
        if has_critical_keyword:
            reasons.append("Safety, legal, or fraud indicators detected")
        if sentiment.urgency == Urgency.CRITICAL:
            reasons.append("Critical urgency classification")

        return EscalationDecision(
            decision=EscalationLevel.URGENT_HANDOFF,
            priority=Urgency.CRITICAL if sentiment.urgency != Urgency.CRITICAL and not has_critical_keyword else sentiment.urgency,
            reason="; ".join(reasons) or "Immediate human intervention requested.",
            triggers=triggers,
        )

    # 2. Human Review
    if (
        sentiment.urgency == Urgency.HIGH
        or ("repeated_complaint" in triggers and sentiment.polarity == Polarity.NEGATIVE)
        or (sentiment.trend == "declining" and sentiment.polarity == Polarity.NEGATIVE)
        or len(recent_turns) >= 4 and sentiment.polarity == Polarity.NEGATIVE
    ):
        return EscalationDecision(
            decision=EscalationLevel.HUMAN_REVIEW,
            priority=Urgency.HIGH,
            reason="High frustration or unresolved repeated interaction requiring agent review.",
            triggers=triggers,
        )

    # 3. Follow Up Flag
    if sentiment.polarity != Polarity.POSITIVE and (
        sentiment.urgency == Urgency.MEDIUM
        or sentiment.trend == "declining"
        or sentiment.polarity == Polarity.NEGATIVE
    ):
        return EscalationDecision(
            decision=EscalationLevel.FOLLOW_UP,
            priority=Urgency.MEDIUM,
            reason="Customer dissatisfaction noted; flagged for quality audit or follow-up.",
            triggers=triggers,
        )

    # 4. None
    return EscalationDecision(
        decision=EscalationLevel.NONE,
        priority=Urgency.LOW,
        reason="Handled autonomously by conversational agent.",
        triggers=triggers,
    )


def build_handoff_package(
    sentiment: SentimentOutput,
    masked_text: str,
    recent_turns: Optional[List[str]] = None,
    vault_ref: Optional[str] = None,
) -> HandoffPackage:
    """
    Construct a concise contextual handoff package for human customer service agents.
    """
    recent_turns = recent_turns or []
    excerpts = [masked_text]
    if recent_turns:
        excerpts = recent_turns[-2:] + excerpts

    policy_refs = []
    for sig in sentiment.escalation_signals:
        if "legal" in sig or "court" in sig:
            policy_refs.append("POL-LEGAL-01: Escalation to Legal Compliance")
        elif "refund" in sig or "chargeback" in sig:
            policy_refs.append("POL-BILLING-03: Disputed Transactions & Refunds")
        elif "safety" in sig or "injury" in sig:
            policy_refs.append("POL-SAFETY-09: Incident Investigation Protocol")

    if not policy_refs:
        policy_refs.append("POL-CS-DEFAULT: Tier-2 Representative Protocol")

    summary = (
        f"Customer expressed {sentiment.emotion.upper()} emotion "
        f"(Urgency: {sentiment.urgency.value.upper()}, Polarity: {sentiment.polarity.value}). "
        f"Primary intent: {sentiment.intent}. Topic: {sentiment.topic}."
    )

    return HandoffPackage(
        summary=summary,
        signals=sentiment.escalation_signals,
        excerpts=excerpts,
        policy_refs=policy_refs,
        vault_ref=vault_ref,
    )
