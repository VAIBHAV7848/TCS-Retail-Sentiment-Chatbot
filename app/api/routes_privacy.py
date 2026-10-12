"""
Privacy and PII preview endpoints.
"""

from __future__ import annotations

import re
from typing import Dict
from pydantic import BaseModel, Field
from fastapi import APIRouter

router = APIRouter(tags=["Privacy"])


class PrivacyPreviewRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class PrivacyPreviewResponse(BaseModel):
    original: str
    masked: str
    entities: Dict[str, int]


try:
    from app.privacy.masker import mask_text
except (ImportError, AttributeError):
    def mask_text(text: str) -> tuple[str, Dict[str, int]]:
        """Fallback regex PII masker if privacy engine is not yet initialized."""
        entities: Dict[str, int] = {}
        masked = text

        # Email
        emails = re.findall(r"[\w\.-]+@[\w\.-]+\.\w+", masked)
        if emails:
            entities["EMAIL_ADDRESS"] = len(emails)
            masked = re.sub(r"[\w\.-]+@[\w\.-]+\.\w+", "<EMAIL_ADDRESS>", masked)

        # Phone numbers
        phones = re.findall(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", masked)
        if phones:
            entities["PHONE_NUMBER"] = len(phones)
            masked = re.sub(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", "<PHONE_NUMBER>", masked)

        # Credit cards (simple 16 digit pattern)
        cards = re.findall(r"\b(?:\d{4}[-\s]?){3}\d{4}\b", masked)
        if cards:
            entities["CREDIT_CARD"] = len(cards)
            masked = re.sub(r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "<CREDIT_CARD>", masked)

        return masked, entities


@router.post("/privacy/preview", response_model=PrivacyPreviewResponse)
async def privacy_preview(payload: PrivacyPreviewRequest) -> PrivacyPreviewResponse:
    """Mask sensitive PII from provided text and return detected entity counts."""
    res = mask_text(payload.text, session_id="preview")
    if isinstance(res, tuple):
        masked_text, entities = res
    elif hasattr(res, "masked_text"):
        masked_text = res.masked_text
        entities = getattr(res, "entities_found", {})
    else:
        masked_text = str(res)
        entities = {}

    return PrivacyPreviewResponse(
        original=payload.text,
        masked=masked_text,
        entities=entities,
    )
