import logging
from typing import Dict, Any, List
from neo4j import GraphDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)

class ThreatIntelIngester:
    """
    Threat Intelligence Ingestion Pipeline (Phase 8)
    
    Responsible for fetching external STIX/TAXII, MITRE ATT&CK, and CVE data 
    and integrating it directly into the Neo4j Risk Graph.
    """
    
    def __init__(self):
        try:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI, 
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            self.is_connected = True
        except Exception as e:
            logger.error(f"Failed to connect TI Ingester to Neo4j: {e}")
            self.is_connected = False
            
    def ingest_mock_cve_feed(self) -> int:
        """Simulates ingestion of a daily CVE stream impacting known network stack components."""
        if not self.is_connected:
            return 0
            
        mock_cves = [
            {"cve_id": "CVE-2026-1002", "severity": 9.8, "target_component": "nginx_gateway"},
            {"cve_id": "CVE-2026-3021", "severity": 7.5, "target_component": "redis:7-alpine"},
            {"cve_id": "CVE-2025-0101", "severity": 10.0, "target_component": "vcenter_internal"}
        ]
        
        query = """
        UNWIND $cves as cve
        MERGE (t:ThreatIntel {id: cve.cve_id})
        SET t.severity = cve.severity, t.last_updated = timestamp()
        
        // Link to potentially vulnerable internal resources
        WITH t, cve
        MATCH (r:Resource)
        WHERE toLower(r.name) CONTAINS toLower(cve.target_component)
        MERGE (t)-[v:VULNERABILITY_EXPOSES]->(r)
        """
        try:
            with self.driver.session() as session:
                session.run(query, cves=mock_cves)
                logger.info(f"Ingested {len(mock_cves)} CVEs into Neo4j Graph.")
                return len(mock_cves)
        except Exception as e:
            logger.warning(f"TI Ingestion Failed: {e}")
            return 0
            
    def query_vulnerable_infrastructure(self) -> List[Dict[str, Any]]:
        """Identify what internal resources are exposed to known external threats."""
        if not self.is_connected:
            return []
            
        query = """
        MATCH (t:ThreatIntel)-[:VULNERABILITY_EXPOSES]->(r:Resource)
        RETURN t.id as cve_id, t.severity as vulnerability_score, r.name as affected_resource
        ORDER BY t.severity DESC
        """
        try:
            with self.driver.session() as session:
                return session.run(query).data()
        except Exception:
            return []

threat_intel_pipeline = ThreatIntelIngester()
