"""
Avatar Controller: Computes expression, voice tone, speech rate, and gesture
directives for 3D/video conversational avatars aligned with emotional context.
"""

from __future__ import annotations

from app.core.schemas import (
    AvatarDirective,
    EscalationDecision,
    EscalationLevel,
    Polarity,
    SentimentOutput,
)


def compute_avatar(
    sentiment: SentimentOutput,
    escalation: EscalationDecision,
) -> AvatarDirective:
    """
    Generate Avatar directives tailored to customer sentiment and escalation status.

    Rules:
    - Never project cheerful demeanor when customer is angry or escalated.
    - Low confidence (< 0.6) defaults to attentive, neutral, professional posture.
    - Escalated conversations shift to composed/calm demeanor with measured speech rate.
    """
    is_escalated = escalation.decision in (
        EscalationLevel.HUMAN_REVIEW,
        EscalationLevel.URGENT_HANDOFF,
    )
    emotion = sentiment.emotion.lower()
    polarity = sentiment.polarity
    confidence = sentiment.confidence

    # Low confidence fallback
    if confidence < 0.6 and not is_escalated:
        return AvatarDirective(
            expression="attentive",
            intensity=0.5,
            voice_tone="professional",
            speech_rate=1.0,
            gesture="subtle_nod",
        )

    # Escalated state: calm, serious, slower speech rate
    if is_escalated or emotion in ["anger", "disgust"]:
        return AvatarDirective(
            expression="serious",
            intensity=0.8,
            voice_tone="calm_respectful",
            speech_rate=0.85,
            gesture="open_palms_reassuring",
        )

    # Emotion & polarity mappings
    if emotion == "sadness":
        return AvatarDirective(
            expression="gentle",
            intensity=0.7,
            voice_tone="soft_warm",
            speech_rate=0.9,
            gesture="sympathetic_nod",
        )

    if emotion in ["fear", "anxious"]:
        return AvatarDirective(
            expression="reassuring",
            intensity=0.7,
            voice_tone="clear_patient",
            speech_rate=0.9,
            gesture="comforting_open",
        )

    if polarity == Polarity.NEGATIVE or emotion in ["frustration", "annoyed"]:
        return AvatarDirective(
            expression="concerned",
            intensity=0.6,
            voice_tone="calm_apologetic",
            speech_rate=0.95,
            gesture="attentive_lean_forward",
        )

    if polarity == Polarity.POSITIVE or emotion == "joy":
        return AvatarDirective(
            expression="warm_smile",
            intensity=0.7,
            voice_tone="friendly",
            speech_rate=1.0,
            gesture="welcoming_wave",
        )

    # Default Neutral
    return AvatarDirective(
        expression="attentive",
        intensity=0.5,
        voice_tone="professional",
        speech_rate=1.0,
        gesture="active_listening",
    )
