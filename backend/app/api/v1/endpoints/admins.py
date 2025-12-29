from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc
from app.db.session import get_db
from app.models.all_models import AdminUser, AdminAudit
from app.api.deps import get_current_admin
import sentry_sdk
from pydantic import BaseModel, EmailStr
from app.core.security import hash_password
from typing import Optional
from app.services.email import send_email

router = APIRouter()

class AdminCreate(BaseModel):
    email: EmailStr
    password: str

class AdminPasswordUpdate(BaseModel):
    password: str

class AdminRoleUpdate(BaseModel):
    role: str

@router.get("/")
async def list_admins(
    skip: int = 0,
    limit: int = 50,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    order_col = AdminUser.created_at if sort_by == "created_at" else AdminUser.email
    order_expr = desc(order_col) if sort_order == "desc" else asc(order_col)
    with sentry_sdk.start_span(op="db", description="list_admins"):
        res = await db.execute(select(AdminUser).order_by(order_expr).offset(skip).limit(limit))
        users = res.scalars().all()
    return [{"id": str(u.id), "email": u.email, "role": u.role, "created_at": u.created_at.isoformat()} for u in users]

@router.post("/")
async def create_admin(
    payload: AdminCreate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
    request: Request = None,
):
    csrf_cookie = request.cookies.get("csrftoken") if request else None
    csrf_header = request.headers.get("x-csrf-token") if request else None
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF validation failed")
    with sentry_sdk.start_span(op="db", description="create_admin_check"):
        exists = await db.execute(select(AdminUser).filter(AdminUser.email == payload.email))
        if exists.scalars().first():
            raise HTTPException(status_code=400, detail="Admin already exists")
    user = AdminUser(email=payload.email, role="admin", password_hash=hash_password(payload.password))
    db.add(user)
    with sentry_sdk.start_span(op="db", description="create_admin_commit"):
        await db.commit()
        await db.refresh(user)
    db.add(AdminAudit(actor_email=admin, action="create_admin", target_email=user.email))
    await db.commit()
    send_email(user.email, "Converso Admin Invite", "You have been added as an admin.")
    return {"id": str(user.id), "email": user.email, "role": user.role, "created_at": user.created_at.isoformat()}

@router.put("/{admin_id}/password")
async def update_admin_password(
    admin_id: str,
    payload: AdminPasswordUpdate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
    request: Request = None,
):
    csrf_cookie = request.cookies.get("csrftoken") if request else None
    csrf_header = request.headers.get("x-csrf-token") if request else None
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF validation failed")
    with sentry_sdk.start_span(op="db", description="update_admin_password_fetch"):
        res = await db.execute(select(AdminUser).filter(AdminUser.id == admin_id))
        user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")
    user.password_hash = hash_password(payload.password)
    with sentry_sdk.start_span(op="db", description="update_admin_password_commit"):
        await db.commit()
        await db.refresh(user)
    db.add(AdminAudit(actor_email=admin, action="update_password", target_email=user.email))
    await db.commit()
    send_email(user.email, "Password Updated", "Your admin password has been changed.")
    return {"id": str(user.id), "email": user.email, "role": user.role}

@router.put("/{admin_id}/role")
async def update_admin_role(
    admin_id: str,
    payload: AdminRoleUpdate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
    request: Request = None,
):
    csrf_cookie = request.cookies.get("csrftoken") if request else None
    csrf_header = request.headers.get("x-csrf-token") if request else None
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF validation failed")
    res_actor = await db.execute(select(AdminUser).filter(AdminUser.email == admin))
    actor = res_actor.scalars().first()
    if actor and actor.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can change roles")
    res = await db.execute(select(AdminUser).filter(AdminUser.id == admin_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")
    user.role = payload.role
    await db.commit()
    db.add(AdminAudit(actor_email=admin, action="update_role", target_email=user.email, metadata_={"role": payload.role}))
    await db.commit()
    return {"id": str(user.id), "email": user.email, "role": user.role}

@router.delete("/{admin_id}")
async def delete_admin(
    admin_id: str,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
    request: Request = None,
):
    csrf_cookie = request.cookies.get("csrftoken") if request else None
    csrf_header = request.headers.get("x-csrf-token") if request else None
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF validation failed")
    res_actor = await db.execute(select(AdminUser).filter(AdminUser.email == admin))
    actor = res_actor.scalars().first()
    if actor and actor.role != "owner":
        raise HTTPException(status_code=403, detail="Only owner can delete admins")
    res = await db.execute(select(AdminUser).filter(AdminUser.id == admin_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")
    await db.delete(user)
    await db.commit()
    db.add(AdminAudit(actor_email=admin, action="delete_admin", target_email=user.email))
    await db.commit()
    return {"ok": True}

@router.get("/logs")
async def list_admin_logs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    res = await db.execute(select(AdminAudit).order_by(desc(AdminAudit.created_at)).offset(skip).limit(limit))
    logs = res.scalars().all()
    return [{"id": str(l.id), "actor_email": l.actor_email, "action": l.action, "target_email": l.target_email, "metadata": l.metadata_ or {}, "created_at": l.created_at.isoformat()} for l in logs]
