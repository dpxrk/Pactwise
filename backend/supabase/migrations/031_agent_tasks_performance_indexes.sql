-- Performance indexes for agent_tasks table
-- These indexes optimize common query patterns in the agent system

-- Composite index for queue processing
-- Optimizes: WHERE status = 'pending' AND enterprise_id = ? AND scheduled_at <= NOW() ORDER BY priority DESC, created_at ASC
CREATE INDEX IF NOT EXISTS idx_agent_tasks_queue_processing 
ON agent_tasks(enterprise_id, status, scheduled_at DESC, priority DESC, created_at ASC) 
WHERE status = 'pending';

-- Index for agent-specific task retrieval
-- Optimizes: WHERE agent_id = ? AND status IN ('pending', 'processing')
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_status 
ON agent_tasks(agent_id, status) 
WHERE status IN ('pending', 'processing');

-- Index for task type filtering
-- Optimizes: WHERE task_type = ? AND enterprise_id = ?
CREATE INDEX IF NOT EXISTS idx_agent_tasks_type_enterprise 
ON agent_tasks(task_type, enterprise_id);

-- Index for retry management
-- Optimizes: WHERE status = 'failed' AND retry_count < max_retries
CREATE INDEX IF NOT EXISTS idx_agent_tasks_retry_management 
ON agent_tasks(status, retry_count, max_retries) 
WHERE status = 'failed';

-- Index for task history and reporting
-- Optimizes: WHERE enterprise_id = ? AND completed_at BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS idx_agent_tasks_reporting 
ON agent_tasks(enterprise_id, completed_at DESC) 
WHERE completed_at IS NOT NULL;

-- Index for vendor-specific tasks
-- Optimizes: WHERE vendor_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_agent_tasks_vendor_status 
ON agent_tasks(vendor_id, status) 
WHERE vendor_id IS NOT NULL;

-- Index for high-priority tasks
-- Optimizes: WHERE priority >= 8 AND status = 'pending'
CREATE INDEX IF NOT EXISTS idx_agent_tasks_high_priority 
ON agent_tasks(priority DESC, status, scheduled_at) 
WHERE priority >= 8 AND status = 'pending';

-- Index for task duration analysis
-- Optimizes: WHERE started_at IS NOT NULL AND completed_at IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_agent_tasks_duration 
ON agent_tasks(started_at, completed_at) 
WHERE started_at IS NOT NULL AND completed_at IS NOT NULL;

-- Index for error tracking
-- Optimizes: WHERE error IS NOT NULL AND enterprise_id = ?
CREATE INDEX IF NOT EXISTS idx_agent_tasks_errors 
ON agent_tasks(enterprise_id, created_at DESC) 
WHERE error IS NOT NULL;

-- Partial index for active processing tasks
-- Optimizes: WHERE status = 'processing'
CREATE INDEX IF NOT EXISTS idx_agent_tasks_active_processing 
ON agent_tasks(agent_id, started_at) 
WHERE status = 'processing';

-- Create a view for task queue monitoring
CREATE OR REPLACE VIEW agent_task_queue_status AS
SELECT 
    at.enterprise_id,
    at.agent_id,
    a.type as agent_type,
    at.status,
    COUNT(*) as task_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - at.created_at))) as avg_age_seconds,
    MAX(at.priority) as max_priority,
    MIN(at.scheduled_at) as next_scheduled
FROM agent_tasks at
JOIN agents a ON a.id = at.agent_id
WHERE at.status IN ('pending', 'processing')
GROUP BY at.enterprise_id, at.agent_id, a.type, at.status;

-- Create a materialized view for task performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_task_performance_metrics AS
SELECT 
    at.enterprise_id,
    at.agent_id,
    a.type as agent_type,
    at.task_type,
    DATE_TRUNC('hour', at.completed_at) as hour,
    COUNT(*) as completed_tasks,
    COUNT(CASE WHEN at.error IS NOT NULL THEN 1 END) as failed_tasks,
    AVG(EXTRACT(EPOCH FROM (at.completed_at - at.started_at))) as avg_processing_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (at.completed_at - at.started_at))) as median_processing_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (at.completed_at - at.started_at))) as p95_processing_time,
    AVG(at.retry_count) as avg_retry_count
FROM agent_tasks at
JOIN agents a ON a.id = at.agent_id
WHERE at.completed_at IS NOT NULL
GROUP BY at.enterprise_id, at.agent_id, a.type, at.task_type, DATE_TRUNC('hour', at.completed_at);

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_task_performance_metrics_lookup 
ON agent_task_performance_metrics(enterprise_id, agent_type, hour DESC);

-- Function to refresh materialized view (to be called periodically)
CREATE OR REPLACE FUNCTION refresh_agent_task_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY agent_task_performance_metrics;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze task queue health
CREATE OR REPLACE FUNCTION analyze_task_queue_health(
    p_enterprise_id UUID
)
RETURNS TABLE (
    agent_type VARCHAR,
    pending_tasks BIGINT,
    processing_tasks BIGINT,
    avg_wait_time_minutes NUMERIC,
    oldest_task_age_minutes NUMERIC,
    high_priority_tasks BIGINT,
    failed_tasks_last_hour BIGINT,
    health_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH task_stats AS (
        SELECT 
            a.type as agent_type,
            COUNT(CASE WHEN at.status = 'pending' THEN 1 END) as pending_tasks,
            COUNT(CASE WHEN at.status = 'processing' THEN 1 END) as processing_tasks,
            AVG(CASE 
                WHEN at.status = 'pending' 
                THEN EXTRACT(EPOCH FROM (NOW() - at.created_at))/60 
            END) as avg_wait_time_minutes,
            MAX(CASE 
                WHEN at.status = 'pending' 
                THEN EXTRACT(EPOCH FROM (NOW() - at.created_at))/60 
            END) as oldest_task_age_minutes,
            COUNT(CASE WHEN at.priority >= 8 AND at.status = 'pending' THEN 1 END) as high_priority_tasks,
            COUNT(CASE 
                WHEN at.status = 'failed' 
                AND at.updated_at >= NOW() - INTERVAL '1 hour' 
                THEN 1 
            END) as failed_tasks_last_hour
        FROM agent_tasks at
        JOIN agents a ON a.id = at.agent_id
        WHERE at.enterprise_id = p_enterprise_id
        GROUP BY a.type
    )
    SELECT 
        ts.agent_type,
        ts.pending_tasks,
        ts.processing_tasks,
        ROUND(ts.avg_wait_time_minutes, 2),
        ROUND(ts.oldest_task_age_minutes, 2),
        ts.high_priority_tasks,
        ts.failed_tasks_last_hour,
        CASE 
            WHEN ts.failed_tasks_last_hour > 10 THEN 'critical'
            WHEN ts.oldest_task_age_minutes > 60 THEN 'warning'
            WHEN ts.pending_tasks > 100 THEN 'warning'
            WHEN ts.high_priority_tasks > 5 THEN 'attention'
            ELSE 'healthy'
        END as health_status
    FROM task_stats ts
    ORDER BY 
        CASE 
            WHEN ts.failed_tasks_last_hour > 10 THEN 1
            WHEN ts.oldest_task_age_minutes > 60 THEN 2
            WHEN ts.pending_tasks > 100 THEN 3
            WHEN ts.high_priority_tasks > 5 THEN 4
            ELSE 5
        END,
        ts.pending_tasks DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get task throughput statistics
CREATE OR REPLACE FUNCTION get_task_throughput_stats(
    p_enterprise_id UUID,
    p_time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
    agent_type VARCHAR,
    total_tasks BIGINT,
    completed_tasks BIGINT,
    failed_tasks BIGINT,
    success_rate NUMERIC,
    avg_completion_time_seconds NUMERIC,
    tasks_per_hour NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.type as agent_type,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN at.status = 'failed' THEN 1 END) as failed_tasks,
        ROUND(
            COUNT(CASE WHEN at.status = 'completed' THEN 1 END)::NUMERIC / 
            NULLIF(COUNT(CASE WHEN at.status IN ('completed', 'failed') THEN 1 END), 0) * 100, 
            2
        ) as success_rate,
        ROUND(
            AVG(
                CASE 
                    WHEN at.completed_at IS NOT NULL AND at.started_at IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (at.completed_at - at.started_at))
                END
            ), 
            2
        ) as avg_completion_time_seconds,
        ROUND(
            COUNT(*)::NUMERIC / (EXTRACT(EPOCH FROM p_time_range) / 3600), 
            2
        ) as tasks_per_hour
    FROM agent_tasks at
    JOIN agents a ON a.id = at.agent_id
    WHERE 
        at.enterprise_id = p_enterprise_id
        AND at.created_at >= NOW() - p_time_range
    GROUP BY a.type
    ORDER BY total_tasks DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add helpful comments
COMMENT ON INDEX idx_agent_tasks_queue_processing IS 'Optimizes task queue processing queries';
COMMENT ON INDEX idx_agent_tasks_agent_status IS 'Optimizes agent-specific task retrieval';
COMMENT ON INDEX idx_agent_tasks_type_enterprise IS 'Optimizes task type filtering by enterprise';
COMMENT ON INDEX idx_agent_tasks_retry_management IS 'Optimizes retry logic queries';
COMMENT ON INDEX idx_agent_tasks_reporting IS 'Optimizes historical reporting queries';
COMMENT ON INDEX idx_agent_tasks_vendor_status IS 'Optimizes vendor-specific task queries';
COMMENT ON INDEX idx_agent_tasks_high_priority IS 'Optimizes high-priority task retrieval';
COMMENT ON INDEX idx_agent_tasks_duration IS 'Optimizes task duration analysis';
COMMENT ON INDEX idx_agent_tasks_errors IS 'Optimizes error tracking and debugging';
COMMENT ON INDEX idx_agent_tasks_active_processing IS 'Optimizes monitoring of active tasks';

-- Grant permissions
GRANT SELECT ON agent_task_queue_status TO authenticated;
GRANT SELECT ON agent_task_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_task_queue_health(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_throughput_stats(UUID, INTERVAL) TO authenticated;