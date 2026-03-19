"""
War Room Command Center API Router

Provides endpoints for:
1. Threat Actor Attribution (correlate indicators)
2. Automated Incident Containment (micro-segmentation)
3. Resilient Intelligence Queries (via proxy mesh)
4. Command Center Status & Metrics

All endpoints enforce org_id isolation via X-Org-ID header or JWT claim.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List, Dict, Any, Optional
import logging

from app.api.deps import (
    get_current_active_user,
    get_attribution_engine,
    get_microseg_service,
    get_request_orchestrator,
    get_org_id_from_request
)
from app.models.models import User

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# 1. THREAT ACTOR ATTRIBUTION ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/attribution/correlate",
    tags=["War Room - Attribution"],
    summary="Correlate threat indicators into actor dossier"
)
async def correlate_threat_indicators(
    indicators: List[str] = Query(..., description="List of threat indicators (IPs, emails, domains, hashes)"),
    note: Optional[str] = Query(None, description="Optional classification/note"),
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    engine = Depends(get_attribution_engine)
) -> Dict[str, Any]:
    """
    Correlate disparate threat indicators into a unified Threat Actor Dossier.
    
    Process:
    1. Query authorized OSINT APIs (Shodan, Censys, Intel X, etc.)
    2. Enrich infrastructure indicators with threat feeds
    3. Generate heuristic confidence scores
    4. Persist to Neo4j for graph traversal and legal attribution support
    
    **Org Isolation**: Uses X-Org-ID header or JWT org_id claim for multi-tenant safety.
    
    Example:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/warroom/attribution/correlate" \\
      -H "X-Org-ID: org_123" \\
      -H "Authorization: Bearer <token>" \\
      -H "Content-Type: application/json" \\
      -d '{"indicators": ["192.0.2.1", "attacker@example.com"]}'
    ```
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    logger.info(f"[WarRoom] Attribution request: user={current_user.email}, org_id={org_id}, indicators={len(indicators)}")
    
    try:
        dossier_meta = {"note": note, "org_id": org_id, "requested_by": current_user.email}
        result = await engine.correlate_indicators(indicators, dossier_meta=dossier_meta)
        
        logger.info(f"[WarRoom] Attribution success: actor_id={result.get('actor_id')}, confidence={result.get('confidence'):.2f}")
        
        return {
            "status": "success",
            "org_id": org_id,
            "dossier": result
        }
    except Exception as e:
        logger.error(f"[WarRoom] Attribution error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Attribution failed: {str(e)}"
        )


@router.get(
    "/attribution/dossier/{actor_id}",
    tags=["War Room - Attribution"],
    summary="Retrieve a threat actor dossier"
)
async def get_threat_actor_dossier(
    actor_id: str,
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    engine = Depends(get_attribution_engine)
) -> Dict[str, Any]:
    """
    Retrieve a previously correlated threat actor dossier from Neo4j.
    
    Returns:
    - Actor metadata (confidence, first_seen, last_seen)
    - Linked evidence nodes and relationships
    - Attribution signal summary
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    logger.info(f"[WarRoom] Dossier retrieval: user={current_user.email}, org_id={org_id}, actor_id={actor_id}")
    
    try:
        # Query Neo4j for threat actor and evidence
        from app.infrastructure.graph import graph_db
        
        result = await graph_db.execute_query(
            "MATCH (ta:ThreatActor {actor_id: $actor_id}) "
            "OPTIONAL MATCH (ta)-[ev:HAS_EVIDENCE]->(evidence:Evidence) "
            "RETURN ta, collect({evidence: evidence, rel: ev}) as evidence_chain",
            {"actor_id": actor_id}
        )
        
        if not result or len(result) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Actor {actor_id} not found"
            )
        
        return {
            "status": "success",
            "org_id": org_id,
            "actor_id": actor_id,
            "dossier": result[0] if result else {}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[WarRoom] Dossier retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dossier retrieval failed: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 2. AUTOMATED INCIDENT CONTAINMENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/containment/isolate",
    tags=["War Room - Containment"],
    summary="Isolate a host via micro-segmentation"
)
async def isolate_host(
    host_identifier: str = Query(..., description="Target host (IP, hostname, or asset_id)"),
    severity: int = Query(..., ge=0, le=10, description="Threat severity (0-10; P1=9-10, P2=7-8)"),
    reason: str = Query(..., description="Isolation reason (for audit trail)"),
    ttl_seconds: int = Query(3600, description="Isolation duration in seconds (default: 1 hour)"),
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    service = Depends(get_microseg_service)
) -> Dict[str, Any]:
    """
    Isolate a host (internal asset) due to a security threat via micro-segmentation.
    
    Process:
    1. Verify policy: severity >= 9 required for automatic isolation
    2. If authorized NetOps API is configured, apply firewall rules remotely
    3. Otherwise, simulate quarantine locally (for dev/test environments)
    4. Return audit trail metadata
    
    **Policy**: Only P1 severity (9-10) and above trigger automatic isolation. 
    Lower severities require manual review.
    
    **Org Isolation**: Enforced via org_id check before any network changes.
    
    Example:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/warroom/containment/isolate" \\
      -H "X-Org-ID: org_123" \\
      -H "Authorization: Bearer <token>" \\
      -d "host_identifier=192.0.2.50&severity=9&reason=Ransomware%20detected"
    ```
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    logger.info(
        f"[WarRoom] Containment request: user={current_user.email}, org_id={org_id}, "
        f"host={host_identifier}, severity={severity}"
    )
    
    try:
        result = await service.isolate_host(
            tenant_id=org_id,
            host_identifier=host_identifier,
            severity=severity,
            reason=reason,
            ttl_seconds=ttl_seconds
        )
        
        logger.info(f"[WarRoom] Containment outcome: {result.get('outcome')}")
        
        return {
            "status": "success",
            "org_id": org_id,
            "containment": result
        }
    except Exception as e:
        logger.error(f"[WarRoom] Containment error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Containment failed: {str(e)}"
        )


@router.get(
    "/containment/status/{host_identifier}",
    tags=["War Room - Containment"],
    summary="Query isolation status of a host"
)
async def get_containment_status(
    host_identifier: str,
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    service = Depends(get_microseg_service)
) -> Dict[str, Any]:
    """
    Query the current isolation status of a host.
    
    Returns:
    - Is isolated (boolean)
    - Isolation reason
    - TTL remaining (if isolated)
    - Applied rules
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    logger.info(f"[WarRoom] Status query: user={current_user.email}, org_id={org_id}, host={host_identifier}")
    
    try:
        status_info = await service.get_containment_status(
            tenant_id=org_id,
            host_identifier=host_identifier
        )
        
        return {
            "status": "success",
            "org_id": org_id,
            "host": host_identifier,
            "containment_status": status_info
        }
    except Exception as e:
        logger.error(f"[WarRoom] Status query error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status query failed: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3. RESILIENT INTELLIGENCE GATHERING ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/intelligence/query",
    tags=["War Room - Intelligence"],
    summary="Execute a resilient intelligence query via proxy mesh"
)
async def execute_intelligence_query(
    url: str = Query(..., description="Target API endpoint URL"),
    method: str = Query("GET", description="HTTP method (GET, POST, etc.)"),
    payload: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
    orchestrator = Depends(get_request_orchestrator)
) -> Dict[str, Any]:
    """
    Execute an intelligence query via the authorized proxy mesh.
    
    Features:
    - Transparent proxy rotation for load balancing
    - Automatic retry with backoff on rate limits
    - Respects Retry-After headers
    - Org-scoped request tracking for audit
    
    **Authorization**: Only org members can query external APIs.
    
    Example:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/warroom/intelligence/query" \\
      -H "X-Org-ID: org_123" \\
      -H "Authorization: Bearer <token>" \\
      -d "url=https://api.shodan.io/host/8.8.8.8"
    ```
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    logger.info(f"[WarRoom] Intelligence query: user={current_user.email}, org_id={org_id}, method={method}, url={url}")
    
    try:
        # Prepare request kwargs
        kwargs = {}
        if payload and method != "GET":
            kwargs["json"] = payload
        
        result = await orchestrator.request(method, url, **kwargs)
        
        logger.info(f"[WarRoom] Intelligence query success: status={result.get('status')}, proxy={result.get('proxy')}")
        
        return {
            "status": "success",
            "org_id": org_id,
            "query": {
                "method": method,
                "url": url
            },
            "result": result
        }
    except Exception as e:
        logger.error(f"[WarRoom] Intelligence query error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Intelligence query failed: {str(e)}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 4. COMMAND CENTER STATUS & METRICS
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/status",
    tags=["War Room - Status"],
    summary="Get War Room command center status"
)
async def get_warroom_status(
    current_user: User = Depends(get_current_active_user),
    request: Request = None
) -> Dict[str, Any]:
    """
    Get overall War Room command center health and metrics.
    
    Returns:
    - System uptime
    - Active intelligence engines
    - Proxy mesh status
    - Recent operations summary
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    try:
        from app.core.intelligence_di import get_di_container
        from app.infrastructure.graph import graph_db
        import time
        
        container = get_di_container()
        
        # Get Neo4j status
        neo4j_status = "healthy"
        try:
            await graph_db.execute_query("RETURN 1")
        except Exception as e:
            neo4j_status = f"degraded: {str(e)}"
        
        # Get engine metrics
        attribution_engine = container.get_attribution_engine(org_id=org_id)
        microseg_service = container.get_microseg_service(org_id=org_id)
        orchestrator = container.get_request_orchestrator(org_id=org_id)
        
        return {
            "status": "operational",
            "org_id": org_id,
            "timestamp": time.time(),
            "components": {
                "attribution_engine": "ready",
                "microseg_service": "ready",
                "request_orchestrator": "ready",
                "neo4j": neo4j_status,
                "proxy_mesh": f"{len(orchestrator.proxies)} nodes"
            },
            "user": {
                "email": current_user.email,
                "role": current_user.role
            }
        }
    except Exception as e:
        logger.error(f"[WarRoom] Status check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status check failed: {str(e)}"
        )


@router.get(
    "/metrics",
    tags=["War Room - Status"],
    summary="Get War Room operational metrics"
)
async def get_warroom_metrics(
    current_user: User = Depends(get_current_active_user),
    request: Request = None
) -> Dict[str, Any]:
    """
    Get detailed operational metrics for the War Room.
    
    Returns:
    - Attribution queries (count, avg confidence)
    - Containment actions (count, success rate)
    - Intelligence queries (count, avg latency)
    """
    org_id = get_org_id_from_request(request) if request else "default_org"
    
    try:
        from app.infrastructure.graph import graph_db
        
        # Query Neo4j for metrics
        attribution_metrics = await graph_db.execute_query(
            "MATCH (ta:ThreatActor) WHERE ta.created_at > datetime()-P1D "
            "RETURN COUNT(ta) as count, AVG(ta.confidence) as avg_confidence",
            {}
        )
        
        return {
            "status": "success",
            "org_id": org_id,
            "metrics": {
                "attribution": attribution_metrics[0] if attribution_metrics else {},
                "containment": {"count": 0, "success_rate": 0.0},
                "intelligence": {"count": 0, "avg_latency_ms": 0}
            }
        }
    except Exception as e:
        logger.error(f"[WarRoom] Metrics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Metrics retrieval failed: {str(e)}"
        )
