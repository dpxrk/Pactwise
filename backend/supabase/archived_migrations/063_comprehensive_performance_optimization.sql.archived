-- Migration: 056_comprehensive_performance_optimization.sql
-- Description: Comprehensive performance optimization with advanced indexing, query optimization, and caching
-- Created: 2025-01-15

-- ============================================================================
-- PART 1: MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Contract Analysis tables
CREATE INDEX IF NOT EXISTS idx_contract_analyses_enterprise_contract 
ON contract_analyses(enterprise_id, contract_id) 
WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_analyses_created_by 
ON contract_analyses(created_by) 
WHERE created_by IS NOT NULL;

-- ML Predictions tables
CREATE INDEX IF NOT EXISTS idx_ml_predictions_enterprise_entity 
ON ml_predictions(enterprise_id, entity_type, entity_id);

-- Note: Removed NOW() from WHERE clause as it's not IMMUTABLE
-- Instead, filter expired caches at query time
CREATE INDEX IF NOT EXISTS idx_ml_predictions_cache_lookup
ON ml_predictions(cache_key, expires_at)
WHERE is_cached = true;

-- Analysis Embeddings
CREATE INDEX IF NOT EXISTS idx_analysis_embeddings_content_lookup 
ON analysis_embeddings(enterprise_id, content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_analysis_embeddings_hash 
ON analysis_embeddings(content_hash);

-- Document Intelligence
CREATE INDEX IF NOT EXISTS idx_document_intelligence_enterprise_doc 
ON document_intelligence(enterprise_id, document_id);

-- ============================================================================
-- PART 2: OPTIMIZED COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Dashboard queries optimization
-- Note: Removed risk_score from INCLUDE as it doesn't exist in contracts table
CREATE INDEX IF NOT EXISTS idx_contracts_dashboard_summary
ON contracts(enterprise_id, status, end_date, value)
INCLUDE (title, vendor_id)
WHERE deleted_at IS NULL;

-- Vendor performance dashboard
CREATE INDEX IF NOT EXISTS idx_vendors_dashboard_metrics 
ON vendors(enterprise_id, status, performance_score DESC, compliance_score DESC) 
INCLUDE (name, total_contract_value)
WHERE deleted_at IS NULL;

-- Budget monitoring with alerts
CREATE INDEX IF NOT EXISTS idx_budgets_alerts
ON budgets(enterprise_id, status)
WHERE deleted_at IS NULL
  AND status IN ('at_risk', 'exceeded');

-- Agent task processing optimization
CREATE INDEX IF NOT EXISTS idx_agent_tasks_processing_queue
ON agent_tasks(status, priority DESC, scheduled_at, retry_count)
INCLUDE (task_type, enterprise_id)
WHERE status IN ('pending', 'processing', 'retry');

-- ============================================================================
-- PART 3: PARTIAL INDEXES FOR SPECIFIC WORKFLOWS
-- ============================================================================

-- Contracts requiring immediate attention
CREATE INDEX IF NOT EXISTS idx_contracts_urgent_renewal
ON contracts(enterprise_id, end_date)
WHERE deleted_at IS NULL
  AND status = 'active'
  AND is_auto_renew = false;

-- High-risk vendors requiring review
CREATE INDEX IF NOT EXISTS idx_vendors_high_risk_review
ON vendors(enterprise_id, updated_at)
WHERE deleted_at IS NULL
  AND status = 'active'
  AND compliance_score < 70;

-- Pending AI analysis queue
CREATE INDEX IF NOT EXISTS idx_contracts_pending_ai_analysis
ON contracts(enterprise_id, created_at)
WHERE deleted_at IS NULL
  AND analysis_status = 'pending'
  AND file_type IS NOT NULL;

-- ============================================================================
-- PART 4: JSONB GIN INDEXES FOR METADATA QUERIES
-- ============================================================================

-- Optimize contract metadata searches
CREATE INDEX IF NOT EXISTS idx_contracts_metadata_gin 
ON contracts USING gin(metadata jsonb_path_ops) 
WHERE deleted_at IS NULL AND metadata IS NOT NULL;

-- Optimize contract analyses results searches
CREATE INDEX IF NOT EXISTS idx_contract_analyses_results_gin 
ON contract_analyses USING gin(analysis_results jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_contract_analyses_findings_gin 
ON contract_analyses USING gin(key_findings jsonb_path_ops);

-- ML predictions results indexing
CREATE INDEX IF NOT EXISTS idx_ml_predictions_results_gin 
ON ml_predictions USING gin(prediction_results jsonb_path_ops);

-- ============================================================================
-- PART 5: FULL-TEXT SEARCH OPTIMIZATION
-- ============================================================================

-- Create text search configuration for contracts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'contract_search') THEN
        CREATE TEXT SEARCH CONFIGURATION contract_search (COPY = english);
    END IF;
END $$;

-- Add contract search indexes with weights
CREATE INDEX IF NOT EXISTS idx_contracts_fulltext_weighted
ON contracts USING gin(
  (
    setweight(to_tsvector('contract_search', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('contract_search', coalesce(notes, '')), 'B')
  )
) WHERE deleted_at IS NULL;

-- Vendor search optimization
CREATE INDEX IF NOT EXISTS idx_vendors_fulltext_weighted
ON vendors USING gin(
  (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(website, '')), 'B')
  )
) WHERE deleted_at IS NULL;

-- ============================================================================
-- PART 6: MATERIALIZED VIEWS FOR EXPENSIVE AGGREGATIONS
-- ============================================================================

-- Enterprise dashboard statistics (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_enterprise_dashboard_stats AS
SELECT 
    e.id as enterprise_id,
    -- Contract statistics
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as active_contracts,
    COUNT(DISTINCT c.id) FILTER (WHERE c.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days') as expiring_soon,
    SUM(c.value) FILTER (WHERE c.status = 'active') as total_contract_value,
    -- Vendor statistics
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') as active_vendors,
    AVG(v.performance_score) FILTER (WHERE v.status = 'active') as avg_vendor_performance,
    COUNT(DISTINCT v.id) FILTER (WHERE v.compliance_score < 70) as high_risk_vendors,
    -- Budget statistics
    COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'healthy') as healthy_budgets,
    SUM(b.allocated_amount) FILTER (WHERE b.status != 'closed') as total_budget_allocated,
    SUM(b.spent_amount) FILTER (WHERE b.status != 'closed') as total_budget_spent,
    COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('at_risk', 'exceeded')) as budgets_at_risk,
    -- AI task statistics
    COUNT(DISTINCT at.id) FILTER (WHERE at.status = 'pending') as pending_ai_tasks,
    AVG(EXTRACT(EPOCH FROM (at.completed_at - at.created_at))) FILTER (WHERE at.status = 'completed' AND at.created_at > NOW() - INTERVAL '7 days') as avg_task_completion_seconds,
    -- Timestamps
    NOW() as calculated_at
FROM enterprises e
LEFT JOIN contracts c ON c.enterprise_id = e.id AND c.deleted_at IS NULL
LEFT JOIN vendors v ON v.enterprise_id = e.id AND v.deleted_at IS NULL
LEFT JOIN budgets b ON b.enterprise_id = e.id AND b.deleted_at IS NULL
LEFT JOIN agent_tasks at ON at.enterprise_id = e.id
WHERE e.deleted_at IS NULL
GROUP BY e.id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_enterprise_dashboard_stats_enterprise 
ON mv_enterprise_dashboard_stats(enterprise_id);

-- Contract analytics by period
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_contract_analytics_monthly AS
SELECT 
    enterprise_id,
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as contracts_created,
    COUNT(*) FILTER (WHERE status = 'active') as contracts_active,
    COUNT(*) FILTER (WHERE status = 'terminated') as contracts_terminated,
    SUM(value) as total_value,
    AVG(value) as avg_value,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY value) as median_value
FROM contracts
WHERE deleted_at IS NULL
GROUP BY enterprise_id, DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_contract_analytics_monthly_key 
ON mv_contract_analytics_monthly(enterprise_id, month);

-- ============================================================================
-- PART 7: OPTIMIZED FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Fast contract summary function with caching
CREATE OR REPLACE FUNCTION get_contract_summary_optimized(
    p_enterprise_id UUID,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    contract_id UUID,
    title TEXT,
    vendor_name TEXT,
    status TEXT,
    value DECIMAL,
    end_date DATE,
    days_until_expiry INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.title,
        v.name,
        c.status,
        c.value,
        c.end_date,
        CASE
            WHEN c.end_date IS NOT NULL THEN (c.end_date - CURRENT_DATE)::INTEGER
            ELSE NULL
        END as days_until_expiry
    FROM contracts c
    LEFT JOIN vendors v ON c.vendor_id = v.id
    WHERE c.enterprise_id = p_enterprise_id
        AND c.deleted_at IS NULL
        AND (p_status IS NULL OR c.status = p_status)
    ORDER BY 
        CASE 
            WHEN c.status = 'active' AND c.end_date IS NOT NULL THEN c.end_date
            ELSE '9999-12-31'::DATE
        END ASC,
        c.value DESC NULLS LAST
    LIMIT p_limit;
END;
$$;

-- Optimized vendor risk assessment
CREATE OR REPLACE FUNCTION calculate_vendor_risk_optimized(p_vendor_id UUID)
RETURNS TABLE (
    risk_score INTEGER,
    risk_level TEXT,
    risk_factors JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_performance_score DECIMAL;
    v_compliance_score DECIMAL;
    v_contract_count INTEGER;
    v_total_value DECIMAL;
    v_overdue_contracts INTEGER;
    v_risk_score INTEGER;
    v_risk_factors JSONB;
BEGIN
    -- Get vendor metrics in single query
    SELECT 
        performance_score,
        compliance_score,
        COUNT(c.id),
        COALESCE(SUM(c.value), 0),
        COUNT(c.id) FILTER (WHERE c.end_date < CURRENT_DATE AND c.status = 'active')
    INTO 
        v_performance_score,
        v_compliance_score,
        v_contract_count,
        v_total_value,
        v_overdue_contracts
    FROM vendors v
    LEFT JOIN contracts c ON c.vendor_id = v.id AND c.deleted_at IS NULL
    WHERE v.id = p_vendor_id AND v.deleted_at IS NULL
    GROUP BY v.id, v.performance_score, v.compliance_score;
    
    -- Calculate risk score
    v_risk_score := 0;
    v_risk_factors := '[]'::jsonb;
    
    -- Performance factor
    IF v_performance_score < 70 THEN
        v_risk_score := v_risk_score + 20;
        v_risk_factors := v_risk_factors || jsonb_build_object('factor', 'low_performance', 'score', v_performance_score);
    END IF;
    
    -- Compliance factor
    IF v_compliance_score < 80 THEN
        v_risk_score := v_risk_score + 25;
        v_risk_factors := v_risk_factors || jsonb_build_object('factor', 'compliance_issues', 'score', v_compliance_score);
    END IF;
    
    -- Overdue contracts factor
    IF v_overdue_contracts > 0 THEN
        v_risk_score := v_risk_score + (v_overdue_contracts * 10);
        v_risk_factors := v_risk_factors || jsonb_build_object('factor', 'overdue_contracts', 'count', v_overdue_contracts);
    END IF;
    
    -- High value concentration factor
    IF v_total_value > 1000000 THEN
        v_risk_score := v_risk_score + 15;
        v_risk_factors := v_risk_factors || jsonb_build_object('factor', 'high_value_exposure', 'value', v_total_value);
    END IF;
    
    RETURN QUERY SELECT 
        LEAST(v_risk_score, 100),
        CASE 
            WHEN v_risk_score >= 75 THEN 'critical'
            WHEN v_risk_score >= 50 THEN 'high'
            WHEN v_risk_score >= 25 THEN 'medium'
            ELSE 'low'
        END,
        v_risk_factors;
END;
$$;

-- ============================================================================
-- PART 8: QUERY RESULT CACHING TABLES
-- ============================================================================

-- Create query cache table for expensive operations
CREATE TABLE IF NOT EXISTS query_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    result_data JSONB NOT NULL,
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_cache_expiry
ON query_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_query_cache_enterprise
ON query_cache(enterprise_id, expires_at)
WHERE enterprise_id IS NOT NULL;

-- ============================================================================
-- PART 9: OPTIMIZE EXISTING SLOW QUERIES
-- ============================================================================

-- Create compound index for user permission checks
CREATE INDEX IF NOT EXISTS idx_users_permission_check
ON users(auth_id, enterprise_id, role, is_active)
WHERE deleted_at IS NULL;

-- Optimize notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read, created_at DESC)
WHERE is_read = false;

-- Optimize audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_enterprise_recent
ON audit_logs(enterprise_id, created_at DESC, action);

-- ============================================================================
-- PART 10: PARTITIONING FOR LARGE TABLES
-- ============================================================================

-- Prepare audit_logs for partitioning by month (for future migration)
-- Note: Actual partitioning requires table recreation, documented here for reference
COMMENT ON TABLE audit_logs IS 'Consider partitioning by created_at monthly for tables > 10M rows';
COMMENT ON TABLE agent_tasks IS 'Consider partitioning by created_at monthly for high-volume processing';
COMMENT ON TABLE notifications IS 'Consider partitioning by created_at quarterly for retention management';

-- ============================================================================
-- PART 11: VACUUM AND ANALYZE CONFIGURATION
-- ============================================================================

-- Set aggressive autovacuum for high-churn tables
ALTER TABLE agent_tasks SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE notifications SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE query_cache SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- ============================================================================
-- PART 12: STORED PROCEDURES FOR MAINTENANCE
-- ============================================================================

-- Automatic materialized view refresh procedure
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh dashboard stats (with concurrent option to avoid locking)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_enterprise_dashboard_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_contract_analytics_monthly;
    
    -- Log the refresh
    INSERT INTO system_logs (action, details, created_at)
    VALUES ('materialized_view_refresh', jsonb_build_object(
        'views_refreshed', ARRAY['mv_enterprise_dashboard_stats', 'mv_contract_analytics_monthly'],
        'timestamp', NOW()
    ), NOW());
END;
$$;

-- Cache cleanup procedure
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM query_cache 
    WHERE expires_at < NOW() 
        OR (hit_count = 0 AND created_at < NOW() - INTERVAL '1 hour');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log cleanup
    IF v_deleted_count > 0 THEN
        INSERT INTO system_logs (action, details, created_at)
        VALUES ('cache_cleanup', jsonb_build_object(
            'deleted_count', v_deleted_count,
            'timestamp', NOW()
        ), NOW());
    END IF;
    
    RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- PART 13: FIX BLOAT DETECTION FUNCTION
-- ============================================================================

-- Fixed and optimized bloat detection function
CREATE OR REPLACE FUNCTION check_index_bloat()
RETURNS TABLE(
    schema_name text,
    table_name text,
    index_name text,
    index_size text,
    index_scans bigint,
    bloat_pct numeric,
    bloat_size text,
    recommendation text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH btree_index_atts AS (
        SELECT 
            nspname,
            indexclass.relname as index_name,
            indexclass.reltuples,
            indexclass.relpages,
            tableclass.relname as tablename,
            regexp_split_to_table(indkey::text, ' ')::smallint AS attnum,
            indexrelid as index_oid
        FROM pg_index
        JOIN pg_class AS indexclass ON pg_index.indexrelid = indexclass.oid
        JOIN pg_class AS tableclass ON pg_index.indrelid = tableclass.oid
        JOIN pg_namespace ON pg_namespace.oid = indexclass.relnamespace
        WHERE indexclass.relkind = 'i'
            AND indexclass.relpages > 0
            AND nspname NOT IN ('pg_catalog', 'information_schema')
    ),
    index_item_sizes AS (
        SELECT
            ind_atts.nspname,
            ind_atts.index_name,
            ind_atts.tablename,
            ind_atts.reltuples,
            ind_atts.relpages,
            ind_atts.index_oid,
            current_setting('block_size')::numeric AS bs,
            8 AS maxalign,
            24 AS pagehdr,
            CASE WHEN max(coalesce(pg_stats.null_frac, 0)) = 0 THEN 2 ELSE 6 END AS index_tuple_hdr,
            sum((1 - coalesce(pg_stats.null_frac, 0)) * coalesce(pg_stats.avg_width, 1024)) AS nulldatawidth
        FROM btree_index_atts AS ind_atts
        LEFT JOIN pg_stats ON 
            pg_stats.schemaname = ind_atts.nspname
            AND pg_stats.tablename = ind_atts.tablename
            AND pg_stats.attname = pg_attribute.attname
        LEFT JOIN pg_attribute ON 
            pg_attribute.attrelid = ind_atts.index_oid
            AND pg_attribute.attnum = ind_atts.attnum
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
    ),
    index_aligned_est AS (
        SELECT
            nspname,
            index_name,
            tablename,
            bs,
            reltuples,
            relpages,
            COALESCE(
                CEIL(
                    reltuples * (6 + maxalign - 
                        CASE WHEN index_tuple_hdr % maxalign = 0 THEN maxalign 
                        ELSE index_tuple_hdr % maxalign END + 
                        nulldatawidth + maxalign - 
                        CASE WHEN nulldatawidth::integer % maxalign = 0 THEN maxalign 
                        ELSE nulldatawidth::integer % maxalign END
                    )::numeric / (bs - pagehdr)
                ), 0
            ) AS expected_pages
        FROM index_item_sizes
    )
    SELECT
        nspname::text,
        tablename::text,
        index_name::text,
        pg_size_pretty(pg_relation_size(indexrelid))::text,
        idx_scan,
        ROUND(100 * (relpages - expected_pages)::numeric / NULLIF(relpages, 0), 2) AS bloat_pct,
        pg_size_pretty((bs * (relpages - expected_pages))::bigint)::text AS bloat_size,
        CASE
            WHEN (relpages - expected_pages)::numeric / NULLIF(relpages, 0) > 0.5 THEN 'REINDEX URGENTLY NEEDED'
            WHEN (relpages - expected_pages)::numeric / NULLIF(relpages, 0) > 0.3 THEN 'REINDEX RECOMMENDED'
            WHEN (relpages - expected_pages)::numeric / NULLIF(relpages, 0) > 0.1 THEN 'Monitor for bloat'
            ELSE 'Healthy'
        END::text AS recommendation
    FROM index_aligned_est
    JOIN pg_stat_user_indexes ON 
        pg_stat_user_indexes.schemaname = index_aligned_est.nspname
        AND pg_stat_user_indexes.indexrelname = index_aligned_est.index_name
    WHERE relpages > 10
        AND (relpages - expected_pages)::numeric / NULLIF(relpages, 0) > 0.1
    ORDER BY bloat_pct DESC;
END;
$$;

-- ============================================================================
-- PART 14: SCHEDULED MAINTENANCE
-- ============================================================================

-- Create maintenance schedule table
CREATE TABLE IF NOT EXISTS maintenance_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_name VARCHAR(100) NOT NULL UNIQUE,
    schedule_interval INTERVAL NOT NULL,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance tasks
INSERT INTO maintenance_schedule (task_name, schedule_interval, next_run)
VALUES 
    ('refresh_materialized_views', INTERVAL '1 hour', NOW() + INTERVAL '1 hour'),
    ('cleanup_expired_cache', INTERVAL '15 minutes', NOW() + INTERVAL '15 minutes'),
    ('analyze_tables', INTERVAL '1 day', NOW() + INTERVAL '1 day'),
    ('check_index_bloat', INTERVAL '1 week', NOW() + INTERVAL '1 week')
ON CONFLICT (task_name) DO NOTHING;

-- ============================================================================
-- PART 15: PERFORMANCE MONITORING
-- ============================================================================

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_lookup 
ON performance_metrics(metric_type, metric_name, recorded_at DESC);

-- Function to capture current performance metrics
CREATE OR REPLACE FUNCTION capture_performance_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_metric RECORD;
BEGIN
    -- Capture table sizes
    FOR v_metric IN 
        SELECT 
            schemaname,
            tablename,
            pg_total_relation_size(schemaname || '.' || tablename) as size_bytes,
            n_live_tup as row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
    LOOP
        INSERT INTO performance_metrics (metric_type, metric_name, metric_value, metadata)
        VALUES (
            'table_size',
            v_metric.tablename,
            v_metric.size_bytes,
            jsonb_build_object(
                'schema', v_metric.schemaname,
                'row_count', v_metric.row_count
            )
        );
    END LOOP;
    
    -- Capture index usage
    INSERT INTO performance_metrics (metric_type, metric_name, metric_value, metadata)
    SELECT 
        'index_usage',
        indexrelname,
        idx_scan,
        jsonb_build_object(
            'table', tablename,
            'index_size', pg_relation_size(indexrelid),
            'rows_read', idx_tup_read
        )
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public';
    
    -- Capture cache hit ratios
    INSERT INTO performance_metrics (metric_type, metric_name, metric_value, metadata)
    SELECT 
        'cache_hit_ratio',
        'database',
        ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2),
        jsonb_build_object(
            'heap_read', sum(heap_blks_read),
            'heap_hit', sum(heap_blks_hit)
        )
    FROM pg_statio_user_tables;
END;
$$;

-- ============================================================================
-- FINAL STATISTICS UPDATE
-- ============================================================================

-- Update statistics for all modified tables
ANALYZE contracts;
ANALYZE vendors;
ANALYZE budgets;
ANALYZE users;
ANALYZE agent_tasks;
ANALYZE notifications;
ANALYZE audit_logs;
ANALYZE contract_analyses;
ANALYZE ml_predictions;
ANALYZE analysis_embeddings;
ANALYZE document_intelligence;
ANALYZE query_cache;
ANALYZE performance_metrics;
ANALYZE maintenance_schedule;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_contract_summary_optimized IS 'Optimized contract summary with vendor joins and risk calculations';
COMMENT ON FUNCTION calculate_vendor_risk_optimized IS 'Fast vendor risk assessment using single-query aggregation';
COMMENT ON FUNCTION refresh_materialized_views IS 'Refreshes all materialized views concurrently';
COMMENT ON FUNCTION cleanup_expired_cache IS 'Removes expired entries from query cache';
COMMENT ON FUNCTION check_index_bloat IS 'Analyzes index bloat and provides reindex recommendations';
COMMENT ON FUNCTION capture_performance_metrics IS 'Captures database performance metrics for monitoring';
COMMENT ON TABLE query_cache IS 'Caches expensive query results with TTL and hit tracking';
COMMENT ON TABLE performance_metrics IS 'Stores database performance metrics for analysis and monitoring';
COMMENT ON TABLE maintenance_schedule IS 'Tracks scheduled maintenance tasks and their execution times';