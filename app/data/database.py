"""
Database configuration and SQLAlchemy ORM models for TCS Sentiment Chatbot.

Manages two distinct SQLite databases:
1. app.db - Application data (sessions, messages, cases, pii_audit, metrics)
2. vault.db - Encrypted PII vault (isolated database for privacy compliance)
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    event,
)
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base, relationship

from app.core.config import get_settings

settings = get_settings()


def _ensure_db_dir(db_url: str) -> None:
    """Ensure directory exists for SQLite database paths."""
    if "sqlite" in db_url:
        path_str = db_url.split(":///")[-1]
        db_path = Path(path_str).resolve()
        db_path.parent.mkdir(parents=True, exist_ok=True)


_ensure_db_dir(settings.database_url)
_ensure_db_dir(settings.vault_database_url)

# Engines
app_engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
)

vault_engine: AsyncEngine = create_async_engine(
    settings.vault_database_url,
    echo=False,
    future=True,
)


@event.listens_for(app_engine.sync_engine, "connect")
def set_app_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


@event.listens_for(vault_engine.sync_engine, "connect")
def set_vault_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


# Session factories
AppSessionLocal = async_sessionmaker(
    bind=app_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

VaultSessionLocal = async_sessionmaker(
    bind=vault_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Declarative bases
AppBase = declarative_base()
VaultBase = declarative_base()


# ── App ORM Models ────────────────────────────────────────────────────────────

class SessionModel(AppBase):
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True, index=True)
    channel = Column(String(32), nullable=False, default="chat")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    retention_expiry = Column(DateTime, nullable=True)

    messages = relationship("MessageModel", back_populates="session", cascade="all, delete-orphan")


class MessageModel(AppBase):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    turn_number = Column(Integer, default=1, nullable=False)
    masked_text = Column(Text, nullable=False)
    sentiment_json = Column(JSON, nullable=True)
    avatar_json = Column(JSON, nullable=True)
    is_bot = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("SessionModel", back_populates="messages")


class CaseModel(AppBase):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    priority = Column(String(32), nullable=False, default="low")
    reason = Column(Text, nullable=False, default="")
    status = Column(String(32), nullable=False, default="open")
    masked_summary = Column(Text, nullable=False, default="")
    signals_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PIIAuditModel(AppBase):
    __tablename__ = "pii_audit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(64), nullable=False, index=True)
    entity_counts_json = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


class MetricsModel(AppBase):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(64), nullable=False, index=True)
    latency_json = Column(JSON, nullable=True)
    model_used = Column(String(64), nullable=True)
    tier_used = Column(Integer, default=1, nullable=False)
    cost = Column(Float, default=0.0, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


# ── Vault ORM Model ───────────────────────────────────────────────────────────

class PIIVaultModel(VaultBase):
    __tablename__ = "pii_vault"

    id = Column(String(64), primary_key=True, index=True)
    encrypted_data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ttl_seconds = Column(Integer, default=86400, nullable=False)


# ── Initialization & Context Managers ─────────────────────────────────────────

async def init_db() -> None:
    """Create all tables in both app and vault databases."""
    _ensure_db_dir(settings.database_url)
    _ensure_db_dir(settings.vault_database_url)
    async with app_engine.begin() as conn:
        await conn.run_sync(AppBase.metadata.create_all)
    async with vault_engine.begin() as conn:
        await conn.run_sync(VaultBase.metadata.create_all)


@asynccontextmanager
async def get_app_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager for app database sessions."""
    async with AppSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def get_vault_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager for vault database sessions."""
    async with VaultSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for app database session."""
    async with get_app_session() as session:
        yield session


async def get_vault_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for vault database session."""
    async with get_vault_session() as session:
        yield session
