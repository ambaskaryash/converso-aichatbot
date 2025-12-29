import asyncio
from uuid import UUID, uuid4
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.rag_service import rag_service
from app.core.config import settings
from app.models.all_models import Project, ChatSession, ChatMessage
from app.services.llm_factory import get_llm
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        # Use factory to get configured LLM
        self.llm = get_llm()

    async def process_message(
        self, 
        db: AsyncSession,
        project_id: UUID, 
        message: str, 
        session_id: Optional[str]
    ) -> AsyncGenerator[str, None]:
        """
        Process a user message with RAG and stream back the response.
        """
        # 1. Get Project Settings (System Prompt)
        project = await db.get(Project, project_id)
        if not project:
            yield "Error: Project not found."
            return

        # 1.1 Ensure ChatSession exists
        session = None
        if session_id:
            session = await db.get(ChatSession, UUID(session_id))
        if not session:
            session = ChatSession(project_id=project_id)
            db.add(session)
            await db.flush()
            session_id = str(session.id)

        # 1.2 Persist user message
        user_msg = ChatMessage(session_id=session.id, role="user", content=message)
        db.add(user_msg)
        await db.flush()
        user_time = datetime.utcnow()

        # 2. Retrieve Context (robust)
        try:
            context = await rag_service.retrieve_context(db, project_id, message)
        except Exception as e:
            logger.warning(f"RAG context retrieval failed for project {project_id}: {e}")
            context = ""
        
        # 3. Construct Prompt
        system_prompt = project.system_prompt or "You are a helpful AI assistant."
        if context:
            system_prompt += f"\n\nRelevant Context:\n{context}\n\nAnswer based on the context above."
            
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=message)
        ]

        # 4. Stream Response from LLM, track response time, and persist assistant message
        first_token_time_ms: Optional[float] = None
        full_response_parts: list[str] = []
        try:
            logger.info(f"Starting LLM stream for project {project_id} session {session_id}")
            async for chunk in self.llm.astream(messages):
                if chunk.content:
                    if first_token_time_ms is None:
                        first_token_time_ms = (datetime.utcnow() - user_time).total_seconds() * 1000.0
                    yield chunk.content
                    full_response_parts.append(chunk.content)
        except Exception as e:
            logger.error(f"LLM streaming error for project {project_id} session {session_id}: {e}")
            yield f"Error generating response: {str(e)}"
            full_response_parts.append(f"Error generating response: {str(e)}")
        finally:
            assistant_content = "".join(full_response_parts).strip()
            assistant_msg = ChatMessage(session_id=session.id, role="assistant", content=assistant_content or "")
            db.add(assistant_msg)
            # Update session metadata with last_response_ms
            meta = session.metadata_ or {}
            if first_token_time_ms is not None:
                meta["last_response_ms"] = int(first_token_time_ms)
            session.metadata_ = meta
            await db.commit()

chat_service = ChatService()
