from slowapi import Limiter
from slowapi.util import get_remote_address
import os

# Use Redis if available, otherwise fallback to memory
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_url,
    default_limits=["100/minute"]
)
