from typing import List, Optional
from langchain_core.embeddings import Embeddings
import random

class MockEmbeddings(Embeddings):
    def __init__(self, size: int = 384):
        self.size = size

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [[random.random() for _ in range(self.size)] for _ in texts]

    def embed_query(self, text: str) -> List[float]:
        return [random.random() for _ in range(self.size)]
    
    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.embed_documents(texts)

    async def aembed_query(self, text: str) -> List[float]:
        return self.embed_query(text)
