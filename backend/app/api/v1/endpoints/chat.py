from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from uuid import UUID
from app.services.chat_service import chat_service
from app.db.session import AsyncSessionLocal
import logging
import json
from urllib.parse import urlparse

router = APIRouter()
logger = logging.getLogger(__name__)

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
