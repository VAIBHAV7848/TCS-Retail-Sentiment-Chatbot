"""
Optional lightweight RAG store: SQLite FTS5 keyword index over data/policies/*.md.

Design constraints (do not break the project):
- stdlib only (sqlite3 + pathlib + re). No faiss/chroma/langchain.
- Separate KB file (data/kb.db) so app.db / vault.db migrations are untouched.
- Fail-open: any error returns [] and never raises into the pipeline.
- Operates on masked_text only (called after the privacy barrier).
"""

from __future__ import annotations

import re
import sqlite3
import time
from pathlib import Path

_WORD_RE = re.compile(r"[a-z0-9]+")


def _default_paths() -> tuple[Path, Path]:
    """Resolve (kb_db_path, policies_dir) relative to repo root."""
    here = Path(__file__).resolve()
    # app/retrieval/store.py -> repo root is parents[2]
    root = here.parents[2]
    return root / "data" / "kb.db", root / "data" / "policies"


def _tokenize(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


def chunk_markdown(source_id: str, title: str, body: str, version: str = "v1.0") -> list[dict]:
    """Split a policy doc into ~500-char heading-aware chunks."""
    chunks: list[dict] = []
    current_heading = title
    buf: list[str] = []

    def _flush() -> None:
        if not buf:
            return
        text = "\n".join(buf).strip()
        # hard-split long buffers on sentence boundaries
        while len(text) > 600:
            cut = text.rfind(". ", 0, 600)
            cut = cut + 1 if cut > 200 else 600
            chunks.append(
                {"source_id": source_id, "title": f"{title} — {current_heading}",
                 "content": text[:cut].strip(), "version": version}
            )
            text = text[cut:].strip()
        if text:
            chunks.append(
                {"source_id": source_id, "title": f"{title} — {current_heading}",
                 "content": text, "version": version}
            )

    for line in body.splitlines():
        if line.startswith("## "):
            _flush()
            buf = []
            current_heading = line[3:].strip()
        else:
            buf.append(line)
    _flush()
    return [c for c in chunks if c["content"]]


def _connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _init_schema(conn: sqlite3.Connection) -> bool:
    """Create tables. Returns True if FTS5 is available."""
    conn.execute(
        """CREATE TABLE IF NOT EXISTS kb_chunks(
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             source_id TEXT NOT NULL,
             title TEXT NOT NULL,
             content TEXT NOT NULL,
             version TEXT NOT NULL DEFAULT 'v1.0',
             updated_at REAL NOT NULL
           )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS kb_meta(
             key TEXT PRIMARY KEY,
             value TEXT NOT NULL
           )"""
    )
    try:
        conn.execute(
            """CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts
               USING fts5(title, content, content='kb_chunks',
                          content_rowid='id', tokenize='porter')"""
        )
        return True
    except sqlite3.OperationalError:
        # FTS5 missing in this sqlite build -> LIKE fallback in search
        return False


def _policies_mtime(policies_dir: Path) -> float:
    mtimes = [p.stat().st_mtime for p in policies_dir.glob("*.md") if p.is_file()]
    return max(mtimes) if mtimes else 0.0


def ensure_indexed(db_path: Path | None = None, policies_dir: Path | None = None) -> int:
    """(Re)build the index if policies changed or index is empty. Returns chunk count."""
    default_db, default_policies = _default_paths()
    db_path = db_path or default_db
    policies_dir = policies_dir or default_policies
    try:
        conn = _connect(db_path)
        try:
            has_fts = _init_schema(conn)
            cur = conn.execute("SELECT COUNT(*) FROM kb_chunks")
            count = int(cur.fetchone()[0])
            row = conn.execute("SELECT value FROM kb_meta WHERE key='policies_mtime'").fetchone()
            indexed_mtime = float(row[0]) if row else 0.0
            current_mtime = _policies_mtime(policies_dir)
            if count > 0 and indexed_mtime >= current_mtime:
                return count
            # rebuild
            conn.execute("DELETE FROM kb_chunks")
            try:
                conn.execute("DELETE FROM kb_fts")
            except sqlite3.OperationalError:
                pass
            now = time.time()
            total = 0
            for md in sorted(policies_dir.glob("*.md")):
                raw = md.read_text(encoding="utf-8", errors="ignore")
                lines = raw.splitlines()
                title = lines[0].lstrip("# ").strip() if lines else md.stem
                for ch in chunk_markdown(md.stem, title, raw):
                    cur = conn.execute(
                        "INSERT INTO kb_chunks(source_id,title,content,version,updated_at)"
                        " VALUES(?,?,?,?,?)",
                        (ch["source_id"], ch["title"], ch["content"], ch["version"], now),
                    )
                    if has_fts:
                        conn.execute(
                            "INSERT INTO kb_fts(rowid,title,content) VALUES(?,?,?)",
                            (cur.lastrowid, ch["title"], ch["content"]),
                        )
                    total += 1
            conn.execute(
                "INSERT OR REPLACE INTO kb_meta(key,value) VALUES('policies_mtime',?)",
                (str(_policies_mtime(policies_dir)),),
            )
            conn.commit()
            return total
        finally:
            conn.close()
    except Exception:
        return 0


def rebuild_index(db_path: Path | None = None, policies_dir: Path | None = None) -> int:
    """Force rebuild (used by scripts/ingest_policies.py)."""
    default_db, default_policies = _default_paths()
    db_path = (db_path or default_db)
    try:
        if db_path.exists():
            db_path.unlink()
    except Exception:
        pass
    return ensure_indexed(db_path, policies_dir or default_policies)


def _fts_search(conn: sqlite3.Connection, query: str, top_k: int) -> list[dict]:
    # Keep FTS query safe: quote tokens, OR them (tolerant to typos/stopwords)
    tokens = [t for t in _tokenize(query) if len(t) > 1][:12]
    if not tokens:
        return []
    match = " OR ".join(f'"{t}"*' for t in tokens)
    try:
        rows = conn.execute(
            """SELECT c.source_id, c.title, c.content, c.version,
                      bm25(kb_fts) AS rank_score
               FROM kb_fts JOIN kb_chunks c ON c.id = kb_fts.rowid
               WHERE kb_fts MATCH ? ORDER BY rank_score LIMIT ?""",
            (match, top_k * 3),
        ).fetchall()
        return [
            {"source_id": r[0], "title": r[1], "content": r[2], "version": r[3],
             "fts_rank": float(r[4]), "score": 0.0}
            for r in rows
        ]
    except sqlite3.OperationalError:
        return []


def _like_fallback(conn: sqlite3.Connection, query: str, top_k: int) -> list[dict]:
    tokens = [t for t in _tokenize(query) if len(t) > 2][:8]
    if not tokens:
        return []
    where = " OR ".join(["content LIKE ?"] * len(tokens))
    params = [f"%{t}%" for t in tokens]
    rows = conn.execute(
        f"SELECT source_id, title, content, version FROM kb_chunks WHERE {where} LIMIT ?",
        (*params, top_k * 3),
    ).fetchall()
    return [
        {"source_id": r[0], "title": r[1], "content": r[2], "version": r[3],
         "fts_rank": 0.0, "score": 0.0}
        for r in rows
    ]


def _rerank(query: str, cands: list[dict], top_k: int) -> list[dict]:
    """Cheap TF overlap rerank (no numpy): score = overlap / sqrt(len)."""
    qtok = set(_tokenize(query))
    if not qtok:
        return cands[:top_k]
    for c in cands:
        ctok = _tokenize(f"{c['title']} {c['content']}")
        overlap = len(qtok.intersection(ctok))
        c["score"] = overlap / (len(ctok) ** 0.5 + 1.0)
        # small bonus for better FTS rank
        if c.get("fts_rank", 0.0) < 0:
            c["score"] += 0.01
    cands.sort(key=lambda c: c["score"], reverse=True)
    out = []
    seen = set()
    for c in cands:
        key = (c["source_id"], c["content"][:80])
        if key in seen:
            continue
        seen.add(key)
        snippet = c["content"][:280].strip()
        out.append({"source_id": c["source_id"], "title": c["title"],
                    "snippet": snippet, "score": round(c["score"], 4)})
        if len(out) >= top_k:
            break
    return out


def search(query: str, top_k: int = 3,
           db_path: Path | None = None, policies_dir: Path | None = None) -> list[dict]:
    """Keyword search + TF rerank. Never raises; returns [] on any failure/empty."""
    if not query or not query.strip():
        return []
    top_k = max(1, min(int(top_k or 3), 5))
    try:
        default_db, default_policies = _default_paths()
        db_path = db_path or default_db
        policies_dir = policies_dir or default_policies
        ensure_indexed(db_path, policies_dir)
        conn = _connect(db_path)
        try:
            _init_schema(conn)  # idempotent; ensures tables exist
            cands = _fts_search(conn, query, top_k)
            if not cands:
                cands = _like_fallback(conn, query, top_k)
            return _rerank(query, cands, top_k)
        finally:
            conn.close()
    except Exception:
        return []
