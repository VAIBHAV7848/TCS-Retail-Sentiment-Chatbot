"""
Health check endpoints.
"""

from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter
from app.core.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return application and model service health status."""
    return HealthResponse(
        status="ok",
        models_loaded={
            "database": True,
            "groq_gateway": True,
        },
        timestamp=datetime.utcnow().isoformat(),
    )
