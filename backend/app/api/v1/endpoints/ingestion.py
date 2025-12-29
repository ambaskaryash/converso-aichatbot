from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import logging

from app.db.session import get_db
from app.services.ingestion_service import ingestion_service
from app.schemas.document import IngestTextRequest, IngestResponse
from app.models.all_models import Project
from app.api.deps import get_current_project
from app.core.limiter import limiter
from starlette.requests import Request

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/{project_id}/text", response_model=IngestResponse)
@limiter.limit("10/minute")
async def ingest_text(
    request: Request,
    project_id: UUID,
    ingest_request: IngestTextRequest,
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(get_current_project)
):
    """
    Ingest raw text into the project's knowledge base.
    Requires API Key.
    """
    if project.id != project_id:
        raise HTTPException(status_code=403, detail="API Key does not match Project ID")

    try:
        count = await ingestion_service.ingest_text(
            db=db,
            project_id=project_id,
            text=ingest_request.text,
            metadata=ingest_request.metadata
        )
        return IngestResponse(
            documents_processed=count,
            message="Text successfully ingested"
        )
    except Exception as e:
        logger.error(f"Error ingesting text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{project_id}/file", response_model=IngestResponse)
@limiter.limit("5/minute")
async def ingest_file(
    request: Request,
    project_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    project: Project = Depends(get_current_project)
):
    """
    Ingest a file (PDF or Text) into the project's knowledge base.
    Requires API Key.
    """
    if project.id != project_id:
        raise HTTPException(status_code=403, detail="API Key does not match Project ID")

    if not file.filename.endswith(('.txt', '.pdf', '.md')):
        raise HTTPException(status_code=400, detail="Only .txt, .pdf, and .md files are supported")

    content = await file.read()
    
    # Simple text decoding for now. PDF support would need pypdf
    try:
        text_content = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Could not decode file as UTF-8 text")

    try:
        count = await ingestion_service.ingest_text(
            db=db,
            project_id=project_id,
            text=text_content,
            metadata={"source": file.filename}
        )
        return IngestResponse(
            documents_processed=count,
            message=f"File {file.filename} successfully ingested"
        )
    except Exception as e:
        logger.error(f"Error ingesting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))
