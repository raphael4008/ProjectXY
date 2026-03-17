-- Cyber Intelligence Platform Schema

-- 1. Identity & Access Management (IAM)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'starter',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50),
    current_period_end TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) DEFAULT 'analyst', -- 'analyst', 'admin', 'auditor'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Audit Logs (Immutable)
-- Partitioned by month for performance & archiving
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'SEARCH', 'VIEW', 'EXPORT'
    resource_type VARCHAR(50),   -- 'ENTITY', 'REPORT'
    resource_id UUID,
    metadata JSONB DEFAULT '{}', -- Stores query params or IP address
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    hash VARCHAR(64), -- Tamper-evident hash
    previous_hash VARCHAR(255),
    signature VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);

-- 3. Intelligence Entities
-- Normalized attributes to support EAV (Entity-Attribute-Value) flexibility
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    canonical_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'person', 'organization', 'domain'
    risk_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_name ON entities USING GIN (to_tsvector('english', canonical_name));

CREATE TABLE IF NOT EXISTS attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'imsi'
    value TEXT NOT NULL,       -- Encrypted at application layer if PII
    value_hash VARCHAR(64),    -- SHA-256 for deterministic lookup
    source VARCHAR(100),
    confidence FLOAT DEFAULT 0.0,
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attr_hash ON attributes(value_hash);
CREATE INDEX IF NOT EXISTS idx_attr_entity ON attributes(entity_id);

-- 4. Investigation Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    summary TEXT, -- AI Generated summary
    content JSONB, -- Full report structure
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Device Tracking & Geofencing
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    type VARCHAR(50),
    latitude FLOAT,
    longitude FLOAT,
    accuracy_radius FLOAT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    active_trace BOOLEAN DEFAULT FALSE,
    owner_id UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_device_name ON devices(name);

CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    center_latitude FLOAT NOT NULL,
    center_longitude FLOAT NOT NULL,
    radius_meters FLOAT DEFAULT 1000.0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
