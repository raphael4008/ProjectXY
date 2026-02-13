from typing import Dict, Any, List
from app.db.graph import graph_db
# In prod, import LLM service here

class NLQueryEngine:
    """
    Translates Natural Language to Database Queries (Text-to-SQL/Cypher).
    Critical Safety: Never execute raw LLM output directly without validation.
    """
    
    def __init__(self):
        # Maps intent keys to query templates
        self.query_templates = {
            "why_high_risk": {
                "type": "explanation",
                "logic": "Retrieve risk factors from RiskEngine" 
            },
            "recent_relationships": {
                "type": "cypher",
                "template": "MATCH (n)-[r]-(m) WHERE r.created_at > datetime() - duration('P30D') RETURN n, r, m LIMIT 20"
            },
            "show_email_link": {
                "type": "cypher",
                "template": "MATCH (p:Person)-[:OWNS]->(e:Email {{address: $email}}) RETURN p"
            }
        }

    async def parse_intent(self, user_query: str) -> Dict[str, Any]:
        """
        Simulates LLM Intent Classification.
        In prod, this would be: user_query -> LLM -> JSON Intent
        """
        user_query = user_query.lower()
        
        if "risk" in user_query:
            return {"intent": "why_high_risk", "params": {}}
            
        if "relationship" in user_query and "30 days" in user_query:
            return {"intent": "recent_relationships", "params": {}}
            
        if "linked to email" in user_query:
            # Extract email via regex (mocked)
            email = user_query.split("email ")[-1]
            return {"intent": "show_email_link", "params": {"email": email}}
            
        return {"intent": "unknown", "params": {}}

    async def execute(self, user_query: str) -> Any:
        # 1. Parse
        parsed = await self.parse_intent(user_query)
        intent = parsed["intent"]
        params = parsed["params"]
        
        if intent == "unknown":
            return "I'm not sure how to answer that yet."
            
        # 2. Route & Execute
        template = self.query_templates.get(intent)
        
        if template["type"] == "cypher":
            # Execute Cypher safely with params
            print(f"Executing Cypher: {template['template']} with params {params}")
            # return await graph_db.execute_query(template['template'], params)
            return f"Graph Result for {intent}: [Simulated Node]"
            
        elif template["type"] == "explanation":
            return "Analysis: The high risk is driven by 3 factors: Breach Exposure, Connection to Malicious Domain X, and Flight Risk."

nl_engine = NLQueryEngine()
