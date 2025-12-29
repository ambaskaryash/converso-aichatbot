from langchain_core.embeddings import Embeddings
from langchain_huggingface import HuggingFaceEmbeddings
from app.services.mock_embeddings import MockEmbeddings
from app.core.config import settings

def get_embeddings() -> Embeddings:
    if settings.EMBEDDING_PROVIDER == "local":
        return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    else:
        return MockEmbeddings()
