from datetime import datetime, timedelta
import math
from typing import List, Tuple
from app.schemas.entity import Entity, Attribute
from app.schemas.relationships import Relationship, LinkType
from app.schemas.evidence import Reliability, Evidence

class CorrelationEngine:
    """
    The Brain of the operation.
    Links disparate entities based on shared attributes and heuristic analysis.
    """
    
    def __init__(self):
        # Configuration
        self.CONFIDENCE_THRESHOLD = 0.75  # Minimum to suggest a link
        self.DECAY_RATE = 0.05  # 5% confidence loss per year for old data
    
    def calculate_confidence(self, method: str, evidence: List[Evidence]) -> float:
        """
        Calculates confidence score (0-1) based on method strength + evidence quality + time decay.
        """
        base_score = 0.0
        
        # 1. Method Strength
        if method == "deterministic": # Shared unique ID (Email, Phone)
            base_score = 1.0
        elif method == "strong_heuristic": # Rare Name + Location
            base_score = 0.85
        elif method == "weak_heuristic": # Name match only
            base_score = 0.4
            
        # 2. Evidence Reliability Penalty
        # If all evidence is low grade, penalize the score
        if all(e.reliability in [Reliability.D, Reliability.E, Reliability.F] for e in evidence):
            base_score *= 0.6
            
        # 3. Time Decay
        # Link confidence fades if not reinforced
        newest_evidence = max([e.collected_at for e in evidence]) if evidence else datetime.utcnow()
        age_years = (datetime.utcnow() - newest_evidence).days / 365.0
        
        # Formula: Score * e^(-decay * age)
        decay_factor = math.exp(-self.DECAY_RATE * age_years)
        
        final_score = base_score * decay_factor
        return round(min(final_score, 1.0), 3)

    def detect_aliases(self, entity: Entity, candidates: List[Entity]) -> List[Tuple[Entity, float]]:
        """
        Scans a list of candidates to find potential aliases for the target entity.
        Returns matches with confidence > threshold.
        """
        matches = []
        
        for candidate in candidates:
            score = 0.0
            
            # Exact attribute match (High Confidence)
            shared_attrs = set(a.value for a in entity.attributes) & set(a.value for a in candidate.attributes)
            if shared_attrs:
                score = 1.0 # Hard link via shared selector
                
            # Name Similarity (Jaro-Winkler would go here)
            # For this MVP, we use exact name match case-insensitive
            elif entity.canonical_name.lower() == candidate.canonical_name.lower():
                score = 0.6 # Moderate confidence, names are not unique
            
            if score >= self.CONFIDENCE_THRESHOLD:
                matches.append((candidate, score))
                
        return matches

# Example Usage
if __name__ == "__main__":
    engine = CorrelationEngine()
    
    # Test Time Decay
    old_evidence = Evidence(
        id="1", provider="OldLeak", 
        collected_at=datetime.utcnow() - timedelta(days=730), # 2 years old
        reliability=Reliability.C
    )
    
    score = engine.calculate_confidence("deterministic", [old_evidence])
    print(f"Confidence for 2-year-old link: {score}") 
    # Expect < 1.0 due to decay
