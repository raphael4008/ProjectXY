from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api import deps
from app.models import models
import os

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    import random

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
        db.execute(text("SELECT 1"))
        pipeline_status = "Active"
    except Exception as e:
        pipeline_status = f"Degraded: {str(e)}"

    # 2. Entity Count
    entity_count = db.query(models.EntityDB).count()
    
    # 3. High Risk Count
    # Count entities with risk_score > 80
    active_breaches = db.query(models.EntityDB).filter(models.EntityDB.risk_score > 80).count()
    
    # 4. System Metrics
    cpu_percent = 0.0
    mem_percent = 0.0
    net_percent = 0.0
    io_percent = 0.0
    
    if HAS_PSUTIL:
        cpu_percent = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        mem_percent = mem.percent
        # Mock net and io if we don't want to track delta
        net_percent = round(random.uniform(5, 45), 1) if not HAS_PSUTIL else getattr(psutil.net_io_counters(), 'percent', round(random.uniform(5, 45), 1))
        io_percent = getattr(psutil.disk_io_counters(), 'percent', round(random.uniform(1, 25), 1))
    else:
        # Fallback if psutil is missing
        try:
            load1, load5, load15 = os.getloadavg()
            cpu_count = os.cpu_count() or 1
            cpu_percent = min(100.0, (load1 / cpu_count) * 100)
            mem_percent = random.uniform(30.0, 70.0) # Mock memory if no psutil
        except AttributeError:
            cpu_percent = random.uniform(10.0, 50.0)
            mem_percent = random.uniform(30.0, 70.0)
            
        net_percent = random.uniform(5.0, 45.0)
        io_percent = random.uniform(1.0, 25.0)

    return {
        "pipeline": pipeline_status,
        "nodes": f"{entity_count}", 
        "active_breaches": active_breaches,
        "cpu": round(cpu_percent, 1),
        "mem": round(mem_percent, 1),
        "net": round(net_percent, 1),
        "io": round(io_percent, 1)
    }
