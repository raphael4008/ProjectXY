from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, log
from app.api.v1.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    log.info("System Starting...")
    yield
    # Shutdown
    log.info("System Shutting Down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Lawful Cyber Intelligence & OSINT Analysis Platform",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/health", tags=["Status"])
async def health_check():
    """
    Health Check Endpoint.
    Used by K8s/Docker to verify service availability.
    """
    return {
        "status": "active",
        "system": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

@app.get("/", tags=["Status"])
async def root():
    return {"message": "Cyber Intelligence Platform API is Online"}

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
