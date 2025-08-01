-- System and Analytics Tables

-- Audit Logs
CREATE TABLE audit_logs (
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
);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000, -- requests per hour
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES users(id),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- API Key Usage
CREATE TABLE api_key_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size INTEGER,
    response_size INTEGER,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(255),
    events TEXT[] NOT NULL,
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    retry_policy JSONB DEFAULT '{"max_retries": 3, "retry_delay_seconds": 60}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Deliveries
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    attempt_count INTEGER DEFAULT 1,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate Limits
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- user_id, api_key_id, ip_address
    identifier_type VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255),
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_duration_seconds INTEGER NOT NULL,
    request_count INTEGER DEFAULT 1,
    limit_exceeded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, identifier_type, endpoint, window_start)
);

-- Analytics Cache
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) NOT NULL,
    cache_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cache_key, enterprise_id)
);

-- Query Performance Metrics
CREATE TABLE query_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_name VARCHAR(255) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    rows_returned INTEGER,
    cache_hit BOOLEAN DEFAULT false,
    user_id UUID REFERENCES users(id),
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract Status History
CREATE TABLE contract_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    previous_status contract_status,
    new_status contract_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract Approvals
CREATE TABLE contract_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    approval_type approval_type NOT NULL,
    status approval_status DEFAULT 'pending',
    approver_id UUID NOT NULL REFERENCES users(id),
    comments TEXT,
    conditions JSONB DEFAULT '[]',
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Checks
CREATE TABLE compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id),
    vendor_id UUID REFERENCES vendors(id),
    check_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    passed BOOLEAN,
    issues JSONB DEFAULT '[]',
    severity VARCHAR(20),
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE,
    next_check_date DATE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File Storage Metadata
CREATE TABLE file_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_id TEXT NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    mime_type VARCHAR(100),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for system tables
CREATE INDEX idx_audit_logs_enterprise ON audit_logs(enterprise_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX idx_api_keys_enterprise ON api_keys(enterprise_id) WHERE is_active = true;
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix) WHERE is_active = true;

CREATE INDEX idx_api_key_usage_key ON api_key_usage(api_key_id, created_at DESC);

CREATE INDEX idx_webhooks_enterprise ON webhooks(enterprise_id) WHERE is_active = true;
CREATE INDEX idx_webhooks_events ON webhooks USING gin(events);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE response_status IS NULL OR response_status >= 400;

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, identifier_type, window_start DESC);

CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key, enterprise_id);;

CREATE INDEX idx_query_metrics_name ON query_metrics(query_name, created_at DESC);

CREATE INDEX idx_contract_status_history_contract ON contract_status_history(contract_id, created_at DESC);

CREATE INDEX idx_contract_approvals_contract ON contract_approvals(contract_id);
CREATE INDEX idx_contract_approvals_pending ON contract_approvals(approver_id) WHERE status = 'pending';

CREATE INDEX idx_compliance_checks_next ON compliance_checks(next_check_date, enterprise_id) WHERE next_check_date IS NOT NULL;

CREATE INDEX idx_file_metadata_entity ON file_metadata(entity_type, entity_id) WHERE deleted_at IS NULL;

-- Add triggers
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_approvals_updated_at BEFORE UPDATE ON contract_approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID,
    p_old_values JSONB,
    p_new_values JSONB,
    p_enterprise_id UUID
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id,
        old_values, new_values, enterprise_id
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, p_enterprise_id
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;