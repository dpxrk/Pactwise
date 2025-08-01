-- Add distributed tracing support
CREATE TABLE IF NOT EXISTS trace_spans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trace_id VARCHAR(32) NOT NULL,
    span_id VARCHAR(16) NOT NULL,
    parent_span_id VARCHAR(16),
    operation_name VARCHAR(255) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,
    status INTEGER NOT NULL DEFAULT 0, -- 0: OK, 1: ERROR, 2: CANCELLED
    kind INTEGER NOT NULL DEFAULT 0, -- 0: INTERNAL, 1: SERVER, 2: CLIENT, 3: PRODUCER, 4: CONSUMER
    tags JSONB DEFAULT '{}',
    logs JSONB DEFAULT '[]',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for efficient querying
    CONSTRAINT unique_span_id UNIQUE (span_id, enterprise_id)
);

-- Create indexes for efficient trace querying
CREATE INDEX idx_trace_spans_trace_id ON trace_spans(trace_id, enterprise_id);
CREATE INDEX idx_trace_spans_parent_span ON trace_spans(parent_span_id) WHERE parent_span_id IS NOT NULL;
CREATE INDEX idx_trace_spans_start_time ON trace_spans(start_time);
CREATE INDEX idx_trace_spans_service_name ON trace_spans(service_name, enterprise_id);
CREATE INDEX idx_trace_spans_operation_name ON trace_spans(operation_name);
CREATE INDEX idx_trace_spans_status ON trace_spans(status) WHERE status != 0;
CREATE INDEX idx_trace_spans_duration ON trace_spans(duration_ms) WHERE duration_ms > 1000; -- Slow spans

-- Create a view for trace summaries
CREATE OR REPLACE VIEW trace_summaries AS
WITH service_stats AS (
    SELECT 
        trace_id,
        enterprise_id,
        service_name,
        COUNT(*) as span_count,
        SUM(duration_ms) as total_duration
    FROM trace_spans
    GROUP BY trace_id, enterprise_id, service_name
),
trace_stats AS (
    SELECT 
        ts.trace_id,
        ts.enterprise_id,
        MIN(ts.start_time) as trace_start_time,
        MAX(ts.end_time) as trace_end_time,
        COUNT(*) as span_count,
        COUNT(CASE WHEN ts.status = 1 THEN 1 END) as error_count,
        MAX(ts.duration_ms) as max_duration_ms,
        SUM(ts.duration_ms) as total_duration_ms,
        array_agg(DISTINCT ts.service_name) as services_involved
    FROM trace_spans ts
    GROUP BY ts.trace_id, ts.enterprise_id
)
SELECT 
    t.*,
    jsonb_object_agg(
        s.service_name,
        jsonb_build_object(
            'span_count', s.span_count,
            'total_duration', s.total_duration
        )
    ) as service_breakdown
FROM trace_stats t
LEFT JOIN service_stats s ON s.trace_id = t.trace_id AND s.enterprise_id = t.enterprise_id
GROUP BY t.trace_id, t.enterprise_id, t.trace_start_time, t.trace_end_time, 
         t.span_count, t.error_count, t.max_duration_ms, t.total_duration_ms, t.services_involved;

-- Function to get complete trace
CREATE OR REPLACE FUNCTION get_trace_timeline(
    p_trace_id VARCHAR(32),
    p_enterprise_id UUID
)
RETURNS TABLE (
    span_id VARCHAR(16),
    parent_span_id VARCHAR(16),
    operation_name VARCHAR(255),
    service_name VARCHAR(100),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,
    status INTEGER,
    depth INTEGER,
    path TEXT
) AS $$
WITH RECURSIVE trace_hierarchy AS (
    -- Root spans (no parent)
    SELECT 
        ts.span_id,
        ts.parent_span_id,
        ts.operation_name,
        ts.service_name,
        ts.start_time,
        ts.end_time,
        ts.duration_ms,
        ts.status,
        0 as depth,
        ts.span_id::TEXT as path
    FROM trace_spans ts
    WHERE ts.trace_id = p_trace_id
      AND ts.enterprise_id = p_enterprise_id
      AND ts.parent_span_id IS NULL
    
    UNION ALL
    
    -- Child spans
    SELECT 
        ts.span_id,
        ts.parent_span_id,
        ts.operation_name,
        ts.service_name,
        ts.start_time,
        ts.end_time,
        ts.duration_ms,
        ts.status,
        th.depth + 1,
        th.path || '/' || ts.span_id
    FROM trace_spans ts
    INNER JOIN trace_hierarchy th ON ts.parent_span_id = th.span_id
    WHERE ts.trace_id = p_trace_id
      AND ts.enterprise_id = p_enterprise_id
)
SELECT * FROM trace_hierarchy
ORDER BY start_time, depth;
$$ LANGUAGE SQL STABLE;

-- Function to analyze trace performance
CREATE OR REPLACE FUNCTION analyze_trace_performance(
    p_trace_id VARCHAR(32),
    p_enterprise_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'trace_id', p_trace_id,
        'total_duration_ms', MAX(end_time) - MIN(start_time),
        'span_count', COUNT(*),
        'error_rate', ROUND(COUNT(CASE WHEN status = 1 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC, 4),
        'service_latencies', jsonb_object_agg(
            service_name,
            jsonb_build_object(
                'avg_duration_ms', AVG(duration_ms),
                'max_duration_ms', MAX(duration_ms),
                'span_count', COUNT(*)
            )
        ),
        'slowest_operations', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'operation', operation_name,
                    'service', service_name,
                    'duration_ms', duration_ms
                )
                ORDER BY duration_ms DESC
            )
            FROM (
                SELECT operation_name, service_name, duration_ms
                FROM trace_spans
                WHERE trace_id = p_trace_id
                  AND enterprise_id = p_enterprise_id
                  AND duration_ms IS NOT NULL
                ORDER BY duration_ms DESC
                LIMIT 5
            ) t
        ),
        'critical_path', (
            WITH RECURSIVE critical_path AS (
                -- Find the longest span
                SELECT span_id, parent_span_id, operation_name, duration_ms, 
                       duration_ms as cumulative_duration
                FROM trace_spans
                WHERE trace_id = p_trace_id
                  AND enterprise_id = p_enterprise_id
                  AND duration_ms = (
                      SELECT MAX(duration_ms) 
                      FROM trace_spans 
                      WHERE trace_id = p_trace_id 
                        AND enterprise_id = p_enterprise_id
                  )
                LIMIT 1
                
                UNION ALL
                
                -- Find parent spans
                SELECT ts.span_id, ts.parent_span_id, ts.operation_name, ts.duration_ms,
                       cp.cumulative_duration + COALESCE(ts.duration_ms, 0)
                FROM trace_spans ts
                INNER JOIN critical_path cp ON ts.span_id = cp.parent_span_id
                WHERE ts.trace_id = p_trace_id
                  AND ts.enterprise_id = p_enterprise_id
            )
            SELECT jsonb_agg(
                jsonb_build_object(
                    'operation', operation_name,
                    'duration_ms', duration_ms
                )
                ORDER BY cumulative_duration
            )
            FROM critical_path
        )
    ) INTO v_result
    FROM trace_spans
    WHERE trace_id = p_trace_id
      AND enterprise_id = p_enterprise_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add RLS policies
ALTER TABLE trace_spans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their enterprise traces"
    ON trace_spans FOR SELECT
    USING (enterprise_id IN (
        SELECT enterprise_id FROM enterprise_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can insert traces"
    ON trace_spans FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON trace_spans TO authenticated;
GRANT SELECT ON trace_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION get_trace_timeline(VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_trace_performance(VARCHAR, UUID) TO authenticated;