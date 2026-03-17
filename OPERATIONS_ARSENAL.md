# 🎯 Operations Arsenal: Script Library & Execution Engine

**Phase 1 of the "Sovereign Command Center"**

Welcome to the **Operations Arsenal** — the weaponry backbone of ProjectXY. This module provides a **Repository Pattern** for managing Red Team and Blue Team scripts, with a **Docker-in-Docker Execution Engine** for safe, isolated script execution.

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│               Frontend (MissionShell.tsx)               │
│           (WebSocket Streaming & Script Editor)         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            FastAPI Operations Router (/ops)             │
│         (CRUD Scripts + Execute + Streaming)            │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌────────────────┐      ┌──────────────────┐
│ ScriptLibrary  │      │ Executor Engine  │
│ (PostgreSQL)   │      │ (Docker-in-Docker)
└────────────────┘      └──────────────────┘
```

### Key Components

1. **ScriptLibrary** (`backend/app/services/ops/library.py`)
   - Repository pattern for script CRUD operations
   - Metadata-driven script management (Team, Category, Danger Level)
   - Approval workflow integration
   - Immutable audit trail in PostgreSQL

2. **Executor** (`backend/app/core/executor.py`)
   - Docker-in-Docker execution engine
   - Resource isolation (Memory, CPU, Network limits)
   - Real-time output streaming via WebSockets
   - Automatic container cleanup
   - Global killswitch capability

3. **API Endpoints** (`backend/app/api/v1/ops/routes.py`)
   - RESTful CRUD operations on scripts
   - Async execution with result tracking
   - WebSocket streaming for real-time output
   - Approval/revocation workflows

---

## 📚 Script Metadata Structure

Every script in the library must include a **JSON metadata header** defining:

```json
{
  "team": "red" | "blue",
  "category": "recon" | "exploit" | "patch" | "isolation" | "forensics" | "hardening",
  "danger_level": 1-10,
  "description": "Human-readable purpose",
  "tags": ["tag1", "tag2"],
  "author": "Team Name",
  "requires_approval": true | false,
  "timeout_seconds": 300
}
```

### Team Definitions

- **RED** 🔴 (Offensive): Attack simulations, penetration testing, adversary emulation
- **BLUE** 🔵 (Defensive): Containment, hardening, incident response, forensics

### Categories

- **recon**: Information gathering, network enumeration
- **exploit**: Active attacks, vulnerability testing
- **patch**: Security updates, remediation
- **isolation**: Containment, network segmentation
- **forensics**: Post-incident analysis, log review
- **hardening**: System strengthening, baseline configuration

### Danger Level

```
1-2:  Safe, read-only operations (info gathering)
3-5:  Medium risk, system changes (patching, firewall rules)
6-8:  High risk, potentially destructive (data deletion, network disruption)
9-10: Critical, system-breaking (kernel changes, full wipes)
```

---

## 🚀 Getting Started

### 1. View the Script Library

```bash
curl -X GET http://localhost:8000/ops/scripts
```

Response:
```json
[
  {
    "id": "script-red-1",
    "name": "Port Scan - Nmap Deep Recon",
    "language": "bash",
    "metadata": {
      "team": "red",
      "category": "recon",
      "danger_level": 2,
      "description": "Performs deep network reconnaissance..."
    },
    "is_approved": false,
    "is_disabled": false,
    "created_at": "2026-03-17T10:30:00Z"
  }
]
```

### 2. Execute a Script (Synchronously)

```bash
curl -X POST http://localhost:8000/ops/execute/script-blue-1 \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "execution_id": "exec-abc123",
  "script_id": "script-blue-1",
  "script_name": "Firewall Rule Deployment - Quick Patch",
  "status": "completed",
  "exit_code": 0,
  "stdout": "[*] Emergency Firewall Deployment\n[*] Deploying critical firewall rules...",
  "stderr": "",
  "started_at": "2026-03-17T10:35:00Z",
  "completed_at": "2026-03-17T10:35:15Z",
  "duration_seconds": 15.2
}
```

### 3. Real-Time Streaming via WebSocket

```javascript
// Frontend JavaScript
const ws = new WebSocket('ws://localhost:8000/ops/ws/execute/script-red-1');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'output') {
    console.log('[LOG]', message.data);
  } else if (message.type === 'result') {
    console.log('[RESULT]', message.data);
  }
};
```

---

## 🛡 Safety & Isolation Features

### Docker Container Isolation

Every script execution spawns a **fresh, isolated Docker container** with:

- **Memory Limit**: 512 MB (configurable)
- **CPU Quota**: 1 CPU (configurable)
- **Network**: Disabled by default (can be enabled per-script)
- **User**: Runs as `nobody` (unprivileged user)
- **Timeout**: 300 seconds (configurable)

### Resource Cleanup

Containers are automatically destroyed immediately after execution:

```python
# Inside executor.py
container.remove(force=True)
```

This prevents **resource leakage** and ensures no lingering processes.

### Approval Workflow

Scripts are categorized by **risk level**:

- **Auto-Approved** (Low Risk): Blue Team scripts (danger_level <= 5)
- **Requires Manual Approval** (High Risk): Red Team scripts (danger_level > 5)

To approve a high-risk script:

```bash
curl -X POST http://localhost:8000/ops/scripts/script-red-1/approve
```

---

## 🎮 API Reference

### Script Management

#### List Scripts
```
GET /ops/scripts
  ?team=red|blue
  &category=recon|exploit|patch|isolation|forensics|hardening
  &max_danger=7
```

#### Create Script
```
POST /ops/scripts
Body: {
  "name": "Script Name",
  "language": "python|bash|powershell",
  "code": "#!/usr/bin/env python3\n...",
  "metadata": { ... },
  "created_by": "username"
}
```

#### Get Script
```
GET /ops/scripts/{script_id}
```

#### Update Script
```
PUT /ops/scripts/{script_id}
Body: {
  "code": "new code...",
  "metadata": { ... }
}
```

#### Delete Script
```
DELETE /ops/scripts/{script_id}
```

### Execution

#### Execute Synchronously
```
POST /ops/execute/{script_id}
  ?timeout_seconds=300
  &memory_mb=512
```

#### Execute with WebSocket Streaming
```
WebSocket /ops/ws/execute/{script_id}
```

#### Get Execution Result
```
GET /ops/executions/{execution_id}
```

#### Get Executor Statistics
```
GET /ops/executions
```

#### Cancel Execution
```
POST /ops/cancel/{execution_id}
```

### Approvals

#### Approve Script
```
POST /ops/scripts/{script_id}/approve
```

#### Revoke Approval
```
POST /ops/scripts/{script_id}/revoke
```

### Arsenal Views

#### Get Red Team Arsenal
```
GET /ops/red-arsenal
```

#### Get Blue Team Arsenal
```
GET /ops/blue-arsenal
```

### Emergency

#### System Lockdown (Global Kill Switch)
```
POST /ops/lockdown
```

---

## 📖 Usage Examples

### Example 1: Execute a Firewall Hardening Script

```python
import requests

# Execute the firewall deployment script
response = requests.post(
    "http://localhost:8000/ops/execute/script-blue-1",
    params={
        "timeout_seconds": 120,
        "memory_mb": 256
    }
)

result = response.json()

print(f"Status: {result['status']}")
print(f"Exit Code: {result['exit_code']}")
print(f"Output:\n{result['stdout']}")
print(f"Duration: {result['duration_seconds']} seconds")
```

### Example 2: Approve a Red Team Script

```python
import requests

# Approve the SQL injection testing script
response = requests.post(
    "http://localhost:8000/ops/scripts/script-red-2/approve"
)

script = response.json()
print(f"Script approved: {script['name']}")
print(f"Is Approved: {script['is_approved']}")
```

### Example 3: WebSocket Real-Time Streaming (JavaScript)

```javascript
async function executeScriptWithStreaming(scriptId) {
  const ws = new WebSocket(`ws://localhost:8000/ops/ws/execute/${scriptId}`);
  
  const logs = [];
  let result = null;
  
  ws.onopen = () => {
    console.log('✅ Connected to execution stream');
  };
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    if (message.type === 'output') {
      logs.push(message.data);
      console.log(message.data);
    } else if (message.type === 'result') {
      result = message.data;
      console.log('✅ Execution complete:', result);
      // Save result to database or display in UI
    } else if (message.type === 'error') {
      console.error('❌ Error:', message.data);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return new Promise((resolve) => {
    ws.onclose = () => {
      resolve({ logs, result });
    };
  });
}

// Usage
const { logs, result } = await executeScriptWithStreaming('script-blue-1');
```

---

## 🔒 Security Considerations

### DO's ✅

- ✅ Always tag scripts with danger level
- ✅ Require approval for high-risk scripts
- ✅ Enable network isolation for untrusted scripts
- ✅ Monitor execution logs for anomalies
- ✅ Use WebSocket streaming for real-time visibility
- ✅ Set reasonable timeouts to prevent hung processes

### DON'Ts ❌

- ❌ Don't disable approval for dangerous scripts
- ❌ Don't enable network access for untested scripts
- ❌ Don't increase memory limits unnecessarily
- ❌ Don't disable container cleanup
- ❌ Don't run production scripts in the test environment

---

## 📊 Execution Statistics

Monitor executor health:

```bash
curl -X GET http://localhost:8000/ops/executions
```

Response:
```json
{
  "total_executions": 42,
  "running": 2,
  "completed": 38,
  "failed": 2,
  "timeouts": 0,
  "average_duration_seconds": 23.5
}
```

---

## 🚨 Global Kill Switch

If an experiment goes wrong or a real attack is detected, activate the **Emergency Lockdown**:

```bash
curl -X POST http://localhost:8000/ops/lockdown
```

This will:
1. Kill all running Docker containers
2. Revoke all JWT tokens
3. Freeze the system
4. Log the incident immutably

---

## 🔮 Next Steps: Phase 2

When you're ready to build the **Magnificent Tabbed Shell** (Phase 2), we'll:

1. Create `frontend/src/components/terminal/MissionShell.tsx`
2. Implement WebSocket integration for real-time streaming
3. Add **Monaco Editor** for inline script editing
4. Create **Forensic Playback** tab for command history
5. Implement "State-Aware" terminal with auto-targeting

---

## 📞 Questions?

Refer to the API documentation at **http://localhost:8000/docs** or check the source code comments for detailed implementation notes.

**Build with the mind of an architect, code with the hands of a craftsman.** 🚀
