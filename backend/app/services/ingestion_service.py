import uuid
from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.all_models import Document, Project
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.services.embeddings_factory import get_embeddings

class IngestionService:
    def __init__(self):
        # Lazy init embeddings to avoid network calls during app import
        self.embeddings = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    async def ingest_text(self, db: AsyncSession, project_id: uuid.UUID, text: str, metadata: dict = None):
        """
        Split text into chunks, generate embeddings, and store in the database.
        """
        if self.embeddings is None:
            self.embeddings = get_embeddings()
        # 1. Validate project exists
        project = await db.get(Project, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # 2. Split text
        chunks = self.text_splitter.create_documents([text], metadatas=[metadata or {}])
        
        # 3. Generate embeddings
        texts = [chunk.page_content for chunk in chunks]
        vectors = await self.embeddings.aembed_documents(texts)
        
        # 4. Store in DB
        db_docs = []
        for i, chunk in enumerate(chunks):
            doc = Document(
                project_id=project_id,
                content=chunk.page_content,
                metadata_=chunk.metadata,
                embedding=vectors[i]
            )
            db.add(doc)
            db_docs.append(doc)
            
        await db.commit()
        return len(db_docs)

ingestion_service = IngestionService()
