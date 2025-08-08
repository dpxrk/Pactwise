-- Performance Optimization: Additional Indexes for Backend Queries
-- This migration adds missing indexes identified during optimization review

-- ============================================================================
-- FOREIGN KEY INDEXES (Critical for JOIN performance)
-- ============================================================================

-- Users table - Missing FK indexes
CREATE INDEX IF NOT EXISTS idx_users_primary_department_id 
ON users(primary_department_id) 
WHERE primary_department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_primary_job_title_id 
ON users(primary_job_title_id) 
WHERE primary_job_title_id IS NOT NULL;

-- Contracts table - Missing FK indexes
CREATE INDEX IF NOT EXISTS idx_contracts_legal_address_id 
ON contracts(legal_address_id) 
WHERE legal_address_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_created_by 
ON contracts(created_by) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_last_modified_by 
ON contracts(last_modified_by) 
WHERE last_modified_by IS NOT NULL AND deleted_at IS NULL;

-- Vendors table - Missing FK indexes
CREATE INDEX IF NOT EXISTS idx_vendors_primary_address_id 
ON vendors(primary_address_id) 
WHERE primary_address_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_created_by 
ON vendors(created_by) 
WHERE created_by IS NOT NULL AND deleted_at IS NULL;

-- Budgets table - Missing FK indexes
CREATE INDEX IF NOT EXISTS idx_budgets_owner_id 
ON budgets(owner_id) 
WHERE owner_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_budgets_created_by 
ON budgets(created_by) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_budgets_parent_budget 
ON budgets(parent_budget_id) 
WHERE parent_budget_id IS NOT NULL AND deleted_at IS NULL;

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- User lookup patterns (auth_id + enterprise for login queries)
CREATE INDEX IF NOT EXISTS idx_users_auth_enterprise 
ON users(auth_id, enterprise_id) 
WHERE deleted_at IS NULL AND is_active = true;

-- Contract search patterns (frequently filtered by status + dates)
CREATE INDEX IF NOT EXISTS idx_contracts_status_dates 
ON contracts(enterprise_id, status, end_date) 
WHERE deleted_at IS NULL;

-- Vendor performance queries
CREATE INDEX IF NOT EXISTS idx_vendors_performance_compliance 
ON vendors(enterprise_id, performance_score DESC, compliance_score DESC) 
WHERE deleted_at IS NULL AND status = 'active';

-- Budget monitoring queries
CREATE INDEX IF NOT EXISTS idx_budgets_monitoring 
ON budgets(enterprise_id, status, end_date) 
WHERE deleted_at IS NULL AND status IN ('at_risk', 'exceeded');

-- ============================================================================
-- PARTIAL INDEXES FOR SPECIFIC QUERY PATTERNS
-- ============================================================================

-- Active contracts needing renewal
CREATE INDEX IF NOT EXISTS idx_contracts_renewal_needed 
ON contracts(enterprise_id, end_date) 
WHERE deleted_at IS NULL 
  AND status = 'active' 
  AND is_auto_renew = false;

-- Contracts pending analysis
CREATE INDEX IF NOT EXISTS idx_contracts_pending_analysis 
ON contracts(enterprise_id, created_at) 
WHERE deleted_at IS NULL 
  AND analysis_status = 'pending';

-- High-value contracts (for executive dashboards)
CREATE INDEX IF NOT EXISTS idx_contracts_high_value 
ON contracts(enterprise_id, value DESC) 
WHERE deleted_at IS NULL 
  AND status = 'active' 
  AND value > 100000;

-- ============================================================================
-- TEXT SEARCH OPTIMIZATION
-- ============================================================================

-- Add GIN indexes for full-text search on commonly searched fields
CREATE INDEX IF NOT EXISTS idx_contracts_title_fts 
ON contracts USING gin(to_tsvector('english', title)) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_name_fts 
ON vendors USING gin(to_tsvector('english', name)) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- JSONB INDEXES FOR METADATA QUERIES
-- ============================================================================

-- Optimize JSONB field access for frequently accessed paths
CREATE INDEX IF NOT EXISTS idx_contracts_metadata_tags 
ON contracts USING gin((metadata->'tags')) 
WHERE deleted_at IS NULL AND metadata IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_settings_notifications 
ON users USING gin((settings->'notifications')) 
WHERE deleted_at IS NULL AND settings IS NOT NULL;

-- ============================================================================
-- TIME-BASED PARTITIONING INDEXES
-- ============================================================================

-- Optimize time-series queries on audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_enterprise_time 
ON audit_logs(enterprise_id, created_at DESC);

-- Optimize agent task scheduling queries
CREATE INDEX IF NOT EXISTS idx_agent_tasks_scheduling 
ON agent_tasks(status, scheduled_at, priority DESC) 
WHERE status IN ('pending', 'retry');

-- ============================================================================
-- COVERING INDEXES FOR READ-HEAVY QUERIES
-- ============================================================================

-- Dashboard summary queries (includes all needed columns)
CREATE INDEX IF NOT EXISTS idx_contracts_dashboard_covering 
ON contracts(enterprise_id, status, end_date) 
INCLUDE (title, value, vendor_id) 
WHERE deleted_at IS NULL;

-- User list queries (includes display columns)
CREATE INDEX IF NOT EXISTS idx_users_list_covering 
ON users(enterprise_id, last_name, first_name) 
INCLUDE (email, role, is_active) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- OPTIMIZE EXISTING INDEXES
-- ============================================================================

-- Drop redundant indexes (if they exist)
DROP INDEX IF EXISTS idx_contracts_enterprise; -- Replaced by composite indexes
DROP INDEX IF EXISTS idx_vendors_enterprise; -- Replaced by composite indexes
DROP INDEX IF EXISTS idx_budgets_enterprise; -- Replaced by composite indexes

-- Recreate with better selectivity
CREATE INDEX IF NOT EXISTS idx_contracts_enterprise_active 
ON contracts(enterprise_id) 
WHERE deleted_at IS NULL AND status IN ('active', 'pending_review', 'pending_analysis');

CREATE INDEX IF NOT EXISTS idx_vendors_enterprise_active 
ON vendors(enterprise_id) 
WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_budgets_enterprise_current 
ON budgets(enterprise_id) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- STATISTICS AND MAINTENANCE
-- ============================================================================

-- Update table statistics for query planner
ANALYZE enterprises;
ANALYZE users;
ANALYZE contracts;
ANALYZE vendors;
ANALYZE budgets;
ANALYZE addresses;
ANALYZE departments;
ANALYZE job_titles;
ANALYZE user_positions;
ANALYZE payment_method_cards;
ANALYZE payment_method_bank_accounts;

-- ============================================================================
-- MONITORING QUERIES (Comments for DBA reference)
-- ============================================================================

COMMENT ON INDEX idx_contracts_renewal_needed IS 'Optimizes dashboard queries for contracts needing renewal attention';
COMMENT ON INDEX idx_contracts_high_value IS 'Optimizes executive dashboard queries for high-value contract monitoring';
COMMENT ON INDEX idx_agent_tasks_scheduling IS 'Critical for agent task processor performance';
COMMENT ON INDEX idx_contracts_dashboard_covering IS 'Covering index to eliminate table lookups for dashboard queries';

-- ============================================================================
-- PERFORMANCE MONITORING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE(
    schemaname text,
    tablename text,
    indexname text,
    idx_scan bigint,
    idx_tup_read bigint,
    idx_tup_fetch bigint,
    size text,
    unused boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname::text,
        s.tablename::text,
        s.indexname::text,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch,
        pg_size_pretty(pg_relation_size(s.indexrelid))::text as size,
        (s.idx_scan = 0 AND s.indexname NOT LIKE 'pg_%')::boolean as unused
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.schemaname = 'public'
    ORDER BY s.idx_scan;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BLOAT DETECTION FUNCTION
-- ============================================================================

-- Temporarily commenting out complex function - fix syntax later
/*
CREATE OR REPLACE FUNCTION check_index_bloat()
RETURNS TABLE(
    tablename text,
    indexname text,
    bloat_ratio numeric,
    wasted_space text,
    recommendation text
) AS $$
BEGIN
    RETURN QUERY
    WITH index_bloat AS (
        SELECT 
            nspname,
            tblname,
            idxname,
            bs*(relpages)::bigint AS real_size,
            bs*(relpages-est_pages)::bigint AS extra_size,
            100 * (relpages-est_pages)::float / relpages AS extra_ratio,
            CASE WHEN relpages > est_pages_ff 
                THEN bs*(relpages-est_pages_ff) 
                ELSE 0 
            END AS bloat_size,
            100 * (relpages-est_pages_ff)::float / relpages AS bloat_ratio
        FROM (
            SELECT
                schemaname AS nspname,
                tablename AS tblname,
                indexname AS idxname,
                relpages,
                bs,
                COALESCE(CEIL((cc.reltuples*((datahdr+ma-
                    (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::float)),0) AS est_pages,
                COALESCE(CEIL((cc.reltuples*((datahdr+ma-
                    (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4)*fillfactor/(bs-20::float*100)),0) AS est_pages_ff
            FROM (
                SELECT
                    schemaname,
                    tablename,
                    indexname,
                    relpages,
                    current_setting('block_size')::numeric AS bs,
                    fillfactor,
                    CASE WHEN avg_leaf_density = 'NaN' THEN 0 ELSE avg_leaf_density END AS avg_leaf_density,
                    indrelid,
                    nspname,
                    reltuples AS cc_reltuples,
                    relpages AS cc_relpages,
                    datahdr,
                    nullhdr2,
                    ma
                FROM pg_stat_user_indexes
                JOIN pg_class ON pg_stat_user_indexes.indexrelid = pg_class.oid
                CROSS JOIN LATERAL (
                    SELECT 
                        current_setting('block_size')::numeric AS bs,
                        90 AS fillfactor,
                        24 AS datahdr,
                        0 AS nullhdr2,
                        8 AS ma
                ) AS constants
            ) AS sub
            JOIN pg_class cc ON sub.indrelid = cc.oid
        ) AS bloat_calc
        WHERE relpages > 10
    )
    SELECT 
        tblname::text,
        idxname::text,
        ROUND(bloat_ratio::numeric, 2),
        pg_size_pretty(bloat_size)::text,
        CASE 
            WHEN bloat_ratio > 50 THEN 'REINDEX RECOMMENDED'
            WHEN bloat_ratio > 30 THEN 'Monitor for reindex'
            ELSE 'Acceptable'
        END::text
    FROM index_bloat
    WHERE bloat_ratio > 20
    ORDER BY bloat_ratio DESC;
END;
$$ LANGUAGE plpgsql;
*/

-- Note: Run these functions periodically to monitor index usage and bloat:
-- SELECT * FROM get_index_usage_stats() WHERE unused = true;
-- SELECT * FROM check_index_bloat();