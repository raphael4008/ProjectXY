from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="analyst")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EntityDB(Base):
    __tablename__ = "entities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canonical_name = Column(String, index=True)
    type = Column(String)
    risk_score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    attributes = relationship("AttributeDB", back_populates="entity")

class AttributeDB(Base):
    __tablename__ = "attributes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id"))
    type = Column(String)
    value = Column(Text) # App-layer encryption recommended
    value_hash = Column(String, index=True)
    source = Column(String)
    confidence = Column(Float)
    last_seen = Column(DateTime(timezone=True))
    
    entity = relationship("EntityDB", back_populates="attributes")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(String)
    resource_type = Column(String)
    resource_id = Column(UUID(as_uuid=True))
    metadata_ = Column("metadata", JSONB)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
