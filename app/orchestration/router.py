"""
Orchestrator Router: Determines dynamic processing routes based on sentiment,
urgency, and fail-closed state.
"""

from __future__ import annotations

from app.core.schemas import Polarity, Urgency, WorkflowState


def determine_route(state: WorkflowState) -> str:
    """
    Determine execution route for the workflow state.

    Routes:
    - 'fail_closed': Security or privacy violation tripped fail-closed policy.
    - 'escalation': High or critical urgency requiring supervisor or agent handoff.
    - 'fast_positive': High-confidence positive sentiment with no complaints.
    - 'standard': Standard conversational pipeline handling neutral or mild inquiries.
    """
    if state.failed_closed:
        return "fail_closed"

    if state.sentiment is None:
        return "standard"

    # Escalation check
    if (
        state.sentiment.urgency in (Urgency.CRITICAL, Urgency.HIGH)
        or "human_agent_requested" in state.sentiment.escalation_signals
    ):
        return "escalation"

    # Fast positive check
    if (
        state.sentiment.polarity == Polarity.POSITIVE
        and state.sentiment.confidence >= 0.8
        and not state.sentiment.escalation_signals
    ):
        return "fast_positive"

    return "standard"
