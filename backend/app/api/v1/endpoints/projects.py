from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import uuid4
import secrets

from app.db.session import get_db
from app.models.all_models import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.api.deps import get_current_admin, get_write_admin
import sentry_sdk

router = APIRouter()

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_write_admin),
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
        api_key=f"sk_{secrets.token_urlsafe(32)}",
        welcome_message=project_in.welcome_message
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

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_write_admin),
    request: Request = None,
):
    """
    Delete a project and all associated data.
    """
    # CSRF double-submit check
    csrf_cookie = request.cookies.get("csrftoken") if request else None
    csrf_header = request.headers.get("x-csrf-token") if request else None
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF validation failed")

    with sentry_sdk.start_span(op="db", description="get_project_for_delete"):
        result = await db.execute(select(Project).filter(Project.id == project_id))
        project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Delete associated data explicitely to avoid FK violations if cascades aren't set up
    from app.models.all_models import EmbedSettings, Document, ChatSession, ChatMessage
    from sqlalchemy import delete
    
    # 1. Delete EmbedSettings
    await db.execute(delete(EmbedSettings).where(EmbedSettings.project_id == project_id))
    
    # 2. Delete Documents
    await db.execute(delete(Document).where(Document.project_id == project_id))
    
    # 3. Delete ChatMessages (via Sessions)
    # We need to find sessions first to delete messages, or use a subquery.
    # Subquery delete is cleaner: DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE project_id = ...)
    
    subq = select(ChatSession.id).where(ChatSession.project_id == project_id)
    await db.execute(delete(ChatMessage).where(ChatMessage.session_id.in_(subq)))
    
    # 4. Delete ChatSessions
    await db.execute(delete(ChatSession).where(ChatSession.project_id == project_id))

    # 5. Delete Project
    await db.delete(project)
    
    with sentry_sdk.start_span(op="db", description="delete_project_commit"):
        await db.commit()
    
    return {"ok": True}

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_write_admin),
    request: Request = None,
):
    """
    Update a project.
    """
    # CSRF check
    csrf_cookie = request.cookies.get("csrftoken") if request else None
    csrf_header = request.headers.get("x-csrf-token") if request else None
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF validation failed")

    with sentry_sdk.start_span(op="db", description="get_project_for_update"):
        result = await db.execute(select(Project).filter(Project.id == project_id))
        project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_in.name is not None:
        project.name = project_in.name
    if project_in.welcome_message is not None:
        project.welcome_message = project_in.welcome_message
    if project_in.system_prompt is not None:
        project.system_prompt = project_in.system_prompt

    with sentry_sdk.start_span(op="db", description="update_project_commit"):
        await db.commit()
        await db.refresh(project)
    
    return project

@router.post("/{project_id}/rotate-key", response_model=ProjectResponse)
async def rotate_key(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_write_admin),
    request: Request = None,
):
    """
    Rotate the API key for a project.
    """
    # CSRF check
    csrf_cookie = request.cookies.get("csrftoken") if request else None
    csrf_header = request.headers.get("x-csrf-token") if request else None
    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(status_code=403, detail="CSRF validation failed")

    with sentry_sdk.start_span(op="db", description="get_project_for_rotate"):
        result = await db.execute(select(Project).filter(Project.id == project_id))
        project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.api_key = f"sk_{secrets.token_urlsafe(32)}"
    
    with sentry_sdk.start_span(op="db", description="rotate_key_commit"):
        await db.commit()
        await db.refresh(project)
    
    return project
