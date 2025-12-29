import asyncio
from typing import AsyncGenerator, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class _LocalMockChunk:
    def __init__(self, content: str):
        self.content = content

class _LocalMockChat:
    async def astream(self, messages: Any) -> AsyncGenerator[_LocalMockChunk, None]:
        text = "Mock reply from local LLM. Configure GROQ_API_KEY to enable real responses."
        for token in text.split(" "):
            await asyncio.sleep(0.02)
            yield _LocalMockChunk(token + " ")

def get_llm() -> BaseChatModel | _LocalMockChat:
    if settings.GROQ_API_KEY:
        try:
            llm = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model_name="llama-3.3-70b-versatile",
                streaming=True
            )
            return llm
        except Exception as e:
            logger.warning(f"Failed to initialize ChatGroq, falling back to local mock: {e}")
    return _LocalMockChat()
