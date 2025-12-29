from fastapi import FastAPI, Request
import uuid
import logging
try:
    import sentry_sdk  # type: ignore
    _SENTRY_AVAILABLE = True
except Exception:
    sentry_sdk = None  # type: ignore
    _SENTRY_AVAILABLE = False
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import chat, projects, ingestion, analytics, embed, auth, conversations, admins
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

if settings.SENTRY_DSN and _SENTRY_AVAILABLE:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2)  # type: ignore

# Set up Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

logger = logging.getLogger("converso")

@app.middleware("http")
async def add_request_id_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    start = logging.LoggerAdapter(logger, {"request_id": request_id})
    start.info(f"HTTP {request.method} {request.url.path} start")
    if settings.SENTRY_DSN and _SENTRY_AVAILABLE:
        with sentry_sdk.start_transaction(name=f"{request.method} {request.url.path}"):  # type: ignore
            response = await call_next(request)
    else:
        response = await call_next(request)
    response.headers["x-request-id"] = request_id
    end = logging.LoggerAdapter(logger, {"request_id": request_id})
    end.info(f"HTTP {request.method} {request.url.path} end {response.status_code}")
    return response

app.include_router(chat.router, prefix=settings.API_V1_STR + "/chat", tags=["chat"])
app.include_router(projects.router, prefix=settings.API_V1_STR + "/projects", tags=["projects"])
app.include_router(ingestion.router, prefix=settings.API_V1_STR + "/ingest", tags=["ingestion"])
app.include_router(analytics.router, prefix=settings.API_V1_STR + "/analytics", tags=["analytics"])
app.include_router(embed.router, prefix=settings.API_V1_STR + "/integrations", tags=["integrations"])
app.include_router(auth.router, prefix=settings.API_V1_STR + "/auth", tags=["auth"])
app.include_router(conversations.router, prefix=settings.API_V1_STR + "/conversations", tags=["conversations"])
app.include_router(admins.router, prefix=settings.API_V1_STR + "/admins", tags=["admins"])

@app.get("/")
def root():
    return {"message": "Converso Chatbot API is running"}
