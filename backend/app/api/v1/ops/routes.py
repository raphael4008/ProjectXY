"""
Operations API Endpoints - Script Management & Execution

Provides REST API for:
- GET /ops/scripts - List script library
- POST /ops/scripts - Upload new script
- GET /ops/scripts/{script_id} - Get script details
- PUT /ops/scripts/{script_id} - Update script
- DELETE /ops/scripts/{script_id} - Delete script
- POST /ops/execute/{script_id} - Execute a script
- GET /ops/executions/{execution_id} - Get execution result
- WebSocket /ops/ws/execute/{script_id} - Real-time execution streaming
"""

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from typing import List, Optional
import logging

from app.services.ops.library import (
    Script, ScriptCreateRequest, ScriptUpdateRequest, 
    ScriptLibrary, Team, Category
)
from app.services.ops.executor import Executor, ExecutionConfig, ExecutionResult
from app.api.deps import get_db

# Import new security and WebSocket modules
try:
    from app.core.socket import ws_manager
except ImportError:
    ws_manager = None

try:
    from app.core.security_state import security_manager
except ImportError:
    security_manager = None

try:
    from app.core.ledger import ledger
except ImportError:
    ledger = None

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ops",
    tags=["operations"]
)

# Global executor instance (TODO: Move to dependency injection)
executor = Executor()


# ─── Script Library Endpoints ──────────────────────────────────────────────────

@router.get("/scripts", response_model=List[Script])
async def list_scripts(
    db = Depends(get_db),
    team: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    max_danger: Optional[int] = Query(None)
):
    """
    List all scripts in the library with optional filtering.
    
    Query Parameters:
    - team: 'red' or 'blue'
    - category: 'recon', 'exploit', 'patch', 'isolation', 'forensics'
    - max_danger: Maximum danger level (1-10)
    """
    library = ScriptLibrary(db)
    
    team_enum = Team[team.upper()] if team else None
    category_enum = Category[category.upper()] if category else None
    
    scripts = library.list_scripts(
        team=team_enum,
        category=category_enum,
        max_danger=max_danger,
        include_disabled=False
    )
    
    logger.info(f"📚 Listed {len(scripts)} scripts")
    return scripts


@router.post("/scripts", response_model=Script, status_code=status.HTTP_201_CREATED)
async def create_script(
    request: ScriptCreateRequest,
    db = Depends(get_db)
):
    """Create a new script in the library."""
    library = ScriptLibrary(db)
    script = library.create_script(request)
    return script


@router.get("/scripts/{script_id}", response_model=Script)
async def get_script(
    script_id: str,
    db = Depends(get_db)
):
    """Get a specific script by ID."""
    library = ScriptLibrary(db)
    script = library.get_script(script_id)
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Script {script_id} not found"
        )
    
    return script


@router.put("/scripts/{script_id}", response_model=Script)
async def update_script(
    script_id: str,
    request: ScriptUpdateRequest,
    db = Depends(get_db)
):
    """Update a script."""
    library = ScriptLibrary(db)
    script = library.update_script(script_id, request)
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Script {script_id} not found"
        )
    
    return script


@router.delete("/scripts/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_script(
    script_id: str,
    db = Depends(get_db)
):
    """Delete (disable) a script."""
    library = ScriptLibrary(db)
    success = library.delete_script(script_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Script {script_id} not found"
        )


@router.post("/scripts/{script_id}/approve", response_model=Script)
async def approve_script(
    script_id: str,
    db = Depends(get_db)
):
    """Approve a script for execution."""
    library = ScriptLibrary(db)
    script = library.approve_script(script_id)
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Script {script_id} not found"
        )
    
    return script


@router.post("/scripts/{script_id}/revoke", response_model=Script)
async def revoke_script(
    script_id: str,
    db = Depends(get_db)
):
    """Revoke approval for a script."""
    library = ScriptLibrary(db)
    script = library.revoke_script(script_id)
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Script {script_id} not found"
        )
    
    return script


# ─── Execution Endpoints ───────────────────────────────────────────────────────

@router.post("/execute/{script_id}", response_model=ExecutionResult)
async def execute_script(
    script_id: str,
    db = Depends(get_db),
    timeout_seconds: int = Query(300, ge=10, le=3600),
    memory_mb: int = Query(512, ge=128, le=2048)
):
    """
    Execute a script immediately (synchronously).
    
    For real-time streaming, use the WebSocket endpoint instead.
    """
    # Fetch the script
    library = ScriptLibrary(db)
    script = library.get_script(script_id)
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Script {script_id} not found"
        )
    
    if script.is_disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Script {script.name} is disabled"
        )
    
    if not script.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Script {script.name} requires approval before execution"
        )
    
    # Execute
    config = ExecutionConfig(
        timeout_seconds=timeout_seconds,
        memory_mb=memory_mb
    )
    
    logger.info(f"🎯 Executing script: {script.name} (ID: {script_id})")
    
    if script.language == "python":
        result = await executor.execute_python(
            script_id=script_id,
            script_name=script.name,
            code=script.code,
            config=config
        )
    elif script.language == "bash":
        result = await executor.execute_bash(
            script_id=script_id,
            script_name=script.name,
            code=script.code,
            config=config
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language: {script.language}"
        )
    
    return result


@router.get("/executions/{execution_id}", response_model=ExecutionResult)
async def get_execution_result(execution_id: str):
    """Get the result of a completed execution."""
    result = executor.get_result(execution_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution {execution_id} not found"
        )
    
    return result


@router.get("/executions", response_model=dict)
async def get_executor_stats():
    """Get executor statistics."""
    return executor.get_statistics()


@router.post("/cancel/{execution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_execution(execution_id: str):
    """Cancel a running execution."""
    success = await executor.cancel_execution(execution_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution {execution_id} not found or already completed"
        )


# ─── WebSocket Streaming ──────────────────────────────────────────────────────

@router.websocket("/ws/execute/{script_id}")
async def websocket_execute_script(
    websocket: WebSocket,
    script_id: str,
    db = Depends(get_db),
    timeout_seconds: int = 300,
    user_id: Optional[str] = None
):
    """
    Execute a script with real-time output streaming via WebSocket.
    
    Connection flow:
    1. Client connects to /ops/ws/execute/{script_id}
    2. Server streams output chunks as {\"type\": \"log_chunk\", \"payload\": {...}}
    3. Server sends status updates and final result
    4. Client receives execution logs in real-time
    """
    await websocket.accept()
    
    execution_id = None
    
    try:
        # Register WebSocket connection
        if ws_manager:
            # Create a temporary execution_id for this session
            import uuid
            execution_id = str(uuid.uuid4())
            await ws_manager.connect(execution_id, websocket)
            logger.info(f"📡 WS client connected for execution {execution_id}")
        
        # Fetch the script
        library = ScriptLibrary(db)
        script = library.get_script(script_id)
        
        if not script:
            error_msg = f"Script {script_id} not found"
            await websocket.send_json({
                "type": "error",
                "data": error_msg
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        if script.is_disabled or not script.is_approved:
            error_msg = f"Script is disabled or not approved"
            await websocket.send_json({
                "type": "error",
                "data": error_msg
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Define output callback for WebSocket streaming
        async def stream_output(chunk: str, is_stderr: bool = False):
            if ws_manager:
                await ws_manager.send_log_chunk(
                    execution_id=execution_id,
                    chunk=chunk,
                    is_stderr=is_stderr
                )
        
        # Execute
        config = ExecutionConfig(timeout_seconds=timeout_seconds)
        
        logger.info(f"� WebSocket execution: {script.name} (ID: {script_id}, Execution: {execution_id})")
        
        if script.language == "python":
            result = await executor.execute_python(
                script_id=script_id,
                script_name=script.name,
                code=script.code,
                config=config,
                output_callback=stream_output,
                user_id=user_id,
                org_id=None  # TODO: Extract from token
            )
        elif script.language == "bash":
            result = await executor.execute_bash(
                script_id=script_id,
                script_name=script.name,
                code=script.code,
                config=config,
                output_callback=stream_output,
                user_id=user_id,
                org_id=None  # TODO: Extract from token
            )
        else:
            error_msg = f"Unsupported language: {script.language}"
            await websocket.send_json({
                "type": "error",
                "data": error_msg
            })
            await websocket.close(code=status.WS_1011_SERVER_ERROR)
            return
        
        # Send final result
        await websocket.send_json({
            "type": "result",
            "data": result.dict()
        })
        
        await websocket.close(code=status.WS_1000_NORMAL_CLOSURE)
    
    except WebSocketDisconnect:
        logger.info(f"💔 WebSocket disconnected for script {script_id}")
    
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "data": str(e)
            })
            await websocket.close(code=status.WS_1011_SERVER_ERROR)
        except:
            pass
    
    finally:
        # Cleanup WebSocket connection
        if execution_id and ws_manager:
            await ws_manager.disconnect(execution_id, websocket)


# ─── System Commands ──────────────────────────────────────────────────────────

@router.post("/lockdown", status_code=status.HTTP_204_NO_CONTENT)
async def system_lockdown(user_id: Optional[str] = None):
    """
    GLOBAL KILL SWITCH: Emergency lockdown.
    
    Triggers:
    - Kills all running containers
    - Revokes all JWT tokens
    - Freezes the system for safety
    - Logs security event to audit trail
    """
    logger.critical("🚨 SYSTEM LOCKDOWN TRIGGERED by user: " + (user_id or "unknown"))
    
    # Kill all containers
    await executor.system_lockdown()
    
    # Engage security lockdown
    if security_manager:
        await security_manager.set_lockdown(
            enabled=True,
            reason=f"EMERGENCY_LOCKDOWN triggered by {user_id or 'system'}"
        )
        await security_manager.revoke_all_tokens("LOCKDOWN")
    
    # Broadcast system alert
    if ws_manager:
        await ws_manager.send_system_alert(
            alert_type="LOCKDOWN",
            message_text="🚨 SYSTEM LOCKDOWN ACTIVATED - All operations halted"
        )
    
    # Log security event
    if ledger:
        await ledger.log_lockdown(
            enabled=True,
            reason=f"EMERGENCY_LOCKDOWN by {user_id or 'system'}",
            user_id=user_id,
            org_id=None
        )


@router.post("/lockdown/release", status_code=status.HTTP_204_NO_CONTENT)
async def release_lockdown(user_id: Optional[str] = None):
    """
    Release the system lockdown (administrative action).
    
    Only callable by authorized users. Restores normal operations.
    """
    logger.warning(f"🔓 SYSTEM LOCKDOWN RELEASED by user: {user_id or 'unknown'}")
    
    if security_manager:
        await security_manager.set_lockdown(
            enabled=False,
            reason=f"Lockdown released by {user_id or 'system'}"
        )
    
    if ws_manager:
        await ws_manager.send_system_alert(
            alert_type="LOCKDOWN_RELEASED",
            message_text="✅ System lockdown released - Operations resumed"
        )
    
    if ledger:
        await ledger.log_lockdown(
            enabled=False,
            reason=f"Lockdown released by {user_id or 'system'}",
            user_id=user_id,
            org_id=None
        )


@router.get("/red-arsenal", response_model=List[Script])
async def get_red_team_arsenal(db = Depends(get_db)):
    """Get all Red Team (offensive) approved scripts."""
    library = ScriptLibrary(db)
    return library.get_red_team_arsenal()


@router.get("/blue-arsenal", response_model=List[Script])
async def get_blue_team_arsenal(db = Depends(get_db)):
    """Get all Blue Team (defensive) approved scripts."""
    library = ScriptLibrary(db)
    return library.get_blue_team_arsenal()
