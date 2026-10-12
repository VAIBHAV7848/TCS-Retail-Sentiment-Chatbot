"""
Template-based fallback responses keyed by sentiment and escalation level.
"""

from __future__ import annotations

from typing import Any, Dict

FALLBACK_TEMPLATES: Dict[str, str] = {
    "positive": (
        "Thank you for your kind words! We're thrilled to hear about your positive experience. "
        "Please let us know if there is anything else we can assist you with today!"
    ),
    "neutral": (
        "Thank you for reaching out. How can I help you today? Please feel free to provide any "
        "additional details about your question or order."
    ),
    "negative": (
        "I'm sorry to hear about your experience. Let me help resolve this for you right away. "
        "Please share your order number or details so I can look into this immediately."
    ),
    "escalation": (
        "I understand your concern and the urgency of this situation. I'm connecting you with "
        "our senior support team to ensure this is resolved quickly. A representative will review "
        "the details shortly."
    ),
}


def get_fallback_response(sentiment: str = "neutral", is_escalated: bool = False) -> str:
    """Return a reliable fallback template response."""
    if is_escalated:
        return FALLBACK_TEMPLATES["escalation"]
    return FALLBACK_TEMPLATES.get(sentiment.lower(), FALLBACK_TEMPLATES["neutral"])


def get_fallback_json(task_type: str, sentiment: str = "neutral") -> Dict[str, Any]:
    """Provide minimal schema-compliant structured fallback data if LLM structured call fails."""
    if task_type == "sentiment_review":
        return {
            "polarity": sentiment if sentiment in ("positive", "negative", "neutral") else "neutral",
            "confidence": 0.65,
            "reason": "Fallback sentiment evaluation",
            "tier_used": 1,
            "escalation_signals": ["fallback_mode"],
        }
    return {
        "reply": get_fallback_response(sentiment),
        "next_steps": ["Customer support follow-up"],
        "confidence": 0.5,
    }
