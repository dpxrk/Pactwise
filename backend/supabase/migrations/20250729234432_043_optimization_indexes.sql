-- Migration: 043_optimization_indexes
-- Description: Adds advanced indexes for performance optimization.
-- Date: 2025-07-29

-- Partial Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_active ON contracts(enterprise_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_agent_tasks_pending ON agent_tasks(enterprise_id, status) WHERE status = 'pending';

-- Expression Indexes
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));

-- BRIN Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_brin ON audit_logs USING brin(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at_brin ON agent_logs USING brin(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at_brin ON security_events USING brin(created_at);

-- Materialized Views for Analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS contract_analytics_mv AS
SELECT
    c.enterprise_id,
    c.status,
    c.contract_type,
    v.category AS vendor_category,
    date_trunc('month', c.created_at) AS month,
    count(*) AS contract_count,
    sum(c.value) AS total_value,
    avg(c.value) AS avg_value
FROM
    contracts c
LEFT JOIN
    vendors v ON c.vendor_id = v.id
GROUP BY
    c.enterprise_id,
    c.status,
    c.contract_type,
    v.category,
    date_trunc('month', c.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_analytics_mv ON contract_analytics_mv(enterprise_id, status, contract_type, vendor_category, month);

-- Table Partitioning (Example for audit_logs)
-- Note: This is a conceptual example. A full implementation would require a more detailed analysis of the data and a more robust partitioning strategy.

-- Create a partitioned table
CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE IF NOT EXISTS audit_logs_y2025m07 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE IF NOT EXISTS audit_logs_y2025m08 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- This is a conceptual example. A full implementation would require a more detailed analysis of the data and a more robust partitioning strategy.
-- For now, we will not be implementing partitioning, but this is a good example of how it could be done.
