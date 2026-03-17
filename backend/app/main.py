from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, log
from app.api.v1.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    log.info("System Starting...")
    
    # Connect Core Persistence and Telemetry Infrastructure
    from app.infrastructure.graph import graph_db
    from app.infrastructure.kafka import kafka_streamer
    await graph_db.connect()
    await kafka_streamer.connect()
    
    # Start WORM Integrity Monitor (Background Task)
    import asyncio
    from app.workers.integrity_monitor import integrity_monitor_loop
    from app.modules.defensive.services.intelligence import soc_engine
    from app.services.combat import combat_orchestrator
    
    asyncio.create_task(integrity_monitor_loop())
    soc_engine.start_monitoring_daemon()
    
    # Phase 3: Start Redis Pub/Sub Distributed WebSocket Sync
    asyncio.create_task(combat_orchestrator.start_redis_listener())
    
    # Hive-Mind Global Threat Inoculation Listener
    from app.services.security.vaccine import vaccine_engine
    asyncio.create_task(vaccine_engine.start_vaccination_listener())
    
    yield
    # Shutdown
    log.info("System Shutting Down...")
    await kafka_streamer.disconnect()
    await graph_db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Lawful Cyber Intelligence & OSINT Analysis Platform",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.requests import Request
from fastapi.responses import JSONResponse
from app.modules.defensive.services.ueba import ueba_engine
from app.modules.defensive.services.graph_analytics import graph_analytics
from app.modules.defensive.services.containment import containment_engine
from app.modules.defensive_ai.ai_scorer import threat_scorer

@app.middleware("http")
async def ueba_monitoring_middleware(request: Request, call_next):
    """
    Enterprise UEBA Telemetry Interceptor & Autonomous Defense Layer (Phase 3).
    """
    # Bypass noise and CORS preflight
    if request.url.path in ["/health", "/", "/openapi.json", "/docs"] or request.method == "OPTIONS":
        return await call_next(request)
        
    client_ip = request.client.host if request.client else "127.0.0.1"
    action_type = f"{request.method}:{request.url.path}"
    user_entity_id = f"ip_entity_{client_ip}"
    
    # [AUTONOMOUS DEFENSE] Check Containment Isolation Sandbox
    if containment_engine.check_isolation(user_entity_id):
        return JSONResponse(
            status_code=403, 
            content={"detail": "Action Denied: Autonomous Containment Sandbox active. Contact SOC."}
        )
        
    # [DECEPTION ENGINEERING] Check if request struck a Honeypot
    from app.modules.deception.deception import deception_ops
    if deception_ops.evaluate_request(request.url.path, client_ip, user_entity_id):
        return JSONResponse(
            status_code=200, 
            content={"status": "success", "data": "MOCK_PAYLOAD_DELIVERED", "warning": "CONNECTION_TERMINATED"}
        )
    
    # 1. Evaluate Anomaly Score against historical baselines
    anomaly_result = ueba_engine.compute_anomaly(
        user_id=user_entity_id,
        action_type=action_type,
        ip_address=client_ip
    )
    is_ueba_anomalous = anomaly_result.get("is_anomalous", False)
    ueba_risk = anomaly_result.get("risk_score", 0.0)
    
    # 2. Track lateral movements in Temporal Graph
    graph_analytics.record_access(
        user_id=user_entity_id,
        resource_name=request.url.path,
        ip_address=client_ip,
        risk=float(ueba_risk)
    )
    
    # 3. Execute Request
    import time
    start_time = time.time()
    response = await call_next(request)
    process_time_ms = (time.time() - start_time) * 1000
    
    # [OBSERVABILITY] Stream Access Telemetry
    from app.infrastructure.streaming.kafka_producer import telemetry_stream
    telemetry_stream.publish_telemetry(
        endpoint=request.url.path,
        response_time_ms=process_time_ms,
        client_ip=client_ip,
        status_code=response.status_code
    )
    
    # 4. Track Endpoint Status Entropy
    ueba_engine.record_outcome(
        user_id=user_entity_id, 
        status_code=response.status_code
    )
    
    # [AUTONOMOUS DEFENSE] Trigger Real-Time Threat Scorer
    # Determine if API fuzzing was detected based on status code
    is_api_abuse = response.status_code >= 400 and request.method != "OPTIONS"
    
    if is_ueba_anomalous or is_api_abuse:
        # Evaluate global context (This merges UEBA + Graph + API signals)
        threat_scorer.evaluate_signals(
            entity_id=user_entity_id,
            ueba_score=ueba_risk,
            graph_is_anomalous=False, # Mocked for speed; real integration queries Neo4j async
            api_abuse_detected=is_api_abuse
        )
        
        # Stream security fault to Kafka for async forensics
        telemetry_stream.publish_security_fault(
            fault_class="UEBA_OR_API_ABUSE_DETECTED",
            entity_id=user_entity_id,
            context=f"UEBA Anomaly: {is_ueba_anomalous}, API Fuzzing: {is_api_abuse}"
        )
    
    return response

@app.get("/health", tags=["Status"])
async def health_check():
    """
    Health Check Endpoint.
    Used by K8s/Docker to verify service availability.
    """
    return {
        "status": "active",
        "system": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

@app.get("/", tags=["Status"])
async def root():
    return {"message": "Cyber Intelligence Platform API is Online"}

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
