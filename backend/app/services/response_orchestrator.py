import logging
from typing import Dict, Any, List
from enum import Enum
from app.services.audit import audit_logger
from app.services.combat import combat_orchestrator

logger = logging.getLogger(__name__)

class ActionType(str, Enum):
    BLOCK_IP = "block_ip"
    THROTTLE_ASN = "throttle_asn"
    FORCE_MFA = "force_mfa"
    ISOLATE_SESSION = "isolate_session"
    ALERT_SOC = "alert_soc"

class ResponseOrchestrator:
    """
    Defensive Orchestration Layer.
    Executes automated responses based on risk thresholds and tenant policies.
    """

    def __init__(self):
        # Default policy mapped by Tenant ID. In prod, comes from PostgesQL Policy tables.
        self.tenant_policies = {
            "default": {
                "auto_block_threshold": 90,
                "auto_mfa_threshold": 75,
                "auto_throttle_threshold": 80,
                "require_human_approval_for_blocking": False
            }
        }

    async def evaluate_and_respond(self, tenant_id: str, target_ip: str, risk_score: float, reasoning: str) -> List[Dict[str, Any]]:
        """
        Evaluates a Threat Intelligence score against the Tenant's zero-trust automation policy.
        """
        policy = self.tenant_policies.get(tenant_id, self.tenant_policies["default"])
        actions_taken = []
        
        logger.info(f"Evaluating response for {target_ip}. Score: {risk_score}")

        # 1. Critical Threat (Block / Isolate)
        if risk_score >= policy["auto_block_threshold"]:
            if policy["require_human_approval_for_blocking"]:
                actions_taken.append(await self._trigger_soc_approval(tenant_id, target_ip, ActionType.BLOCK_IP, reasoning))
            else:
                actions_taken.append(await self._execute_block(tenant_id, target_ip, reasoning))

        # 2. High Threat (Throttle / Rate Limit)
        elif risk_score >= policy["auto_throttle_threshold"]:
            actions_taken.append(await self._execute_throttle(tenant_id, target_ip, reasoning))

        # 3. Medium Threat (Step-Up Auth)
        elif risk_score >= policy["auto_mfa_threshold"]:
            actions_taken.append(await self._force_mfa(tenant_id, target_ip, reasoning))
            
        return actions_taken

    async def execute_trap(self, tenant_id: str, ip: str, reasoning: str) -> Dict[str, Any]:
        """
        Directly executes a block action on an IP, bypassing normal evaluation.
        Triggered by a manual command from the Situation Room.
        """
        logger.warning(f"Manual TRAP command received for IP: {ip}. Reason: {reasoning}")
        return await self._execute_block(tenant_id, ip, reasoning)

    async def _execute_block(self, tenant_id: str, ip: str, reasoning: str) -> Dict[str, Any]:
        """Applies a WAF / Network level block."""
        
        # Step 3: Hive-Mind Inoculation (Zero-Day Sharing)
        from app.services.security.vaccine import vaccine_engine
        await vaccine_engine.publish_vaccine(source_tenant=tenant_id, threat_ip=ip, signature={"reason": reasoning})
        
        # Broadcast via websocket to the Situation Room
        await combat_orchestrator.broadcast_dashboard("DEFENSE_ACTION", {
            "action": "BLOCK_IP",
            "target": ip,
            "status": "EXECUTED"
        })
        
        audit_logger.log_action(
            actor_id="AUTO_RESPONDER",
            action="BLOCK_IP",
            resource="NETWORK_FIREWALL",
            target_id=ip,
            metadata={"reason": reasoning, "tenant_id": tenant_id}
        )
        return {"action": ActionType.BLOCK_IP, "status": "executed", "target": ip}

    async def _execute_throttle(self, tenant_id: str, ip: str, reasoning: str) -> Dict[str, Any]:
        """Applies an API Gateway rate limit."""
        await combat_orchestrator.broadcast_dashboard("DEFENSE_ACTION", {
            "action": "THROTTLE_IP",
            "target": ip,
            "status": "EXECUTED"
        })
        
        audit_logger.log_action("AUTO_RESPONDER", "THROTTLE_IP", "API_GATEWAY", ip, {"reason": reasoning})
        return {"action": ActionType.THROTTLE_ASN, "status": "executed", "target": ip}

    async def _force_mfa(self, tenant_id: str, ip: str, reasoning: str) -> Dict[str, Any]:
        """Invalidates current sessions and forces step-up authentication."""
        await combat_orchestrator.broadcast_dashboard("DEFENSE_ACTION", {
            "action": "FORCE_MFA",
            "target": ip,
            "status": "PENDING_USER"
        })
        
        audit_logger.log_action("AUTO_RESPONDER", "FORCE_MFA", "IAM_PROVIDER", ip, {"reason": reasoning})
        return {"action": ActionType.FORCE_MFA, "status": "enforced", "target": ip}

    async def _trigger_soc_approval(self, tenant_id: str, ip: str, requested_action: ActionType, reasoning: str) -> Dict[str, Any]:
        """Generates a P1 ticket for human review."""
        await combat_orchestrator.broadcast_dashboard("APPROVAL_REQUIRED", {
            "requested_action": requested_action,
            "target": ip,
            "reasoning": reasoning
        })
        return {"action": requested_action, "status": "pending_human_approval", "target": ip}

response_orchestrator = ResponseOrchestrator()
