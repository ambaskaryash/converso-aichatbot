from pydantic import BaseModel
from typing import Optional, Literal
from uuid import UUID

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    
class ChatRequest(BaseModel):
    project_id: UUID
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    type: Literal["token", "error", "done"]
    content: Optional[str] = None
    error: Optional[str] = None
