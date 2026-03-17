from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.modules.offensive.aeg_engine import aeg_core

router = APIRouter()

class ExploitRequest(BaseModel):
    target_profile: Dict[str, Any]

@router.post("/aeg/synthesize", tags=["Offensive Security - The Spear"])
async def trigger_aeg(request: ExploitRequest):
    """
    Tier 5: Automated Exploit Generation.
    Feed the engine a target profile (IP, vulnerability, environment specifics)
    and the AI will autonomously synthesize a custom weaponized payload.
    This acts as the core of the active penetration testing suite.
    """
    try:
        # In a real tool, authentication AND authorization checks would happen here
        # ensuring only 'Hacker' or 'Admin' roles can synthesize payloads.
        payload = await aeg_core.synthesize_payload(request.target_profile)
        
        return {
            "status": "PAYLOAD_SYNTHESIZED",
            "message": "Custom offensive capability ready for deployment.",
            "weaponized_package": payload
        }
    except Exception as e:
        print(f"[THE SPEAR] AEG Engine failure: {e}")
        raise HTTPException(status_code=500, detail="Automated Exploit Generation encountered an error.")
