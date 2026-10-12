"""Unit tests for Privacy Agent and PII Recognizers."""

import pytest
from app.core.schemas import PIIRiskLevel
from app.privacy.masker import mask_text
from app.privacy.vault import PIIVault
from app.privacy.output_scan import scan_output
from app.privacy.recognizers_india import luhn_check


def test_luhn_check():
    assert luhn_check("4111111111111111") is True
    assert luhn_check("4111111111111112") is False
    assert luhn_check("123") is False


def test_mask_phone_and_email():
    text = "Call me at 9845012345 or +919876543210 and email test.user@example.com."
    out = mask_text(text, session_id="test_sess_1")
    assert "9845012345" not in out.masked_text
    assert "test.user@example.com" not in out.masked_text
    assert "[PHONE_1]" in out.masked_text or "[PHONE_2]" in out.masked_text
    assert "[EMAIL_1]" in out.masked_text


def test_mask_aadhaar_pan_card():
    text = "My Aadhaar is 4832 9812 5467, PAN is ABCDE1234F, card is 4111 1111 1111 1111."
    out = mask_text(text, session_id="test_sess_2")
    assert "4832 9812 5467" not in out.masked_text
    assert "ABCDE1234F" not in out.masked_text
    assert "4111 1111 1111 1111" not in out.masked_text
    assert out.risk_level == PIIRiskLevel.HIGH
    assert len(out.warnings) > 0


def test_mask_order_id_and_upi():
    text = "Order #ORD-9921 refunded to user@okhdfcbank."
    out = mask_text(text, session_id="test_sess_3")
    assert "#ORD-9921" not in out.masked_text
    assert "user@okhdfcbank" not in out.masked_text


def test_encrypted_vault_roundtrip():
    vault = PIIVault()
    mapping = {"[PHONE_1]": "+919876543210", "[PERSON_1]": "Priya Sharma"}
    ref = vault.store("session_123", mapping)
    assert ref is not None

    retrieved = vault.retrieve(ref)
    assert retrieved == mapping

    vault.delete(ref)
    assert vault.retrieve(ref) is None


def test_output_scan_redacts_accidental_pii():
    bot_reply = "We verified your phone 9845012345 and card 4111111111111111."
    sanitized, warnings = scan_output(bot_reply)
    assert "9845012345" not in sanitized
    assert "4111111111111111" not in sanitized
    assert "[REDACTED]" in sanitized
    assert len(warnings) >= 2
