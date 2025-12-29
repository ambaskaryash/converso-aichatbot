from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_project
from app.db.session import get_db
from app.models.all_models import EmbedSettings

router = APIRouter()

@router.get("/{project_id}/embed-settings")
async def get_embed_settings(
    project_id: UUID,
    project = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    if project.id != project_id:
        raise HTTPException(status_code=403, detail="API Key does not match Project ID")
    result = await db.execute(select(EmbedSettings).filter(EmbedSettings.project_id == project_id))
    settings = result.scalars().first()
    if not settings:
        settings = EmbedSettings(project_id=project_id, domains=[], theme="ocean")
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return {"domains": settings.domains or [], "theme": settings.theme}

@router.post("/{project_id}/embed-settings")
async def update_embed_settings(
    project_id: UUID,
    payload: dict,
    project = Depends(get_current_project),
    db: AsyncSession = Depends(get_db),
):
    if project.id != project_id:
        raise HTTPException(status_code=403, detail="API Key does not match Project ID")
    result = await db.execute(select(EmbedSettings).filter(EmbedSettings.project_id == project_id))
    settings = result.scalars().first()
    if not settings:
        settings = EmbedSettings(project_id=project_id, domains=[], theme="ocean")
        db.add(settings)
    domains: Optional[List[str]] = payload.get("domains")
    theme: Optional[str] = payload.get("theme")
    if domains is not None:
        settings.domains = [d.strip().lower() for d in domains if d and isinstance(d, str)]
    if theme is not None:
        settings.theme = str(theme)
    await db.commit()
    await db.refresh(settings)
    return {"domains": settings.domains or [], "theme": settings.theme}
