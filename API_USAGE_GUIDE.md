# ProjectXY API Usage Guide

## Authentication

All endpoints require a JWT token in the `Authorization` header:

```bash
Authorization: Bearer <your-jwt-token>
```

## Script Management

### 1. List All Scripts

```bash
curl -X GET "http://localhost:8000/api/v1/ops/scripts" \
  -H "Authorization: Bearer $TOKEN"
```

**Query Parameters:**
- `team`: Filter by "red" or "blue"
- `category`: Filter by category (recon, exploit, patch, isolation, forensics, hardening)
- `max_danger`: Maximum danger level (1-10)

**Example - Get all RED team reconnaissance scripts:**
```bash
curl -X GET "http://localhost:8000/api/v1/ops/scripts?team=red&category=recon&max_danger=5" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Subnet Scanner",
    "language": "python",
    "code": "import nmap\nscanner = nmap.PortScanner()...",
    "team": "RED",
    "category": "RECON",
    "danger_level": 3,
    "is_approved": true,
    "metadata": {
      "team": "red",
      "category": "recon",
      "danger_level": 3,
      "description": "Scans target subnet for active hosts",
      "tags": ["network", "discovery"],
      "author": "security@example.com",
      "requires_approval": false,
      "timeout_seconds": 300
    },
    "created_at": "2026-03-18T10:00:00Z",
    "created_by": "admin"
  }
]
```

### 2. Get Script by ID

```bash
curl -X GET "http://localhost:8000/api/v1/ops/scripts/{script_id}" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Create New Script

```bash
curl -X POST "http://localhost:8000/api/v1/ops/scripts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Port Scanner",
    "language": "python",
    "code": "import socket\nfor port in range(1, 1001): ...",
    "created_by": "user@example.com",
    "metadata": {
      "team": "red",
      "category": "recon",
      "danger_level": 4,
      "description": "TCP port scanner",
      "tags": ["network", "scan"],
      "author": "user@example.com",
      "requires_approval": true,
      "timeout_seconds": 300
    }
  }'
```

### 4. Update Script

```bash
curl -X PUT "http://localhost:8000/api/v1/ops/scripts/{script_id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Port Scanner",
    "code": "import socket\nupdated code..."
  }'
```

### 5. Delete Script

```bash
curl -X DELETE "http://localhost:8000/api/v1/ops/scripts/{script_id}" \
  -H "Authorization: Bearer $TOKEN"
```

## Script Execution

### 1. Execute Script (HTTP - Synchronous)

```bash
curl -X POST "http://localhost:8000/api/v1/ops/execute/{script_id}" \
  -H "Authorization: Bearer $TOKEN"
```

**Query Parameters:**
- `timeout_seconds`: Override default timeout
- `memory_mb`: Override memory limit
- `user_id`: User executing the script

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/ops/execute/550e8400-e29b-41d4-a716-446655440000?timeout_seconds=600" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "execution_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "script_id": "550e8400-e29b-41d4-a716-446655440000",
  "script_name": "Port Scanner",
  "status": "COMPLETED",
  "exit_code": 0,
  "stdout": "Port 22: OPEN\nPort 80: OPEN\nPort 443: OPEN",
  "stderr": "",
  "started_at": "2026-03-18T10:05:00Z",
  "completed_at": "2026-03-18T10:05:05Z",
  "duration_seconds": 5.2
}
```

### 2. Execute Script with Real-time Streaming (WebSocket)

**Connect to WebSocket:**
```bash
wscat -c "ws://localhost:8000/api/v1/ops/ws/execute/550e8400-e29b-41d4-a716-446655440000"
```

**Python Example:**
```python
import asyncio
import websockets
import json

async def stream_execution():
    uri = "ws://localhost:8000/api/v1/ops/ws/execute/550e8400-e29b-41d4-a716-446655440000"
    
    async with websockets.connect(uri) as websocket:
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            
            if data['type'] == 'log_chunk':
                print(f"[{data['payload']['stream']}] {data['payload']['text']}")
            
            elif data['type'] == 'execution_complete':
                print(f"Exit code: {data['payload']['exit_code']}")
                print(f"Duration: {data['payload']['duration_seconds']}s")
                break
            
            elif data['type'] == 'system_alert':
                print(f"⚠️  {data['payload']['message']}")

asyncio.run(stream_execution())
```

**WebSocket Message Types:**

#### Log Chunk
```json
{
  "type": "log_chunk",
  "execution_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "timestamp": "2026-03-18T10:05:01Z",
  "payload": {
    "text": "Port 22: OPEN",
    "stream": "stdout"
  }
}
```

#### Status Update
```json
{
  "type": "status_update",
  "execution_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "timestamp": "2026-03-18T10:05:00Z",
  "payload": {
    "status": "RUNNING",
    "details": {
      "script_name": "Port Scanner",
      "script_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

#### Execution Complete
```json
{
  "type": "execution_complete",
  "execution_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "timestamp": "2026-03-18T10:05:05Z",
  "payload": {
    "exit_code": 0,
    "duration_seconds": 5.2
  }
}
```

#### System Alert
```json
{
  "type": "system_alert",
  "execution_id": "SYSTEM",
  "timestamp": "2026-03-18T10:05:10Z",
  "payload": {
    "alert_type": "LOCKDOWN",
    "message": "🚨 SYSTEM LOCKDOWN ACTIVATED - All operations halted"
  }
}
```

### 3. Get Execution Result

```bash
curl -X GET "http://localhost:8000/api/v1/ops/executions/{execution_id}" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get Executor Statistics

```bash
curl -X GET "http://localhost:8000/api/v1/ops/executions" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "total_executions": 145,
  "running": 2,
  "completed": 140,
  "failed": 3,
  "timeouts": 0,
  "average_duration_seconds": 4.23
}
```

### 5. Cancel Running Execution

```bash
curl -X POST "http://localhost:8000/api/v1/ops/cancel/{execution_id}" \
  -H "Authorization: Bearer $TOKEN"
```

## Security Operations

### 1. Trigger SYSTEM_LOCKDOWN

**Immediate emergency kill-all:**

```bash
curl -X POST "http://localhost:8000/api/v1/ops/lockdown" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "admin@example.com"}'
```

**Effects:**
- ❌ All running containers are killed
- ❌ All JWT tokens are revoked
- ❌ All future executions are blocked
- ✓ Security event logged to audit trail
- ✓ System alert broadcast to all clients

### 2. Release Lockdown

```bash
curl -X POST "http://localhost:8000/api/v1/ops/lockdown/release" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "admin@example.com"}'
```

## Approval Workflow

### 1. Get Approval Queue

```bash
curl -X GET "http://localhost:8000/api/v1/ops/approvals" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "script_id": "550e8400-e29b-41d4-a716-446655440000",
    "script_name": "Privilege Escalation",
    "danger_level": 8,
    "requested_by": "user@example.com",
    "requested_at": "2026-03-18T10:00:00Z",
    "team": "RED"
  }
]
```

### 2. Approve Script

```bash
curl -X POST "http://localhost:8000/api/v1/ops/approvals/{approval_id}/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved_by": "admin@example.com", "notes": "Reviewed and approved"}'
```

### 3. Reject Script

```bash
curl -X POST "http://localhost:8000/api/v1/ops/approvals/{approval_id}/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rejected_by": "admin@example.com", "reason": "Exceeds danger threshold"}'
```

## Team-Specific Endpoints

### Get RED Team Arsenal

```bash
curl -X GET "http://localhost:8000/api/v1/ops/red-arsenal" \
  -H "Authorization: Bearer $TOKEN"
```

### Get BLUE Team Arsenal

```bash
curl -X GET "http://localhost:8000/api/v1/ops/blue-arsenal" \
  -H "Authorization: Bearer $TOKEN"
```

## Error Handling

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (success, no response body) |
| 400 | Bad Request |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (system lockdown, not approved) |
| 404 | Not Found |
| 409 | Conflict (resource already exists) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "detail": "Script with danger_level > 5 requires approval before execution"
}
```

### Common Errors

**System Lockdown:**
```json
{
  "detail": "System is in lockdown mode"
}
```

**Script Not Approved:**
```json
{
  "detail": "Script requires approval before execution"
}
```

**Execution Timeout:**
```json
{
  "exit_code": -1,
  "status": "TIMEOUT",
  "error_message": "Execution timeout after 300 seconds"
}
```

## Code Examples

### Python Client

```python
import requests
import asyncio
import websockets
import json

class ProjectXYClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {token}"}
    
    def list_scripts(self, team=None):
        params = {}
        if team:
            params["team"] = team
        
        resp = requests.get(
            f"{self.base_url}/api/v1/ops/scripts",
            headers=self.headers,
            params=params
        )
        return resp.json()
    
    def execute_script(self, script_id):
        resp = requests.post(
            f"{self.base_url}/api/v1/ops/execute/{script_id}",
            headers=self.headers
        )
        return resp.json()
    
    async def stream_execution(self, script_id):
        uri = f"ws://localhost:8000/api/v1/ops/ws/execute/{script_id}"
        
        async with websockets.connect(uri) as ws:
            while True:
                message = await ws.recv()
                data = json.loads(message)
                
                if data['type'] == 'log_chunk':
                    print(f"[{data['payload']['stream']}] {data['payload']['text']}")
                elif data['type'] == 'execution_complete':
                    print(f"✓ Completed: {data['payload']['exit_code']}")
                    break

# Usage
client = ProjectXYClient("http://localhost:8000", "your-token")
scripts = client.list_scripts(team="red")
print(scripts)

result = client.execute_script("script-id")
asyncio.run(client.stream_execution("script-id"))
```

### JavaScript/TypeScript Client

```typescript
import axios from 'axios';

interface ScriptMetadata {
  team: 'red' | 'blue';
  category: string;
  danger_level: number;
  description: string;
  requires_approval: boolean;
  timeout_seconds: number;
}

class ProjectXYClient {
  constructor(baseURL: string, token: string) {
    this.client = axios.create({
      baseURL,
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async listScripts(team?: string, maxDanger?: number) {
    const { data } = await this.client.get('/api/v1/ops/scripts', {
      params: { team, max_danger: maxDanger }
    });
    return data;
  }

  async executeScript(scriptId: string) {
    const { data } = await this.client.post(
      `/api/v1/ops/execute/${scriptId}`
    );
    return data;
  }

  async streamExecution(scriptId: string, onLog: (log: any) => void) {
    const uri = `ws://localhost:8000/api/v1/ops/ws/execute/${scriptId}`;
    const ws = new WebSocket(uri);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'log_chunk') {
        onLog({
          stream: message.payload.stream,
          text: message.payload.text
        });
      } else if (message.type === 'execution_complete') {
        console.log(`✓ Exit code: ${message.payload.exit_code}`);
        ws.close();
      }
    };
  }
}

// Usage
const client = new ProjectXYClient('http://localhost:8000', 'token');
const scripts = await client.listScripts('red');
await client.streamExecution('script-id', (log) => {
  console.log(`[${log.stream}] ${log.text}`);
});
```

## Rate Limiting

- **Default limit**: 1000 requests per minute per user
- **WebSocket**: Unlimited message rate
- **Execution**: 10 concurrent executions per user

## Pagination

List endpoints support pagination:

```bash
curl "http://localhost:8000/api/v1/ops/scripts?skip=0&limit=20"
```

## Filtering & Searching

### Search by Name

```bash
curl "http://localhost:8000/api/v1/ops/scripts?search=scanner"
```

### Sort Order

```bash
curl "http://localhost:8000/api/v1/ops/scripts?sort=danger_level&order=desc"
```

## Documentation

- **Interactive Docs**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json
