"""
Agent 1: Preprocessing Agent
Cleans, normalizes encoding, strips HTML, detects language, and validates input length
without discarding case, stopwords, emojis, or punctuation.
"""

from __future__ import annotations

import re
from bs4 import BeautifulSoup
import ftfy
from langdetect import LangDetectException, detect
import structlog

from app.core.schemas import PreprocessInput, PreprocessOutput

logger = structlog.get_logger(__name__)

# Normalize character elongation (e.g. "sooooo" -> "soo")
ELONGATION_PATTERN = re.compile(r"(.)\1{3,}")


def preprocess(input: PreprocessInput) -> PreprocessOutput:
    """
    Clean and normalize user input text.

    Guarantees:
    - Never downcases the text (case holds critical emotional signals).
    - Preserves emojis, punctuation, and numerals.
    - Resolves mojibake / Unicode encoding anomalies with ftfy.
    - Strips unwanted HTML markup.
    - Normalizes character elongation and excessive whitespace.
    - Detects language and flags non-English.
    """
    raw = input.raw_text
    flags: list[str] = []
    report: dict = {}

    # 1. Reject or flag empty
    if not raw or not raw.strip():
        flags.append("empty_input")
        return PreprocessOutput(
            clean_text="",
            language="en",
            flags=flags,
            report={"original_length": 0, "cleaned_length": 0},
        )

    text = raw
    original_length = len(text)

    # 2. Truncate if > 2000 characters
    if len(text) > 2000:
        text = text[:2000]
        flags.append("truncated")

    # 3. ftfy to fix text encoding issues
    text = ftfy.fix_text(text)

    # 4. Remove HTML tags using BeautifulSoup
    if "<" in text and ">" in text:
        try:
            soup = BeautifulSoup(text, "html.parser")
            text = soup.get_text(separator=" ")
            flags.append("html_stripped")
        except Exception as e:
            logger.debug("html_strip_warning", error=str(e))

    # 5. Normalize elongation: e.g. "pleeeease" -> "pleease"
    text = ELONGATION_PATTERN.sub(r"\1\1", text)

    # 6. Collapse excessive whitespace and remove spaces before punctuation
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s+([!?,.])", r"\1", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()

    # 7. Language detection
    detected_lang = "en"
    try:
        # Detect on alphanumeric content if available
        letters_only = re.sub(r"[^\w\s]", "", text).strip()
        if len(letters_only) >= 3:
            detected_lang = detect(letters_only)
            if detected_lang != "en":
                flags.append(f"non_english:{detected_lang}")
    except LangDetectException:
        detected_lang = "en"
    except Exception as e:
        logger.debug("langdetect_failed", error=str(e))

    report = {
        "original_length": original_length,
        "cleaned_length": len(text),
        "channel": input.channel.value if hasattr(input.channel, "value") else str(input.channel),
    }

    return PreprocessOutput(
        clean_text=text,
        language=detected_lang,
        flags=flags,
        report=report,
    )
