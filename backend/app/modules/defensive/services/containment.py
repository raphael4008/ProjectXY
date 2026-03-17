import logging
import time
from typing import Dict, Any, List
import redis

logger = logging.getLogger(__name__)

class ContainmentEngine:
    """
    Automated Containment Policies (Phase 3)
    
    Provides rapid isolation capabilities for entities exceeding risk thresholds.
    """
    def __init__(self, redis_url: str = "redis://redis:6379/0"):
        try:
            self.redis = redis.from_url(redis_url, decode_responses=True)
            self.redis.ping()
            self.is_connected = True
        except Exception:
            self.is_connected = False
            
    def isolate_entity(self, entity_id: str, reason: str, duration_seconds: int = 3600) -> Dict[str, Any]:
        """
        Temporarily revokes access for an entity by placing them in an isolation sandbox.
        """
        if not self.is_connected:
            return {"status": "failed", "reason": "cache_unavailable"}
            
        isolation_key = f"containment:isolated:{entity_id}"
        if self.redis.exists(isolation_key):
            return {"status": "already_isolated"}
            
        self.redis.setex(isolation_key, duration_seconds, reason)
        logger.critical(f"CONTAINMENT ENACTED: {entity_id} isolated for {duration_seconds}s. Reason: {reason}")
        return {"status": "isolated", "entity": entity_id, "duration": duration_seconds, "action": "shadow_sandbox"}
        
    def check_isolation(self, entity_id: str) -> bool:
        """Check if an entity is currently in the containment sandbox."""
        if not self.is_connected:
            return False
        return self.redis.exists(f"containment:isolated:{entity_id}") > 0

    def invalidate_token(self, token_jti: str, duration_seconds: int = 86400) -> None:
        """[PHASE 6] Invalidates an explicitly compromised JWT token."""
        if self.is_connected:
            self.redis.setex(f"containment:revoked_token:{token_jti}", duration_seconds, "invalidated_by_ai")

    def quarantine_session(self, session_id: str, duration_seconds: int = 3600) -> None:
        """[PHASE 6] Places an active session into quarantine."""
        if self.is_connected:
            self.redis.setex(f"containment:quarantine:{session_id}", duration_seconds, "quarantined_by_ai")

    def downgrade_privilege(self, user_id: str, duration_seconds: int = 3600) -> None:
        """[PHASE 6] Dynamically downgrades user privilege to READ_ONLY_SANDBOX."""
        if self.is_connected:
            self.redis.setex(f"containment:downgrade:{user_id}", duration_seconds, "READ_ONLY")

    def throttle_api(self, entity_id: str, limit_per_minute: int = 5, duration_seconds: int = 3600) -> None:
        """[PHASE 6] Imposes strict rate-limiting on a suspicious entity."""
        if self.is_connected:
            # We enforce a generic throttling flag to be checked by the edge API GW
            self.redis.setex(f"containment:throttle:{entity_id}", duration_seconds, str(limit_per_minute))

containment_engine = ContainmentEngine()
