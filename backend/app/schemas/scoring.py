from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class RiskLevel(str, Enum):
    LOW = "LOW"         # 0-20
    MEDIUM = "MEDIUM"   # 21-60
    HIGH = "HIGH"       # 61-90
    CRITICAL = "CRITICAL" # 91-100

class RiskFactor(BaseModel):
    name: str = Field(..., description="The driver of the risk (e.g., 'Breach Exposure')")
    score_impact: int = Field(..., description="Points added to the total score")
    description: str
    evidence_ref: Optional[str] = None

class RiskAnalysisResult(BaseModel):
    target_id: str
    total_score: int = Field(..., ge=0, le=100)
    level: RiskLevel
    factors: List[RiskFactor]
    narrative: str = Field(..., description="Auto-generated explanation for the analyst")
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
