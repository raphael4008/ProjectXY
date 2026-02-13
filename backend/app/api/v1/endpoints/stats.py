from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.db import models

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
def get_system_stats(
    db: Session = Depends(deps.get_db),
    # current_user: models.User = Depends(deps.get_current_active_user), # Optional: Public or Private? Let's keep it authenticated.
) -> Any:
    """
    Get system statistics:
    - Pipeline status (Mocked for now, or check DB connection)
    - Entity count
    - Active Risks
    """
    # 1. Pipeline Status (Check if DB is alive)
    try:
        db.execute("SELECT 1")
        pipeline_status = "Active"
    except Exception:
        pipeline_status = "Degraded"

    # 2. Entity Count
    entity_count = db.query(models.EntityDB).count()
    
    # 3. High Risk Count
    # Count entities with risk_score > 80
    active_breaches = db.query(models.EntityDB).filter(models.EntityDB.risk_score > 80).count()
    
    return {
        "pipeline": pipeline_status,
        "nodes": f"{entity_count}", 
        "active_breaches": active_breaches
    }
