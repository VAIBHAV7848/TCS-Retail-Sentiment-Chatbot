"""
Dashboard analytics and summary endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter
from app.core.schemas import DashboardSummary
from app.data.repositories import MetricsRepo

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary() -> DashboardSummary:
    """Retrieve operational dashboard summary metrics."""
    return await MetricsRepo.get_dashboard_summary()
