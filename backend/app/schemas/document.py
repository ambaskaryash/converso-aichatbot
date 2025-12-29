from pydantic import BaseModel
from typing import Optional, Dict, Any

class IngestTextRequest(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = None

class IngestResponse(BaseModel):
    documents_processed: int
    message: str
