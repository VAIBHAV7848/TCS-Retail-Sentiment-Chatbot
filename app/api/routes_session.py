"""
Session management endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.data.repositories import SessionRepo

router = APIRouter(tags=["Session"])


class DeleteSessionResponse(BaseModel):
    session_id: str
    deleted: bool
    message: str


@router.delete("/session/{session_id}", response_model=DeleteSessionResponse)
async def delete_session(session_id: str) -> DeleteSessionResponse:
    """Delete a session, cascading removal of associated messages, cases, and vault data."""
    existing = await SessionRepo.get(session_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Session not found")

    deleted = await SessionRepo.delete(session_id)
    return DeleteSessionResponse(
        session_id=session_id,
        deleted=deleted,
        message=f"Session {session_id} and all related messages and vault entries deleted.",
    )
