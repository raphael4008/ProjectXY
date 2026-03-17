from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID

from app.api import deps
from app.models.models import Device
from app.schemas import device as device_schema

router = APIRouter()

@router.get("/", response_model=List[device_schema.Device])
def read_devices(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve devices.
    """
    devices = db.query(Device).offset(skip).limit(limit).all()
    return devices

@router.post("/", response_model=device_schema.Device)
def create_device(
    *,
    db: Session = Depends(deps.get_db),
    device_in: device_schema.DeviceCreate,
) -> Any:
    """
    Create new device.
    """
    device = Device(
        name=device_in.name,
        type=device_in.type,
        latitude=device_in.latitude,
        longitude=device_in.longitude,
        accuracy_radius=device_in.accuracy_radius,
        owner_id=device_in.owner_id,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device

@router.get("/{device_id}", response_model=device_schema.Device)
def read_device(
    *,
    db: Session = Depends(deps.get_db),
    device_id: UUID,
) -> Any:
    """
    Get device by ID.
    """
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.put("/{device_id}", response_model=device_schema.Device)
async def update_device(
    *,
    db: Session = Depends(deps.get_db),
    device_id: UUID,
    device_in: device_schema.DeviceUpdate,
) -> Any:
    """
    Update device metadata.
    """
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Update PG fields
    if device_in.name is not None:
        device.name = device_in.name
    if device_in.type is not None:
        device.type = device_in.type
    if device_in.active_trace is not None:
        device.active_trace = device_in.active_trace
        
        # Sync active_trace to Neo4j
        try:
            query = """
            MERGE (d:Device:Entity {id: $device_id})
            SET d.active_trace = $active_trace
            """
            await graph_db.execute_query(query, {
                "device_id": str(device_id),
                "active_trace": device_in.active_trace
            })
        except Exception as e:
            print(f"Graph update (trace) failed: {e}")

    db.commit()
    db.refresh(device)
    return device

from app.infrastructure.graph import graph_db

@router.post("/{device_id}/gps-update", response_model=device_schema.Device)
async def update_device_location(
    *,
    db: Session = Depends(deps.get_db),
    device_id: UUID,
    location_in: device_schema.DeviceLocationUpdate,
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Update device GPS location.
    """
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.latitude = location_in.latitude
    device.longitude = location_in.longitude
    device.accuracy_radius = location_in.accuracy_radius
    
    # Update Neo4j Graph
    try:
        query = """
        MERGE (d:Device:Entity {id: $device_id})
        SET d.latitude = $lat, d.longitude = $long
        MERGE (l:Location {lat: $lat, long: $long})
        MERGE (d)-[:LOCATED_AT]->(l)
        """
        await graph_db.execute_query(query, {
            "device_id": str(device_id),
            "lat": location_in.latitude,
            "long": location_in.longitude
        })
    except Exception as e:
        # Log error but don't fail the request (or handle as needed)
        print(f"Graph update failed: {e}")
    
    # Check Geofence (Spatial Agent) - Background Task
    from app.services.spatial import check_geofence
    background_tasks.add_task(check_geofence, db, device.id, location_in.latitude, location_in.longitude)
    
    db.commit()
    db.refresh(device)
    return device
