"""Optional lightweight RAG (SQLite FTS5 + TF rerank, stdlib only)."""

from app.retrieval.service import retrieve_evidence
from app.retrieval.store import ensure_indexed, rebuild_index, search

__all__ = ["retrieve_evidence", "search", "ensure_indexed", "rebuild_index"]
