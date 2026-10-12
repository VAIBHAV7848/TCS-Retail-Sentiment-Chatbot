"""
Security and orchestration policies enforcing strict privacy isolation and fail-closed rules.
"""

from __future__ import annotations

from app.core.schemas import WorkflowState


def validate_no_raw_text(state: WorkflowState) -> bool:
    """
    Validate that raw unmasked customer text has been purged from state.
    Returns True if raw_text is completely empty.
    """
    return state.raw_text == "" or len(state.raw_text.strip()) == 0


def should_fail_closed(state: WorkflowState) -> bool:
    """
    Check if the workflow state has tripped the fail-closed security switch.
    """
    return bool(state.failed_closed)
