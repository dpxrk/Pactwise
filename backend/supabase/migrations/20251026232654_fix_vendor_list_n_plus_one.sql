-- ============================================================================
-- Migration: 067_fix_vendor_list_n_plus_one.sql
-- Description: Fix N+1 query problem in vendor list endpoint by creating
--              optimized function that uses vendor_metrics_mv
-- Created: 2025-10-26
-- ============================================================================

-- Create function to get vendors with metrics efficiently
-- Uses the materialized view to avoid N+1 queries
CREATE OR REPLACE FUNCTION get_vendors_with_metrics(
    p_enterprise_id UUID,
    p_category TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_sort_by TEXT DEFAULT 'name',
    p_sort_order TEXT DEFAULT 'asc'
)
RETURNS TABLE (
    id UUID,
    enterprise_id UUID,
    name TEXT,
    category TEXT,
    status TEXT,
    website TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID,
    deleted_at TIMESTAMPTZ,
    active_contracts BIGINT,
    total_contracts BIGINT,
    total_contract_value NUMERIC,
    compliance_score NUMERIC,
    performance_score NUMERIC
) AS $$
DECLARE
    v_query TEXT;
    v_order_clause TEXT;
BEGIN
    -- Build the ORDER BY clause
    v_order_clause := CASE
        WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN 'v.name ASC'
        WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN 'v.name DESC'
        WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN 'v.created_at ASC'
        WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN 'v.created_at DESC'
        WHEN p_sort_by = 'updated_at' AND p_sort_order = 'asc' THEN 'v.updated_at ASC'
        WHEN p_sort_by = 'updated_at' AND p_sort_order = 'desc' THEN 'v.updated_at DESC'
        WHEN p_sort_by = 'active_contracts' AND p_sort_order = 'asc' THEN 'COALESCE(vm.active_contracts, 0) ASC'
        WHEN p_sort_by = 'active_contracts' AND p_sort_order = 'desc' THEN 'COALESCE(vm.active_contracts, 0) DESC'
        WHEN p_sort_by = 'total_contract_value' AND p_sort_order = 'asc' THEN 'COALESCE(vm.total_contract_value, 0) ASC'
        WHEN p_sort_by = 'total_contract_value' AND p_sort_order = 'desc' THEN 'COALESCE(vm.total_contract_value, 0) DESC'
        ELSE 'v.name ASC'
    END;

    -- Build and execute dynamic query with filters
    RETURN QUERY EXECUTE format($query$
        SELECT
            v.id,
            v.enterprise_id,
            v.name,
            v.category,
            v.status,
            v.website,
            v.description,
            v.metadata,
            v.created_at,
            v.updated_at,
            v.created_by,
            v.deleted_at,
            COALESCE(vm.active_contracts, 0) AS active_contracts,
            COALESCE(vm.total_contracts, 0) AS total_contracts,
            COALESCE(vm.total_contract_value, 0) AS total_contract_value,
            COALESCE(vm.compliance_score, 3.0) AS compliance_score,
            COALESCE(vm.performance_score, 3.0) AS performance_score
        FROM vendors v
        LEFT JOIN vendor_metrics_mv vm ON v.id = vm.vendor_id
        WHERE
            v.enterprise_id = $1
            AND v.deleted_at IS NULL
            AND ($2::TEXT IS NULL OR v.category = $2)
            AND ($3::TEXT IS NULL OR v.status = $3)
            AND ($4::TEXT IS NULL OR v.name ILIKE '%' || $4 || '%')
        ORDER BY %s
        LIMIT $5
        OFFSET $6
    $query$, v_order_clause)
    USING p_enterprise_id, p_category, p_status, p_search, p_limit, p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION get_vendors_with_metrics IS
'Efficiently retrieves vendors with pre-calculated metrics from materialized view. '
'Eliminates N+1 query problem by joining vendor_metrics_mv. '
'Supports filtering by category, status, and search term with pagination and sorting.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_vendors_with_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_vendors_with_metrics TO service_role;
