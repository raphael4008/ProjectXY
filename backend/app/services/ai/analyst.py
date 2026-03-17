
import random
from typing import List, Dict, Any
from app.services.sandbox import sandbox_service

class AnalystService:
    """
    AI Analyst: Orchestrates investigations and generates reports.
    """
    def __init__(self):
        self.personas = ["Forensic Analyst", "Threat Hunter", "Malware Researcher"]

    async def investigate_entity(self, entity_id: str, context: Dict[str, Any], seed: int = None) -> Dict[str, Any]:
        """
        Conduct a deep-dive investigation on an entity.
        """
        if seed is not None:
             random.seed(seed)

        # 1. Sandbox Analysis (if applicable)
        artifacts = context.get("artifacts", [])
        sandbox_results = []
        for artifact in artifacts:
            if artifact.get("type") in ["file", "script"]:
                # Mock running it in sandbox
                # res = sandbox_service.run_in_container(artifact["content"], artifact["lang"])
                # sandbox_results.append(res)
                pass

        # 2. Heuristic Analysis (Mock LLM Generation based on context)
        threat_score = random.randint(30, 95)
        
        report = {
            "case_id": f"CASE-{random.randint(1000,9999)}",
            "entity_id": entity_id,
            "threat_score": threat_score,
            "verdict": "MALICIOUS" if threat_score > 70 else "SUSPICIOUS",
            "summary": self._generate_summary(context, threat_score, seed),
            "kill_chain_stage": random.choice(["Reconnaissance", "Weaponization", "Delivery", "Exploitation", "Installation", "C2", "Actions on Objectives"]),
            "recommendations": [
                "Isolate affected endpoints immediately.",
                "Rotate all admin credentials.",
                "Block C2 domains at the perimeter."
            ]
        }
        return report

    def chat_with_analyst(self, entity_id: str, question: str) -> str:
        """
        Simulate an AI Chat response about an entity.
        """
        # Simple keyword matching for "RAG" simulation
        q = question.lower()
        if "malware" in q or "virus" in q:
            return "Based on the artifact analysis, this entity behaves like a classic RAT (Remote Access Trojan). It uses port 4444 for C2 communications."
        elif "who" in q or "actor" in q:
            return "Attribution is difficult, but the TTPs match those of 'APT-28' (Fancy Bear). The code contains Cyrillic comments."
        elif "risk" in q or "score" in q:
            return "The risk score is CRITICAL due to confirmed lateral movement attempts and credential dumping tools found in memory."
        else:
            return f"I am analyzing the telemetry for entity {entity_id}. The behavior indicates anomalous data exfiltration patterns. What specific aspect would you like to drill down into?"

    def _generate_summary(self, context: Dict[str, Any], score: int, seed: int = None) -> str:
        if seed is not None:
            random.seed(seed)
            
        entity_name = context.get("name", "Unknown")
        artifacts = context.get("artifacts", [])
        
        # Mock evidence citation if artifacts exist
        citation = ""
        if artifacts:
            # Assuming artifacts have IDs, or we generate a mock one
            # For this mock, let's assume the first artifact is the evidence
            citation = f" [Evidence: {artifacts[0].get('id', 'unknown')}]"
            
        if score > 70:
            return f"Investigation into '{entity_name}' reveals sophisticated evasion techniques. Primary indicators suggest a targeted attack aimed at data exfiltration{citation}. Sandbox analysis confirmed malicious payload execution."
        else:
            return f"Investigation into '{entity_name}' inconclusive. Activity appears benign but warrants monitoring{citation}."

analyst_service = AnalystService()
