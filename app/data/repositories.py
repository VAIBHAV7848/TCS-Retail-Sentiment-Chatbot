"""
Asynchronous repository layer providing CRUD operations for database models.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from cryptography.fernet import Fernet
from sqlalchemy import delete, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.schemas import DashboardSummary
from app.data.database import (
    CaseModel,
    MessageModel,
    MetricsModel,
    PIIAuditModel,
    PIIVaultModel,
    SessionModel,
    get_app_session,
    get_vault_session,
)

settings = get_settings()

# Initialize or generate Fernet key
_raw_key = settings.vault_encryption_key.strip() if settings.vault_encryption_key else ""
if not _raw_key:
    _fernet_key = Fernet.generate_key()
else:
    _fernet_key = _raw_key.encode() if isinstance(_raw_key, str) else _raw_key
_cipher = Fernet(_fernet_key)


# ── Vault Repository ──────────────────────────────────────────────────────────

class VaultRepo:
    """Repository for managing encrypted PII entities in vault.db."""

    @staticmethod
    def encrypt_data(data: str | bytes | dict) -> bytes:
        if isinstance(data, dict):
            raw = json.dumps(data).encode("utf-8")
        elif isinstance(data, str):
            raw = data.encode("utf-8")
        else:
            raw = data
        return _cipher.encrypt(raw)

    @staticmethod
    def decrypt_data(token: bytes) -> str:
        return _cipher.decrypt(token).decode("utf-8")

    @classmethod
    async def store(
        cls,
        vault_id: str,
        data: str | bytes | dict,
        ttl_seconds: int = 86400,
        session: Optional[AsyncSession] = None,
    ) -> str:
        """Encrypt and persist data to the vault database."""
        encrypted = cls.encrypt_data(data)

        async def _persist(s: AsyncSession) -> str:
            vault_entry = PIIVaultModel(
                id=vault_id,
                encrypted_data=encrypted,
                created_at=datetime.utcnow(),
                ttl_seconds=ttl_seconds,
            )
            s.add(vault_entry)
            await s.flush()
            return vault_id

        if session is not None:
            return await _persist(session)
        async with get_vault_session() as s:
            return await _persist(s)

    @classmethod
    async def retrieve(
        cls, vault_id: str, session: Optional[AsyncSession] = None
    ) -> Optional[str]:
        """Retrieve and decrypt data from vault.db."""
        async def _get(s: AsyncSession) -> Optional[str]:
            stmt = select(PIIVaultModel).where(PIIVaultModel.id == vault_id)
            res = await s.execute(stmt)
            item = res.scalar_one_or_none()
            if not item:
                return None
            try:
                return cls.decrypt_data(item.encrypted_data)
            except Exception:
                return None

        if session is not None:
            return await _get(session)
        async with get_vault_session() as s:
            return await _get(s)

    @classmethod
    async def delete(
        cls, vault_id: str, session: Optional[AsyncSession] = None
    ) -> bool:
        """Delete vault entry by id."""
        async def _delete(s: AsyncSession) -> bool:
            stmt = delete(PIIVaultModel).where(PIIVaultModel.id == vault_id)
            res = await s.execute(stmt)
            return res.rowcount > 0

        if session is not None:
            return await _delete(session)
        async with get_vault_session() as s:
            return await _delete(s)

    @classmethod
    async def cleanup_expired(cls, session: Optional[AsyncSession] = None) -> int:
        """Delete expired vault entries."""
        now = datetime.utcnow()

        async def _cleanup(s: AsyncSession) -> int:
            stmt = select(PIIVaultModel)
            res = await s.execute(stmt)
            records = res.scalars().all()
            deleted_count = 0
            for record in records:
                expiry = record.created_at + timedelta(seconds=record.ttl_seconds)
                if now > expiry:
                    await s.delete(record)
                    deleted_count += 1
            return deleted_count

        if session is not None:
            return await _cleanup(session)
        async with get_vault_session() as s:
            return await _cleanup(s)


# ── Session Repository ────────────────────────────────────────────────────────

class SessionRepo:
    """Repository for conversation sessions."""

    @staticmethod
    async def create(
        session_id: str,
        channel: str = "chat",
        retention_expiry: Optional[datetime] = None,
        session: Optional[AsyncSession] = None,
    ) -> SessionModel:
        async def _create(s: AsyncSession) -> SessionModel:
            item = SessionModel(
                id=session_id,
                channel=channel,
                created_at=datetime.utcnow(),
                retention_expiry=retention_expiry,
            )
            s.add(item)
            await s.flush()
            return item

        if session is not None:
            return await _create(session)
        async with get_app_session() as s:
            return await _create(s)

    @staticmethod
    async def get(
        session_id: str, session: Optional[AsyncSession] = None
    ) -> Optional[SessionModel]:
        async def _get(s: AsyncSession) -> Optional[SessionModel]:
            stmt = select(SessionModel).where(SessionModel.id == session_id)
            res = await s.execute(stmt)
            return res.scalar_one_or_none()

        if session is not None:
            return await _get(session)
        async with get_app_session() as s:
            return await _get(s)

    @staticmethod
    async def list_recent(
        limit: int = 20, session: Optional[AsyncSession] = None
    ) -> List[SessionModel]:
        async def _list(s: AsyncSession) -> List[SessionModel]:
            stmt = select(SessionModel).order_by(SessionModel.created_at.desc()).limit(limit)
            res = await s.execute(stmt)
            return list(res.scalars().all())

        if session is not None:
            return await _list(session)
        async with get_app_session() as s:
            return await _list(s)

    @staticmethod
    async def delete(
        session_id: str, session: Optional[AsyncSession] = None
    ) -> bool:
        """Deletes session, cascading to messages, cases, and associated vault entries."""
        # Clean associated vault entry if session_id matches vault_id
        await VaultRepo.delete(session_id)

        async def _delete(s: AsyncSession) -> bool:
            # Explicitly delete cases associated with session
            await s.execute(delete(CaseModel).where(CaseModel.session_id == session_id))
            # Delete session (messages cascade via FK / relationship)
            stmt = delete(SessionModel).where(SessionModel.id == session_id)
            res = await s.execute(stmt)
            return res.rowcount > 0

        if session is not None:
            return await _delete(session)
        async with get_app_session() as s:
            return await _delete(s)


# ── Message Repository ────────────────────────────────────────────────────────

class MessageRepo:
    """Repository for conversation messages."""

    @staticmethod
    async def create(
        session_id: str,
        turn_number: int,
        masked_text: str,
        sentiment_json: Optional[Dict[str, Any]] = None,
        avatar_json: Optional[Dict[str, Any]] = None,
        is_bot: bool = False,
        session: Optional[AsyncSession] = None,
    ) -> MessageModel:
        async def _create(s: AsyncSession) -> MessageModel:
            msg = MessageModel(
                session_id=session_id,
                turn_number=turn_number,
                masked_text=masked_text,
                sentiment_json=sentiment_json,
                avatar_json=avatar_json,
                is_bot=is_bot,
                timestamp=datetime.utcnow(),
            )
            s.add(msg)
            await s.flush()
            return msg

        if session is not None:
            return await _create(session)
        async with get_app_session() as s:
            return await _create(s)

    @staticmethod
    async def get_by_session(
        session_id: str,
        limit: int = 10,
        session: Optional[AsyncSession] = None,
    ) -> List[MessageModel]:
        """Fetch last N messages in ascending order for context replay."""
        async def _fetch(s: AsyncSession) -> List[MessageModel]:
            stmt = (
                select(MessageModel)
                .where(MessageModel.session_id == session_id)
                .order_by(desc(MessageModel.id))
                .limit(limit)
            )
            res = await s.execute(stmt)
            messages = list(res.scalars().all())
            messages.reverse()
            return messages

        if session is not None:
            return await _fetch(session)
        async with get_app_session() as s:
            return await _fetch(s)

    @staticmethod
    async def count_by_sentiment(
        session: Optional[AsyncSession] = None,
    ) -> Dict[str, int]:
        """Count customer messages grouped by polarity."""
        async def _count(s: AsyncSession) -> Dict[str, int]:
            stmt = select(MessageModel.sentiment_json).where(
                MessageModel.is_bot.is_(False),
                MessageModel.sentiment_json.is_not(None),
            )
            res = await s.execute(stmt)
            counts: Dict[str, int] = {"positive": 0, "neutral": 0, "negative": 0}
            for row in res.scalars():
                if isinstance(row, dict):
                    polarity = row.get("polarity")
                    if polarity in counts:
                        counts[polarity] += 1
                    elif polarity:
                        counts[str(polarity).lower()] = counts.get(str(polarity).lower(), 0) + 1
            return counts

        if session is not None:
            return await _count(session)
        async with get_app_session() as s:
            return await _count(s)


# ── Case Repository ───────────────────────────────────────────────────────────

class CaseRepo:
    """Repository for escalated support cases."""

    @staticmethod
    async def create(
        case_id: str,
        session_id: str,
        priority: str,
        reason: str,
        status: str = "open",
        masked_summary: str = "",
        signals_json: Optional[List[str]] = None,
        session: Optional[AsyncSession] = None,
    ) -> CaseModel:
        async def _create(s: AsyncSession) -> CaseModel:
            item = CaseModel(
                id=case_id,
                session_id=session_id,
                priority=priority,
                reason=reason,
                status=status,
                masked_summary=masked_summary,
                signals_json=signals_json or [],
                created_at=datetime.utcnow(),
            )
            s.add(item)
            await s.flush()
            return item

        if session is not None:
            return await _create(session)
        async with get_app_session() as s:
            return await _create(s)

    @staticmethod
    async def get(
        case_id: str, session: Optional[AsyncSession] = None
    ) -> Optional[CaseModel]:
        async def _get(s: AsyncSession) -> Optional[CaseModel]:
            stmt = select(CaseModel).where(CaseModel.id == case_id)
            res = await s.execute(stmt)
            return res.scalar_one_or_none()

        if session is not None:
            return await _get(session)
        async with get_app_session() as s:
            return await _get(s)

    @staticmethod
    async def list_all(
        session: Optional[AsyncSession] = None,
    ) -> List[CaseModel]:
        async def _list(s: AsyncSession) -> List[CaseModel]:
            stmt = select(CaseModel).order_by(desc(CaseModel.created_at))
            res = await s.execute(stmt)
            return list(res.scalars().all())

        if session is not None:
            return await _list(session)
        async with get_app_session() as s:
            return await _list(s)

    @staticmethod
    async def update_status(
        case_id: str, status: str, session: Optional[AsyncSession] = None
    ) -> Optional[CaseModel]:
        async def _update(s: AsyncSession) -> Optional[CaseModel]:
            stmt = (
                update(CaseModel)
                .where(CaseModel.id == case_id)
                .values(status=status)
                .returning(CaseModel)
            )
            res = await s.execute(stmt)
            return res.scalar_one_or_none()

        if session is not None:
            return await _update(session)
        async with get_app_session() as s:
            return await _update(s)


# ── PII Audit Repository ──────────────────────────────────────────────────────

class PIIAuditRepo:
    """Repository for auditing detected PII entities without storing sensitive values."""

    @staticmethod
    async def create(
        request_id: str,
        entity_counts: Dict[str, int],
        session: Optional[AsyncSession] = None,
    ) -> PIIAuditModel:
        async def _create(s: AsyncSession) -> PIIAuditModel:
            audit = PIIAuditModel(
                request_id=request_id,
                entity_counts_json=entity_counts,
                timestamp=datetime.utcnow(),
            )
            s.add(audit)
            await s.flush()
            return audit

        if session is not None:
            return await _create(session)
        async with get_app_session() as s:
            return await _create(s)


# ── Metrics Repository ────────────────────────────────────────────────────────

class MetricsRepo:
    """Repository for latency, LLM tier usage, and dashboard reporting."""

    @staticmethod
    async def create(
        request_id: str,
        latency_json: Dict[str, float],
        model_used: Optional[str] = None,
        tier_used: int = 1,
        cost: float = 0.0,
        session: Optional[AsyncSession] = None,
    ) -> MetricsModel:
        async def _create(s: AsyncSession) -> MetricsModel:
            record = MetricsModel(
                request_id=request_id,
                latency_json=latency_json,
                model_used=model_used,
                tier_used=tier_used,
                cost=cost,
                timestamp=datetime.utcnow(),
            )
            s.add(record)
            await s.flush()
            return record

        if session is not None:
            return await _create(session)
        async with get_app_session() as s:
            return await _create(s)

    @staticmethod
    async def get_dashboard_summary(
        session: Optional[AsyncSession] = None,
    ) -> DashboardSummary:
        """Aggregate total messages, sentiment distribution, escalation counts, avg confidence, tier2 rate, avg latency."""
        async def _aggregate(s: AsyncSession) -> DashboardSummary:
            # Total messages
            total_stmt = select(func.count(MessageModel.id)).where(MessageModel.is_bot.is_(False))
            total_res = await s.execute(total_stmt)
            total_messages = total_res.scalar() or 0

            # Sentiment distribution & Avg confidence
            sentiment_dist: Dict[str, int] = {"positive": 0, "neutral": 0, "negative": 0}
            confidences: List[float] = []

            msg_stmt = select(MessageModel.sentiment_json).where(
                MessageModel.is_bot.is_(False),
                MessageModel.sentiment_json.is_not(None),
            )
            msg_res = await s.execute(msg_stmt)
            for row in msg_res.scalars():
                if isinstance(row, dict):
                    pol = row.get("polarity")
                    if pol:
                        key = str(pol).lower()
                        sentiment_dist[key] = sentiment_dist.get(key, 0) + 1
                    conf = row.get("confidence")
                    if conf is not None:
                        try:
                            confidences.append(float(conf))
                        except (ValueError, TypeError):
                            pass

            avg_confidence = (sum(confidences) / len(confidences)) if confidences else 0.0

            # Escalation counts from cases
            case_stmt = select(CaseModel.priority, func.count(CaseModel.id)).group_by(CaseModel.priority)
            case_res = await s.execute(case_stmt)
            escalation_counts: Dict[str, int] = {}
            for priority, count in case_res.all():
                escalation_counts[str(priority)] = count

            # Tier 2 rate & Latencies from metrics
            metrics_stmt = select(MetricsModel)
            metrics_res = await s.execute(metrics_stmt)
            all_metrics = list(metrics_res.scalars().all())

            total_requests = len(all_metrics)
            tier2_count = sum(1 for m in all_metrics if m.tier_used == 2)
            tier2_rate = (tier2_count / total_requests) if total_requests > 0 else 0.0

            latencies: List[float] = []
            for m in all_metrics:
                if isinstance(m.latency_json, dict):
                    total_lat = m.latency_json.get("total") or m.latency_json.get("total_ms")
                    if total_lat is not None:
                        try:
                            latencies.append(float(total_lat))
                        except (ValueError, TypeError):
                            pass
                    else:
                        summed = sum(
                            float(v) for v in m.latency_json.values() if isinstance(v, (int, float))
                        )
                        if summed > 0:
                            latencies.append(summed)

            avg_latency = (sum(latencies) / len(latencies)) if latencies else 0.0

            return DashboardSummary(
                total_messages=total_messages,
                sentiment_distribution=sentiment_dist,
                escalation_counts=escalation_counts,
                avg_confidence=round(avg_confidence, 3),
                tier2_rate=round(tier2_rate, 3),
                avg_latency_ms=round(avg_latency, 2),
            )

        if session is not None:
            return await _aggregate(session)
        async with get_app_session() as s:
            return await _aggregate(s)
