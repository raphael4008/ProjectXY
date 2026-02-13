-- Cyber Intelligence Platform Schema

-- 1. Identity & Access Management (IAM)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    hash VARCHAR(64) -- Tamper-evident hash of the previous row (Blockchain-lite)
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);

-- 3. Intelligence Entities
-- Normalized attributes to support EAV (Entity-Attribute-Value) flexibility
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
