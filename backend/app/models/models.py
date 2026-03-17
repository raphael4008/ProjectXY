from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, index=True, unique=True)
    domain = Column(String, unique=True, index=True)
    subscription_tier = Column(String, default="starter") # starter, professional, enterprise
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Add back_populates after defining User
    users = relationship("User", back_populates="tenant")

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), index=True, nullable=True) # Added for multi-tenancy
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="analyst")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="users")

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), unique=True)
    stripe_customer_id = Column(String, index=True)
    stripe_subscription_id = Column(String, index=True)
    status = Column(String) # active, past_due, canceled
    current_period_end = Column(DateTime(timezone=True))

class EntityDB(Base):
    __tablename__ = "entities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), index=True, nullable=True) # Added for multi-tenancy
    canonical_name = Column(String, index=True)
    type = Column(String, index=True)  # Added index
    risk_score = Column(Integer, default=0, index=True)  # Added index
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    attributes = relationship("AttributeDB", back_populates="entity")

class AttributeDB(Base):
    __tablename__ = "attributes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id"), index=True) # Added index
    type = Column(String, index=True) # Added index
    value = Column(Text) # App-layer encryption recommended
    value_hash = Column(String, index=True)
    source = Column(String, index=True) # Added index
    confidence = Column(Float)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    entity = relationship("EntityDB", back_populates="attributes")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    action = Column(String, index=True) # Added index
    resource_type = Column(String)
    resource_id = Column(UUID(as_uuid=True), index=True) # Added index
    metadata_ = Column("metadata", JSONB)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True) # Added index
    
    # WORM / Immutable Ledger Fields
    hash = Column(String, index=True) # SHA-256(prev_hash + actor + action + timestamp)
    previous_hash = Column(String, index=True)
    signature = Column(String) # Digital signature (e.g., Ed25519) for non-repudiation

class Device(Base):
    __tablename__ = "devices"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, index=True)
    type = Column(String, index=True) # Added index
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    accuracy_radius = Column(Float, nullable=True)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), index=True) # Added index
    active_trace = Column(Boolean, default=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # Optional owner linking
    
    # Relationship to Geofences
    geofences = relationship("Geofence", back_populates="device")


class Geofence(Base):
    __tablename__ = "geofences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"))
    center_latitude = Column(Float, nullable=False)
    center_longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, default=1000.0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    device = relationship("Device", back_populates="geofences")

class IntelligenceReport(Base):
    __tablename__ = "intelligence_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target = Column(String, index=True)
    source = Column(String, index=True)
    data = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


