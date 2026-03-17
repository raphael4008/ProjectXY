import logging
import uuid
from typing import Dict, Any, List
from app.modules.defensive.services.intelligence import soc_engine
from app.modules.defensive.services.containment import containment_engine

logger = logging.getLogger(__name__)

class DeceptionEngine:
    """
    Deception Operations Module (Phase 4)
    
    Generates invisible trap-doors, dummy schemas (Honeypots) and tracked 
    documents (Canary Tokens). Any interaction instantly triggers a High severity lockdown.
    """
    
    def __init__(self):
        # Known honeypot routes or entity IDs that legitimate usage would NEVER touch
        self.honeypot_endpoints = {
            "/api/v1/system/debug/shell",
            "/api/v1/admin/legacy/export",
            "/api/v1/internal/billing/dump"
        }
        
        self.canary_tokens = {
            "AWS_AKIA_MOCK_HONY": "AWS Keys File",
            "ghp_mock_token_deploy": "GitHub Deploy Token"
        }
        
        self.credential_decoys = {
            "admin_shadow@projectxy.local": "password123!",
            "svc_db_backup": "R3dTeam!nv!siib!lity"
        }
        
    def deploy_invisible_traps(self, graph_db_session) -> None:
        """
        [PHASE 7: DECEPTION ENGINEERING]
        Inject invisible nodes into the Neo4j graph. These nodes do not exist in the 
        real production schema, but an adversary enumerating the graph will see them.
        """
        query = """
        MERGE (h:Honeypot:Resource {name: 'vcenter_legacy_backup_01', type: 'shadow_VM'})
        MERGE (a:Honeypot:User {id: 'svc_db_backup'})
        CREATE (a)-[:ADMIN_ACCESS]->(h)
        """
        try:
            graph_db_session.run(query)
            logger.info("Deception: Invisible trap relationships active in Graph.")
        except Exception as e:
            logger.warning(f"Deception: Failed to deploy invisible traps: {e}")
            
    def evaluate_request(self, path: str, ip_address: str, user_id: str, payload_data: Any = None) -> bool:
        """
        Check if a request touched a honeypot endpoint or used decoy credentials.
        Returns True if a trap was triggered, False otherwise.
        """
        if path in self.honeypot_endpoints:
            self._trigger_trap("HONEYPOT_API_TOUCHED", path, ip_address, user_id)
            return True
            
        if payload_data and isinstance(payload_data, dict):
            # Evaluate for Credential Decoys
            attempted_user = payload_data.get("username", "")
            if attempted_user in self.credential_decoys:
                self._trigger_trap("CREDENTIAL_DECOY_USED", attempted_user, ip_address, user_id)
                return True
                
        return False
        
    def check_exfiltrated_canary(self, token_found: str, ip_address: str, context: str):
        """
        Invoked conditionally if a monitoring hook spots a canary token being used 
        anywhere in request payloads or outbound traffic.
        """
        if token_found in self.canary_tokens:
            fake_asset = self.canary_tokens[token_found]
            self._trigger_trap("CANARY_EXFILTRATION_TOUCHED", fake_asset, ip_address, "unknown")
            
    def _trigger_trap(self, trap_type: str, asset: str, ip_address: str, user_id: str):
        """Execute immediate maximum-severity lockdown for deception triggers."""
        logger.critical(f"DECEPTION TRAP TRIGGERED: Type {trap_type} via IP {ip_address}")
        
        # 1. Alerting
        soc_engine.trigger_alert(
            severity="CRITICAL", 
            source="DECEPTION_ENGINE", 
            message=f"Adversary interacted with trap ({trap_type}: {asset}) from {ip_address}."
        )
        
        # 2. Instant Containment
        containment_engine.isolate_entity(
            entity_id=f"ip_entity_{ip_address}",
            reason=f"Deception trap triggered: {asset}",
            duration_seconds=86400 # 24-hour instant block
        )
        
        if user_id and user_id != "unknown":
            containment_engine.isolate_entity(
                entity_id=user_id,
                reason=f"Deception trap triggered via compromised session: {asset}",
                duration_seconds=86400
            )

deception_ops = DeceptionEngine()
