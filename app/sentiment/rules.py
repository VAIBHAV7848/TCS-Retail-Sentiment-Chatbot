"""
Heuristic rules and signal detectors for sentiment analysis, urgency evaluation,
and escalation triggers.
"""

from __future__ import annotations

import re
from typing import List, Optional

from app.core.schemas import Urgency

ESCALATION_KEYWORDS = [
    "refund",
    "cancel",
    "chargeback",
    "consumer court",
    "fraud",
    "legal",
    "lawsuit",
    "worst",
    "terrible",
    "horrible",
    "safety",
    "injury",
    "dangerous",
    "scam",
    "cheat",
]

CRITICAL_KEYWORDS = {
    "safety",
    "injury",
    "dangerous",
    "legal",
    "lawsuit",
    "consumer court",
    "fraud",
    "scam",
}

HUMAN_REQUEST_PATTERNS = [
    r"speak to (?:a )?human",
    r"talk to (?:a )?person",
    r"real person",
    r"human agent",
    r"transfer me",
    r"connect me to",
    r"supervisor",
    r"manager",
    r"representative",
]


def detect_human_request(text: str) -> bool:
    """Detect if the customer is explicitly requesting a human agent/manager."""
    if not text:
        return False
    lower = text.lower()
    return any(re.search(pat, lower) for pat in HUMAN_REQUEST_PATTERNS)


def check_escalation_signals(text: str, recent_turns: Optional[List[str]] = None) -> List[str]:
    """
    Check for escalation signals such as keywords, capitalization ratio,
    excessive exclamation marks, and repeat contact indications.
    """
    signals: List[str] = []
    if not text:
        return signals

    lower = text.lower()

    # Keyword check
    for kw in ESCALATION_KEYWORDS:
        if re.search(rf"\b{re.escape(kw)}\b", lower):
            signals.append(f"keyword:{kw}")

    # Human agent check
    if detect_human_request(text):
        signals.append("human_agent_requested")

    # Capitalization ratio (anger/frustration shout)
    letters = [c for c in text if c.isalpha()]
    if len(letters) >= 10:
        caps_count = sum(1 for c in letters if c.isupper())
        caps_ratio = caps_count / len(letters)
        if caps_ratio >= 0.5:
            signals.append("excessive_caps")

    # Exclamation count
    if text.count("!") >= 3:
        signals.append("multiple_exclamation_marks")

    # Repeat contact signal
    if recent_turns and len(recent_turns) >= 3:
        signals.append("repeated_turns")
    if any(phrase in lower for phrase in ["already told you", "again", "third time", "second time", "no one helped"]):
        signals.append("repeated_complaint")

    return signals


def compute_urgency(
    emotion: str,
    emotion_score: float,
    signals: List[str],
    trend: str = "stable",
) -> Urgency:
    """
    Determine urgency level (LOW, MEDIUM, HIGH, CRITICAL) based on detected signals,
    emotion intensity, and sentiment trend.
    """
    has_critical_keyword = any(
        s.startswith("keyword:") and s.split(":", 1)[1] in CRITICAL_KEYWORDS
        for s in signals
    )

    if has_critical_keyword:
        return Urgency.CRITICAL

    if "human_agent_requested" in signals and (emotion in ["anger", "disgust", "sadness"] or emotion_score >= 0.6):
        return Urgency.CRITICAL

    if "human_agent_requested" in signals:
        return Urgency.HIGH

    if emotion == "anger" and emotion_score >= 0.7:
        return Urgency.HIGH

    if any(s in ["repeated_complaint", "excessive_caps"] for s in signals) and emotion in ["anger", "disgust"]:
        return Urgency.HIGH

    if trend == "declining" and len(signals) >= 2:
        return Urgency.HIGH

    if signals or emotion in ["anger", "fear", "sadness"] or trend == "declining":
        return Urgency.MEDIUM

    return Urgency.LOW


def compute_trend(recent_polarities: List[str]) -> str:
    """
    Compute sentiment trajectory across recent turns.
    Returns: 'improving', 'stable', or 'declining'.
    """
    if not recent_polarities or len(recent_polarities) < 2:
        return "stable"

    score_map = {"positive": 1, "neutral": 0, "negative": -1}
    scores = [score_map.get(p.lower(), 0) for p in recent_polarities]

    diff = scores[-1] - scores[0]
    if diff >= 1:
        return "improving"
    if diff <= -1:
        return "declining"
    return "stable"
