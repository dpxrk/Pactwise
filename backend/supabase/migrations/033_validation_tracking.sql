-- Validation error tracking for monitoring and improvement
CREATE TABLE agent_validation_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    errors JSONB NOT NULL DEFAULT '[]',
    error_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(errors)) STORED,
    request_data JSONB, -- Sanitized request data for debugging
    user_id UUID REFERENCES users(id),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for analysis
    INDEX idx_validation_errors_agent (agent_id, created_at DESC),
    INDEX idx_validation_errors_type (agent_type, operation, created_at DESC),
    INDEX idx_validation_errors_enterprise (enterprise_id, created_at DESC)
);

-- Summary view for validation error trends
CREATE OR REPLACE VIEW validation_error_summary AS
SELECT 
    ave.enterprise_id,
    ave.agent_type,
    ave.operation,
    DATE_TRUNC('hour', ave.created_at) as error_hour,
    COUNT(*) as error_count,
    SUM(ave.error_count) as total_error_fields,
    AVG(ave.error_count) as avg_errors_per_request,
    MODE() WITHIN GROUP (ORDER BY ave.errors->0->>'path') as most_common_error_field,
    array_agg(DISTINCT ave.errors->0->>'message' ORDER BY ave.errors->0->>'message') 
        FILTER (WHERE ave.errors->0->>'message' IS NOT NULL) as unique_error_messages
FROM agent_validation_errors ave
WHERE ave.created_at >= NOW() - INTERVAL '7 days'
GROUP BY ave.enterprise_id, ave.agent_type, ave.operation, DATE_TRUNC('hour', ave.created_at);

-- Function to analyze validation patterns
CREATE OR REPLACE FUNCTION analyze_validation_patterns(
    p_enterprise_id UUID,
    p_time_window INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
    agent_type VARCHAR,
    operation VARCHAR,
    total_errors BIGINT,
    unique_error_types BIGINT,
    most_common_errors JSONB,
    error_rate NUMERIC,
    recommendations TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH error_stats AS (
        SELECT 
            ave.agent_type,
            ave.operation,
            COUNT(*) as error_count,
            jsonb_agg(DISTINCT ave.errors) as all_errors
        FROM agent_validation_errors ave
        WHERE ave.enterprise_id = p_enterprise_id
          AND ave.created_at >= NOW() - p_time_window
        GROUP BY ave.agent_type, ave.operation
    ),
    task_stats AS (
        SELECT 
            a.type as agent_type,
            COUNT(*) as total_tasks
        FROM agent_tasks at
        JOIN agents a ON a.id = at.agent_id
        WHERE at.enterprise_id = p_enterprise_id
          AND at.created_at >= NOW() - p_time_window
        GROUP BY a.type
    ),
    error_details AS (
        SELECT 
            es.agent_type,
            es.operation,
            es.error_count,
            es.all_errors,
            ts.total_tasks,
            ROUND((es.error_count::NUMERIC / NULLIF(ts.total_tasks, 0)) * 100, 2) as error_rate_pct
        FROM error_stats es
        LEFT JOIN task_stats ts ON ts.agent_type = es.agent_type
    )
    SELECT 
        ed.agent_type,
        ed.operation,
        ed.error_count as total_errors,
        jsonb_array_length(ed.all_errors) as unique_error_types,
        (
            SELECT jsonb_object_agg(error_type, count)
            FROM (
                SELECT 
                    e->>'path' as error_type,
                    COUNT(*) as count
                FROM agent_validation_errors ave,
                     jsonb_array_elements(ave.errors) e
                WHERE ave.agent_type = ed.agent_type
                  AND ave.operation = ed.operation
                  AND ave.enterprise_id = p_enterprise_id
                  AND ave.created_at >= NOW() - p_time_window
                GROUP BY e->>'path'
                ORDER BY count DESC
                LIMIT 5
            ) t
        ) as most_common_errors,
        ed.error_rate_pct as error_rate,
        CASE 
            WHEN ed.error_rate_pct > 50 THEN 
                ARRAY['Critical: Over 50% error rate - review input requirements',
                      'Consider adding input examples or templates',
                      'Review validation rules for over-strictness']
            WHEN ed.error_rate_pct > 20 THEN 
                ARRAY['High error rate detected',
                      'Add better error messages and guidance',
                      'Consider input pre-validation or sanitization']
            WHEN ed.error_rate_pct > 10 THEN 
                ARRAY['Moderate error rate',
                      'Review common error patterns',
                      'Improve documentation for this operation']
            ELSE 
                ARRAY['Error rate within acceptable range']
        END as recommendations
    FROM error_details ed
    ORDER BY ed.error_rate_pct DESC, ed.error_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Validation rules configuration table
CREATE TABLE validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    agent_type VARCHAR(50),
    operation VARCHAR(100),
    field_path VARCHAR(255),
    rule_type VARCHAR(50) NOT NULL, -- 'required', 'format', 'range', 'custom'
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    severity VARCHAR(20) DEFAULT 'error', -- 'error', 'warning', 'info'
    error_message TEXT,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_validation_rule UNIQUE (rule_name, agent_type, operation, enterprise_id)
);

-- Create indexes
CREATE INDEX idx_validation_rules_lookup ON validation_rules(agent_type, operation, is_active) 
WHERE is_active = true;

-- Sample validation rules
INSERT INTO validation_rules (rule_name, agent_type, operation, field_path, rule_type, rule_config, error_message, enterprise_id)
SELECT 
    'contract_value_positive',
    'secretary',
    'create_contract',
    'value.amount',
    'range',
    '{"min": 0.01, "max": 999999999}',
    'Contract value must be positive and within reasonable limits',
    id
FROM enterprises
LIMIT 1;

-- Function to get custom validation rules
CREATE OR REPLACE FUNCTION get_validation_rules(
    p_agent_type VARCHAR,
    p_operation VARCHAR,
    p_enterprise_id UUID
)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'field', field_path,
                'type', rule_type,
                'config', rule_config,
                'severity', severity,
                'message', error_message
            )
            ORDER BY 
                CASE severity 
                    WHEN 'error' THEN 1 
                    WHEN 'warning' THEN 2 
                    ELSE 3 
                END,
                field_path
        )
        FROM validation_rules
        WHERE (agent_type = p_agent_type OR agent_type IS NULL)
          AND (operation = p_operation OR operation IS NULL)
          AND enterprise_id = p_enterprise_id
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS policies
ALTER TABLE agent_validation_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;

-- Users can view validation errors for their enterprise
CREATE POLICY "View own enterprise validation errors"
    ON agent_validation_errors
    FOR SELECT
    USING (enterprise_id IN (
        SELECT enterprise_id FROM enterprise_users WHERE user_id = auth.uid()
    ));

-- Admins can manage validation rules
CREATE POLICY "Admins manage validation rules"
    ON validation_rules
    FOR ALL
    USING (
        enterprise_id IN (
            SELECT enterprise_id 
            FROM enterprise_users 
            WHERE user_id = auth.uid() 
              AND role IN ('admin', 'owner')
        )
    );

-- Trigger to update timestamp
CREATE TRIGGER update_validation_rules_updated_at
    BEFORE UPDATE ON validation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON agent_validation_errors TO authenticated;
GRANT SELECT ON validation_error_summary TO authenticated;
GRANT SELECT ON validation_rules TO authenticated;
GRANT INSERT ON agent_validation_errors TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_validation_patterns(UUID, INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_validation_rules(VARCHAR, VARCHAR, UUID) TO authenticated;