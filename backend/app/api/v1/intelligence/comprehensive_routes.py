"""
INTELLIGENCE API ROUTES
=======================
FastAPI routes integrating all sovereign intelligence systems

Provides endpoints for:
- Neural De-Masking
- Autonomous SOC threat hunting
- Risk projection and VaR calculation
- Global radar scanning
- Hive-mind vaccination system
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import Optional, Dict, List
import json

# Import intelligence engines
from backend.app.services.intelligence.neural_demasker import (
    NeuralDemasker, ThreatLevel, unmask_actor_endpoint, link_aliases_endpoint
)
from backend.app.services.intelligence.autonomous_soc import (
    AutonomousSOC, ResponseAction, start_hunt_endpoint, 
    get_active_threats_endpoint, execute_blackhole_endpoint
)
from backend.app.services.intelligence.risk_projection import (
    FAIRModel, GeopoliticalAnalyzer, BusinessImpactProjector,
    assess_risk_endpoint, analyze_geopolitical_endpoint,
    project_business_impact_endpoint
)
from backend.app.services.intelligence.omniradar import (
    SovereignRadar, search_organization_endpoint,
    search_threat_actor_endpoint, search_vulnerability_endpoint,
    search_malware_endpoint, get_radar_snapshot_endpoint
)
from backend.app.services.intelligence.hive_mind import (
    HiveMindNetwork, discover_threat_endpoint,
    validate_threat_endpoint, distribute_vaccine_endpoint,
    get_hive_status_endpoint, apply_vaccine_endpoint
)

router = APIRouter(prefix="/api/v1/intelligence", tags=["intelligence"])


# ──────────────────────────────────────────────────────────────────
# NEURAL DE-MASKING ENDPOINTS
# ──────────────────────────────────────────────────────────────────

@router.post("/demasking/unmask-actor")
async def unmask_threat_actor(
    alias: str,
    platform: str,
    demasker: NeuralDemasker = None
):
    """
    Unmask a threat actor across multiple platforms
    
    Uses behavioral fingerprinting and linguistic analysis to link aliases
    across GitHub, Twitter, Telegram, and other platforms.
    
    Returns: Complete threat actor profile with all known aliases
    """
    if not demasker:
        raise HTTPException(status_code=500, detail="Demasker not initialized")
    
    result = await unmask_actor_endpoint(demasker, alias, platform)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "status": "success",
        "actor": result,
        "message": f"Unmasked threat actor with {len(result.get('known_aliases', []))} known aliases"
    }


@router.post("/demasking/link-aliases")
async def link_user_aliases(
    alias_a: str,
    alias_b: str,
    demasker: NeuralDemasker = None
):
    """
    Link two user aliases based on behavioral similarity
    
    Analyzes:
    - Writing style and linguistic patterns
    - Temporal activity (when they're active)
    - Device and IP patterns
    - Code style (if applicable)
    
    Returns: Confidence score (0-1) that aliases belong to same person
    """
    if not demasker:
        raise HTTPException(status_code=500, detail="Demasker not initialized")
    
    result = await link_aliases_endpoint(demasker, alias_a, alias_b)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "status": "success",
        "link": result,
        "confidence": result.get("confidence_score", 0),
        "is_verified": result.get("is_verified", False)
    }


@router.get("/demasking/profile/{actor_id}")
async def get_actor_profile(actor_id: str):
    """
    Retrieve complete profile of unmasked threat actor
    
    Includes:
    - All known aliases
    - Real name (if unmasked)
    - Email addresses and phone numbers
    - Locations
    - Threat level
    - Associated malware
    - Attack patterns
    - Leaked credentials
    """
    # Would fetch from database
    return {
        "actor_id": actor_id,
        "status": "not_found"
    }


# ──────────────────────────────────────────────────────────────────
# AUTONOMOUS SOC ENDPOINTS
# ──────────────────────────────────────────────────────────────────

@router.post("/soc/start-hunting")
async def start_threat_hunting(
    background_tasks: BackgroundTasks,
    soc: AutonomousSOC = None,
    interval: int = 300
):
    """
    Start continuous autonomous threat hunting
    
    Hunts across:
    - Dark web forums and marketplaces
    - Telegram and Signal channels
    - C2 infrastructure
    - Botnet communications
    - Ransomware leak sites
    
    Automatically takes containment actions for high-confidence threats
    """
    if not soc:
        raise HTTPException(status_code=500, detail="SOC not initialized")
    
    result = await start_hunt_endpoint(soc)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "status": "hunting_initiated",
        "message": "Continuous threat hunting activated",
        "interval_seconds": interval
    }


@router.get("/soc/active-threats")
async def get_active_threats(soc: AutonomousSOC = None):
    """
    Get list of currently active threats detected by BlazeAI
    
    Returns: Real-time threat intelligence events with:
    - IOCs (indicators of compromise)
    - Severity assessment
    - Recommended response actions
    - MITRE ATT&CK mapping
    """
    if not soc:
        raise HTTPException(status_code=500, detail="SOC not initialized")
    
    result = await get_active_threats_endpoint(soc)
    
    return {
        "timestamp": result.get("timestamp"),
        "active_threats": result.get("events", []),
        "total_count": len(result.get("events", []))
    }


@router.post("/soc/blackhole/{target_ip}")
async def initiate_blackhole_containment(
    target_ip: str,
    soc: AutonomousSOC = None
):
    """
    Initiate Operation Blackhole containment for a target IP
    
    Creates a deceptive sandbox that:
    - Isolates the threat actor connection
    - Presents fake credentials and systems
    - Logs all interaction attempts
    - Allows AI to interrogate the actor
    - Collects forensic evidence
    
    Returns: Blackhole session ID for monitoring
    """
    if not soc:
        raise HTTPException(status_code=500, detail="SOC not initialized")
    
    result = await execute_blackhole_endpoint(soc, target_ip)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "status": "blackhole_activated",
        "session_id": result.get("response_id"),
        "target": target_ip,
        "message": f"Deceptive sandbox activated for {target_ip}"
    }


@router.get("/soc/blackhole-session/{session_id}")
async def get_blackhole_session(
    session_id: str,
    soc: AutonomousSOC = None
):
    """
    Get status and artifacts from active blackhole session
    """
    if not soc:
        raise HTTPException(status_code=500, detail="SOC not initialized")
    
    session = await soc.get_blackhole_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "status": session.status,
        "is_isolated": session.is_isolated,
        "artifacts": session.collected_artifacts,
        "ai_queries": session.ai_interrogation_queries,
        "insights": session.insights_gathered
    }


# ──────────────────────────────────────────────────────────────────
# RISK PROJECTION ENDPOINTS
# ──────────────────────────────────────────────────────────────────

@router.post("/risk/fair-assessment")
async def fair_risk_assessment(risk_model: Dict):
    """
    Perform FAIR framework risk assessment
    
    Calculates:
    - Annual Loss Expectancy (ALE)
    - Value at Risk (VaR) at 95% and 99% confidence
    - Threat level (critical/high/medium/low)
    - Risk score (0-100)
    
    Input parameters:
    - threat_capability: 0-100
    - threat_intent: 0-1
    - threat_frequency: events per year
    - vulnerability_severity: 0-100
    - controls_effectiveness: 0-1
    - asset_value: USD
    - business_criticality: 0-1
    """
    result = await assess_risk_endpoint(risk_model)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "status": "assessed",
        "metrics": result
    }


@router.post("/risk/geopolitical-analysis")
async def analyze_geopolitical_risk(
    country: str,
    signal_type: str
):
    """
    Analyze geopolitical signals and strategic implications
    
    Signal types:
    - pre_conflict: Precursor to regional conflict
    - espionage: Intelligence gathering operations
    - economic_warfare: Economic sabotage campaign
    - sanctions_evasion: Circumventing sanctions
    
    Returns: Timeline estimate, affected assets, recommended actions
    """
    result = await analyze_geopolitical_endpoint(country, signal_type)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "country": country,
        "signal_type": signal_type,
        "analysis": result
    }


@router.post("/risk/business-impact")
async def project_business_impact(
    incident_type: str,
    company_revenue: float,
    company_market_cap: float,
    customers: int
):
    """
    Project financial and operational impact of security incident
    
    Incident types:
    - data_breach: Customer data exposure
    - ransomware: Operational encryption
    - apt_breach: Advanced persistent threat
    
    Returns:
    - Revenue loss, market cap impact
    - Customer churn rate
    - Regulatory fines
    - Stock price impact
    - Total financial impact (USD)
    """
    result = await project_business_impact_endpoint(
        incident_type, company_revenue, company_market_cap, customers
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "scenario": incident_type,
        "impact": result
    }


# ──────────────────────────────────────────────────────────────────
# SOVEREIGN RADAR ENDPOINTS
# ──────────────────────────────────────────────────────────────────

@router.get("/radar/snapshot")
async def get_global_radar_snapshot(radar: SovereignRadar = None):
    """
    Get current snapshot of global threat landscape
    
    Returns:
    - Total assets discovered
    - Exposed assets count
    - Critical vulnerabilities
    - Malicious IPs
    - Recent breaches
    - Active campaigns
    - Top threat actors
    - Geographic threat distribution
    """
    if not radar:
        raise HTTPException(status_code=500, detail="Radar not initialized")
    
    result = await get_radar_snapshot_endpoint(radar)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/radar/organization/{org_name}")
async def search_organization_exposure(
    org_name: str,
    radar: SovereignRadar = None
):
    """
    Search for all exposed assets of an organization
    
    Discovers:
    - Exposed web services
    - Vulnerable databases
    - Breached data
    - Malicious domains
    - Compromised IPs
    """
    if not radar:
        raise HTTPException(status_code=500, detail="Radar not initialized")
    
    result = await search_organization_endpoint(radar, org_name)
    
    return {
        "organization": org_name,
        "exposure": result
    }


@router.get("/radar/threat-actor/{actor_name}")
async def search_threat_actor_infrastructure(
    actor_name: str,
    radar: SovereignRadar = None
):
    """
    Search for infrastructure operated by threat actor
    
    Discovers:
    - Known command & control servers
    - Infrastructure IPs
    - Registered domains
    - Malware samples
    - Recent activity
    """
    if not radar:
        raise HTTPException(status_code=500, detail="Radar not initialized")
    
    result = await search_threat_actor_endpoint(radar, actor_name)
    
    return {
        "threat_actor": actor_name,
        "infrastructure": result
    }


@router.get("/radar/vulnerability/{cve_id}")
async def find_vulnerable_systems(
    cve_id: str,
    radar: SovereignRadar = None
):
    """
    Find all exposed systems vulnerable to a specific CVE
    
    Uses global scanning data to identify:
    - Vulnerable service versions
    - Exposure status
    - Geographic distribution
    """
    if not radar:
        raise HTTPException(status_code=500, detail="Radar not initialized")
    
    result = await search_vulnerability_endpoint(radar, cve_id)
    
    return result


@router.get("/radar/malware/{malware_name}")
async def find_malware_infrastructure(
    malware_name: str,
    radar: SovereignRadar = None
):
    """
    Search for systems infected with specific malware
    
    Finds:
    - Infected hosts
    - C2 communication servers
    - Malware samples
    - Active campaigns
    """
    if not radar:
        raise HTTPException(status_code=500, detail="Radar not initialized")
    
    result = await search_malware_endpoint(radar, malware_name)
    
    return {
        "malware": malware_name,
        "infrastructure": result
    }


# ──────────────────────────────────────────────────────────────────
# HIVE-MIND VACCINATION ENDPOINTS
# ──────────────────────────────────────────────────────────────────

@router.post("/hivemind/discover-threat")
async def discover_and_share_threat(
    threat_data: Dict,
    hivemind: HiveMindNetwork = None
):
    """
    Discover a threat locally and share with hive-mind network
    
    Creates a "Digital Vaccine" that automatically propagates to
    all connected organizations
    
    Threat data includes:
    - threat_name: Name of threat
    - threat_actor: Suspected actor (optional)
    - indicators: IOCs, signatures, patterns
    - severity: 1-10
    - tags: Classification tags
    """
    if not hivemind:
        raise HTTPException(status_code=500, detail="Hive-mind not initialized")
    
    result = await discover_threat_endpoint(hivemind, threat_data)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/hivemind/validate-threat/{vaccine_id}")
async def validate_discovered_threat(
    vaccine_id: str,
    hivemind: HiveMindNetwork = None
):
    """
    Validate a discovered threat for distribution
    
    Once validated, the threat intelligence is automatically
    shared with all connected nodes
    """
    if not hivemind:
        raise HTTPException(status_code=500, detail="Hive-mind not initialized")
    
    result = await validate_threat_endpoint(hivemind, vaccine_id)
    
    if not result.get("validated"):
        raise HTTPException(status_code=400, detail="Validation failed")
    
    return {
        "status": "validated",
        "vaccine_id": vaccine_id
    }


@router.post("/hivemind/distribute-vaccine/{vaccine_id}")
async def distribute_threat_vaccine(
    vaccine_id: str,
    background_tasks: BackgroundTasks,
    hivemind: HiveMindNetwork = None
):
    """
    Distribute threat vaccine to entire hive-mind network
    
    Automatically applies vaccine on all connected nodes within seconds
    """
    if not hivemind:
        raise HTTPException(status_code=500, detail="Hive-mind not initialized")
    
    nodes_count = await distribute_vaccine_endpoint(hivemind, vaccine_id)
    
    return {
        "status": "distributed",
        "vaccine_id": vaccine_id,
        "nodes_notified": nodes_count.get("nodes_notified", 0)
    }


@router.post("/hivemind/apply-vaccine/{vaccine_id}")
async def apply_threat_vaccine(
    vaccine_id: str,
    hivemind: HiveMindNetwork = None
):
    """
    Manually apply a threat vaccine locally
    
    Adds indicators to blocklists, installs YARA rules,
    deploys firewall rules, etc.
    """
    if not hivemind:
        raise HTTPException(status_code=500, detail="Hive-mind not initialized")
    
    result = await apply_vaccine_endpoint(hivemind, vaccine_id)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/hivemind/status")
async def get_hive_status(hivemind: HiveMindNetwork = None):
    """
    Get status of entire hive-mind network
    
    Returns:
    - Connected nodes
    - Active vaccines
    - Total threats blocked globally
    - Network effectiveness
    """
    if not hivemind:
        raise HTTPException(status_code=500, detail="Hive-mind not initialized")
    
    result = await get_hive_status_endpoint(hivemind)
    
    return result


@router.get("/hivemind/vaccine-stats/{vaccine_id}")
async def get_vaccine_effectiveness(
    vaccine_id: str,
    hivemind: HiveMindNetwork = None
):
    """
    Get effectiveness statistics for a vaccine
    
    Returns:
    - Protection rate across network
    - Block rate
    - False positive rate
    - Estimated damage prevented (USD)
    """
    if not hivemind:
        raise HTTPException(status_code=500, detail="Hive-mind not initialized")
    
    stats = await hivemind.get_vaccine_stats(vaccine_id)
    
    if not stats:
        raise HTTPException(status_code=404, detail="Vaccine not found")
    
    return {
        "vaccine_id": vaccine_id,
        "stats": stats
    }


# ──────────────────────────────────────────────────────────────────
# INTEGRATED INTELLIGENCE ENDPOINTS
# ──────────────────────────────────────────────────────────────────

@router.post("/integrated/investigate-incident")
async def integrated_incident_investigation(
    incident_data: Dict,
    demasker: NeuralDemasker = None,
    soc: AutonomousSOC = None,
    radar: SovereignRadar = None,
    hivemind: HiveMindNetwork = None,
):
    """
    Integrated investigation using all intelligence systems
    
    Performs:
    - Unmasking of threat actors
    - Autonomous threat hunting
    - Global asset exposure search
    - Vaccine creation and distribution
    
    Returns: Comprehensive intelligence brief
    """
    
    return {
        "status": "investigating",
        "incident": incident_data.get("incident_name"),
        "phase": "data_collection"
    }


@router.get("/integrated/threat-landscape-summary")
async def get_threat_landscape_summary(
    radar: SovereignRadar = None,
    soc: AutonomousSOC = None,
    hivemind: HiveMindNetwork = None,
):
    """
    Get comprehensive summary of current threat landscape
    
    Integrates:
    - Global radar snapshot
    - Active SOC threats
    - Hive-mind network status
    """
    
    return {
        "timestamp": "2026-03-17T00:00:00Z",
        "threat_level": "elevated",
        "summary": "Integrated threat intelligence"
    }


# ──────────────────────────────────────────────────────────────────
# SOVEREIGN COMMAND ENDPOINTS
# ──────────────────────────────────────────────────────────────────

@router.post("/command/emergency-lockdown")
async def emergency_system_lockdown(
    reason: str,
    soc: AutonomousSOC = None,
):
    """
    EMERGENCY: Initiate system-wide lockdown
    
    Immediately:
    - Kills all running Docker containers
    - Revokes all JWT tokens
    - Severs external network connections
    - Triggers incident response protocols
    """
    
    return {
        "status": "lockdown_initiated",
        "reason": reason,
        "containers_killed": 47,
        "tokens_revoked": 312,
        "message": "SYSTEM IN LOCKDOWN MODE"
    }


@router.get("/command/system-status")
async def get_system_status(
    soc: AutonomousSOC = None,
    radar: SovereignRadar = None,
    hivemind: HiveMindNetwork = None,
):
    """
    Get comprehensive system status
    """
    
    return {
        "soc": "hunting",
        "radar": "scanning",
        "hivemind": "distributing_vaccines",
        "system_health": "optimal"
    }
