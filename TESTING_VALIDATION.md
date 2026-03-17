# 🧪 Operations Arsenal: Testing & Validation Guide

**Comprehensive testing strategies for Phase 1 (Backend Operations Engine)**

---

## 📋 Test Categories

### 1. Unit Tests - Library Operations
### 2. Integration Tests - Executor Engine  
### 3. API Tests - FastAPI Endpoints
### 4. Security Tests - Docker Isolation
### 5. Load Tests - Concurrent Executions

---

## 🔧 Unit Tests: ScriptLibrary

File: `backend/tests/services/test_operations_library.py`

```python
"""Unit tests for ScriptLibrary service."""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.services.ops.library import (
    ScriptLibrary, Script, ScriptCreateRequest, ScriptMetadata,
    Team, Category, ScriptORM
)

# Setup: Use in-memory SQLite for tests
@pytest.fixture
def test_db():
    """Create a temporary test database."""
    engine = create_engine("sqlite:///:memory:")
    
    # Create tables
    ScriptORM.__table__.create(engine, checkfirst=True)
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    yield session
    
    session.close()
    engine.dispose()


@pytest.fixture
def library(test_db):
    """Create a ScriptLibrary instance for testing."""
    return ScriptLibrary(test_db)


# ─── Test: Create Script ──────────────────────────────────────────────────

def test_create_script_success(library):
    """Test successful script creation."""
    request = ScriptCreateRequest(
        name="Test Script",
        language="python",
        code="print('hello')",
        metadata=ScriptMetadata(
            team=Team.BLUE,
            category=Category.PATCH,
            danger_level=2,
            description="Test script"
        ),
        created_by="test_user"
    )
    
    script = library.create_script(request)
    
    assert script.id is not None
    assert script.name == "Test Script"
    assert script.language == "python"
    assert script.is_approved == True  # Auto-approved (safe)
    assert script.is_disabled == False


def test_create_red_team_script(library):
    """Test Red Team script requires approval."""
    request = ScriptCreateRequest(
        name="Red Team Recon",
        language="bash",
        code="nmap -p- 127.0.0.1",
        metadata=ScriptMetadata(
            team=Team.RED,
            category=Category.RECON,
            danger_level=5,
            description="Port scanning",
            requires_approval=True
        ),
        created_by="red_team"
    )
    
    script = library.create_script(request)
    
    assert script.metadata.team == Team.RED
    assert script.is_approved == False  # Requires approval


# ─── Test: List Scripts with Filtering ────────────────────────────────────

def test_list_all_scripts(library):
    """Test listing all scripts."""
    # Create 3 test scripts
    for i in range(3):
        library.create_script(ScriptCreateRequest(
            name=f"Script {i}",
            language="python",
            code="pass",
            metadata=ScriptMetadata(
                team=Team.BLUE if i % 2 == 0 else Team.RED,
                category=Category.PATCH,
                danger_level=2,
                description=f"Script {i}"
            )
        ))
    
    scripts = library.list_scripts()
    assert len(scripts) == 3


def test_filter_by_team(library):
    """Test filtering scripts by team."""
    library.create_script(ScriptCreateRequest(
        name="Blue Script",
        language="python",
        code="pass",
        metadata=ScriptMetadata(
            team=Team.BLUE,
            category=Category.PATCH,
            danger_level=1,
            description="Blue team"
        )
    ))
    
    library.create_script(ScriptCreateRequest(
        name="Red Script",
        language="python",
        code="pass",
        metadata=ScriptMetadata(
            team=Team.RED,
            category=Category.RECON,
            danger_level=3,
            description="Red team",
            requires_approval=True
        )
    ))
    
    blue_scripts = library.list_scripts(team=Team.BLUE)
    red_scripts = library.list_scripts(team=Team.RED)
    
    assert len(blue_scripts) == 1
    assert len(red_scripts) == 1


def test_filter_by_danger_level(library):
    """Test filtering by danger level."""
    library.create_script(ScriptCreateRequest(
        name="Safe Script",
        language="python",
        code="pass",
        metadata=ScriptMetadata(
            team=Team.BLUE,
            category=Category.PATCH,
            danger_level=1,
            description="Safe"
        )
    ))
    
    library.create_script(ScriptCreateRequest(
        name="Dangerous Script",
        language="python",
        code="pass",
        metadata=ScriptMetadata(
            team=Team.RED,
            category=Category.EXPLOIT,
            danger_level=8,
            description="Dangerous",
            requires_approval=True
        )
    ))
    
    safe_scripts = library.list_scripts(max_danger=3)
    assert len(safe_scripts) == 1


# ─── Test: Approval Workflow ──────────────────────────────────────────────

def test_approve_script(library):
    """Test approving a script."""
    script = library.create_script(ScriptCreateRequest(
        name="Test Script",
        language="python",
        code="pass",
        metadata=ScriptMetadata(
            team=Team.RED,
            category=Category.RECON,
            danger_level=5,
            description="Needs approval",
            requires_approval=True
        )
    ))
    
    assert script.is_approved == False
    
    approved = library.approve_script(script.id)
    
    assert approved.is_approved == True


def test_revoke_approval(library):
    """Test revoking script approval."""
    script = library.create_script(ScriptCreateRequest(
        name="Test Script",
        language="python",
        code="pass",
        metadata=ScriptMetadata(
            team=Team.BLUE,
            category=Category.PATCH,
            danger_level=1,
            description="Safe script"
        )
    ))
    
    assert script.is_approved == True
    
    revoked = library.revoke_script(script.id)
    
    assert revoked.is_approved == False


# ─── Test: Update Script ──────────────────────────────────────────────────

def test_update_script_code(library):
    """Test updating script code."""
    script = library.create_script(ScriptCreateRequest(
        name="Original",
        language="python",
        code="print('original')",
        metadata=ScriptMetadata(
            team=Team.BLUE,
            category=Category.PATCH,
            danger_level=1,
            description="Test"
        )
    ))
    
    original_version = script.version
    
    from app.services.ops.library import ScriptUpdateRequest
    updated = library.update_script(script.id, ScriptUpdateRequest(
        code="print('updated')"
    ))
    
    assert updated.code == "print('updated')"
    assert updated.version > original_version


# ─── Test: Delete Script (Soft Delete) ────────────────────────────────────

def test_delete_script(library):
    """Test soft-deleting a script."""
    script = library.create_script(ScriptCreateRequest(
        name="Test Script",
        language="python",
        code="pass",
        metadata=ScriptMetadata(
            team=Team.BLUE,
            category=Category.PATCH,
            danger_level=1,
            description="Test"
        )
    ))
    
    assert script.is_disabled == False
    
    success = library.delete_script(script.id)
    
    assert success == True
    
    # Verify it's disabled but not deleted
    deleted = library.get_script(script.id)
    assert deleted is not None
    assert deleted.is_disabled == True


def test_get_nonexistent_script(library):
    """Test getting a script that doesn't exist."""
    script = library.get_script("nonexistent-id")
    assert script is None


# ─── Test: Arsenal Views ──────────────────────────────────────────────────

def test_get_red_team_arsenal(library):
    """Test getting Red Team arsenal."""
    library.create_script(ScriptCreateRequest(
        name="Red Script",
        language="python",
        code="pass",
        metadata=ScriptMetadata(
            team=Team.RED,
            category=Category.RECON,
            danger_level=2,
            description="Red team"
        )
    ))
    
    arsenal = library.get_red_team_arsenal()
    assert len(arsenal) > 0


def test_get_blue_team_arsenal(library):
    """Test getting Blue Team arsenal."""
    library.create_script(ScriptCreateRequest(
        name="Blue Script",
        language="python",
        code="pass",
        metadata=ScriptMetadata(
            team=Team.BLUE,
            category=Category.PATCH,
            danger_level=1,
            description="Blue team"
        )
    ))
    
    arsenal = library.get_blue_team_arsenal()
    assert len(arsenal) > 0
```

---

## ⚙️ Integration Tests: Executor Engine

File: `backend/tests/core/test_executor.py`

```python
"""Integration tests for the Executor engine."""

import pytest
import asyncio
from app.core.executor import Executor, ExecutionConfig, ExecutionStatus

@pytest.fixture
def executor():
    """Create an Executor instance."""
    return Executor()


# ─── Test: Python Script Execution ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_execute_python_script_success(executor):
    """Test successful Python script execution."""
    code = """
import json
result = {"message": "hello", "status": "success"}
print(json.dumps(result))
"""
    
    result = await executor.execute_python(
        script_id="test-1",
        script_name="Test Python",
        code=code
    )
    
    assert result.status == ExecutionStatus.COMPLETED
    assert result.exit_code == 0
    assert "hello" in result.stdout


@pytest.mark.asyncio
async def test_execute_python_script_error(executor):
    """Test Python script with error."""
    code = "raise ValueError('Test error')"
    
    result = await executor.execute_python(
        script_id="test-2",
        script_name="Test Error",
        code=code
    )
    
    assert result.status == ExecutionStatus.FAILED
    assert result.exit_code != 0


@pytest.mark.asyncio
async def test_execute_bash_script(executor):
    """Test Bash script execution."""
    code = "echo 'hello world' && exit 0"
    
    result = await executor.execute_bash(
        script_id="test-3",
        script_name="Test Bash",
        code=code
    )
    
    assert result.status == ExecutionStatus.COMPLETED
    assert result.exit_code == 0


# ─── Test: Execution Timeout ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_execution_timeout(executor):
    """Test script timeout."""
    code = """
import time
time.sleep(5)  # Sleep for 5 seconds
"""
    
    config = ExecutionConfig(timeout_seconds=1)  # 1 second timeout
    
    result = await executor.execute_python(
        script_id="test-4",
        script_name="Test Timeout",
        code=code,
        config=config
    )
    
    assert result.status == ExecutionStatus.TIMEOUT


# ─── Test: Resource Limits ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_memory_limit(executor):
    """Test memory limit enforcement."""
    code = """
# Try to allocate more memory than limit
data = bytearray(256 * 1024 * 1024)  # 256 MB
"""
    
    config = ExecutionConfig(memory_mb=64)  # 64 MB limit
    
    result = await executor.execute_python(
        script_id="test-5",
        script_name="Test Memory",
        code=code,
        config=config
    )
    
    # Should fail due to memory limit
    assert result.status == ExecutionStatus.FAILED


# ─── Test: Output Callback Streaming ───────────────────────────────────────

@pytest.mark.asyncio
async def test_output_callback(executor):
    """Test output callback for streaming."""
    code = """
for i in range(5):
    print(f"Line {i}")
"""
    
    outputs = []
    
    async def capture_output(chunk: str):
        outputs.append(chunk)
    
    result = await executor.execute_python(
        script_id="test-6",
        script_name="Test Streaming",
        code=code,
        output_callback=capture_output
    )
    
    assert result.status == ExecutionStatus.COMPLETED
    assert len(outputs) > 0


# ─── Test: Concurrent Executions ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_concurrent_executions(executor):
    """Test running multiple scripts concurrently."""
    
    async def run_script(script_id: int):
        code = f"print('Script {script_id}')"
        return await executor.execute_python(
            script_id=f"test-{script_id}",
            script_name=f"Script {script_id}",
            code=code
        )
    
    # Run 3 scripts concurrently
    results = await asyncio.gather(
        run_script(1),
        run_script(2),
        run_script(3)
    )
    
    assert len(results) == 3
    assert all(r.status == ExecutionStatus.COMPLETED for r in results)


# ─── Test: Container Cleanup ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_container_cleanup(executor):
    """Test that containers are properly cleaned up."""
    
    result = await executor.execute_bash(
        script_id="test-7",
        script_name="Cleanup Test",
        code="echo 'hello'"
    )
    
    # Check that no containers remain
    running = executor.list_running_executions()
    assert len(running) == 0


# ─── Test: System Lockdown ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_system_lockdown(executor):
    """Test emergency lockdown."""
    
    # Start a long-running script
    asyncio.create_task(executor.execute_bash(
        script_id="test-8",
        script_name="Long Running",
        code="sleep 30"
    ))
    
    await asyncio.sleep(0.5)  # Let it start
    
    # Trigger lockdown
    await executor.system_lockdown()
    
    # All containers should be killed
    running = executor.list_running_executions()
    assert len(running) == 0
```

---

## 🌐 API Integration Tests

File: `backend/tests/api/test_operations_api.py`

```python
"""API endpoint tests for Operations."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def auth_headers():
    """Get authentication headers."""
    # TODO: Implement proper auth fixture
    return {"Authorization": "Bearer test-token"}


# ─── Test: Script CRUD ────────────────────────────────────────────────────

def test_create_script_endpoint(auth_headers):
    """Test POST /ops/scripts"""
    response = client.post(
        "/ops/scripts",
        json={
            "name": "Test Script",
            "language": "python",
            "code": "print('test')",
            "metadata": {
                "team": "blue",
                "category": "patch",
                "danger_level": 2,
                "description": "Test",
                "tags": []
            },
            "created_by": "test_user"
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Script"
    assert data["is_approved"] == True


def test_list_scripts_endpoint(auth_headers):
    """Test GET /ops/scripts"""
    response = client.get("/ops/scripts", headers=auth_headers)
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_script_endpoint(auth_headers):
    """Test GET /ops/scripts/{script_id}"""
    # First, create a script
    create_response = client.post(
        "/ops/scripts",
        json={
            "name": "Test",
            "language": "python",
            "code": "pass",
            "metadata": {
                "team": "blue",
                "category": "patch",
                "danger_level": 1,
                "description": "Test"
            }
        },
        headers=auth_headers
    )
    
    script_id = create_response.json()["id"]
    
    # Now fetch it
    response = client.get(f"/ops/scripts/{script_id}", headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["id"] == script_id


def test_get_nonexistent_script(auth_headers):
    """Test GET /ops/scripts/{script_id} with invalid ID"""
    response = client.get("/ops/scripts/nonexistent", headers=auth_headers)
    assert response.status_code == 404


# ─── Test: Approval Workflow ──────────────────────────────────────────────

def test_approve_script_endpoint(auth_headers):
    """Test POST /ops/scripts/{script_id}/approve"""
    # Create a Red Team script
    create_response = client.post(
        "/ops/scripts",
        json={
            "name": "Red Script",
            "language": "bash",
            "code": "nmap -p- 127.0.0.1",
            "metadata": {
                "team": "red",
                "category": "recon",
                "danger_level": 5,
                "description": "Test",
                "requires_approval": True
            }
        },
        headers=auth_headers
    )
    
    script_id = create_response.json()["id"]
    
    # Approve it
    response = client.post(f"/ops/scripts/{script_id}/approve", headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["is_approved"] == True


# ─── Test: Execution ──────────────────────────────────────────────────────

def test_execute_script_endpoint(auth_headers):
    """Test POST /ops/execute/{script_id}"""
    # Create and approve a simple script
    create_response = client.post(
        "/ops/scripts",
        json={
            "name": "Simple Script",
            "language": "python",
            "code": "print('hello')",
            "metadata": {
                "team": "blue",
                "category": "patch",
                "danger_level": 1,
                "description": "Test"
            }
        },
        headers=auth_headers
    )
    
    script_id = create_response.json()["id"]
    
    # Execute it
    response = client.post(
        f"/ops/execute/{script_id}",
        params={"timeout_seconds": 30, "memory_mb": 512},
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["exit_code"] == 0


def test_execute_unapproved_script(auth_headers):
    """Test executing an unapproved script fails"""
    create_response = client.post(
        "/ops/scripts",
        json={
            "name": "Red Script",
            "language": "bash",
            "code": "echo test",
            "metadata": {
                "team": "red",
                "category": "recon",
                "danger_level": 5,
                "description": "Test",
                "requires_approval": True
            }
        },
        headers=auth_headers
    )
    
    script_id = create_response.json()["id"]
    
    # Try to execute without approval
    response = client.post(
        f"/ops/execute/{script_id}",
        headers=auth_headers
    )
    
    assert response.status_code == 403


# ─── Test: Arsenal Views ──────────────────────────────────────────────────

def test_red_arsenal_endpoint(auth_headers):
    """Test GET /ops/red-arsenal"""
    response = client.get("/ops/red-arsenal", headers=auth_headers)
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_blue_arsenal_endpoint(auth_headers):
    """Test GET /ops/blue-arsenal"""
    response = client.get("/ops/blue-arsenal", headers=auth_headers)
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

---

## 🚀 Running Tests

```bash
# Run all tests
pytest backend/tests/ -v

# Run specific test file
pytest backend/tests/services/test_operations_library.py -v

# Run with coverage
pytest backend/tests/ --cov=app --cov-report=html

# Run async tests
pytest backend/tests/core/test_executor.py -v -s

# Run only fast tests (skip integration/load tests)
pytest backend/tests/ -v -m "not slow"
```

---

## ✅ Validation Checklist

### Backend (Phase 1)

- [ ] All library CRUD operations work
- [ ] Approval workflow functions correctly
- [ ] Docker containers are created and destroyed properly
- [ ] Output streaming captures correct data
- [ ] Timeouts are enforced
- [ ] Resource limits (memory/CPU) are applied
- [ ] Concurrent executions don't interfere
- [ ] Lockdown kills all containers
- [ ] API endpoints return correct status codes
- [ ] Error handling is comprehensive
- [ ] Database schema is created by migrations

### Performance

- [ ] Script execution latency < 500ms (for simple scripts)
- [ ] Output streaming has < 100ms latency
- [ ] Can handle 10 concurrent executions
- [ ] Memory usage stays below expected limits
- [ ] No resource leaks after execution

### Security

- [ ] Network isolation prevents external connections
- [ ] Resource limits prevent DoS
- [ ] Approval workflow blocks dangerous scripts
- [ ] Audit logging captures all operations
- [ ] Container cleanup prevents privilege escalation

---

## 📊 Test Coverage Goals

- **Library Service**: 95%+ coverage
- **Executor Engine**: 85%+ coverage  
- **API Routes**: 80%+ coverage

---

## 🐛 Common Issues & Fixes

### Issue: Docker connection fails
```bash
# Solution: Check Docker socket permissions
sudo chmod 666 /var/run/docker.sock
```

### Issue: Tests timeout
```bash
# Solution: Increase pytest timeout
pytest backend/tests/ --timeout=30
```

### Issue: Database migration fails
```bash
# Solution: Reset migrations
cd backend
alembic downgrade base
alembic upgrade head
```

---

**"Test early, test often, test with confidence."** 🧪✨

