-- Enhanced Rate Limiting System
-- Supports multiple strategies and comprehensive monitoring

-- Rate limiting rules configuration
CREATE TABLE rate_limit_rules (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    strategy VARCHAR(50) NOT NULL CHECK (strategy IN ('fixed_window', 'sliding_window', 'token_bucket')),
    max_requests INTEGER NOT NULL CHECK (max_requests > 0),
    window_seconds INTEGER NOT NULL CHECK (window_seconds > 0),
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('global', 'user', 'ip', 'endpoint', 'enterprise')),
    endpoint VARCHAR(255),
    user_tier VARCHAR(50) CHECK (user_tier IN ('free', 'premium', 'enterprise')),
    burst_multiplier DECIMAL(3,2) DEFAULT 1.0,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Rate limit counters (for fixed window strategy)
-- Skip if table already exists from migration 005
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(100) NOT NULL REFERENCES rate_limit_rules(id) ON DELETE CASCADE,
    fingerprint VARCHAR(255) NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(rule_id, fingerprint, window_start)
);

-- Individual requests (for sliding window strategy)
CREATE TABLE rate_limit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(100) NOT NULL REFERENCES rate_limit_rules(id) ON DELETE CASCADE,
    fingerprint VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limit violations (security monitoring)
CREATE TABLE rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(100) NOT NULL REFERENCES rate_limit_rules(id) ON DELETE CASCADE,
    fingerprint VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    violation_count INTEGER NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE
);

-- Rate limiting metrics (for monitoring and analytics)
CREATE TABLE rate_limit_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(100) NOT NULL REFERENCES rate_limit_rules(id) ON DELETE CASCADE,
    hour_bucket VARCHAR(20) NOT NULL, -- YYYY-MM-DDTHH format
    total_requests INTEGER NOT NULL DEFAULT 0,
    blocked_requests INTEGER NOT NULL DEFAULT 0,
    unique_clients INTEGER NOT NULL DEFAULT 0,
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(rule_id, hour_bucket)
);

-- Indexes for performance
-- Only create indexes if the enhanced rate_limits table exists with new columns
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rate_limits' AND column_name = 'rule_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(rule_id, fingerprint, window_start);
        CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(window_start);
        CREATE INDEX IF NOT EXISTS idx_rate_limits_enterprise ON rate_limits(enterprise_id);
    END IF;
END $$;

CREATE INDEX idx_rate_limit_requests_lookup ON rate_limit_requests(rule_id, fingerprint, created_at);
CREATE INDEX idx_rate_limit_requests_cleanup ON rate_limit_requests(created_at);
CREATE INDEX idx_rate_limit_requests_enterprise ON rate_limit_requests(enterprise_id);

CREATE INDEX idx_rate_limit_violations_analysis ON rate_limit_violations(rule_id, fingerprint, blocked_at);
CREATE INDEX idx_rate_limit_violations_cleanup ON rate_limit_violations(blocked_at);
CREATE INDEX idx_rate_limit_violations_ip ON rate_limit_violations(ip_address, blocked_at);
CREATE INDEX idx_rate_limit_violations_enterprise ON rate_limit_violations(enterprise_id);

CREATE INDEX idx_rate_limit_metrics_lookup ON rate_limit_metrics(rule_id, hour_bucket);
CREATE INDEX idx_rate_limit_metrics_enterprise ON rate_limit_metrics(enterprise_id);

CREATE INDEX idx_rate_limit_rules_lookup ON rate_limit_rules(enabled, priority DESC) WHERE enabled = true;
CREATE INDEX idx_rate_limit_rules_enterprise ON rate_limit_rules(enterprise_id);

-- Functions for rate limiting

-- Function to get applicable rate limit rules for a request
CREATE OR REPLACE FUNCTION get_rate_limit_rules(
    p_endpoint VARCHAR DEFAULT NULL,
    p_user_tier VARCHAR DEFAULT NULL,
    p_enterprise_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id VARCHAR(100),
    name VARCHAR(255),
    strategy VARCHAR(50),
    max_requests INTEGER,
    window_seconds INTEGER,
    scope VARCHAR(50),
    endpoint VARCHAR(255),
    user_tier VARCHAR(50),
    burst_multiplier DECIMAL,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.strategy,
        r.max_requests,
        r.window_seconds,
        r.scope,
        r.endpoint,
        r.user_tier,
        r.burst_multiplier,
        r.priority
    FROM rate_limit_rules r
    WHERE r.enabled = true
      AND (r.enterprise_id IS NULL OR r.enterprise_id = p_enterprise_id)
      AND (r.endpoint IS NULL OR r.endpoint = p_endpoint)
      AND (r.user_tier IS NULL OR r.user_tier = p_user_tier)
    ORDER BY r.priority DESC, r.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to clean up old rate limiting data
CREATE OR REPLACE FUNCTION cleanup_rate_limit_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up old rate limit counters (older than 24 hours)
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old request records (older than 24 hours)
    DELETE FROM rate_limit_requests 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old violations (older than 7 days)
    DELETE FROM rate_limit_violations 
    WHERE blocked_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old metrics (older than 30 days)
    DELETE FROM rate_limit_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get rate limiting analytics
CREATE OR REPLACE FUNCTION get_rate_limit_analytics(
    p_time_range VARCHAR DEFAULT '24h',
    p_enterprise_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    cutoff_time TIMESTAMP WITH TIME ZONE;
    analytics_result JSONB;
BEGIN
    -- Set cutoff time based on range
    CASE p_time_range
        WHEN '1h' THEN cutoff_time := NOW() - INTERVAL '1 hour';
        WHEN '24h' THEN cutoff_time := NOW() - INTERVAL '24 hours';
        WHEN '7d' THEN cutoff_time := NOW() - INTERVAL '7 days';
        ELSE cutoff_time := NOW() - INTERVAL '24 hours';
    END CASE;
    
    WITH request_stats AS (
        SELECT 
            COUNT(*) as total_requests,
            COUNT(DISTINCT fingerprint) as unique_clients,
            COUNT(DISTINCT endpoint) as unique_endpoints
        FROM rate_limit_requests
        WHERE created_at >= cutoff_time
        AND (p_enterprise_id IS NULL OR enterprise_id = p_enterprise_id)
    ),
    violation_stats AS (
        SELECT 
            COUNT(*) as total_violations,
            COUNT(DISTINCT fingerprint) as blocked_clients,
            COUNT(DISTINCT ip_address) as blocked_ips
        FROM rate_limit_violations
        WHERE blocked_at >= cutoff_time
        AND (p_enterprise_id IS NULL OR enterprise_id = p_enterprise_id)
    ),
    top_endpoints AS (
        SELECT 
            endpoint,
            COUNT(*) as request_count
        FROM rate_limit_requests
        WHERE created_at >= cutoff_time
        AND (p_enterprise_id IS NULL OR enterprise_id = p_enterprise_id)
        GROUP BY endpoint
        ORDER BY request_count DESC
        LIMIT 10
    ),
    top_violators AS (
        SELECT 
            fingerprint,
            ip_address,
            COUNT(*) as violation_count
        FROM rate_limit_violations
        WHERE blocked_at >= cutoff_time
        AND (p_enterprise_id IS NULL OR enterprise_id = p_enterprise_id)
        GROUP BY fingerprint, ip_address
        ORDER BY violation_count DESC
        LIMIT 10
    )
    SELECT jsonb_build_object(
        'time_range', p_time_range,
        'period_start', cutoff_time,
        'period_end', NOW(),
        'requests', jsonb_build_object(
            'total', COALESCE(r.total_requests, 0),
            'unique_clients', COALESCE(r.unique_clients, 0),
            'unique_endpoints', COALESCE(r.unique_endpoints, 0)
        ),
        'violations', jsonb_build_object(
            'total', COALESCE(v.total_violations, 0),
            'blocked_clients', COALESCE(v.blocked_clients, 0),
            'blocked_ips', COALESCE(v.blocked_ips, 0)
        ),
        'top_endpoints', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object('endpoint', endpoint, 'requests', request_count)
            ) FROM top_endpoints), '[]'::jsonb
        ),
        'top_violators', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'fingerprint', fingerprint, 
                    'ip_address', ip_address,
                    'violations', violation_count
                )
            ) FROM top_violators), '[]'::jsonb
        )
    ) INTO analytics_result
    FROM request_stats r
    CROSS JOIN violation_stats v;
    
    RETURN analytics_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert default rate limiting rules
INSERT INTO rate_limit_rules (id, name, strategy, max_requests, window_seconds, scope, priority, enabled) VALUES
('api_default', 'Default API Rate Limit', 'fixed_window', 100, 60, 'user', 1, true),
('api_anonymous', 'Anonymous API Rate Limit', 'sliding_window', 20, 60, 'ip', 2, true),
('ai_analysis', 'AI Analysis Rate Limit', 'token_bucket', 10, 3600, 'user', 10, true),
('file_upload', 'File Upload Rate Limit', 'token_bucket', 5, 300, 'user', 9, true),
('auth_login', 'Login Attempt Rate Limit', 'sliding_window', 5, 900, 'ip', 15, true);

-- Update default rate limiting rules with additional properties
UPDATE rate_limit_rules SET 
    endpoint = '/ai-analysis',
    burst_multiplier = 2.0
WHERE id = 'ai_analysis';

UPDATE rate_limit_rules SET 
    endpoint = '/storage'
WHERE id = 'file_upload';

UPDATE rate_limit_rules SET 
    endpoint = '/auth'
WHERE id = 'auth_login';

-- Enable RLS on all rate limiting tables
ALTER TABLE rate_limit_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rate limiting tables

-- Rate limit rules - admins can manage, users can view
CREATE POLICY "Admins can manage rate limit rules" ON rate_limit_rules
    FOR ALL USING (
        public.user_has_role('admin') OR 
        (enterprise_id IS NULL) OR -- Global rules readable by all
        (enterprise_id = public.current_user_enterprise_id() AND public.user_has_role('manager'))
    );

-- Rate limits - enterprise isolation (only if enhanced table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rate_limits' AND column_name = 'enterprise_id'
    ) THEN
        CREATE POLICY "Enterprise isolation for rate limits" ON rate_limits
            FOR ALL USING (
                enterprise_id IS NULL OR enterprise_id = public.current_user_enterprise_id()
            );
    END IF;
END $$;

-- Rate limit requests - enterprise isolation  
CREATE POLICY "Enterprise isolation for rate limit requests" ON rate_limit_requests
    FOR ALL USING (
        enterprise_id IS NULL OR enterprise_id = public.current_user_enterprise_id()
    );

-- Rate limit violations - admins only for security monitoring
CREATE POLICY "Admins can view rate limit violations" ON rate_limit_violations
    FOR SELECT USING (
        public.user_has_role('admin') AND 
        (enterprise_id IS NULL OR enterprise_id = public.current_user_enterprise_id())
    );

-- Rate limit metrics - managers and admins can view
CREATE POLICY "Managers can view rate limit metrics" ON rate_limit_metrics
    FOR SELECT USING (
        public.user_has_role('manager') AND 
        (enterprise_id IS NULL OR enterprise_id = public.current_user_enterprise_id())
    );

-- Grant permissions
GRANT SELECT ON rate_limit_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO authenticated;
GRANT SELECT, INSERT ON rate_limit_requests TO authenticated;
GRANT SELECT, INSERT ON rate_limit_violations TO authenticated;
GRANT SELECT ON rate_limit_metrics TO authenticated;

GRANT EXECUTE ON FUNCTION get_rate_limit_rules TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_rate_limit_analytics TO authenticated;