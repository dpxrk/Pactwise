-- Migration: 071_performance_optimization_indexes_and_caching
-- Description: Comprehensive performance optimization with indexes, materialized views, and query optimizations
-- Date: 2025-01-30

-- ==================== SECTION 1: Missing Foreign Key Indexes ====================

-- Contracts table indexes
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_id ON public.contracts(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_enterprise_id_status ON public.contracts(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_status_end_date ON public.contracts(status, end_date) WHERE end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_created_by ON public.contracts(created_by);

-- Vendors table indexes
CREATE INDEX IF NOT EXISTS idx_vendors_enterprise_id_status ON public.vendors(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON public.vendors(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_performance_score ON public.vendors(performance_score DESC) WHERE performance_score IS NOT NULL;

-- Agent tasks indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_priority ON public.agent_tasks(status, priority DESC) WHERE status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_agent_tasks_enterprise_id_status ON public.agent_tasks(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_id_status ON public.agent_tasks(agent_id, status) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_contract_id ON public.agent_tasks(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_vendor_id ON public.agent_tasks(vendor_id) WHERE vendor_id IS NOT NULL;

-- Agent insights indexes
CREATE INDEX IF NOT EXISTS idx_agent_insights_enterprise_id_severity ON public.agent_insights(enterprise_id, severity);
CREATE INDEX IF NOT EXISTS idx_agent_insights_contract_id ON public.agent_insights(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_insights_vendor_id ON public.agent_insights(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_insights_is_actionable ON public.agent_insights(enterprise_id, is_actionable) WHERE is_actionable = true;

-- Agent memory indexes
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_id_type ON public.agent_memory(agent_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_importance ON public.agent_memory(importance_score DESC) WHERE importance_score > 0.5;
CREATE INDEX IF NOT EXISTS idx_agent_memory_enterprise_id ON public.agent_memory(enterprise_id);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_enterprise_id_role ON public.users(enterprise_id, role);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email) WHERE email IS NOT NULL;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_enterprise_id ON public.notifications(enterprise_id);

-- RFQ/RFP indexes
CREATE INDEX IF NOT EXISTS idx_rfqs_enterprise_id_status ON public.rfqs(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_rfqs_created_by ON public.rfqs(created_by);
CREATE INDEX IF NOT EXISTS idx_sourcing_requests_enterprise_id_status ON public.sourcing_requests(enterprise_id, status);

-- Vendor issues indexes (new table from migration 070)
CREATE INDEX IF NOT EXISTS idx_vendor_issues_vendor_id ON public.vendor_issues(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_issues_enterprise_id_severity ON public.vendor_issues(enterprise_id, severity);
CREATE INDEX IF NOT EXISTS idx_vendor_issues_status ON public.vendor_issues(status) WHERE status != 'resolved';

-- Contract clauses indexes
CREATE INDEX IF NOT EXISTS idx_contract_clauses_contract_id ON public.contract_clauses(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_clauses_clause_type ON public.contract_clauses(clause_type);

-- ==================== SECTION 2: GIN Indexes for JSONB and Array Columns ====================

-- Enable GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_contracts_metadata_gin ON public.contracts USING gin(metadata) WHERE metadata IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_metadata_gin ON public.vendors USING gin(metadata) WHERE metadata IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_payload_gin ON public.agent_tasks USING gin(payload) WHERE payload IS NOT NULL;

-- Note: vendors.category is an enum (vendor_category), not an array, so no GIN index needed
-- If categories/certifications are added as JSONB or array columns in the future, add GIN indexes here

-- ==================== SECTION 3: Materialized Views for Analytics ====================

-- Drop existing materialized view if it exists (from migration 060)
DROP MATERIALIZED VIEW IF EXISTS public.vendor_metrics_summary;

-- Comprehensive vendor analytics materialized view
CREATE MATERIALIZED VIEW public.vendor_analytics_summary AS
SELECT
    v.id AS vendor_id,
    v.enterprise_id,
    v.name AS vendor_name,
    v.category,
    v.status,
    v.performance_score,
    v.compliance_score,
    -- Note: risk_level is calculated dynamically, not stored on vendors table

    -- Contract metrics
    COUNT(DISTINCT c.id) AS total_contracts,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) AS active_contracts,
    COUNT(DISTINCT CASE WHEN c.status = 'expired' THEN c.id END) AS expired_contracts,

    -- Financial metrics
    COALESCE(SUM(c.value), 0) AS total_contract_value,
    COALESCE(SUM(CASE WHEN c.status = 'active' THEN c.value ELSE 0 END), 0) AS active_contract_value,
    COALESCE(AVG(CASE WHEN c.status = 'active' THEN c.value END), 0) AS avg_active_contract_value,

    -- Annual spend estimate (contracts with dates)
    COALESCE(
        SUM(
            CASE
                WHEN c.status = 'active' AND c.start_date IS NOT NULL AND c.end_date IS NOT NULL
                THEN c.value / NULLIF(EXTRACT(YEAR FROM AGE(c.end_date, c.start_date))::numeric, 0)
                ELSE 0
            END
        ),
        0
    ) AS estimated_annual_spend,

    -- Note: overall_score not available on contracts table
    -- Performance metrics would go here if contracts.overall_score column is added

    -- Issue metrics
    COUNT(DISTINCT vi.id) AS total_issues,
    COUNT(DISTINCT CASE WHEN vi.status != 'resolved' THEN vi.id END) AS open_issues,
    COUNT(DISTINCT CASE WHEN vi.severity = 'critical' THEN vi.id END) AS critical_issues,

    -- Recent activity
    MAX(c.created_at) AS last_contract_date,
    MAX(vi.created_at) AS last_issue_date,

    -- Timestamps
    v.created_at AS vendor_created_at,
    v.updated_at AS vendor_updated_at,
    NOW() AS view_updated_at

FROM public.vendors v
LEFT JOIN public.contracts c ON c.vendor_id = v.id AND c.enterprise_id = v.enterprise_id
LEFT JOIN public.vendor_issues vi ON vi.vendor_id = v.id AND vi.enterprise_id = v.enterprise_id
GROUP BY
    v.id,
    v.enterprise_id,
    v.name,
    v.category,
    v.status,
    v.performance_score,
    v.compliance_score,
    v.created_at,
    v.updated_at;

-- Create unique index on materialized view for concurrent refresh
CREATE UNIQUE INDEX idx_vendor_analytics_summary_pk ON public.vendor_analytics_summary(vendor_id, enterprise_id);

-- Add standard indexes on materialized view
CREATE INDEX idx_vendor_analytics_enterprise_id ON public.vendor_analytics_summary(enterprise_id);
CREATE INDEX idx_vendor_analytics_category ON public.vendor_analytics_summary(category) WHERE category IS NOT NULL;
CREATE INDEX idx_vendor_analytics_total_value ON public.vendor_analytics_summary(total_contract_value DESC);
CREATE INDEX idx_vendor_analytics_performance ON public.vendor_analytics_summary(performance_score DESC) WHERE performance_score IS NOT NULL;

COMMENT ON MATERIALIZED VIEW public.vendor_analytics_summary IS
'Aggregated vendor analytics for fast dashboard queries. Refreshed on vendor/contract changes.';

-- Contract analytics materialized view
CREATE MATERIALIZED VIEW public.contract_analytics_summary AS
SELECT
    c.enterprise_id,
    c.status,
    c.contract_type,

    -- Count metrics
    COUNT(*) AS contract_count,

    -- Value metrics
    COALESCE(SUM(c.value), 0) AS total_value,
    COALESCE(AVG(c.value), 0) AS avg_value,
    COALESCE(MIN(c.value), 0) AS min_value,
    COALESCE(MAX(c.value), 0) AS max_value,

    -- Note: Score metrics would go here if contracts.overall_score column exists

    -- Expiration metrics (for active contracts)
    COUNT(CASE WHEN c.status = 'active' AND c.end_date < NOW() + INTERVAL '30 days' THEN 1 END) AS expiring_soon_30d,
    COUNT(CASE WHEN c.status = 'active' AND c.end_date < NOW() + INTERVAL '60 days' THEN 1 END) AS expiring_soon_60d,
    COUNT(CASE WHEN c.status = 'active' AND c.end_date < NOW() + INTERVAL '90 days' THEN 1 END) AS expiring_soon_90d,

    -- Auto-renewal metrics
    COUNT(CASE WHEN c.is_auto_renew = true THEN 1 END) AS auto_renewal_count,

    -- Timestamps
    MIN(c.created_at) AS earliest_contract,
    MAX(c.created_at) AS latest_contract,
    NOW() AS view_updated_at

FROM public.contracts c
WHERE c.enterprise_id IS NOT NULL
GROUP BY c.enterprise_id, c.status, c.contract_type;

-- Add indexes on contract analytics view
CREATE INDEX idx_contract_analytics_enterprise_id ON public.contract_analytics_summary(enterprise_id);
CREATE INDEX idx_contract_analytics_status ON public.contract_analytics_summary(status);
CREATE INDEX idx_contract_analytics_type ON public.contract_analytics_summary(contract_type);

COMMENT ON MATERIALIZED VIEW public.contract_analytics_summary IS
'Aggregated contract statistics by enterprise, status, and type for dashboard analytics.';

-- ==================== SECTION 4: Automatic Refresh Functions ====================

-- Function to refresh vendor analytics materialized view
CREATE OR REPLACE FUNCTION public.refresh_vendor_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh materialized view concurrently (non-blocking)
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.vendor_analytics_summary;
    RETURN NULL;
END;
$$;

-- Function to refresh contract analytics materialized view
CREATE OR REPLACE FUNCTION public.refresh_contract_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh materialized view concurrently (non-blocking)
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.contract_analytics_summary;
    RETURN NULL;
END;
$$;

-- Triggers for vendor analytics refresh (debounced - only after statement completes)
DROP TRIGGER IF EXISTS trigger_refresh_vendor_analytics_on_vendor ON public.vendors;
CREATE TRIGGER trigger_refresh_vendor_analytics_on_vendor
    AFTER INSERT OR UPDATE OR DELETE ON public.vendors
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.refresh_vendor_analytics();

DROP TRIGGER IF EXISTS trigger_refresh_vendor_analytics_on_contract ON public.contracts;
CREATE TRIGGER trigger_refresh_vendor_analytics_on_contract
    AFTER INSERT OR UPDATE OR DELETE ON public.contracts
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.refresh_vendor_analytics();

DROP TRIGGER IF EXISTS trigger_refresh_vendor_analytics_on_issues ON public.vendor_issues;
CREATE TRIGGER trigger_refresh_vendor_analytics_on_issues
    AFTER INSERT OR UPDATE OR DELETE ON public.vendor_issues
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.refresh_vendor_analytics();

-- Triggers for contract analytics refresh
DROP TRIGGER IF EXISTS trigger_refresh_contract_analytics ON public.contracts;
CREATE TRIGGER trigger_refresh_contract_analytics
    AFTER INSERT OR UPDATE OR DELETE ON public.contracts
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.refresh_contract_analytics();

-- ==================== SECTION 5: Query Optimization Functions ====================

-- Fast vendor lookup with cached metrics
CREATE OR REPLACE FUNCTION public.get_vendor_with_metrics(
    p_vendor_id UUID,
    p_enterprise_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Use materialized view for fast aggregated metrics
    SELECT jsonb_build_object(
        'vendor', jsonb_build_object(
            'id', v.id,
            'name', v.name,
            'category', v.category,
            'status', v.status,
            'performance_score', v.performance_score,
            'compliance_score', v.compliance_score,
            'contact_email', v.contact_email,
            'contact_phone', v.contact_phone
        ),
        'metrics', jsonb_build_object(
            'total_contracts', vas.total_contracts,
            'active_contracts', vas.active_contracts,
            'total_contract_value', vas.total_contract_value,
            'active_contract_value', vas.active_contract_value,
            'estimated_annual_spend', vas.estimated_annual_spend,
            'avg_contract_score', vas.avg_contract_score,
            'total_issues', vas.total_issues,
            'open_issues', vas.open_issues,
            'critical_issues', vas.critical_issues
        ),
        'last_activity', jsonb_build_object(
            'last_contract_date', vas.last_contract_date,
            'last_issue_date', vas.last_issue_date
        )
    )
    INTO v_result
    FROM public.vendors v
    LEFT JOIN public.vendor_analytics_summary vas ON vas.vendor_id = v.id
    WHERE v.id = p_vendor_id
      AND v.enterprise_id = p_enterprise_id;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_vendor_with_metrics IS
'Fast vendor lookup using materialized view for metrics. Returns vendor details with aggregated statistics.';

-- Optimized contract search with scoring
CREATE OR REPLACE FUNCTION public.search_contracts_optimized(
    p_enterprise_id UUID,
    p_search_term TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_vendor_id UUID DEFAULT NULL,
    p_min_value NUMERIC DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    contract JSONB,
    vendor_name TEXT,
    relevance_score REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        jsonb_build_object(
            'id', c.id,
            'title', c.title,
            'status', c.status,
            'contract_type', c.contract_type,
            'value', c.value,
            'start_date', c.start_date,
            'end_date', c.end_date,
            'created_at', c.created_at
        ) AS contract,
        v.name AS vendor_name,
        CASE
            WHEN p_search_term IS NOT NULL THEN
                ts_rank(
                    to_tsvector('english', COALESCE(c.title, '') || ' ' || COALESCE(c.description, '')),
                    plainto_tsquery('english', p_search_term)
                )
            ELSE 1.0
        END AS relevance_score
    FROM public.contracts c
    LEFT JOIN public.vendors v ON v.id = c.vendor_id
    WHERE c.enterprise_id = p_enterprise_id
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_vendor_id IS NULL OR c.vendor_id = p_vendor_id)
      AND (p_min_value IS NULL OR c.value >= p_min_value)
      AND (
          p_search_term IS NULL OR
          c.title ILIKE '%' || p_search_term || '%' OR
          c.description ILIKE '%' || p_search_term || '%'
      )
    ORDER BY relevance_score DESC, c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.search_contracts_optimized IS
'Optimized contract search with full-text search ranking and pagination.';

-- ==================== SECTION 6: Connection Pooling Settings ====================

-- Recommended connection pool settings (commented for documentation)
-- These should be set in supabase config or connection string:
--
-- pool_size: 20-30 (for production)
-- max_client_conn: 100
-- statement_timeout: 30000 (30 seconds)
-- idle_in_transaction_session_timeout: 60000 (60 seconds)

-- Set reasonable statement timeout to prevent long-running queries
ALTER DATABASE postgres SET statement_timeout = '30s';

-- Set idle in transaction timeout to free up connections
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '60s';

-- ==================== SECTION 7: Table Statistics Update ====================

-- Analyze tables to update statistics for query planner
ANALYZE public.contracts;
ANALYZE public.vendors;
ANALYZE public.agent_tasks;
ANALYZE public.agent_insights;
ANALYZE public.agent_memory;
ANALYZE public.users;
ANALYZE public.notifications;
ANALYZE public.rfqs;
ANALYZE public.sourcing_requests;
ANALYZE public.vendor_issues;

-- ==================== SECTION 8: Performance Monitoring Views ====================

-- View for monitoring slow queries
CREATE OR REPLACE VIEW public.performance_slow_queries AS
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    rows
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- queries averaging over 100ms
ORDER BY mean_exec_time DESC
LIMIT 50;

COMMENT ON VIEW public.performance_slow_queries IS
'Monitors queries with high execution times. Requires pg_stat_statements extension.';

-- View for monitoring index usage
CREATE OR REPLACE VIEW public.performance_index_usage AS
SELECT
    schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, relname;

COMMENT ON VIEW public.performance_index_usage IS
'Monitors index usage to identify unused or underutilized indexes.';

-- ==================== SECTION 9: Cache Table for Expensive Queries ====================

-- Create cache table for expensive API responses
CREATE TABLE IF NOT EXISTS public.query_cache (
    cache_key TEXT PRIMARY KEY,
    cache_value JSONB NOT NULL,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0,
    last_accessed TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_query_cache_enterprise_id ON public.query_cache(enterprise_id);
CREATE INDEX idx_query_cache_expires_at ON public.query_cache(expires_at);

COMMENT ON TABLE public.query_cache IS
'Application-level cache for expensive query results with TTL expiration.';

-- Function to get or set cache
CREATE OR REPLACE FUNCTION public.get_or_set_cache(
    p_cache_key TEXT,
    p_enterprise_id UUID,
    p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cached_value JSONB;
BEGIN
    -- Try to get from cache
    SELECT cache_value INTO v_cached_value
    FROM public.query_cache
    WHERE cache_key = p_cache_key
      AND enterprise_id = p_enterprise_id
      AND expires_at > NOW();

    IF FOUND THEN
        -- Update hit count and last accessed
        UPDATE public.query_cache
        SET hit_count = hit_count + 1,
            last_accessed = NOW()
        WHERE cache_key = p_cache_key;

        RETURN v_cached_value;
    ELSE
        -- Return null to indicate cache miss (caller should compute and set)
        RETURN NULL;
    END IF;
END;
$$;

-- Function to set cache value
CREATE OR REPLACE FUNCTION public.set_cache(
    p_cache_key TEXT,
    p_cache_value JSONB,
    p_enterprise_id UUID,
    p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.query_cache (cache_key, cache_value, enterprise_id, expires_at)
    VALUES (p_cache_key, p_cache_value, p_enterprise_id, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (cache_key)
    DO UPDATE SET
        cache_value = EXCLUDED.cache_value,
        expires_at = EXCLUDED.expires_at,
        last_accessed = NOW();
END;
$$;

-- Function to clean up expired cache entries (should be called by cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.query_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_cache IS
'Removes expired cache entries. Should be called periodically via pg_cron or application job.';

-- ==================== END OF MIGRATION ====================

-- Grant necessary permissions
GRANT SELECT ON public.vendor_analytics_summary TO authenticated;
GRANT SELECT ON public.contract_analytics_summary TO authenticated;
GRANT SELECT ON public.performance_slow_queries TO authenticated;
GRANT SELECT ON public.performance_index_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.query_cache TO authenticated;

-- Refresh materialized views initially
REFRESH MATERIALIZED VIEW public.vendor_analytics_summary;
REFRESH MATERIALIZED VIEW public.contract_analytics_summary;
