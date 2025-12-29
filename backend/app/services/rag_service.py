import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.all_models import Document
from app.core.config import settings
from app.services.embeddings_factory import get_embeddings

class RAGService:
    def __init__(self):
        # Use factory to get configured embeddings
        self.embeddings = get_embeddings()

    async def retrieve_context(self, db: AsyncSession, project_id: uuid.UUID, query: str, limit: int = 4) -> str:
        """
        Retrieve relevant documents for a query and format them as context.
        """
        # 1. Embed query
        query_vector = await self.embeddings.aembed_query(query)
        
        # 2. Search in DB using pgvector L2 distance
        # Note: We filter by project_id to ensure multi-tenancy isolation
        stmt = select(Document).filter(
            Document.project_id == project_id
        ).order_by(
            Document.embedding.l2_distance(query_vector)
        ).limit(limit)
        
        result = await db.execute(stmt)
        docs = result.scalars().all()
        
        # 3. Format context
        if not docs:
            return ""
            
        context_parts = []
        for doc in docs:
            context_parts.append(f"---\n{doc.content}\n---")
            
        return "\n".join(context_parts)

rag_service = RAGService()
