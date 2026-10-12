"""
Presidio-based PII Masking Engine with Indian entity recognizers and vault storage.
"""

from __future__ import annotations

from typing import Dict, List, Optional
import structlog
from presidio_analyzer import AnalyzerEngine

from app.core.config import get_settings
from app.core.schemas import PIIRiskLevel, PrivacyOutput
from app.privacy.recognizers_india import (
    AadhaarRecognizer,
    CardRecognizer,
    IFSCRecognizer,
    IndianPhoneRecognizer,
    OrderIDRecognizer,
    PANRecognizer,
    UPIRecognizer,
)
from app.privacy.vault import PIIVault

logger = structlog.get_logger(__name__)

# Global singletons
_analyzer: Optional[AnalyzerEngine] = None
_vault: Optional[PIIVault] = None

# Entity mapping from Presidio entity names to simplified placeholder tags
ENTITY_TAG_MAP = {
    "PERSON": "PERSON",
    "PHONE_NUMBER": "PHONE",
    "EMAIL_ADDRESS": "EMAIL",
    "CREDIT_CARD": "CARD",
    "IN_AADHAAR": "AADHAAR",
    "IN_PAN": "PAN",
    "IN_UPI": "UPI",
    "ORDER_ID": "ORDER_ID",
    "IN_IFSC": "IFSC",
    "LOCATION": "LOCATION",
    "DATE_TIME": "DATE_TIME",
    "ORGANIZATION": "ORG",
    "URL": "URL",
    "IP_ADDRESS": "IP",
    "IBAN_CODE": "IBAN",
    "UK_NHS": "PHONE",  # fallback mapping
    "NRP": "NRP",
}

# Entities considered high risk
HIGH_RISK_TAGS = {"CARD", "AADHAAR"}
MEDIUM_RISK_TAGS = {"PAN", "UPI", "PHONE", "EMAIL"}


def get_analyzer() -> AnalyzerEngine:
    """Lazy initialize and return AnalyzerEngine with custom recognizers."""
    global _analyzer
    if _analyzer is None:
        from presidio_analyzer.nlp_engine import SpacyNlpEngine
        nlp_engine = SpacyNlpEngine(models=[{"lang_code": "en", "model_name": "en_core_web_sm"}])
        engine = AnalyzerEngine(nlp_engine=nlp_engine)
        # Add custom recognizers
        engine.registry.add_recognizer(IndianPhoneRecognizer())
        engine.registry.add_recognizer(AadhaarRecognizer())
        engine.registry.add_recognizer(PANRecognizer())
        engine.registry.add_recognizer(UPIRecognizer())
        engine.registry.add_recognizer(IFSCRecognizer())
        engine.registry.add_recognizer(OrderIDRecognizer())
        engine.registry.add_recognizer(CardRecognizer())

        # Remove built-in recognizers that conflict with Indian formats
        # UK_NHS matches 10-digit numbers and outscores our Indian phone recognizer
        recognizers_to_remove = []
        for rec in engine.registry.recognizers:
            if rec.name in ("NhsRecognizer", "PhoneRecognizer", "UsBankRecognizer",
                            "UsLicenseRecognizer", "UsItinRecognizer", "UsPassportRecognizer",
                            "CreditCardRecognizer", "MedicalLicenseRecognizer"):
                recognizers_to_remove.append(rec)
        for rec in recognizers_to_remove:
            engine.registry.remove_recognizer(rec.name)

        _analyzer = engine
        logger.info("presidio_analyzer_initialized_with_custom_recognizers")
    return _analyzer


def get_vault() -> PIIVault:
    """Lazy initialize and return the global PIIVault instance."""
    global _vault
    if _vault is None:
        settings = get_settings()
        _vault = PIIVault(settings.vault_encryption_key)
        logger.info("pii_vault_initialized")
    return _vault


def mask_text(text: str, session_id: str) -> PrivacyOutput:
    """
    Detect and mask PII entities within raw input text.

    1. Runs Presidio analyzer for entity detection.
    2. Sorts and resolves entity spans.
    3. Replaces spans from end to start with numbered tags [TAG_1].
    4. Records placeholder-to-value map in encrypted vault.
    5. Computes risk level and issues warnings for sensitive identifiers.
    """
    if not text or not text.strip():
        return PrivacyOutput(
            masked_text=text,
            entities_found={},
            vault_ref=None,
            risk_level=PIIRiskLevel.LOW,
            detector_confidence=1.0,
            warnings=[],
        )

    analyzer = get_analyzer()
    vault = get_vault()

    try:
        results = analyzer.analyze(
            text=text,
            language="en",
            entities=list(ENTITY_TAG_MAP.keys()),
            score_threshold=0.5,
        )
    except Exception as e:
        logger.error("analyzer_run_failed", error=str(e))
        raise

    # Sort spans by start descending. Filter out overlapping spans.
    sorted_results = sorted(results, key=lambda r: (r.start, -(r.end - r.start)))
    non_overlapping = []
    last_end = -1
    for res in sorted_results:
        if res.start >= last_end:
            non_overlapping.append(res)
            last_end = res.end
        elif res.score > non_overlapping[-1].score:
            # Overlap: replace previous if current has strictly higher score
            non_overlapping[-1] = res
            last_end = res.end

    # Group counts and create replacement map
    type_counters: Dict[str, int] = {}
    placeholder_map: Dict[str, str] = {}
    entities_found: Dict[str, int] = {}
    warnings: List[str] = []
    has_high_risk = False
    has_med_risk = False
    min_confidence = 1.0

    # Sort in reverse start order to replace from back of text safely
    reverse_spans = sorted(non_overlapping, key=lambda r: r.start, reverse=True)

    text_chars = list(text)

    for res in reverse_spans:
        original_value = text[res.start : res.end]
        raw_type = res.entity_type
        tag = ENTITY_TAG_MAP.get(raw_type, raw_type)

        type_counters[tag] = type_counters.get(tag, 0) + 1
        placeholder = f"[{tag}_{type_counters[tag]}]"
        placeholder_map[placeholder] = original_value
        entities_found[tag] = entities_found.get(tag, 0) + 1

        if tag in HIGH_RISK_TAGS:
            has_high_risk = True
            warnings.append(f"High-risk identifier detected and masked ({tag}).")
        elif tag in MEDIUM_RISK_TAGS:
            has_med_risk = True

        if res.score < min_confidence:
            min_confidence = res.score

        # Replace in text
        text_chars[res.start : res.end] = list(placeholder)

    masked_text = "".join(text_chars)

    risk_level = PIIRiskLevel.LOW
    if has_high_risk:
        risk_level = PIIRiskLevel.HIGH
    elif has_med_risk:
        risk_level = PIIRiskLevel.MEDIUM

    vault_ref = None
    if placeholder_map:
        vault_ref = vault.store(session_id, placeholder_map)

    return PrivacyOutput(
        masked_text=masked_text,
        entities_found=entities_found,
        vault_ref=vault_ref,
        risk_level=risk_level,
        detector_confidence=round(min_confidence if reverse_spans else 1.0, 3),
        warnings=warnings,
    )
