"""
Retrieval service: thin, fail-open wrapper used by the pipeline.

- Reads flags from settings (rag_enabled / rag_top_k).
- Always operates on masked_text (never raw PII).
- Never raises: returns [] when disabled, empty, or on any error.
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger(__name__)


def retrieve_evidence(masked_text: str, top_k: int | None = None) -> list[dict]:
    if not masked_text or not masked_text.strip():
        return []
    try:
        from app.core.config import get_settings

        settings = get_settings()
        if not getattr(settings, "rag_enabled", True):
            return []
        k = int(top_k or getattr(settings, "rag_top_k", 3) or 3)
    except Exception:
        k = int(top_k or 3)

    try:
        from app.retrieval.store import search

        results = search(masked_text, top_k=k)
        # keep only meaningful hits
        return [r for r in results if r.get("score", 0) > 0][:k]
    except Exception as exc:  # fail-open by design
        logger.warning("rag_retrieve_failed", error=str(exc))
        return []
