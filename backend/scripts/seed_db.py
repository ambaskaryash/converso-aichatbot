import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.all_models import Project
from app.services.ingestion_service import ingestion_service

async def seed_data():
    async with AsyncSessionLocal() as db:
        # 1. Create Test Project
        project_id = uuid.UUID("123e4567-e89b-12d3-a456-426614174000")
        project = await db.get(Project, project_id)
        
        if not project:
            print(f"Creating project {project_id}...")
            project = Project(
                id=project_id,
                name="Demo Project",
                api_key="sk-test-key-123",
                vector_namespace=f"ns-{project_id}",
                system_prompt="You are a friendly support assistant for the Demo Company."
            )
            db.add(project)
            await db.commit()
        else:
            print(f"Project {project_id} already exists.")

        # 2. Ingest Dummy Documents
        print("Ingesting sample documents...")
        sample_text = """
        The Demo Company was founded in 2023.
        Our main product is the SuperWidget 3000.
        The SuperWidget 3000 costs $49.99 and is available in blue and red.
        Our support team is available 24/7 at support@demo.com.
        Refunds are processed within 5 business days.
        """
        
        count = await ingestion_service.ingest_text(
            db, 
            project_id, 
            sample_text, 
            metadata={"source": "manual_entry"}
        )
        print(f"Ingested {count} document chunks.")

if __name__ == "__main__":
    asyncio.run(seed_data())
