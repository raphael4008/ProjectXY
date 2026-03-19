# War Room Intelligence Platform - End-to-End Testing Guide

## Overview

This guide covers complete end-to-end testing of the War Room Intelligence Platform, including:
- Attribution Engine (threat actor correlation)
- Microsegmentation Service (automated containment)
- Request Orchestrator (resilient intelligence gathering)
- Neo4j threat actor graph visualization
- Integrated UI dashboards

---

## Prerequisites

### 1. Environment Setup

```bash
# Backend environment variables
export PROJECTXY_ENV=development
export NETOPS_API_URL="http://localhost:8001"  # Mock NetOps API or real endpoint
export NETOPS_API_TOKEN="your-netops-token"
export PROXY_MESH='["http://proxy1:8080", "http://proxy2:8080"]'
export REQUEST_TIMEOUT=10.0

# Neo4j credentials
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="your-neo4j-password"

# OSINT API keys
export SHODAN_API_KEY="your-shodan-key"
export CENSYS_API_KEY="your-censys-key"
export INTEL_X_API_KEY="your-intelx-key"

# Frontend
export REACT_APP_API_URL="http://localhost:8000/api/v1"
```

### 2. Services Running

Ensure these services are running:

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Neo4j
docker run --rm -p 7687:7687 -p 7474:7474 \
  -e NEO4J_AUTH=neo4j/your-neo4j-password \
  neo4j:latest

# Terminal 4: PostgreSQL (if using)
docker run --rm -p 5432:5432 \
  -e POSTGRES_USER=projectxy \
  -e POSTGRES_PASSWORD=projectxy-pass \
  postgres:latest

# Terminal 5: Mock NetOps API (optional, for testing containment)
python -m http.server 8001
```

---

## Test Scenarios

### Test 1: Attribution Engine - Threat Actor Correlation

**Objective:** Correlate multiple threat indicators and create a threat actor dossier.

#### 1.1 Basic Correlation Test

```bash
# Get authentication token
curl -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=admin"

# Store token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export ORG_ID="default_org"

# Test: Correlate threat indicators
curl -X POST http://localhost:8000/api/v1/warroom/attribution/correlate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": [
      "192.168.1.100",
      "attacker@example.com",
      "evil.com"
    ],
    "dossier_meta": {
      "note": "Test threat actor - APT29 indicators",
      "classification": "TLP:AMBER"
    }
  }'

# Expected response:
# {
#   "actor_id": "TA-12345678",
#   "confidence": 0.65,
#   "observations": 12,
#   "enriched_matches": 4
# }
```

**Validation:**
- [ ] Response contains actor_id with format "TA-*"
- [ ] Confidence score between 0.0 and 1.0
- [ ] Observations count > 0
- [ ] No errors in backend logs

#### 1.2 Verify Neo4j Persistence

```bash
# Connect to Neo4j and verify ThreatActor node was created
# Using Neo4j Browser at http://localhost:7474

# Run Cypher query:
MATCH (ta:ThreatActor {actor_id: "TA-12345678"})
RETURN ta, [(ta)-[:HAS_EVIDENCE]->(e) | e] as evidence

# Expected output:
# - ThreatActor node with properties: actor_id, confidence, last_seen, summary
# - Multiple Evidence nodes linked via HAS_EVIDENCE relationships
```

#### 1.3 Attribution with Multiple Indicators

```bash
# Test with larger set of indicators (stress test)
curl -X POST http://localhost:8000/api/v1/warroom/attribution/correlate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": [
      "10.0.0.1",
      "10.0.0.2",
      "10.0.0.3",
      "attacker1@evil.com",
      "attacker2@evil.com",
      "c2.evil.com",
      "staging.evil.com",
      "abc123def456abc123def456abc123de"
    ],
    "dossier_meta": {
      "note": "Large campaign - multiple C2 nodes",
      "severity": "P0"
    }
  }'

# Validation:
# - [ ] Request completes within 30 seconds
# - [ ] Confidence score reflects 8 indicators
# - [ ] Enriched matches >= 2
```

---

### Test 2: Microsegmentation Service - Automated Containment

**Objective:** Test automated network isolation with severity thresholds.

#### 2.1 Initiate Containment

```bash
# Test: Isolate a host at P1 severity
curl -X POST http://localhost:8000/api/v1/warroom/containment/isolate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "host_identifier": "web-server-01",
    "severity": 9,
    "reason": "Ransomware outbreak detected - quarantine for 1 hour",
    "ttl_seconds": 3600
  }'

# Expected response:
# {
#   "outcome": "success",
#   "method": "netops",
#   "netops_resp": {...}
# }
```

**Validation:**
- [ ] Response contains outcome field
- [ ] Method is either "netops" or "simulated"
- [ ] No errors in backend logs

#### 2.2 Check Containment Status

```bash
# Verify containment is active
curl -X GET http://localhost:8000/api/v1/warroom/containment/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID"

# Expected response:
# {
#   "active_quarantines": 1,
#   "hosts": [
#     {
#       "host": "web-server-01",
#       "started_at": "2026-03-19T10:30:00Z",
#       "expires_at": "2026-03-19T11:30:00Z",
#       "reason": "Ransomware outbreak detected..."
#     }
#   ]
# }
```

**Validation:**
- [ ] active_quarantines >= 1
- [ ] hosts array contains our isolated host
- [ ] expires_at is 1 hour from started_at

#### 2.3 Policy-Based Denial Test

```bash
# Test: Try to isolate at LOW severity (should be denied by policy)
curl -X POST http://localhost:8000/api/v1/warroom/containment/isolate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "host_identifier": "test-server",
    "severity": 3,
    "reason": "Testing policy threshold",
    "ttl_seconds": 1800
  }'

# Expected response:
# {
#   "outcome": "denied",
#   "reason": "policy"
# }
```

**Validation:**
- [ ] Outcome is "denied"
- [ ] Reason is "policy"

---

### Test 3: Request Orchestrator - Resilient Intelligence Gathering

**Objective:** Test distributed request handling with proxy rotation and rate-limit handling.

#### 3.1 Basic Resilient Query

```bash
# Test: Query external intelligence API with orchestrator
curl -X POST http://localhost:8000/api/v1/warroom/intelligence/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.abuseipdb.com/api/v2/check",
    "method": "GET",
    "headers": {
      "Key": "your-abuseipdb-key"
    },
    "params": {
      "ipAddress": "192.168.1.1",
      "maxAgeInDays": 90
    }
  }'

# Expected response:
# {
#   "status": 200,
#   "proxy": "http://proxy1:8080",
#   "body": {...}
# }
```

**Validation:**
- [ ] Status code 200
- [ ] Proxy field shows which proxy was used
- [ ] Body contains valid JSON response

#### 3.2 Rate-Limit Handling Test

```bash
# Test: Multiple rapid requests to trigger rate limiting
for i in {1..5}; do
  curl -X POST http://localhost:8000/api/v1/warroom/intelligence/query \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Org-ID: $ORG_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "url": "https://api.example.com/lookup",
      "method": "GET"
    }' &
done
wait

# Validation:
# - [ ] At least 2 different proxies were used (round-robin)
# - [ ] No errors in final responses (orchestrator backed off properly)
# - [ ] Backend logs show rate-limit detection
```

---

### Test 4: War Room Dashboard Integration

**Objective:** Test the integrated War Room UI with all components.

#### 4.1 Access War Room Dashboard

```bash
# Open in browser
open http://localhost:3000/warroom

# Or via curl to verify API connectivity
curl -X GET http://localhost:8000/api/v1/warroom/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_ID"

# Expected response:
# {
#   "status": "operational",
#   "services": {
#     "attribution": "ready",
#     "containment": "ready",
#     "orchestrator": "ready",
#     "neo4j": "connected"
#   },
#   "timestamp": "2026-03-19T10:35:00Z"
# }
```

**UI Validation Checklist:**
- [ ] Battlefield tab shows Neo4j graph (threat actors)
- [ ] Intelligence tab shows enriched feed
- [ ] Operations tab shows containment status
- [ ] Attribution controls are visible and functional
- [ ] Containment controls show active quarantines
- [ ] Real-time updates flowing through WebSocket

#### 4.2 Execute Attribution from UI

```bash
# In the CommandDeck UI:
# 1. Click "Battlefield" tab
# 2. Enter indicators: 192.168.1.100, attacker@evil.com, evil.com
# 3. Click "Correlate"
# 4. Verify threat actor dossier appears in graph
# 5. Click on threat actor node to see evidence
```

**UI Validation:**
- [ ] Threat actor appears in Neo4j graph
- [ ] Indicators are linked as evidence
- [ ] Confidence score is displayed
- [ ] Graph updates in real-time

#### 4.3 Execute Containment from UI

```bash
# In the CommandDeck UI:
# 1. Click "Operations" tab
# 2. Select a host from the list
# 3. Set severity to P1
# 4. Click "Isolate"
# 5. Verify containment status updates
```

**UI Validation:**
- [ ] Host appears in quarantine list
- [ ] TTL countdown starts
- [ ] Status page shows 1 active quarantine
- [ ] Color indication changes (red for quarantined)

---

### Test 5: Org-ID Isolation Verification

**Objective:** Ensure multi-tenant isolation is enforced.

#### 5.1 Create Dossier in Org-A

```bash
export ORG_A="org-a-test"

curl -X POST http://localhost:8000/api/v1/warroom/attribution/correlate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_A" \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": ["192.168.1.1"],
    "dossier_meta": {"note": "Org-A dossier"}
  }'

# Store the actor_id (e.g., "TA-11111111")
export ACTOR_A="TA-11111111"
```

#### 5.2 Try to Access from Org-B

```bash
export ORG_B="org-b-test"

# Query threat actors in Org-B (should not include Org-A's actors)
curl -X GET "http://localhost:8000/api/v1/warroom/attribution/actors?actor_id=$ACTOR_A" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: $ORG_B"

# Expected response (if access control is enforced):
# {
#   "error": "Actor not found in this organization"
# }
```

**Validation:**
- [ ] Org-A cannot access Org-B's threat actors
- [ ] Org-B cannot access Org-A's containment records
- [ ] Neo4j queries include org_id filter

#### 5.3 Verify Neo4j Org Isolation

```bash
# In Neo4j Browser, verify org isolation:
MATCH (ta:ThreatActor)
WHERE NOT ta.org_id IN ["org-a-test", "default_org"]
RETURN count(ta)

# Expected: 0 (no cross-org leakage)
```

---

## Performance Tests

### Test 6: Stress Testing

#### 6.1 Parallel Attribution Requests

```bash
# Test 10 concurrent correlation requests
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/v1/warroom/attribution/correlate \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Org-ID: $ORG_ID" \
    -H "Content-Type: application/json" \
    -d "{
      \"indicators\": [\"192.168.$((RANDOM % 256)).$((RANDOM % 256))\"],
      \"dossier_meta\": {\"note\": \"Stress test $i\"}
    }" &
done
wait

echo "All 10 requests completed"
```

**Validation:**
- [ ] All requests complete successfully
- [ ] Response times under 5 seconds each
- [ ] No database connection errors

#### 6.2 Neo4j Graph Size Check

```cypher
# Check total nodes and relationships
MATCH (n)
RETURN labels(n) as type, count(*) as count

# Check graph density
MATCH ()-[r]->()
RETURN type(r) as relationship_type, count(*) as count
```

**Validation:**
- [ ] ThreatActor count < 10,000 (performance threshold)
- [ ] Evidence nodes properly linked
- [ ] No orphaned nodes

---

## Troubleshooting

### Common Issues

#### Issue 1: Authentication Fails

```bash
# Debug: Check token validity
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"

# If fails, re-authenticate
curl -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=admin"
```

#### Issue 2: Neo4j Connection Error

```bash
# Check Neo4j is running
curl -X GET http://localhost:7474/db/neo4j/

# Check Cypher query directly:
# In Neo4j Browser: :sysinfo
```

#### Issue 3: OSINT API Rate Limiting

```bash
# Check backend logs for rate-limit messages
tail -f backend/logs/app.log | grep -i "rate"

# Verify PROXY_MESH is configured:
echo $PROXY_MESH

# If empty, set proxies:
export PROXY_MESH='["http://proxy1:8080"]'
```

#### Issue 4: Org-ID Not Isolated

```bash
# Verify X-Org-ID header is being passed
curl -v http://localhost:8000/api/v1/warroom/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Org-ID: test-org" 2>&1 | grep "X-Org-ID"

# Check backend logs for org_id extraction
tail -f backend/logs/app.log | grep -i "org_id"
```

---

## Test Results Summary

After running all tests, fill in this checklist:

- [ ] Test 1: Attribution Engine - PASSED
- [ ] Test 2: Microsegmentation - PASSED
- [ ] Test 3: Request Orchestrator - PASSED
- [ ] Test 4: War Room UI Integration - PASSED
- [ ] Test 5: Org-ID Isolation - PASSED
- [ ] Test 6: Stress Testing - PASSED

**Date Tested:** _______________
**Tester:** _______________
**Environment:** _______________
**Notes:** _______________

---

## Next Steps

Once all tests pass:

1. **Deploy to Staging:** Follow `DEPLOYMENT.md`
2. **Monitor Metrics:** Check Prometheus dashboards
3. **Load Testing:** Use `k6` for sustained load tests
4. **Security Audit:** Run OWASP scanning
5. **Documentation:** Update API docs with real examples
