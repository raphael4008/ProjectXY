# War Room Intelligence Platform - Architecture & Integration Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (Frontend)                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    War Room Dashboard (Next.js)                  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │   │
│  │  │ Battlefield  │ │ Intelligence │ │    Operations Terminal   │ │   │
│  │  │  (Neo4j Graph)  │ (OSINT Feed) │ │  (Containment Controls) │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────────────┘ │   │
│  │                                                                  │   │
│  │  Attribution Controls │ Containment Controls │ Intelligence Mgmt   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
              HTTP/REST          WebSocket          gRPC (future)
                  │                  │                  │
┌─────────────────▼──────────────────▼──────────────────▼─────────────────┐
│                          API GATEWAY (FastAPI)                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Authentication & Authorization (Zero Trust + RBAC)                │ │
│  │ Request Validation │ Org-ID Isolation │ Rate Limiting            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────┬──────────────────┬──────────────────┬───────────────┘
                     │                  │                  │
         ┌───────────▼──┐   ┌───────────▼──────┐  ┌───────▼───────────┐
         │ Attribution  │   │  Containment     │  │ Intelligence      │
         │  Service     │   │  Service         │  │ Orchestrator      │
         └──────┬──────┘   └────────┬─────────┘  └─────────┬─────────┘
                │                   │                      │
         ┌──────▼──────┐   ┌────────▼─────────┐  ┌────────▼──────────┐
         │ OSINT Conn  │   │ NetOps API       │  │ Proxy Mesh        │
         │ • Shodan    │   │ (Firewall, VLAN) │  │ • Round-robin     │
         │ • Censys    │   │ • Rate-limit     │  │ • Resilience      │
         │ • Intel-X   │   │   handling       │  │ • Backoff policy  │
         └──────┬──────┘   └────────┬─────────┘  └────────┬──────────┘
                │                   │                      │
         ┌──────▼──────────────────▼──────────────────────▼──────────┐
         │               Data Persistence Layer                      │
         │  ┌──────────────────────────────────────────────────────┐ │
         │  │ Neo4j Graph Database (Threat Actor Topology)       │ │
         │  │ • ThreatActor nodes                                 │ │
         │  │ • Evidence nodes (IPs, emails, domains, hashes)    │ │
         │  │ • Relationships: HAS_EVIDENCE, KNOWN_AS, etc.     │ │
         │  │ • Org-ID indexed for multi-tenancy                │ │
         │  └──────────────────────────────────────────────────────┘ │
         │  ┌──────────────────────────────────────────────────────┐ │
         │  │ PostgreSQL (Operational Events & Audit Logs)       │ │
         │  │ • Containment events                                │ │
         │  │ • Attribution requests                              │ │
         │  │ • API query logs (WORM: append-only)              │ │
         │  │ • User activity audit trail                        │ │
         │  └──────────────────────────────────────────────────────┘ │
         └──────────────────────────────────────────────────────────┘
```

---

## Data Flow: Attribution Workflow

```
User Input (Indicators)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ [1] Attribution Engine receives indicators (192.168.1.1)    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ [2] ConnectorService queries OSINT APIs in parallel:        │
│     • Shodan: Get open ports/services                       │
│     • Censys: Get certificate history                       │
│     • Intel-X: Get dark web mentions                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ [3] EnrichmentEngine correlates signals:                    │
│     • Threat feed lookups                                   │
│     • Related infrastructure discovery                      │
│     • Confidence scoring (0.0 - 1.0)                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ [4] Generate Threat Actor ID (TA-{hash})                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ [5] Neo4j Persistence:                                      │
│     CREATE (ta:ThreatActor {actor_id, confidence, org_id})  │
│     MERGE (evidence nodes)                                  │
│     CREATE (ta)-[:HAS_EVIDENCE]->(evidence)                │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ [6] PostgreSQL audit log:                                   │
│     INSERT INTO attribution_events (actor_id, org_id, ...)  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
Return {actor_id, confidence, observations_count}
        │
        ▼
Frontend updates Battlefield tab
with new ThreatActor node in Neo4j graph
```

---

## Data Flow: Containment Workflow

```
Alert: Host exhibiting malicious behavior
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ [1] MicrosegmentationService receives isolation request      │
│     • host: web-server-01                                    │
│     • severity: 9 (P1)                                       │
│     • ttl_seconds: 3600                                      │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ [2] Policy validation:                                       │
│     if severity >= 9 → ALLOW isolation                       │
│     else → DENY (return outcome: "denied")                   │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ [3] Local ContainmentEngine:                                 │
│     isolate_entity(host, reason, ttl)                        │
│     → Store in-memory quarantine record                      │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ [4] NetOps API integration (if configured):                  │
│     POST /segmentation/apply {tenant_id, host, action, ttl}  │
│     → Real firewall rules, VLAN tags updated                 │
│     → Returns confirmation                                   │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ [5] PostgreSQL WORM audit log:                               │
│     INSERT INTO containment_events (host, severity, ...)     │
│     (append-only, immutable)                                 │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
Return {outcome: "success", method: "netops", netops_resp: {...}}
        │
        ▼
Frontend Operations tab updates:
• Shows host in quarantine list
• Displays TTL countdown
• Red indicator for isolated host
```

---

## Data Flow: Intelligence Orchestrator

```
External OSINT API Query Request
        │
        ▼
┌────────────────────────────────────────────────────────────┐
│ [1] RequestOrchestrator receives query:                    │
│     • url: https://api.abuseipdb.com/check                │
│     • method: GET                                          │
│     • headers, params, body (if POST)                     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ [2] Proxy mesh rotation (round-robin shuffle):             │
│     • Select from PROXY_MESH list                         │
│     • Randomize order to spread load                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ [3] httpx.AsyncClient with proxy:                         │
│     client = httpx.AsyncClient(proxies=selected_proxy)    │
│     response = await client.request(method, url, ...)    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
         Is response 429/503?
        (Rate-limited or throttled)
       /                         \
      YES                         NO
      │                           │
      ▼                           ▼
┌──────────────┐        ┌──────────────────┐
│ Check        │        │ Success!         │
│ Retry-After  │        │ Return response  │
│ Wait & retry │        │ with proxy info  │
└──────┬───────┘        └──────┬───────────┘
       │                       │
       └───────────┬───────────┘
                   ▼
         Return {status: 200, proxy: "...", body: {...}}
                   │
                   ▼
         PostgreSQL audit log:
         INSERT INTO intelligence_queries (url, proxy_used, ...)
```

---

## Multi-Tenancy & Org-ID Isolation

### Request Flow with Org-ID

```
Client Request
    ├─ Header: X-Org-ID: "org-a"
    ├─ Header: Authorization: "Bearer JWT_TOKEN"
    └─ Body: {...}
            │
            ▼
┌─────────────────────────────────────────────┐
│ APIGateway: get_org_id_from_request()       │
│ • Priority 1: X-Org-ID header               │
│ • Priority 2: org_id claim in JWT           │
│ • Default: "default_org"                    │
│ → Extract: org_id = "org-a"                 │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ DI Container: get_org_scoped_engine()       │
│ • Retrieve/create engine for org-a          │
│ • Inject org_id into service instance       │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Service execution:                          │
│ • All Neo4j queries filter by org_id:       │
│   MATCH (ta:ThreatActor)                    │
│   WHERE ta.org_id = "org-a"                 │
│                                             │
│ • All PostgreSQL queries filter:            │
│   WHERE org_id = 'org-a'                    │
│                                             │
│ • Containment records tagged with org_id    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
                Result (org-a only)
```

### Neo4j Schema for Multi-Tenancy

```cypher
# ThreatActor node includes org_id
CREATE (ta:ThreatActor {
    actor_id: "TA-12345678",
    org_id: "org-a",           ← Multi-tenant isolation
    confidence: 0.75,
    last_seen: datetime(),
    summary: "APT29 indicators"
})

# Index for performance
CREATE INDEX IF NOT EXISTS ON :ThreatActor(org_id, actor_id)

# Query with org filter:
MATCH (ta:ThreatActor)
WHERE ta.org_id = "org-a"
RETURN ta
```

---

## Integration Points

### 1. External OSINT APIs

**Supported:**
- Shodan (IP/service enumeration)
- Censys (Certificate & host data)
- Intel-X (Dark web & leak archives)
- AbuseIPDB (IP reputation)
- Any REST API (via RequestOrchestrator)

**Integration in AttributionEngine:**
```python
observations = await self.connector.search_public_intel(indicator)
# Returns: [
#   {"source": "Shodan", "type": "infrastructure", "data": {...}},
#   {"source": "Censys", "type": "certificate", "data": {...}},
#   ...
# ]
```

### 2. NetOps API (Firewall/VLAN Management)

**Expected Interface:**
```
POST /segmentation/apply
{
  "tenant_id": "org-a",
  "host": "web-server-01",
  "action": "isolate" | "release",
  "reason": "Ransomware detected",
  "ttl": 3600
}

Response:
{
  "status": "success",
  "firewall_rules_updated": 3,
  "vlans_modified": ["vlan_10", "vlan_20"]
}
```

**Integration in MicrosegmentationService:**
```python
async with httpx.AsyncClient() as client:
    resp = await client.post(
        f"{NETOPS_API_URL}/segmentation/apply",
        json=payload,
        headers={"Authorization": f"Bearer {NETOPS_API_TOKEN}"}
    )
```

### 3. Neo4j Graph Database

**Connection:**
```python
# In infrastructure/graph.py
graph_db = Neo4jClient(
    uri=settings.NEO4J_URI,
    user=settings.NEO4J_USER,
    password=settings.NEO4J_PASSWORD,
    pool_size=settings.GRAPH_DB_CONNECTION_POOL_SIZE
)
```

**Queries used:**
```cypher
# Create threat actor
MERGE (ta:ThreatActor {actor_id: $actor_id, org_id: $org_id})
SET ta.confidence = $confidence, ta.last_seen = datetime()

# Link evidence
MATCH (ta:ThreatActor {actor_id: $actor_id})
MERGE (ta)-[:HAS_EVIDENCE {first_seen: datetime()}]->(e:Evidence {key: $key})

# Query with org isolation
MATCH (ta:ThreatActor {org_id: $org_id})
WHERE ta.confidence > 0.5
RETURN ta, [(ta)-[:HAS_EVIDENCE]->(e) | e] as evidence
```

### 4. PostgreSQL Audit Logs

**Tables:**
```sql
-- Attribution events
CREATE TABLE IF NOT EXISTS attribution_events (
    id SERIAL PRIMARY KEY,
    actor_id VARCHAR(50) NOT NULL,
    org_id VARCHAR(100) NOT NULL,
    indicators TEXT[],
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (org_id, actor_id)
);

-- Containment events (WORM)
CREATE TABLE IF NOT EXISTS containment_events (
    id SERIAL PRIMARY KEY,
    org_id VARCHAR(100) NOT NULL,
    host_identifier VARCHAR(255) NOT NULL,
    severity INT,
    reason TEXT,
    started_at TIMESTAMP,
    ttl_seconds INT,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (org_id)
);

-- Intelligence queries
CREATE TABLE IF NOT EXISTS intelligence_queries (
    id SERIAL PRIMARY KEY,
    org_id VARCHAR(100) NOT NULL,
    url TEXT,
    proxy_used VARCHAR(255),
    status_code INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (org_id)
);
```

---

## Configuration Matrix

| Component | Setting | Default | Purpose |
|-----------|---------|---------|---------|
| **Attribution** | SHODAN_API_KEY | None | Shodan API access |
| | CENSYS_API_KEY | None | Censys API access |
| | INTEL_X_API_KEY | None | Intel-X API access |
| **Containment** | NETOPS_API_URL | None | Firewall API endpoint |
| | NETOPS_API_TOKEN | None | NetOps authentication |
| **Orchestrator** | PROXY_MESH | [] | List of proxy URLs |
| | REQUEST_TIMEOUT | 10.0 | Query timeout (seconds) |
| **Database** | NEO4J_URI | localhost:7687 | Neo4j Bolt endpoint |
| | NEO4J_USER | neo4j | Neo4j username |
| | NEO4J_PASSWORD | neo4j | Neo4j password |
| **Security** | SECRET_KEY | (random) | JWT signing key |
| | ALGORITHM | HS256 | JWT algorithm |

---

## Monitoring & Observability

### Key Metrics to Monitor

```python
# Attribution Engine
- indicators_correlated_per_minute
- average_confidence_score
- osint_api_call_latency
- neo4j_write_latency

# Containment Service
- hosts_quarantined_per_hour
- average_ttl_duration
- netops_api_availability
- policy_denial_rate

# Request Orchestrator
- queries_per_minute
- proxy_rotation_distribution
- rate_limit_hit_rate
- average_query_latency

# System
- org_isolation_violations (should be 0)
- token_validation_failures
- database_connection_pool_usage
- memory_usage_per_tenant
```

### Logging Configuration

```python
# backend/app/core/logging.py
LOGGING_CONFIG = {
    "version": 1,
    "handlers": {
        "attribution": {"filename": "logs/attribution.log"},
        "containment": {"filename": "logs/containment.log"},
        "orchestrator": {"filename": "logs/orchestrator.log"},
        "security": {"filename": "logs/security.log"},
    },
    "loggers": {
        "app.services.intel.attribution": {"handlers": ["attribution"]},
        "app.services.ops.containment": {"handlers": ["containment"]},
        "app.services.intel.request_orchestrator": {"handlers": ["orchestrator"]},
        "app.core.security": {"handlers": ["security"]},
    }
}
```

---

## Deployment Architecture

### Development
```
Localhost:3000 (Frontend) ← HTTP → Localhost:8000 (Backend)
                                    ├─ Neo4j:7687 (Graph)
                                    └─ PostgreSQL:5432 (Audit)
```

### Production
```
CloudFront (CDN)
    ↓
Load Balancer
    ├─ Backend Pod 1 (8000) ─┬─ Neo4j Cluster (Leader + Replicas)
    ├─ Backend Pod 2 (8000) ─┤
    └─ Backend Pod 3 (8000) ─┴─ PostgreSQL RDS (Encrypted)

All with:
- VPC isolation
- Security groups (Least Privilege)
- Secrets Manager (API keys, DB credentials)
- CloudWatch logging (Audit trail)
- DDoS protection (WAF)
```

---

## Security Considerations

### Authentication & Authorization

✅ **Implemented:**
- JWT token-based authentication
- Zero Trust multi-factor evaluation
- Dynamic role assessment
- Zero Trust policy violations → HTTP 403

### Data Privacy

✅ **Implemented:**
- Org-ID isolation (Neo4j + PostgreSQL)
- Encryption in transit (TLS)
- Append-only audit logs (WORM)
- No personally identifiable information stored (only hashes/IPs)

### Rate Limiting & DDoS

✅ **Implemented:**
- Per-org rate limits
- Exponential backoff for external APIs
- Proxy mesh for resilience
- Request timeout enforcement

### Containment Safety

✅ **Implemented:**
- Severity threshold enforcement
- Human-readable audit trails
- TTL-based auto-release
- Policy deny-by-default

---

## Next Steps & Roadmap

### Phase 4 (Q2 2026)
- [ ] GraphQL API for complex threat queries
- [ ] Automated incident response playbooks
- [ ] Machine learning threat scoring
- [ ] Integration with SIEM (Splunk, Elastic)

### Phase 5 (Q3 2026)
- [ ] Threat actor timeline visualization
- [ ] Collaborative investigation tools
- [ ] Custom enrichment plugins
- [ ] Blockchain-based evidence chain

### Phase 6 (Q4 2026)
- [ ] Real-time threat feed subscriptions
- [ ] Lateral movement detection
- [ ] Automated remediation workflows
- [ ] SOC2 certification

---

## References

- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **Neo4j Docs:** https://neo4j.com/docs/
- **OWASP Top 10:** https://owasp.org/Top10/
- **Zero Trust Architecture:** https://www.nist.gov/publications/zero-trust-architecture
- **MITRE ATT&CK:** https://attack.mitre.org/
