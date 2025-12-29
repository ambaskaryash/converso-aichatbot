from fastapi import Depends, HTTPException, Security, status, Request
from fastapi.security import APIKeyHeader, APIKeyQuery
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.all_models import Project, AdminUser
from app.core.config import settings

# Define API Key schemes
api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)
api_key_query = APIKeyQuery(name="api_key", auto_error=False)

async def get_current_project(
    api_key_header: str = Security(api_key_header),
    api_key_query: str = Security(api_key_query),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """
    Authenticate request using API Key from header or query parameter.
    Returns the associated Project object.
    """
    api_key = api_key_header or api_key_query
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    # Find project by API key
    result = await db.execute(select(Project).filter(Project.api_key == api_key))
    project = result.scalars().first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )
        
    return project

async def get_current_admin(request: Request, db: AsyncSession = Depends(get_db)) -> str:
    """
    Verify Authorization: Bearer JWT for admin endpoints.
    Returns the admin email (sub) if valid.
    """
    auth = request.headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = auth.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub = payload.get("sub")
        result = await db.execute(select(AdminUser).filter(AdminUser.email == sub))
        user = result.scalars().first()
        if user:
            return sub
        allowed = set(settings.ADMIN_EMAILS or [])
        if settings.ADMIN_EMAIL:
            allowed.add(settings.ADMIN_EMAIL)
        if sub in allowed:
            return sub
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
