
from typing import Any, List
from fastapi import APIRouter, Depends
from app.api import deps
from app.models import models
from app.services.ai.sentinel import sentinel_service
from app.services.ai.nemesis import nemesis_service
from app.services.ai_advisor import ai_advisor
from pydantic import BaseModel

class OracleChatRequest(BaseModel):
    prompt: str
    context: str = "defensive"
    role: str = "analyst"

router = APIRouter()

@router.get("/sentinel/status")
def get_sentinel_status(
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get Blue Team AI status and system health.
    """
    return sentinel_service.analyze_system_health()

@router.post("/sentinel/feedback")
def sentinel_feedback(
    alert_id: str,
    false_positive: bool,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Provide feedback to improve Sentinel accuracy.
    """
    return sentinel_service.learn_feedback(alert_id, false_positive)

@router.post("/nemesis/generate-scenario")
def generate_red_team_scenario(
    difficulty: str = "HARD",
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Generate a new Red Team attack scenario.
    """
    return nemesis_service.generate_scenario(difficulty)

@router.get("/feed/merged")
def get_tactical_feed(
    current_user: models.User = Depends(deps.get_current_active_user),
) -> List[Any]:
    """
    Get a merged feed of AI insights, threats, and system events.
    (Mocked aggregation for frontend)
    """
    # In reality, this would query a time-series DB or event bus
    # Generative AI Mock Feed
    return [
       {"timestamp": "Now", "source": "SENTINEL", "type": "DEFENSE", "message": "Heuristic analysis detected anomaly inAuth Module. Confidence: 89%"},
       {"timestamp": "2m ago", "source": "NEMESIS", "type": "SIMULATION", "message": "Simulation 'Operation Phantom' completed. 3 vulnerabilities found."},
       {"timestamp": "5m ago", "source": "SYSTEM", "type": "INFO", "message": "Daily backup completed successfully."}
    ]

@router.post("/chat")
async def chat_with_oracle(
    request: OracleChatRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Nexus Oracle unified chat interface for both Analyst and Hacker roles.
    """
    reply = await ai_advisor.process_chat_prompt(request.prompt, request.context, request.role)
    return {"reply": reply}
