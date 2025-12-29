from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.all_models import ChatSession, ChatMessage
from typing import Optional
from app.api.deps import get_current_admin
import sentry_sdk

# Simple in-memory cache with TTL for analytics responses
_CACHE: dict[str, tuple[float, dict]] = {}
_CACHE_TTL_SECONDS = 60.0

router = APIRouter()

@router.get("/overview")
async def overview_metrics(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    cache_key = f"overview:{project_id or 'all'}"
    now = datetime.utcnow().timestamp()
    cached = _CACHE.get(cache_key)
    if cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
        return cached[1]

    # Total conversations (sessions)
    if project_id:
        total_conversations = (
            await db.execute(
                select(func.count(ChatSession.id)).where(ChatSession.project_id == project_id)
            )
        ).scalar() or 0
    else:
        total_conversations = (await db.execute(select(func.count(ChatSession.id)))).scalar() or 0

    # Messages today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if project_id:
        messages_today = (
            await db.execute(
                select(func.count(ChatMessage.id))
                .join(ChatSession, ChatMessage.session_id == ChatSession.id)
                .where(ChatMessage.created_at >= today_start)
                .where(ChatSession.project_id == project_id)
            )
        ).scalar() or 0
        
        # Feedback stats
        positive_feedback = (
            await db.execute(
                select(func.count(ChatMessage.id))
                .join(ChatSession, ChatMessage.session_id == ChatSession.id)
                .where(ChatSession.project_id == project_id)
                .where(ChatMessage.feedback_score == 1)
            )
        ).scalar() or 0
        
        negative_feedback = (
            await db.execute(
                select(func.count(ChatMessage.id))
                .join(ChatSession, ChatMessage.session_id == ChatSession.id)
                .where(ChatSession.project_id == project_id)
                .where(ChatMessage.feedback_score == -1)
            )
        ).scalar() or 0
    else:
        messages_today = (
            await db.execute(
                select(func.count(ChatMessage.id)).where(ChatMessage.created_at >= today_start)
            )
        ).scalar() or 0
        
        positive_feedback = (
            await db.execute(select(func.count(ChatMessage.id)).where(ChatMessage.feedback_score == 1))
        ).scalar() or 0
        
        negative_feedback = (
            await db.execute(select(func.count(ChatMessage.id)).where(ChatMessage.feedback_score == -1))
        ).scalar() or 0

    # Active users approximation: distinct sessions with messages in last 24h
    last_24h = datetime.utcnow() - timedelta(hours=24)
    if project_id:
        with sentry_sdk.start_span(op="db", description="active_users_project"):
            active_users = (
                await db.execute(
                    select(func.count(func.distinct(ChatMessage.session_id)))
                    .join(ChatSession, ChatMessage.session_id == ChatSession.id)
                    .where(ChatMessage.created_at >= last_24h)
                    .where(ChatSession.project_id == project_id)
                )
            ).scalar() or 0
    else:
        with sentry_sdk.start_span(op="db", description="active_users_all"):
            active_users = (
                await db.execute(
                    select(func.count(func.distinct(ChatMessage.session_id))).where(ChatMessage.created_at >= last_24h)
                )
            ).scalar() or 0

    # Avg response time from session metadata over last 24h
    avg_response_ms = None
    sessions_query = select(ChatSession).join(ChatMessage, ChatMessage.session_id == ChatSession.id)\
        .where(ChatMessage.created_at >= last_24h)
    if project_id:
        sessions_query = sessions_query.where(ChatSession.project_id == project_id)
    with sentry_sdk.start_span(op="db", description="overview_sessions"):
        result_sessions = await db.execute(sessions_query)
    sessions = result_sessions.scalars().all()
    times = [s.metadata_.get("last_response_ms") for s in sessions if isinstance(s.metadata_, dict) and s.metadata_.get("last_response_ms") is not None]
    if times:
        avg_response_ms = int(sum(times) / len(times))

    # Usage for last 7 days: messages per day
    seven_days_ago = datetime.utcnow() - timedelta(days=6)
    base_usage_select = select(
        cast(ChatMessage.created_at, Date).label('day'),
        func.count(ChatMessage.id).label('messages')
    ).where(ChatMessage.created_at >= seven_days_ago)

    if project_id:
        base_usage_select = base_usage_select.join(ChatSession, ChatMessage.session_id == ChatSession.id)\
            .where(ChatSession.project_id == project_id)

    with sentry_sdk.start_span(op="db", description="usage_rows"):
        usage_rows = await db.execute(
            base_usage_select.group_by(cast(ChatMessage.created_at, Date))
            .order_by(cast(ChatMessage.created_at, Date))
        )
    usage = []
    for row in usage_rows:
        day_val = row.day
        # row.day may already be a date object
        label = day_val.strftime("%a") if hasattr(day_val, "strftime") else str(day_val)
        usage.append({"day": label, "messages": int(row.messages)})

    result = {
        "total_conversations": int(total_conversations),
        "messages_today": int(messages_today),
        "active_users": int(active_users),
        "avg_response_ms": avg_response_ms,
        "status": "live",
        "usage": usage,
        "positive_feedback": int(positive_feedback),
        "negative_feedback": int(negative_feedback),
    }
    _CACHE[cache_key] = (now, result)
    return result

@router.get("/latency_trend")
async def latency_trend(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    seven_days_ago = datetime.utcnow() - timedelta(days=6)
    base_select = select(ChatSession).where(ChatSession.created_at >= seven_days_ago)
    if project_id:
        base_select = base_select.where(ChatSession.project_id == project_id)
    res = await db.execute(base_select)
    sessions = res.scalars().all()
    buckets: dict[str, list[int]] = {}
    for s in sessions:
        day = s.created_at.date().strftime("%a")
        val = None
        if isinstance(s.metadata_, dict):
            val = s.metadata_.get("last_response_ms")
        if val is not None:
            buckets.setdefault(day, []).append(int(val))
    trend = []
    for day, vals in sorted(buckets.items(), key=lambda x: x[0]):
        avg = int(sum(vals) / len(vals)) if vals else 0
        trend.append({"day": day, "ms": avg})
    return {"trend": trend}
