from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class DeviceBase(BaseModel):
    name: str = Field(..., description="Device name or hostname")
    type: str = Field(..., description="Device type (e.g., android, ios, workstation)")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_radius: Optional[float] = None

class DeviceCreate(DeviceBase):
    owner_id: Optional[UUID] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_radius: Optional[float] = None
    active_trace: Optional[bool] = None
    owner_id: Optional[UUID] = None

class Device(DeviceBase):
    id: UUID
    last_seen: datetime
    owner_id: Optional[UUID] = None

    class Config:
        from_attributes = True

class DeviceLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy_radius: Optional[float] = 10.0
