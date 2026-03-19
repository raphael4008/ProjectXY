# War Room Intelligence Platform - Developer Quick Start Guide

## Overview

This guide helps developers get the War Room Intelligence Platform up and running in minutes. It covers environment setup, service initialization, and example workflows.

---

## Quick Setup (5 minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/raphael4008/ProjectXY.git
cd ProjectXY

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### 2. Environment Configuration

Create `.env` files in both backend and frontend:

**`backend/.env`**
```bash
# FastAPI Configuration
PROJECT_NAME=ProjectXY War Room
DEBUG=True
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql://projectxy:projectxy@localhost:5432/projectxy
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j-password

# Security
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Intelligence APIs (OSINT)
SHODAN_API_KEY=your-shodan-key
CENSYS_API_KEY=your-censys-key
INTEL_X_API_KEY=your-intelx-key

# NetOps Integration
NETOPS_API_URL=http://localhost:8001
NETOPS_API_TOKEN=your-netops-token

# Proxy Mesh for Resilient Queries
PROXY_MESH=["http://proxy1:8080", "http://proxy2:8080"]
REQUEST_TIMEOUT=10.0

# Neo4j Configuration
GRAPH_DB_TYPE=neo4j
GRAPH_DB_CONNECTION_POOL_SIZE=50
```

**`frontend/.env.local`**
```bash
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_WS_URL=ws://localhost:8000/ws
REACT_APP_NEO4J_ENABLED=true
```

### 3. Start Services (3 terminals)

**Terminal 1: Neo4j Database**
```bash
# Using Docker (recommended)
docker run --rm -d \
  -p 7687:7687 \
  -p 7474:7474 \
  -e NEO4J_AUTH=neo4j/neo4j-password \
  --name projectxy-neo4j \
  neo4j:latest

# Or local installation
# neo4j start (if installed locally)
```

**Terminal 2: PostgreSQL Database** (optional, if using)
```bash
docker run --rm -d \
  -p 5432:5432 \
  -e POSTGRES_USER=projectxy \
  -e POSTGRES_PASSWORD=projectxy \
  -e POSTGRES_DB=projectxy \
  --name projectxy-db \
  postgres:latest

# Run migrations
cd backend
alembic upgrade head
```

**Terminal 3: Backend API**
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 4: Frontend**
```bash
cd frontend
npm run dev
# Opens at http://localhost:3000
```

---

## Accessing the Platform

### 1. Default Credentials

```
Email: admin@example.com
Password: admin
```

If user doesn't exist, register first:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin",
    "full_name": "Admin User"
  }'
```

### 2. Get Authentication Token

```bash
export TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=admin" \
  | jq -r '.access_token')

echo $TOKEN
```

### 3. Verify Backend is Running

```bash
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"

# Should return:
# {
#   "id": "...",
#   "email": "admin@example.com",
#   "full_name": "Admin User"
# }
```

### 4. Access War Room Dashboard

```bash
# In browser
open http://localhost:3000/warroom

# Or verify API endpoint
curl -X GET http://localhost:8000/api/v1/warroom/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org"
```

---

## Core API Endpoints

### Attribution Engine

**Correlate Threat Indicators**
```bash
curl -X POST http://localhost:8000/api/v1/warroom/attribution/correlate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org" \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": ["192.168.1.1", "attacker@evil.com", "evil.com"],
    "dossier_meta": {"note": "APT29 indicators"}
  }'
```

**Get Threat Actors**
```bash
curl -X GET "http://localhost:8000/api/v1/warroom/attribution/actors" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org"
```

**Get Actor Details**
```bash
curl -X GET "http://localhost:8000/api/v1/warroom/attribution/actors/{actor_id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org"
```

### Containment Service

**Isolate a Host**
```bash
curl -X POST http://localhost:8000/api/v1/warroom/containment/isolate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org" \
  -H "Content-Type: application/json" \
  -d '{
    "host_identifier": "web-server-01",
    "severity": 9,
    "reason": "Ransomware detected",
    "ttl_seconds": 3600
  }'
```

**Get Containment Status**
```bash
curl -X GET http://localhost:8000/api/v1/warroom/containment/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org"
```

**Release Quarantine**
```bash
curl -X POST http://localhost:8000/api/v1/warroom/containment/release \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org" \
  -H "Content-Type: application/json" \
  -d '{
    "host_identifier": "web-server-01"
  }'
```

### Intelligence Orchestrator

**Execute Resilient Query**
```bash
curl -X POST http://localhost:8000/api/v1/warroom/intelligence/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.abuseipdb.com/api/v2/check",
    "method": "GET",
    "headers": {"Key": "your-api-key"},
    "params": {"ipAddress": "192.168.1.1"}
  }'
```

---

## Example Workflows

### Workflow 1: Correlate and Visualize Threat Actor

```bash
#!/bin/bash
set -e

# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=admin" \
  | jq -r '.access_token')

ORG_ID="default_org"

# 2. Correlate indicators
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/warroom/attribution/correlate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": ["10.0.0.1", "10.0.0.2", "attacker@evil.com"],
    "dossier_meta": {"note": "Campaign X"}
  }')

ACTOR_ID=$(echo $RESPONSE | jq -r '.actor_id')
CONFIDENCE=$(echo $RESPONSE | jq -r '.confidence')

echo "✓ Threat actor created: $ACTOR_ID (confidence: $CONFIDENCE)"

# 3. Fetch actor details
curl -s -X GET "http://localhost:8000/api/v1/warroom/attribution/actors/$ACTOR_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" | jq '.'

# 4. Open Neo4j Browser to visualize
echo ""
echo "Open Neo4j Browser: http://localhost:7474"
echo "Run query: MATCH (ta:ThreatActor {actor_id: \"$ACTOR_ID\"})-[:HAS_EVIDENCE]->(e) RETURN ta, e"
```

**Save as `workflows/correlate_actor.sh` and run:**
```bash
chmod +x workflows/correlate_actor.sh
./workflows/correlate_actor.sh
```

### Workflow 2: Automated Incident Response

```bash
#!/bin/bash
set -e

TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=admin" \
  | jq -r '.access_token')

ORG_ID="default_org"

# Scenario: Ransomware detected on web-server-01

echo "🚨 Ransomware outbreak detected!"

# 1. Correlate malware indicators
echo "[1] Correlating threat indicators..."
ACTOR=$(curl -s -X POST http://localhost:8000/api/v1/warroom/attribution/correlate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": [
      "192.168.10.50",
      "c2.ransomware.xyz",
      "5ba6a32f2b0c4e7a9f8d3c1b"
    ],
    "dossier_meta": {
      "note": "Ransomware C2 infrastructure",
      "severity": "P0"
    }
  }')

ACTOR_ID=$(echo $ACTOR | jq -r '.actor_id')
echo "✓ Threat actor identified: $ACTOR_ID"

# 2. Isolate infected host
echo "[2] Isolating infected host..."
CONTAINMENT=$(curl -s -X POST http://localhost:8000/api/v1/warroom/containment/isolate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "host_identifier": "web-server-01",
    "severity": 10,
    "reason": "Ransomware outbreak - isolating for forensic analysis",
    "ttl_seconds": 7200
  }')

echo "✓ Host isolated: $(echo $CONTAINMENT | jq -r '.outcome')"

# 3. Check containment status
echo "[3] Verifying containment..."
STATUS=$(curl -s -X GET http://localhost:8000/api/v1/warroom/containment/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID")

ACTIVE_QUARANTINES=$(echo $STATUS | jq -r '.active_quarantines')
echo "✓ Active quarantines: $ACTIVE_QUARANTINES"

# 4. Query external reputation for C2
echo "[4] Checking C2 reputation..."
REPUTATION=$(curl -s -X POST http://localhost:8000/api/v1/warroom/intelligence/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.abuseipdb.com/api/v2/check",
    "method": "GET",
    "headers": {"Key": "YOUR_KEY"},
    "params": {"ipAddress": "192.168.10.50"}
  }')

echo "✓ Reputation query executed"

echo ""
echo "🛡️  Incident response complete!"
echo "Actor ID: $ACTOR_ID"
echo "Affected Host: web-server-01"
echo "Quarantine Status: Active (2 hours)"
```

**Save as `workflows/incident_response.sh`:**
```bash
chmod +x workflows/incident_response.sh
./workflows/incident_response.sh
```

---

## Development Patterns

### Adding a New Threat Indicator Type

1. **Update the Attribution Engine** (`backend/app/services/intel/attribution.py`):

```python
# In the correlate_indicators method, add enrichment for new type
if obs.get("type") == "new_indicator_type":
    enriched_data = await self.enrichment.enrich_new_type(obs.get("data"))
    enriched.append(enriched_data)
```

2. **Add to EnrichmentEngine** (`backend/app/services/enrichment_engine.py`):

```python
async def enrich_new_type(self, data):
    # Logic to enrich new type from threat feeds
    return {"type": "new_indicator_type", "enriched": True}
```

3. **Test the addition**:

```bash
curl -X POST http://localhost:8000/api/v1/warroom/attribution/correlate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org" \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": ["new_indicator_value"],
    "dossier_meta": {"note": "Testing new type"}
  }'
```

### Adding a New Containment Policy

1. **Update MicrosegmentationService** (`backend/app/services/ops/containment.py`):

```python
def _policy_allows(self, tenant_id: str, severity: int, policy_type: str = "default") -> bool:
    # Add custom policy logic
    if policy_type == "custom_policy":
        return severity >= 8  # Different threshold
    return severity >= 9
```

2. **Test the policy**:

```bash
curl -X POST http://localhost:8000/api/v1/warroom/containment/isolate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: default_org" \
  -H "Content-Type: application/json" \
  -d '{
    "host_identifier": "test-host",
    "severity": 8,
    "reason": "Testing custom policy",
    "ttl_seconds": 1800,
    "policy_type": "custom_policy"
  }'
```

---

## Debugging

### Enable Verbose Logging

```bash
# Backend
cd backend
export LOG_LEVEL=DEBUG
python -m uvicorn app.main:app --reload --log-level debug

# Check specific logs
tail -f logs/intelligence.log
tail -f logs/containment.log
```

### Check Neo4j Queries

```bash
# In Neo4j Browser (http://localhost:7474), enable query profiling:
# :session set param resultformat
# PROFILE MATCH (ta:ThreatActor) RETURN ta

# View slow queries
curl -X GET http://localhost:7474/db/neo4j/exec \
  -d 'CALL dbms.queryJmx("*:*") YIELD name, attributes'
```

### Inspect Request Orchestrator Proxy Routing

```bash
# Enable proxy logging
export DEBUG_PROXY_ROUTING=true

# Check which proxies are being used
grep -i "proxy" logs/orchestrator.log
```

---

## Common Tasks

### Reset Database

```bash
# Neo4j
curl -X POST http://localhost:7474/db/neo4j/reset \
  -u neo4j:neo4j-password

# PostgreSQL (if using)
cd backend
alembic downgrade base
alembic upgrade head
```

### Seed Initial Data

```bash
cd backend
python -m app.scripts.seed
```

### Generate API Documentation

```bash
# Swagger UI available at:
open http://localhost:8000/docs

# OpenAPI JSON:
open http://localhost:8000/openapi.json
```

### Run Unit Tests

```bash
cd backend
pytest tests/ -v

cd ../frontend
npm test
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ConnectionError: Cannot connect to Neo4j` | Verify Neo4j is running: `docker ps \| grep neo4j` |
| `AuthenticationError: Invalid token` | Re-generate token: See "Get Authentication Token" section |
| `CORS errors in frontend` | Verify `REACT_APP_API_URL` matches backend URL in `.env.local` |
| `Rate limiting on OSINT APIs` | Enable proxy mesh: Set `PROXY_MESH` in `.env` |
| `Org-ID isolation not working` | Verify `X-Org-ID` header is being passed in requests |

---

## Next Steps

1. **Explore API Documentation:** Open http://localhost:8000/docs
2. **Run E2E Tests:** Follow `WARROOM_E2E_TESTING.md`
3. **Deploy to Cloud:** See `backend/deploy/README.md`
4. **Integrate Custom OSINT:** Add API keys in `.env`
5. **Build Custom Dashboards:** Extend `frontend/src/components/warroom/`

---

## Support & Resources

- **API Docs:** http://localhost:8000/docs
- **Neo4j Docs:** https://neo4j.com/docs/
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **React Docs:** https://react.dev/
- **Project Repo:** https://github.com/raphael4008/ProjectXY

---

**Happy hacking! 🚀**
