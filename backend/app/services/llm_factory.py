from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq
from app.core.config import settings

def get_llm() -> BaseChatModel:
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model_name="llama-3.3-70b-versatile",
        streaming=True
    )
