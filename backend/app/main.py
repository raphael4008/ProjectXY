from contextlib import asynccontextmanager
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

Endpoints for:from app.core.config import settings

1. Threat Actor Attribution (correlate indicators)from app.core.logging import setup_logging, log

2. Automated Incident Containment (micro-segmentation)from app.api.v1.api import api_router

3. Resilient Intelligence Queries (via proxy mesh)

4. Command Center Status & Metrics@asynccontextmanager

async def lifespan(app: FastAPI):

All endpoints enforce org_id isolation via X-Org-ID header or JWT claim.    # Startup

"""    setup_logging()

    log.info("System Starting...")

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request    

from typing import List, Dict, Any, Optional    # Connect Core Persistence and Telemetry Infrastructure

import logging    from app.infrastructure.graph import graph_db

    from app.infrastructure.kafka import kafka_streamer

from app.api.deps import (    await graph_db.connect()

    get_current_active_user,    await kafka_streamer.connect()

    get_attribution_engine,    

    get_microseg_service,    # ─── Initialize Intelligence DI Container (Phase 3+) ────────────────────────────────

    get_request_orchestrator,    from app.core.intelligence_di import initialize_intelligence_di, shutdown_intelligence_di

    get_org_id_from_request    await initialize_intelligence_di()

)    log.info("[DI] Intelligence services initialized")

from app.models.models import User    

    # Start WORM Integrity Monitor (Background Task)

logger = logging.getLogger(__name__)    import asyncio

    from app.workers.integrity_monitor import integrity_monitor_loop

router = APIRouter()    from app.modules.defensive.services.intelligence import soc_engine

    from app.services.combat import combat_orchestrator

    

# ─────────────────────────────────────────────────────────────────────────────    asyncio.create_task(integrity_monitor_loop())

# 1. THREAT ACTOR ATTRIBUTION ENDPOINTS    soc_engine.start_monitoring_daemon()

# ─────────────────────────────────────────────────────────────────────────────    

    # Phase 3: Start Redis Pub/Sub Distributed WebSocket Sync

@router.post(    asyncio.create_task(combat_orchestrator.start_redis_listener())

    "/attribution/correlate",    

    tags=["War Room - Attribution"],    # Hive-Mind Global Threat Inoculation Listener

    summary="Correlate threat indicators into actor dossier"    from app.services.security.vaccine import vaccine_engine

)    asyncio.create_task(vaccine_engine.start_vaccination_listener())

async def correlate_threat_indicators(    

    indicators: List[str] = Query(..., description="List of threat indicators (IPs, emails, domains, hashes)"),    yield

    note: Optional[str] = Query(None, description="Optional classification/note"),    # Shutdown

    current_user: User = Depends(get_current_active_user),    log.info("System Shutting Down...")

    request: Request = None,    

    engine = Depends(get_attribution_engine)    # Gracefully shutdown Intelligence services

) -> Dict[str, Any]:    await shutdown_intelligence_di()

    """    log.info("[DI] Intelligence services shutdown complete")

    Correlate disparate threat indicators into a unified Threat Actor Dossier.    

        await kafka_streamer.disconnect()

    Process:    await graph_db.close()

    1. Query authorized OSINT APIs (Shodan, Censys, etc.)

    2. Enrich with threat intelligence feedsapp = FastAPI(

    3. Create Neo4j threat actor graph nodes    title=settings.PROJECT_NAME,

    4. Return attribution confidence and indicators    version="1.0.0",

        description="Lawful Cyber Intelligence & OSINT Analysis Platform",

    Example:    openapi_url=f"{settings.API_V1_STR}/openapi.json",

        POST /warroom/attribution/correlate?indicators=8.8.8.8&indicators=216.239.32.0&note=APT28    lifespan=lifespan

    """)

    org_id = get_org_id_from_request(request) if request else "default_org"

    # CORS Middleware

    if not indicators:app.add_middleware(

        raise HTTPException(    CORSMiddleware,

            status_code=status.HTTP_400_BAD_REQUEST,    allow_origin_regex=".*",

            detail="At least one indicator is required"    allow_credentials=True,

        )    allow_methods=["*"],

        allow_headers=["*"],

    logger.info()

        f"[WarRoom] Attribution request: user={current_user.email}, "

        f"org_id={org_id}, indicators_count={len(indicators)}"from starlette.requests import Request

    )from fastapi.responses import JSONResponse

    from app.modules.defensive.services.ueba import ueba_engine

    try:from app.modules.defensive.services.graph_analytics import graph_analytics

        dossier_meta = {"note": note or "Automated correlation"}from app.modules.defensive.services.containment import containment_engine

        result = await engine.correlate_indicators(indicators, dossier_meta=dossier_meta)from app.modules.defensive_ai.ai_scorer import threat_scorer

        

        return {@app.middleware("http")

            "status": "success",async def ueba_monitoring_middleware(request: Request, call_next):

            "actor_id": result["actor_id"],    """

            "confidence": result["confidence"],    Enterprise UEBA Telemetry Interceptor & Autonomous Defense Layer (Phase 3).

            "observations": result["observations"],    """

            "enriched_matches": result["enriched_matches"],    # Bypass noise and CORS preflight

            "org_id": org_id    if request.url.path in ["/health", "/", "/openapi.json", "/docs"] or request.method == "OPTIONS":

        }        return await call_next(request)

    except Exception as e:        

        logger.error(f"[WarRoom] Attribution correlation failed: {e}")    client_ip = request.client.host if request.client else "127.0.0.1"

        raise HTTPException(    action_type = f"{request.method}:{request.url.path}"

            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,    user_entity_id = f"ip_entity_{client_ip}"

            detail=f"Attribution correlation failed: {str(e)}"    

        )    # [AUTONOMOUS DEFENSE] Check Containment Isolation Sandbox

    if containment_engine.check_isolation(user_entity_id):

        return JSONResponse(

# ─────────────────────────────────────────────────────────────────────────────            status_code=403, 

# 2. AUTOMATED INCIDENT CONTAINMENT ENDPOINTS            content={"detail": "Action Denied: Autonomous Containment Sandbox active. Contact SOC."}

# ─────────────────────────────────────────────────────────────────────────────        )

        

@router.post(    # [DECEPTION ENGINEERING] Check if request struck a Honeypot

    "/containment/isolate",    from app.modules.deception.deception import deception_ops

    tags=["War Room - Containment"],    if deception_ops.evaluate_request(request.url.path, client_ip, user_entity_id):

    summary="Isolate a compromised host from the network"        return JSONResponse(

)            status_code=200, 

async def isolate_host(            content={"status": "success", "data": "MOCK_PAYLOAD_DELIVERED", "warning": "CONNECTION_TERMINATED"}

    host_identifier: str = Query(..., description="Target host (IP, hostname, asset_id)"),        )

    severity: int = Query(..., ge=0, le=10, description="Threat severity (0-10; P1=9-10)"),    

    reason: str = Query(..., description="Isolation reason"),    # 1. Evaluate Anomaly Score against historical baselines

    ttl_seconds: int = Query(3600, ge=60, le=86400, description="Isolation duration (60-86400 seconds)"),    anomaly_result = ueba_engine.compute_anomaly(

    current_user: User = Depends(get_current_active_user),        user_id=user_entity_id,

    request: Request = None,        action_type=action_type,

    service = Depends(get_microseg_service)        ip_address=client_ip

) -> Dict[str, Any]:    )

    """    is_ueba_anomalous = anomaly_result.get("is_anomalous", False)

    Programmatically isolate a compromised internal asset.    ueba_risk = anomaly_result.get("risk_score", 0.0)

        

    Policy:    # 2. Track lateral movements in Temporal Graph

    - Only severity >= 9 (P1/P0) triggers automatic isolation    graph_analytics.record_access(

    - Requires authorization via Zero Trust Engine        user_id=user_entity_id,

    - Creates audit trail via ledger        resource_name=request.url.path,

            ip_address=client_ip,

    Outcome:        risk=float(ueba_risk)

    - If NETOPS_API_URL configured: delegates to external microSegmentation API    )

    - Otherwise: simulates firewall quarantine locally    

    """    # 3. Execute Request

    org_id = get_org_id_from_request(request) if request else "default_org"    import time

        start_time = time.time()

    logger.info(    response = await call_next(request)

        f"[WarRoom] Containment request: user={current_user.email}, "    process_time_ms = (time.time() - start_time) * 1000

        f"org_id={org_id}, host={host_identifier}, severity={severity}"    

    )    # [OBSERVABILITY] Stream Access Telemetry

        from app.infrastructure.streaming.kafka_producer import telemetry_stream

    try:    telemetry_stream.publish_telemetry(

        result = await service.isolate_host(        endpoint=request.url.path,

            tenant_id=org_id,        response_time_ms=process_time_ms,

            host_identifier=host_identifier,        client_ip=client_ip,

            severity=severity,        status_code=response.status_code

            reason=reason,    )

            ttl_seconds=ttl_seconds    

        )    # 4. Track Endpoint Status Entropy

            ueba_engine.record_outcome(

        return {        user_id=user_entity_id, 

            "status": "success",        status_code=response.status_code

            "outcome": result["outcome"],    )

            "method": result.get("method", "unknown"),    

            "detail": result.get("detail"),    # [AUTONOMOUS DEFENSE] Trigger Real-Time Threat Scorer

            "org_id": org_id    # Determine if API fuzzing was detected based on status code

        }    is_api_abuse = response.status_code >= 400 and request.method != "OPTIONS"

    except Exception as e:    

        logger.error(f"[WarRoom] Containment isolation failed: {e}")    if is_ueba_anomalous or is_api_abuse:

        raise HTTPException(        # Evaluate global context (This merges UEBA + Graph + API signals)

            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,        threat_scorer.evaluate_signals(

            detail=f"Isolation failed: {str(e)}"            entity_id=user_entity_id,

        )            ueba_score=ueba_risk,

            graph_is_anomalous=False, # Mocked for speed; real integration queries Neo4j async

            api_abuse_detected=is_api_abuse

@router.post(        )

    "/containment/unisolate",        

    tags=["War Room - Containment"],        # Stream security fault to Kafka for async forensics

    summary="Release a host from isolation"        telemetry_stream.publish_security_fault(

)            fault_class="UEBA_OR_API_ABUSE_DETECTED",

async def release_host(            entity_id=user_entity_id,

    host_identifier: str = Query(..., description="Target host"),            context=f"UEBA Anomaly: {is_ueba_anomalous}, API Fuzzing: {is_api_abuse}"

    current_user: User = Depends(get_current_active_user),        )

    request: Request = None,    

    service = Depends(get_microseg_service)    return response

) -> Dict[str, Any]:

    """@app.get("/health", tags=["Status"])

    Release a host from isolation and restore network access.async def health_check():

    """    """

    org_id = get_org_id_from_request(request) if request else "default_org"    Health Check Endpoint.

        Used by K8s/Docker to verify service availability.

    logger.info(    """

        f"[WarRoom] Unisolation request: user={current_user.email}, "    return {

        f"org_id={org_id}, host={host_identifier}"        "status": "active",

    )        "system": settings.PROJECT_NAME,

            "version": "1.0.0"

    try:    }

        result = await service.unisolate_host(

            tenant_id=org_id,@app.get("/", tags=["Status"])

            host_identifier=host_identifierasync def root():

        )    return {"message": "Cyber Intelligence Platform API is Online"}

        

        return {app.include_router(api_router, prefix=settings.API_V1_STR)

            "status": "success",

            "outcome": result["outcome"],if __name__ == "__main__":

            "org_id": org_id    import uvicorn

        }    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

    except Exception as e:
        logger.error(f"[WarRoom] Unisolation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unisolation failed: {str(e)}"
        )


@router.get(
    "/containment/status",
    tags=["War Room - Containment"],
    summary="Get isolation status for a host"
)
async def get_isolation_status(
    host_identifier: str = Query(...),
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    service = Depends(get_microseg_service)
) -> Dict[str, Any]:
    """
    Query the isolation status for a specific host.
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    status_info = service.get_isolation_status(host_identifier)
    
    return {
        "host": host_identifier,
        "isolated": status_info is not None,
        "status": status_info or {},
        "org_id": org_id
    }


@router.get(
    "/containment/list",
    tags=["War Room - Containment"],
    summary="List all currently isolated hosts"
)
async def list_isolated_hosts(
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    service = Depends(get_microseg_service)
) -> Dict[str, Any]:
    """
    List all currently isolated hosts (org-scoped).
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    isolated = service.list_isolated_hosts(tenant_id=org_id)
    
    return {
        "org_id": org_id,
        "count": len(isolated),
        "isolated_hosts": isolated
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. RESILIENT INTELLIGENCE QUERY ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/intelligence/query",
    tags=["War Room - Intelligence"],
    summary="Execute a resilient threat intelligence API query"
)
async def query_threat_intelligence(
    url: str = Query(..., description="Target API URL"),
    method: str = Query("GET", regex="^(GET|POST|PUT|DELETE)$"),
    payload: Optional[Dict[str, Any]] = Query(None, description="Optional JSON payload for POST/PUT"),
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    orchestrator = Depends(get_request_orchestrator)
) -> Dict[str, Any]:
    """
    Execute a threat intelligence query through the distributed proxy mesh.
    
    Features:
    - Transparent proxy rotation for resilience
    - Automatic rate-limit handling
    - Latency metrics per proxy
    
    Example:
        POST /warroom/intelligence/query?url=https://api.shodan.io/shodan/host/8.8.8.8
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    logger.info(
        f"[WarRoom] Intelligence query: user={current_user.email}, "
        f"org_id={org_id}, url={url}, method={method}"
    )
    
    try:
        kwargs = {}
        if payload and method in ("POST", "PUT"):
            kwargs["json"] = payload
        
        result = await orchestrator.request(method, url, **kwargs)
        
        return {
            "status": "success",
            "response_status": result["status"],
            "proxy": result["proxy"],
            "body": result["body"],
            "elapsed_ms": result["elapsed_ms"],
            "org_id": org_id
        }
    except Exception as e:
        logger.error(f"[WarRoom] Intelligence query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed after all proxy attempts: {str(e)}"
        )


@router.get(
    "/intelligence/metrics",
    tags=["War Room - Intelligence"],
    summary="Get proxy mesh performance metrics"
)
async def get_orchestrator_metrics(
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    orchestrator = Depends(get_request_orchestrator)
) -> Dict[str, Any]:
    """
    Get aggregated performance metrics for the distributed request orchestrator.
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    metrics = orchestrator.get_metrics()
    
    return {
        "org_id": org_id,
        "metrics": metrics
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. WAR ROOM STATUS & HEALTH ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/status",
    tags=["War Room - Status"],
    summary="War Room command center health"
)
async def warroom_status(
    current_user: User = Depends(get_current_active_user),
    request: Request = None
) -> Dict[str, Any]:
    """
    Get the status of the War Room command center and all subsystems.
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    return {
        "status": "operational",
        "org_id": org_id,
        "user": current_user.email,
        "subsystems": {
            "attribution": "ready",
            "containment": "ready",
            "intelligence": "ready"
        },
        "message": "War Room Command Center operational"
    }


@router.post(
    "/reset-metrics",
    tags=["War Room - Status"],
    summary="Reset orchestrator metrics (admin only)"
)
async def reset_metrics(
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    orchestrator = Depends(get_request_orchestrator)
) -> Dict[str, Any]:
    """
    Reset accumulated metrics (admin-only endpoint).
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    # Check if admin
    user_role = getattr(current_user, "dynamic_role", current_user.role)
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can reset metrics"
        )
    
    orchestrator.reset_metrics()
    
    return {
        "status": "success",
        "message": "Metrics reset",
        "org_id": org_id
    }
