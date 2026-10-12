"""Rebuild the RAG KB index from data/policies/*.md. Usage: python scripts/ingest_policies.py"""
from app.retrieval.store import rebuild_index

if __name__ == "__main__":
    n = rebuild_index()
    print(f"Indexed {n} chunks.")
