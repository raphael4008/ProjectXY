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
    timeout_seconds: int = 300
):
    """
    Execute a script with real-time output streaming via WebSocket.
    
    Connection flow:
    1. Client connects to /ops/ws/execute/{script_id}
    2. Server streams output chunks as {\"type\": \"output\", \"data\": \"...\"}
    3. Server sends final result as {\"type\": \"result\", \"data\": ExecutionResult}
    """
    await websocket.accept()
    
    try:
        # Fetch the script
        library = ScriptLibrary(db)
        script = library.get_script(script_id)
        
        if not script:
            await websocket.send_json({
                "type": "error",
                "data": f"Script {script_id} not found"
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        if script.is_disabled or not script.is_approved:
            await websocket.send_json({
                "type": "error",
                "data": f"Script is disabled or not approved"
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Define output callback for streaming
        async def stream_output(chunk: str):
            await websocket.send_json({
                "type": "output",
                "data": chunk
            })
        
        # Execute
        config = ExecutionConfig(timeout_seconds=timeout_seconds)
        
        logger.info(f"📡 WebSocket execution: {script.name} (ID: {script_id})")
        
        if script.language == "python":
            result = await executor.execute_python(
                script_id=script_id,
                script_name=script.name,
                code=script.code,
                config=config,
                output_callback=stream_output
            )
        elif script.language == "bash":
            result = await executor.execute_bash(
                script_id=script_id,
                script_name=script.name,
                code=script.code,
                config=config,
                output_callback=stream_output
            )
        else:
            await websocket.send_json({
                "type": "error",
                "data": f"Unsupported language: {script.language}"
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


# ─── System Commands ──────────────────────────────────────────────────────────

@router.post("/lockdown", status_code=status.HTTP_204_NO_CONTENT)
async def system_lockdown():
    """
    GLOBAL KILL SWITCH: Emergency lockdown.
    
    - Kills all running containers
    - Revokes all JWT tokens
    - Freezes the system
    """
    logger.critical("🚨 SYSTEM LOCKDOWN TRIGGERED")
    
    # Kill all containers
    await executor.system_lockdown()
    
    # TODO: Revoke all JWT tokens in Redis
    # TODO: Set SYSTEM_LOCKDOWN flag in Redis
    # TODO: Log incident to audit table


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
