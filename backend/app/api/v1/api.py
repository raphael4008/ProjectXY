from fastapi import APIRouter
from app.api.v1.endpoints import auth, entities, analysis, stats

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/login", tags=["Auth"])
api_router.include_router(entities.router, prefix="/entities", tags=["Entities"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
api_router.include_router(stats.router, prefix="/stats", tags=["Stats"])
