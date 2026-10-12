"""
Metrics recording functions for runtime tracking.
"""

from __future__ import annotations

from typing import Dict, Optional
import structlog

from app.data.repositories import MetricsRepo

logger = structlog.get_logger(__name__)


async def record_metrics(
    request_id: str,
    latencies: Dict[str, float],
    model_used: Optional[str] = None,
    tier_used: int = 1,
    cost: float = 0.0,
) -> None:
    """Persist pipeline request metrics into the database."""
    try:
        await MetricsRepo.create(
            request_id=request_id,
            latency_json=latencies,
            model_used=model_used,
            tier_used=tier_used,
            cost=cost,
        )
        logger.info(
            "metrics_recorded",
            request_id=request_id,
            tier_used=tier_used,
            model_used=model_used,
            total_lat=latencies.get("total_ms", 0.0),
        )
    except Exception as exc:
        logger.error("metrics_record_error", request_id=request_id, error=str(exc))
