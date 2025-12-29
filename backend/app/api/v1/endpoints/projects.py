from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import uuid4
import secrets

from app.db.session import get_db
from app.models.all_models import Project
from app.schemas.project import ProjectCreate, ProjectResponse
from app.api.deps import get_current_admin
import sentry_sdk

router = APIRouter()

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
    request: Request = None,
):
    """
    Create a new project.
    Generates a unique API key for the project.
    """
    # CSRF double-submit check
    csrf_cookie = request.cookies.get("csrftoken") if request else None
    csrf_header = request.headers.get("x-csrf-token") if request else None
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF validation failed")

    # Check if vector namespace is already taken
    with sentry_sdk.start_span(op="db", description="check_vector_namespace"):
        result = await db.execute(select(Project).filter(Project.vector_namespace == project_in.vector_namespace))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Vector namespace already exists")

    new_project = Project(
        name=project_in.name,
        # description=project_in.description, # Removed as model doesn't support it yet
        vector_namespace=project_in.vector_namespace,
        api_key=f"sk_{secrets.token_urlsafe(32)}"
    )
    
    db.add(new_project)
    with sentry_sdk.start_span(op="db", description="create_project_commit"):
        await db.commit()
        await db.refresh(new_project)
    return new_project

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    """
    List all projects.
    """
    with sentry_sdk.start_span(op="db", description="list_projects"):
        result = await db.execute(select(Project).offset(skip).limit(limit))
    projects = result.scalars().all()
    return projects
