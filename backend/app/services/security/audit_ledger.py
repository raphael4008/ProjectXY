import json
import hashlib
import asyncio
import logging
from datetime import datetime
from uuid import uuid4
from typing import Dict, Any, Optional

from app.core.config import settings
from app.services.combat import combat_orchestrator

logger = logging.getLogger(__name__)

# Simulated Database Connection (In production, use actual Async SQLAlchemy session)
# We will use an in-memory list to represent the append-only Postgres table for this demonstration.
# Real implementation would execute: "INSERT INTO audit_ledger (id, timestamp, event_type, payload, prev_hash, current_hash) VALUES..."
class DummyPostgresDB:
    def __init__(self):
        self.table = []
        
    async def insert(self, record: dict):
        self.table.append(record)
        
    async def fetch_all_ordered(self):
        return sorted(self.table, key=lambda x: x["timestamp"])
        
    async def get_latest_hash(self) -> str:
        if not self.table:
            return "0000000000000000000000000000000000000000000000000000000000000000" # Genesis Node
        return self.table[-1]["current_hash"]

db = DummyPostgresDB()

class AuditLedgerService:
    """
    Sovereign Hardening: Cryptographic Integrity (The Tamper-Proof Log).
    Implements a Merkle-Tree style append-only hash chain for all actions.
    """

    def __init__(self):
        self.is_verifying = False

    def _generate_hash(self, prev_hash: str, payload: dict, timestamp: str) -> str:
        """Creates an SHA-256 seal combining the previous hash and current payload."""
        payload_str = json.dumps(payload, sort_keys=True)
        block = f"{prev_hash}|{timestamp}|{payload_str}"
        return hashlib.sha256(block.encode('utf-8')).hexdigest()

    async def log_event(self, event_type: str, actor_id: str, target_id: Optional[str] = None, metadata: Dict[str, Any] = None) -> str:
        """
        Appends a new cryptographically sealed record to the ledger.
        """
        entry_id = str(uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        payload = {
            "entry_id": entry_id,
            "actor": actor_id,
            "action": event_type.upper(),
            "target": target_id,
            "metadata": metadata or {}
        }
        
        # 1. Fetch Previous Hash (Lock required in high-concurrency real DB)
        prev_hash = await db.get_latest_hash()
        
        # 2. Compute Current Merkle Hash
        current_hash = self._generate_hash(prev_hash, payload, timestamp)
        
        # 3. Store the immutable record
        record = {
            "id": entry_id,
            "timestamp": timestamp,
            "event_type": event_type,
            "payload": payload,
            "prev_hash": prev_hash,
            "current_hash": current_hash
        }
        await db.insert(record)
        logger.info(f"AUDIT LEDGER: Appended {entry_id} [Hash: {current_hash[:8]}...]")
        
        return entry_id

    async def verify_integrity_chain(self) -> bool:
        """
        Background process to verify the cryptographic chain of the ledger.
        If a user manually edits a row in PostgreSQL, this will catch it instantly.
        """
        if self.is_verifying:
            return True
            
        self.is_verifying = True
        logger.info("AUDIT LEDGER: Initiating Cryptographic Integrity Verification Sweep...")
        
        records = await db.fetch_all_ordered()
        
        if not records:
            self.is_verifying = False
            return True

        expected_prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"

        for idx, record in enumerate(records):
            
            # 1. Does the prev_hash match the actual previous hash?
            if record["prev_hash"] != expected_prev_hash:
                await self._trigger_p0_alert(f"CHAIN BROKEN at Block {idx}. Prev Hash Mismatch.")
                self.is_verifying = False
                return False

            # 2. Recalculate the current hash based on payload to catch tampering
            recalculated_hash = self._generate_hash(
                record["prev_hash"], 
                record["payload"], 
                record["timestamp"]
            )
            
            if recalculated_hash != record["current_hash"]:
                await self._trigger_p0_alert(f"PAYLOAD TAMPERING DETECTED at Block {idx}. Hash mismatch.")
                self.is_verifying = False
                return False
                
            expected_prev_hash = record["current_hash"]

        logger.info("AUDIT LEDGER: Integrity Sweep Passed. Chain is pristine.")
        self.is_verifying = False
        return True

    async def _trigger_p0_alert(self, detail: str):
        """Immediately alerts the God View upon detecting forensic tampering."""
        logger.critical(f"SYSTEM INTEGRITY COMPROMISED: {detail}")
        await combat_orchestrator.broadcast_dashboard("ALERT", {
            "level": "CRITICAL",
            "message": f"P0 SYSTEM INTEGRITY ALERT: Cryptographic Audit Ledger Tampering Detected. {detail}"
        })

    async def start_verification_daemon(self):
        """Background loop to continually check database integrity."""
        while True:
            await self.verify_integrity_chain()
            await asyncio.sleep(60) # Sweep every 60 seconds

audit_ledger = AuditLedgerService()
