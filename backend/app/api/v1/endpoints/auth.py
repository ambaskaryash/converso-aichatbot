from fastapi import APIRouter, HTTPException, Response, Depends
import secrets
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.all_models import AdminUser

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).filter(AdminUser.email == data.email))
    user = result.scalars().first()
    if user and user.password_hash:
        if not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        if (not settings.ADMIN_EMAIL and not settings.ADMIN_EMAILS) or not settings.ADMIN_PASSWORD_HASH:
            raise HTTPException(status_code=500, detail="Admin credentials not configured")
        allowed = set(settings.ADMIN_EMAILS or [])
        if settings.ADMIN_EMAIL:
            allowed.add(settings.ADMIN_EMAIL)
        if data.email not in allowed or not verify_password(data.password, settings.ADMIN_PASSWORD_HASH):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": data.email})
    csrf_token = secrets.token_urlsafe(16)
    response.set_cookie(
        key="csrftoken",
        value=csrf_token,
        httponly=False,
        secure=False,
        samesite="lax",
    )
    return {"access_token": token, "token_type": "bearer"}
