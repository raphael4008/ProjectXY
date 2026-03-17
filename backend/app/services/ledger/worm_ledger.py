import hashlib
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import AuditLog
import uuid
from typing import Dict, Any

class WormLedgerService:
    """
    Tier 3: The Immutable Ledger (WORM - Write Once Read Many)
    Provides an un-tamperable cryptographic audit trail for the Unified Intelligence Chain.
    Every event is hashed together with the previous event's hash, forming a strict chain.
    """

    @staticmethod
    def _calculate_hash(previous_hash: str, actor_id: str, action: str, timestamp_str: str, metadata: Dict[str, Any]) -> str:
        """Calculates a SHA-256 hash forming the cryptographic chain."""
        # Ensure consistent ordering for JSON dumps to maintain hash stability
        metadata_str = json.dumps(metadata, sort_keys=True)
        
        # Structure the block string
        block_string = f"{previous_hash}|{actor_id}|{action}|{timestamp_str}|{metadata_str}"
        
        # Return the SHA-256 Digest
        return hashlib.sha256(block_string.encode('utf-8')).hexdigest()

    @staticmethod
    async def append_event(db: Session, actor_id: uuid.UUID, action: str, metadata: Dict[str, Any] = None, resource_type: str = "TELEMETRY", resource_id: uuid.UUID = None) -> AuditLog:
        """
        Appends a new event to the ledger, calculating its cryptographic hash based on the previous entry.
        """
        if metadata is None:
            metadata = {}
            
        timestamp = datetime.utcnow()
        timestamp_str = timestamp.isoformat()
        
        # 1. Retrieve the previous hash
        # To prevent race conditions in a highly concurrent distributed system, 
        # this would ideally use a database row lock (`with_for_update`) or a Redis sequencer.
        # For this prototype implementation, we query the latest row.
        last_log = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).first()
        
        previous_hash = last_log.hash if last_log and last_log.hash else "0000000000000000000000000000000000000000000000000000000000000000" # Genesis Block
        
        # 2. Calculate the new hash
        actor_id_str = str(actor_id) if actor_id else "SYSTEM"
        new_hash = WormLedgerService._calculate_hash(
            previous_hash=previous_hash,
            actor_id=actor_id_str,
            action=action,
            timestamp_str=timestamp_str,
            metadata=metadata
        )
        
        # 3. Create the Database Entry
        new_audit_log = AuditLog(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_=metadata,
            timestamp=timestamp,
            hash=new_hash,
            previous_hash=previous_hash,
            signature="ed25519_mock_signature" # In prod, this is dynamically signed by an HSM
        )
        
        # 4. Commit to the immutable store
        try:
            db.add(new_audit_log)
            db.commit()
            db.refresh(new_audit_log)
        except Exception as e:
            db.rollback()
            print(f"[IMMUTABLE LEDGER] Critical Failure appending to chain: {e}")
            raise e
            
        print(f"[IMMUTABLE LEDGER] Event {action} securely chained. Hash: {new_hash[:8]}...")
        return new_audit_log

worm_ledger = WormLedgerService()
