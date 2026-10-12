"""
Output sanitation scanner ensuring no sensitive PII leaks in outbound assistant responses.
"""

from __future__ import annotations

import re
from typing import List, Tuple

# Regex patterns for sensitive entities in outbound text
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_PATTERN = re.compile(r"(?:\+91[\s\-]?)?(?:\b[6-9]\d{9}\b|\b\d{10}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)")
CARD_PATTERN = re.compile(r"\b(?:\d{4}[-\s]?){3}\d{1,4}\b|\b\d{13,19}\b")
AADHAAR_PATTERN = re.compile(r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b")
PAN_PATTERN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")


def scan_output(text: str) -> Tuple[str, List[str]]:
    """
    Scan outbound response text for accidental leaks of sensitive PII.
    Replaces any matched data with [REDACTED] and returns warnings.

    Returns:
        (cleaned_text, list_of_warnings)
    """
    if not text:
        return text, []

    warnings: List[str] = []
    cleaned = text

    # Check and mask Card
    if CARD_PATTERN.search(cleaned):
        cleaned = CARD_PATTERN.sub("[REDACTED]", cleaned)
        warnings.append("Outbound credit card number pattern detected and redacted.")

    # Check and mask Aadhaar
    if AADHAAR_PATTERN.search(cleaned):
        cleaned = AADHAAR_PATTERN.sub("[REDACTED]", cleaned)
        warnings.append("Outbound Aadhaar number pattern detected and redacted.")

    # Check and mask PAN
    if PAN_PATTERN.search(cleaned):
        cleaned = PAN_PATTERN.sub("[REDACTED]", cleaned)
        warnings.append("Outbound PAN pattern detected and redacted.")

    # Check and mask Email
    if EMAIL_PATTERN.search(cleaned):
        cleaned = EMAIL_PATTERN.sub("[REDACTED]", cleaned)
        warnings.append("Outbound email address detected and redacted.")

    # Check and mask Phone
    if PHONE_PATTERN.search(cleaned):
        cleaned = PHONE_PATTERN.sub("[REDACTED]", cleaned)
        warnings.append("Outbound phone number pattern detected and redacted.")

    return cleaned, warnings
