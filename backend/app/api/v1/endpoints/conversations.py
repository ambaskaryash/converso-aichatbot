from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.db.session import get_db
from app.models.all_models import ChatSession, ChatMessage
from app.api.deps import get_current_admin
from datetime import datetime
import sentry_sdk
from typing import Optional

router = APIRouter()

@router.get("/sessions")
async def list_sessions(
    project_id: Optional[UUID] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    stmt = select(ChatSession)
    if project_id:
        stmt = stmt.where(ChatSession.project_id == project_id)
    if start_date:
        sd = datetime.fromisoformat(start_date)
        stmt = stmt.where(ChatSession.created_at >= sd)
    if end_date:
        ed = datetime.fromisoformat(end_date)
        stmt = stmt.where(ChatSession.created_at <= ed)
    with sentry_sdk.start_span(op="db", description="list_sessions"):
        res = await db.execute(stmt.order_by(ChatSession.created_at.desc()).limit(100))
    sessions = res.scalars().all()
    return [{"id": str(s.id), "project_id": str(s.project_id), "created_at": s.created_at.isoformat(), "last_response_ms": (s.metadata_ or {}).get("last_response_ms")} for s in sessions]

@router.get("/sessions/{session_id}/messages")
async def list_messages(
    session_id: UUID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    stmt = select(ChatMessage).where(ChatMessage.session_id == session_id)
    if start_date:
        sd = datetime.fromisoformat(start_date)
        stmt = stmt.where(ChatMessage.created_at >= sd)
    if end_date:
        ed = datetime.fromisoformat(end_date)
        stmt = stmt.where(ChatMessage.created_at <= ed)
    with sentry_sdk.start_span(op="db", description="list_messages"):
        res = await db.execute(stmt.order_by(ChatMessage.created_at.asc()))
    messages = res.scalars().all()
    return [{"id": str(m.id), "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in messages]
