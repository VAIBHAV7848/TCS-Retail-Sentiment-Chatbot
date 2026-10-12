"""
Custom Presidio EntityRecognizer implementations for Indian identifiers and retail entities.
"""

from __future__ import annotations

import re
from typing import List, Optional

from presidio_analyzer import EntityRecognizer, RecognizerResult


def luhn_check(number: str) -> bool:
    """Validate a card number using Luhn algorithm."""
    digits = [int(c) for c in number if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for idx, d in enumerate(reverse_digits):
        if idx % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0


class IndianPhoneRecognizer(EntityRecognizer):
    """
    Recognizer for Indian phone numbers (+91 prefix or 10-digit starting with 6-9).
    Score: 0.7 - 0.85.
    """

    def __init__(self):
        super().__init__(
            supported_entities=["PHONE_NUMBER"],
            supported_language="en",
            name="IndianPhoneRecognizer",
        )
        self.pattern = re.compile(
            r"(?:\+91[\s\-]?)?(?:\b[6-9]\d{9}\b|\b[6-9]\d{4}[\s\-]\d{5}\b|\b[6-9]\d{2}[\s\-]\d{3}[\s\-]\d{4}\b)"
        )

    def load(self) -> None:
        pass

    def analyze(
        self, text: str, entities: List[str], nlp_artifacts=None
    ) -> List[RecognizerResult]:
        results: List[RecognizerResult] = []
        if "PHONE_NUMBER" not in entities:
            return results

        for match in self.pattern.finditer(text):
            matched_str = match.group(0)
            score = 0.95 if "+91" in matched_str else 0.90
            results.append(
                RecognizerResult(
                    entity_type="PHONE_NUMBER",
                    start=match.start(),
                    end=match.end(),
                    score=score,
                )
            )
        return results


class AadhaarRecognizer(EntityRecognizer):
    r"""
    Recognizer for 12-digit Indian Aadhaar numbers.
    Pattern: \b[2-9]\d{3}\s?\d{4}\s?\d{4}\b. Score: 0.8.
    """

    def __init__(self):
        super().__init__(
            supported_entities=["IN_AADHAAR"],
            supported_language="en",
            name="AadhaarRecognizer",
        )
        self.pattern = re.compile(r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b")

    def load(self) -> None:
        pass

    def analyze(
        self, text: str, entities: List[str], nlp_artifacts=None
    ) -> List[RecognizerResult]:
        results: List[RecognizerResult] = []
        if "IN_AADHAAR" not in entities:
            return results

        for match in self.pattern.finditer(text):
            results.append(
                RecognizerResult(
                    entity_type="IN_AADHAAR",
                    start=match.start(),
                    end=match.end(),
                    score=0.95,
                )
            )
        return results


class PANRecognizer(EntityRecognizer):
    """
    Recognizer for Indian Permanent Account Number (PAN).
    Pattern: [A-Z]{5}[0-9]{4}[A-Z]. Score: 0.9.
    """

    def __init__(self):
        super().__init__(
            supported_entities=["IN_PAN"],
            supported_language="en",
            name="PANRecognizer",
        )
        self.pattern = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")

    def load(self) -> None:
        pass

    def analyze(
        self, text: str, entities: List[str], nlp_artifacts=None
    ) -> List[RecognizerResult]:
        results: List[RecognizerResult] = []
        if "IN_PAN" not in entities:
            return results

        for match in self.pattern.finditer(text):
            results.append(
                RecognizerResult(
                    entity_type="IN_PAN",
                    start=match.start(),
                    end=match.end(),
                    score=0.9,
                )
            )
        return results


class UPIRecognizer(EntityRecognizer):
    """
    Recognizer for Indian UPI IDs (e.g. user@okhdfcbank, name@upi).
    Score: 0.75.
    """

    def __init__(self):
        super().__init__(
            supported_entities=["IN_UPI"],
            supported_language="en",
            name="UPIRecognizer",
        )
        # UPI handle pattern: user identifier @ bank/app handle
        self.pattern = re.compile(r"\b[\w.]+@[a-z]{2,}\b", re.IGNORECASE)

    def load(self) -> None:
        pass

    def analyze(
        self, text: str, entities: List[str], nlp_artifacts=None
    ) -> List[RecognizerResult]:
        results: List[RecognizerResult] = []
        if "IN_UPI" not in entities:
            return results

        # Skip typical email domains like com, net, org, edu, gov, io, co, in
        email_tlds = {"com", "net", "org", "edu", "gov", "io", "co"}
        for match in self.pattern.finditer(text):
            matched_str = match.group(0)
            parts = matched_str.split("@")
            if len(parts) == 2:
                domain_part = parts[1].lower()
                # If domain ends with standard email tld like .com, avoid false positive
                if any(domain_part.endswith(f".{tld}") for tld in email_tlds):
                    continue
            results.append(
                RecognizerResult(
                    entity_type="IN_UPI",
                    start=match.start(),
                    end=match.end(),
                    score=0.75,
                )
            )
        return results


class IFSCRecognizer(EntityRecognizer):
    """
    Recognizer for Indian Financial System Code (IFSC).
    Pattern: [A-Z]{4}0[A-Z0-9]{6}. Score: 0.85.
    """

    def __init__(self):
        super().__init__(
            supported_entities=["IN_IFSC"],
            supported_language="en",
            name="IFSCRecognizer",
        )
        self.pattern = re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")

    def load(self) -> None:
        pass

    def analyze(
        self, text: str, entities: List[str], nlp_artifacts=None
    ) -> List[RecognizerResult]:
        results: List[RecognizerResult] = []
        if "IN_IFSC" not in entities:
            return results

        for match in self.pattern.finditer(text):
            results.append(
                RecognizerResult(
                    entity_type="IN_IFSC",
                    start=match.start(),
                    end=match.end(),
                    score=0.85,
                )
            )
        return results


class OrderIDRecognizer(EntityRecognizer):
    r"""
    Recognizer for retail Order / Tracking IDs.
    Pattern: #?\b(ORD|ORDER|TRK|TRACK)[-_]?\d{4,}\b. Score: 0.7.
    """

    def __init__(self):
        super().__init__(
            supported_entities=["ORDER_ID"],
            supported_language="en",
            name="OrderIDRecognizer",
        )
        self.pattern = re.compile(
            r"#?\b(ORD|ORDER|TRK|TRACK)[-_]?\d{4,}\b", re.IGNORECASE
        )

    def load(self) -> None:
        pass

    def analyze(
        self, text: str, entities: List[str], nlp_artifacts=None
    ) -> List[RecognizerResult]:
        results: List[RecognizerResult] = []
        if "ORDER_ID" not in entities:
            return results

        for match in self.pattern.finditer(text):
            results.append(
                RecognizerResult(
                    entity_type="ORDER_ID",
                    start=match.start(),
                    end=match.end(),
                    score=0.95,
                )
            )
        return results


class CardRecognizer(EntityRecognizer):
    """
    Recognizer for 13-19 digit credit/debit card numbers with Luhn check.
    Score: 0.95.
    """

    def __init__(self):
        super().__init__(
            supported_entities=["CREDIT_CARD"],
            supported_language="en",
            name="CardRecognizer",
        )
        self.pattern = re.compile(
            r"\b(?:\d{4}[\s\-]?){3}\d{1,4}\b|\b\d{13,19}\b"
        )

    def load(self) -> None:
        pass

    def analyze(
        self, text: str, entities: List[str], nlp_artifacts=None
    ) -> List[RecognizerResult]:
        results: List[RecognizerResult] = []
        if "CREDIT_CARD" not in entities:
            return results

        for match in self.pattern.finditer(text):
            digits_only = re.sub(r"\D", "", match.group(0))
            if 13 <= len(digits_only) <= 19 and luhn_check(digits_only):
                results.append(
                    RecognizerResult(
                        entity_type="CREDIT_CARD",
                        start=match.start(),
                        end=match.end(),
                        score=0.95,
                    )
                )
        return results
