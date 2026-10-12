"""
Case management endpoints for escalated support issues.
"""

from __future__ import annotations

from typing import List
from fastapi import APIRouter, HTTPException

from app.core.schemas import CaseView
from app.data.repositories import CaseRepo

router = APIRouter(tags=["Cases"])


def _to_case_view(c) -> CaseView:
    return CaseView(
        case_id=c.id,
        session_id=c.session_id,
        priority=c.priority,
        reason=c.reason,
        status=c.status,
        summary=c.masked_summary,
        signals=c.signals_json or [],
        created_at=c.created_at.isoformat() if hasattr(c.created_at, "isoformat") else str(c.created_at),
    )


@router.get("/cases", response_model=List[CaseView])
async def list_cases() -> List[CaseView]:
    """Retrieve all escalated cases."""
    cases = await CaseRepo.list_all()
    return [_to_case_view(c) for c in cases]


@router.get("/cases/{case_id}", response_model=CaseView)
async def get_case(case_id: str) -> CaseView:
    """Retrieve an escalated case by ID."""
    case = await CaseRepo.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return _to_case_view(case)
