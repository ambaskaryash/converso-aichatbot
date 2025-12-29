from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File
from uuid import UUID
from app.services.chat_service import chat_service
from app.db.session import AsyncSessionLocal, get_db
from app.schemas.chat import ChatFeedbackRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.all_models import ChatMessage
import logging
import json
from urllib.parse import urlparse
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple in-memory rate limiter
_RATE_LIMIT_DATA = {}
_RATE_LIMIT = 60 # messages per minute
_RATE_WINDOW = 60 # seconds

def check_rate_limit(ip: str) -> bool:
    now = datetime.utcnow()
    history = _RATE_LIMIT_DATA.get(ip, [])
    # Remove old
    history = [t for t in history if (now - t).total_seconds() < _RATE_WINDOW]
    if len(history) >= _RATE_LIMIT:
        _RATE_LIMIT_DATA[ip] = history # Update cleaned
        return False
    history.append(now)
    _RATE_LIMIT_DATA[ip] = history
    return True

@router.post("/feedback")
async def submit_feedback(
    payload: ChatFeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit feedback for a chat message.
    """
    result = await db.execute(select(ChatMessage).filter(ChatMessage.id == payload.message_id))
    message = result.scalars().first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.feedback_score = payload.score
    await db.commit()
    return {"ok": True}

@router.post("/{project_id}/upload")
async def upload_file(
    project_id: UUID,
    file: UploadFile = File(...),
):
    """
    Upload a file, extract text, and return it.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    content = ""
    try:
        # Simple text extraction for now
        # Limit size to 5MB
        if file.size and file.size > 5 * 1024 * 1024:
             raise HTTPException(status_code=400, detail="File too large")
             
        file_content = await file.read()
        try:
            content = file_content.decode("utf-8")
        except UnicodeDecodeError:
            # Try to handle as PDF if needed, but requires external lib.
            # For now, just error on binary
            raise HTTPException(status_code=400, detail="Only text files are supported currently")
            
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail="Error processing file")
        
    return {"filename": file.filename, "content": content}

@router.websocket("/{project_id}/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    project_id: UUID,
):
    # Extract API key from query params since headers are limited in WebSocket API in browsers
    api_key = websocket.query_params.get("api_key")
    
    # Accept connection to send close frame with reason if needed, or reject immediately
    # But standard is to accept then close if auth fails, or just close with 403
    
    if not api_key:
        await websocket.close(code=1008, reason="Missing API Key")
        return

    # Validate API Key
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        from app.models.all_models import Project, EmbedSettings
        
        result = await db.execute(select(Project).filter(Project.api_key == api_key))
        project = result.scalars().first()
        
        if not project or project.id != project_id:
            await websocket.close(code=1008, reason="Invalid API Key")
            return

        origin = websocket.headers.get("origin")
        if origin:
            try:
                host = urlparse(origin).hostname or ""
                host = host.lower()
                settings_result = await db.execute(select(EmbedSettings).filter(EmbedSettings.project_id == project_id))
                settings_obj = settings_result.scalars().first()
                allowed_domains = (settings_obj.domains if settings_obj and settings_obj.domains else [])
                if allowed_domains and host and host not in [d.lower() for d in allowed_domains]:
                    await websocket.close(code=1008, reason="Origin not allowed")
                    return
            except Exception:
                await websocket.close(code=1008, reason="Invalid Origin")
                return

    await websocket.accept()
    
    # Send welcome message if exists
    if project.welcome_message:
        await websocket.send_json({
            "type": "token", # Treat as token or new type?
            # If I use 'token' it might look like a stream.
            # Use 'message' or just send a full message object structure?
            # The client expects 'token', 'done', 'error'.
            # I'll simulate a bot message.
            "content": project.welcome_message
        })
        await websocket.send_json({"type": "done"})

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                message = payload.get("message")
                session_id = payload.get("session_id")
                
                if not message:
                    await websocket.send_json({"type": "error", "error": "Message is required"})
                    continue

                # Rate Limit Check
                client_ip = websocket.client.host if websocket.client else "unknown"
                if not check_rate_limit(client_ip):
                    await websocket.send_json({"type": "error", "error": "Rate limit exceeded"})
                    continue

                # Create a new DB session for this request
                async with AsyncSessionLocal() as db:
                    # Stream response
                    async for chunk in chat_service.process_message(db, project_id, message, session_id):
                        await websocket.send_json({
                            "type": "token",
                            "content": chunk
                        })
                
                # Signal completion
                await websocket.send_json({"type": "done"})
                
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "error": "Invalid JSON"})
                
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from project {project_id}")
    except Exception as e:
        logger.error(f"Error in websocket connection: {e}")
        # Only try to close if not already closed
        try:
            await websocket.close()
        except:
            pass
