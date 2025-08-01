-- Security Monitoring and Alerting System
-- Comprehensive security event logging and alert management

-- Security events table
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'auth_failure', 'rate_limit_violation', 'suspicious_activity', 
        'data_breach_attempt', 'privilege_escalation', 'unauthorized_access',
        'malicious_payload', 'brute_force_attack', 'anomalous_behavior', 'system_intrusion'
    )),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source_ip INET NOT NULL,
    user_agent TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    request_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    false_positive BOOLEAN DEFAULT false
);

-- Security rules table
CREATE TABLE security_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_types TEXT[] NOT NULL, -- Array of SecurityEventType
    severity_threshold VARCHAR(10) NOT NULL CHECK (severity_threshold IN ('low', 'medium', 'high', 'critical')),
    time_window_minutes INTEGER NOT NULL CHECK (time_window_minutes > 0),
    threshold_count INTEGER NOT NULL CHECK (threshold_count > 0),
    enabled BOOLEAN DEFAULT true,
    alert_channels TEXT[] DEFAULT ARRAY['email'], -- Array of AlertChannel
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_alert_channels CHECK (
        alert_channels <@ ARRAY['email', 'slack', 'webhook', 'sms']
    )
);

-- Security alerts table
CREATE TABLE security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES security_events(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES security_rules(id) ON DELETE SET NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('threshold', 'pattern', 'anomaly', 'manual')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channels TEXT[] NOT NULL,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    event_count INTEGER DEFAULT 1,
    last_triggered TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security alert recipients table (for flexible notification management)
CREATE TABLE security_alert_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL,
    severity_threshold VARCHAR(10) NOT NULL,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('user', 'role', 'email', 'webhook')),
    recipient_value VARCHAR(255) NOT NULL, -- user_id, role name, email, or webhook URL
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'slack', 'webhook', 'sms')),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_severity_threshold CHECK (severity_threshold IN ('low', 'medium', 'high', 'critical'))
);

-- Security metrics aggregation table (for performance)
CREATE TABLE security_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    hour_bucket INTEGER CHECK (hour_bucket >= 0 AND hour_bucket <= 23),
    event_type VARCHAR(50),
    severity VARCHAR(10),
    total_events INTEGER NOT NULL DEFAULT 0,
    unique_ips INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(enterprise_id, metric_date, hour_bucket, event_type, severity)
);

-- IP reputation table (for threat intelligence)
CREATE TABLE ip_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL UNIQUE,
    reputation_score INTEGER CHECK (reputation_score >= 0 AND reputation_score <= 100),
    threat_types TEXT[], -- e.g., ['malware', 'botnet', 'scanner']
    country_code VARCHAR(2),
    organization VARCHAR(255),
    last_seen TIMESTAMP WITH TIME ZONE,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_events INTEGER DEFAULT 0,
    is_whitelisted BOOLEAN DEFAULT false,
    is_blacklisted BOOLEAN DEFAULT false,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User behavior analytics (for anomaly detection)
CREATE TABLE user_behavior_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- e.g., 'login_frequency', 'api_usage', 'data_access'
    baseline_value DECIMAL(10,2) NOT NULL,
    variance DECIMAL(10,2) NOT NULL,
    sample_size INTEGER NOT NULL,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, metric_type)
);

-- Indexes for performance
CREATE INDEX idx_security_events_type_severity ON security_events(event_type, severity, created_at DESC);
CREATE INDEX idx_security_events_ip ON security_events(source_ip, created_at DESC);
CREATE INDEX idx_security_events_user ON security_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_security_events_enterprise ON security_events(enterprise_id, created_at DESC);
CREATE INDEX idx_security_events_endpoint ON security_events(endpoint, created_at DESC) WHERE endpoint IS NOT NULL;
CREATE INDEX idx_security_events_cleanup ON security_events(created_at);

CREATE INDEX idx_security_alerts_status ON security_alerts(acknowledged, resolved, severity, created_at DESC);
CREATE INDEX idx_security_alerts_rule ON security_alerts(rule_id, created_at DESC);
CREATE INDEX idx_security_alerts_enterprise ON security_alerts(event_id, created_at DESC);

CREATE INDEX idx_security_rules_enterprise ON security_rules(enterprise_id, enabled) WHERE enabled = true;
CREATE INDEX idx_security_rules_events ON security_rules USING GIN(event_types) WHERE enabled = true;

CREATE INDEX idx_security_metrics_lookup ON security_metrics(enterprise_id, metric_date, hour_bucket);
CREATE INDEX idx_security_metrics_aggregation ON security_metrics(event_type, severity, metric_date);

CREATE INDEX idx_ip_reputation_lookup ON ip_reputation(ip_address, reputation_score);
CREATE INDEX idx_ip_reputation_threats ON ip_reputation USING GIN(threat_types);

CREATE INDEX idx_user_behavior_user ON user_behavior_baselines(user_id, metric_type);

-- Functions for security monitoring

-- Function to get security events with enriched data
CREATE OR REPLACE FUNCTION get_security_events_enriched(
    p_enterprise_id UUID DEFAULT NULL,
    p_time_range VARCHAR DEFAULT '24h',
    p_severity VARCHAR DEFAULT NULL,
    p_event_type VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    event_type VARCHAR,
    severity VARCHAR,
    title VARCHAR,
    description TEXT,
    source_ip INET,
    user_email VARCHAR,
    endpoint VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    ip_reputation INTEGER,
    country_code VARCHAR,
    alert_count BIGINT
) AS $$
DECLARE
    cutoff_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Set cutoff time based on range
    CASE p_time_range
        WHEN '1h' THEN cutoff_time := NOW() - INTERVAL '1 hour';
        WHEN '24h' THEN cutoff_time := NOW() - INTERVAL '24 hours';
        WHEN '7d' THEN cutoff_time := NOW() - INTERVAL '7 days';
        WHEN '30d' THEN cutoff_time := NOW() - INTERVAL '30 days';
        ELSE cutoff_time := NOW() - INTERVAL '24 hours';
    END CASE;
    
    RETURN QUERY
    SELECT 
        se.id,
        se.event_type,
        se.severity,
        se.title,
        se.description,
        se.source_ip,
        u.email as user_email,
        se.endpoint,
        se.created_at,
        ip.reputation_score as ip_reputation,
        ip.country_code,
        COUNT(sa.id) as alert_count
    FROM security_events se
    LEFT JOIN users u ON se.user_id = u.id
    LEFT JOIN ip_reputation ip ON se.source_ip = ip.ip_address
    LEFT JOIN security_alerts sa ON se.id = sa.event_id
    WHERE 
        se.created_at >= cutoff_time
        AND (p_enterprise_id IS NULL OR se.enterprise_id = p_enterprise_id)
        AND (p_severity IS NULL OR se.severity = p_severity)
        AND (p_event_type IS NULL OR se.event_type = p_event_type)
    GROUP BY se.id, u.email, ip.reputation_score, ip.country_code
    ORDER BY se.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update IP reputation
CREATE OR REPLACE FUNCTION update_ip_reputation(
    p_ip_address INET,
    p_event_type VARCHAR,
    p_severity VARCHAR
)
RETURNS VOID AS $$
DECLARE
    severity_score INTEGER;
BEGIN
    -- Map severity to score impact
    CASE p_severity
        WHEN 'critical' THEN severity_score := -20;
        WHEN 'high' THEN severity_score := -10;
        WHEN 'medium' THEN severity_score := -5;
        WHEN 'low' THEN severity_score := -2;
        ELSE severity_score := -1;
    END CASE;
    
    -- Update or insert IP reputation
    INSERT INTO ip_reputation (
        ip_address, 
        reputation_score, 
        threat_types, 
        last_seen, 
        total_events
    ) VALUES (
        p_ip_address,
        GREATEST(0, 100 + severity_score), -- Start at 100, reduce based on severity
        ARRAY[p_event_type],
        NOW(),
        1
    )
    ON CONFLICT (ip_address) DO UPDATE SET
        reputation_score = GREATEST(0, ip_reputation.reputation_score + severity_score),
        threat_types = array_append(ip_reputation.threat_types, p_event_type),
        last_seen = NOW(),
        total_events = ip_reputation.total_events + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate security metrics
CREATE OR REPLACE FUNCTION calculate_security_metrics(
    p_enterprise_id UUID DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
    metric_record RECORD;
    inserted_count INTEGER := 0;
BEGIN
    -- Calculate hourly metrics for the specified date
    FOR metric_record IN
        SELECT 
            COALESCE(se.enterprise_id, p_enterprise_id) as enterprise_id,
            p_date as metric_date,
            EXTRACT(HOUR FROM se.created_at) as hour_bucket,
            se.event_type,
            se.severity,
            COUNT(*) as total_events,
            COUNT(DISTINCT se.source_ip) as unique_ips,
            COUNT(DISTINCT se.user_id) as unique_users
        FROM security_events se
        WHERE 
            DATE(se.created_at) = p_date
            AND (p_enterprise_id IS NULL OR se.enterprise_id = p_enterprise_id)
        GROUP BY 
            COALESCE(se.enterprise_id, p_enterprise_id),
            EXTRACT(HOUR FROM se.created_at),
            se.event_type,
            se.severity
    LOOP
        INSERT INTO security_metrics (
            enterprise_id,
            metric_date,
            hour_bucket,
            event_type,
            severity,
            total_events,
            unique_ips,
            unique_users
        ) VALUES (
            metric_record.enterprise_id,
            metric_record.metric_date,
            metric_record.hour_bucket::INTEGER,
            metric_record.event_type,
            metric_record.severity,
            metric_record.total_events,
            metric_record.unique_ips,
            metric_record.unique_users
        )
        ON CONFLICT (enterprise_id, metric_date, hour_bucket, event_type, severity)
        DO UPDATE SET
            total_events = EXCLUDED.total_events,
            unique_ips = EXCLUDED.unique_ips,
            unique_users = EXCLUDED.unique_users;
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to detect anomalous behavior
CREATE OR REPLACE FUNCTION detect_user_anomalies(
    p_user_id UUID,
    p_metric_type VARCHAR,
    p_current_value DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
    baseline RECORD;
    z_score DECIMAL;
    anomaly_threshold DECIMAL := 3.0; -- Standard deviations
BEGIN
    -- Get user's baseline for this metric
    SELECT * INTO baseline
    FROM user_behavior_baselines
    WHERE user_id = p_user_id 
    AND metric_type = p_metric_type;
    
    IF NOT FOUND THEN
        -- No baseline yet, not anomalous
        RETURN false;
    END IF;
    
    -- Calculate z-score
    IF baseline.variance > 0 THEN
        z_score := ABS(p_current_value - baseline.baseline_value) / baseline.variance;
    ELSE
        z_score := 0;
    END IF;
    
    -- Return true if anomalous
    RETURN z_score > anomaly_threshold;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to clean up old security data
CREATE OR REPLACE FUNCTION cleanup_security_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up old security events (older than 90 days, except critical)
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND severity != 'critical'
    AND resolved_at IS NOT NULL;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up resolved alerts older than 30 days
    DELETE FROM security_alerts 
    WHERE resolved = true 
    AND resolved_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up old security metrics (older than 1 year)
    DELETE FROM security_metrics 
    WHERE metric_date < CURRENT_DATE - INTERVAL '1 year';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean up stale IP reputation data (not seen for 6 months)
    DELETE FROM ip_reputation 
    WHERE last_seen < NOW() - INTERVAL '6 months'
    AND is_blacklisted = false
    AND is_whitelisted = false;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update IP reputation on security events
CREATE OR REPLACE FUNCTION trigger_update_ip_reputation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update IP reputation for the source IP
    PERFORM update_ip_reputation(NEW.source_ip, NEW.event_type, NEW.severity);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_event_ip_reputation
    AFTER INSERT ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_ip_reputation();

-- Enable RLS on all security tables
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alert_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_baselines ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Security events - enterprise isolation
CREATE POLICY "Enterprise isolation for security events" ON security_events
    FOR ALL USING (
        enterprise_id IS NULL OR 
        enterprise_id = auth.user_enterprise_id() OR
        auth.has_role('owner')
    );

-- Security rules - admins can manage
CREATE POLICY "Admins can manage security rules" ON security_rules
    FOR ALL USING (
        auth.has_role('admin') AND 
        (enterprise_id IS NULL OR enterprise_id = auth.user_enterprise_id())
    );

-- Security alerts - managers and admins can view
CREATE POLICY "Managers can view security alerts" ON security_alerts
    FOR SELECT USING (
        auth.has_role('manager') AND 
        EXISTS (
            SELECT 1 FROM security_events se 
            WHERE se.id = security_alerts.event_id 
            AND (se.enterprise_id = auth.user_enterprise_id() OR se.enterprise_id IS NULL)
        )
    );

-- Security metrics - managers and admins can view
CREATE POLICY "Managers can view security metrics" ON security_metrics
    FOR SELECT USING (
        auth.has_role('manager') AND 
        (enterprise_id IS NULL OR enterprise_id = auth.user_enterprise_id())
    );

-- IP reputation - read-only for authenticated users
CREATE POLICY "Authenticated users can view IP reputation" ON ip_reputation
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- User behavior baselines - users can view their own, admins can view all
CREATE POLICY "Users can view own behavior baselines" ON user_behavior_baselines
    FOR SELECT USING (
        user_id = auth.user_id() OR
        (auth.has_role('admin') AND enterprise_id = auth.user_enterprise_id())
    );

-- Insert default security rules
INSERT INTO security_rules (
    name, 
    description, 
    event_types, 
    severity_threshold, 
    time_window_minutes, 
    threshold_count, 
    alert_channels,
    created_by
) VALUES 
(
    'Brute Force Detection',
    'Detect multiple failed authentication attempts',
    ARRAY['auth_failure', 'brute_force_attack'],
    'medium',
    15,
    5,
    ARRAY['email', 'slack'],
    (SELECT id FROM users WHERE role = 'owner' LIMIT 1)
),
(
    'Rate Limit Violations',
    'Alert on excessive rate limit violations',
    ARRAY['rate_limit_violation'],
    'high',
    10,
    10,
    ARRAY['email'],
    (SELECT id FROM users WHERE role = 'owner' LIMIT 1)
),
(
    'Critical Security Events',
    'Immediate alert for critical security events',
    ARRAY['data_breach_attempt', 'privilege_escalation', 'system_intrusion'],
    'critical',
    5,
    1,
    ARRAY['email', 'slack', 'sms'],
    (SELECT id FROM users WHERE role = 'owner' LIMIT 1)
);

-- Grant permissions
GRANT SELECT, INSERT ON security_events TO authenticated;
GRANT SELECT ON security_rules TO authenticated;
GRANT SELECT, UPDATE ON security_alerts TO authenticated;
GRANT SELECT ON security_metrics TO authenticated;
GRANT SELECT ON ip_reputation TO authenticated;
GRANT SELECT ON user_behavior_baselines TO authenticated;

GRANT EXECUTE ON FUNCTION get_security_events_enriched TO authenticated;
GRANT EXECUTE ON FUNCTION update_ip_reputation TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_security_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION detect_user_anomalies TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_security_data TO authenticated;