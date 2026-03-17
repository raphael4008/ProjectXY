import asyncio
import logging
from app.infrastructure.session import SessionLocal
from app.services.worm import worm_service

logger = logging.getLogger(__name__)

async def integrity_monitor_loop():
    """
    Runs every 60 seconds to verify the blockchain integrity.
    """
    logger.info("Starting WORM Integrity Monitor...")
    while True:
        try:
            db = SessionLocal()
            is_valid = worm_service.verify_chain(db)
            db.close()
            
            if not is_valid:
                logger.critical("🚨 SYSTEM COMPROMISED: AUDIT LOG INTEGRITY FAILURE DETECTED 🚨")
                # In a real app, this would trigger a system lockdown or alert via WebSocket
            else:
                logger.debug("Audit Log Integrity: VERIFIED")
                
        except Exception as e:
            logger.error(f"Integrity Monitor Error: {e}")
        
        await asyncio.sleep(60)
