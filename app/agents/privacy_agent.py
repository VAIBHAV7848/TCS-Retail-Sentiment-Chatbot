"""
Agent 2: Privacy / PII Masking Agent
Orchestrates PII redaction and vaulting with fail-closed security guarantees.
"""

from __future__ import annotations

import structlog

from app.core.schemas import PIIRiskLevel, PrivacyOutput
from app.privacy import masker

logger = structlog.get_logger(__name__)


def run_privacy(clean_text: str, session_id: str) -> PrivacyOutput:
    """
    Run PII detection and masking on clean user text.
    Fails closed on any error, ensuring no unmasked data leaks downstream.
    """
    if not clean_text:
        return PrivacyOutput(
            masked_text="",
            entities_found={},
            vault_ref=None,
            risk_level=PIIRiskLevel.LOW,
            detector_confidence=1.0,
            warnings=[],
        )

    try:
        return masker.mask_text(clean_text, session_id)
    except Exception as e:
        logger.error(
            "privacy_agent_failed_closed",
            session_id=session_id,
            error=str(e),
            exc_info=True,
        )
        # Fail closed guarantee: never pass unmasked data if masking fails
        return PrivacyOutput(
            masked_text="[CONTENT_REDACTED_PRIVACY_ERROR]",
            entities_found={"ERROR": 1},
            vault_ref=None,
            risk_level=PIIRiskLevel.HIGH,
            detector_confidence=0.0,
            warnings=["Privacy analysis failed; text was redacted to prevent potential data leakage."],
        )
