-- Optimize RLS (Row Level Security) Policies for Performance
-- This migration optimizes existing RLS policies with better index usage

-- ============================================================================
-- CREATE HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Cached function to get user's enterprise_id (reduces repeated lookups)
CREATE OR REPLACE FUNCTION public.current_user_enterprise_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT enterprise_id 
    FROM public.users 
    WHERE auth_id = auth.uid() 
    AND deleted_at IS NULL
    LIMIT 1;
$$;

-- Cached function to get user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role 
    FROM public.users 
    WHERE auth_id = auth.uid() 
    AND deleted_at IS NULL
    LIMIT 1;
$$;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE auth_id = auth.uid() 
        AND role = required_role
        AND deleted_at IS NULL
    );
$$;

-- Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_role_any(required_roles user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE auth_id = auth.uid() 
        AND role = ANY(required_roles)
        AND deleted_at IS NULL
    );
$$;

-- Create indexes to support RLS functions
CREATE INDEX IF NOT EXISTS idx_users_auth_id_rls 
ON users(auth_id, enterprise_id, role) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- OPTIMIZE EXISTING RLS POLICIES
-- ============================================================================

-- Drop and recreate policies with better performance characteristics

-- Contracts policies
DROP POLICY IF EXISTS "Users can view their enterprise contracts" ON contracts;
CREATE POLICY "Users can view their enterprise contracts" ON contracts
    FOR SELECT 
    USING (
        enterprise_id = public.current_user_enterprise_id() 
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "Users can create contracts for their enterprise" ON contracts;
CREATE POLICY "Users can create contracts for their enterprise" ON contracts
    FOR INSERT
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.has_role_any(ARRAY['user', 'manager', 'admin', 'owner']::user_role[])
    );

DROP POLICY IF EXISTS "Managers can update contracts" ON contracts;
CREATE POLICY "Managers can update contracts" ON contracts
    FOR UPDATE
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.has_role_any(ARRAY['manager', 'admin', 'owner']::user_role[])
        AND deleted_at IS NULL
    )
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.has_role_any(ARRAY['manager', 'admin', 'owner']::user_role[])
    );

-- Vendors policies
DROP POLICY IF EXISTS "Users can view their enterprise vendors" ON vendors;
CREATE POLICY "Users can view their enterprise vendors" ON vendors
    FOR SELECT
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "Users can manage vendors" ON vendors;
CREATE POLICY "Users can manage vendors" ON vendors
    FOR ALL
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.has_role_any(ARRAY['user', 'manager', 'admin', 'owner']::user_role[])
        AND deleted_at IS NULL
    );

-- Budgets policies
DROP POLICY IF EXISTS "Users can view their enterprise budgets" ON budgets;
CREATE POLICY "Users can view their enterprise budgets" ON budgets
    FOR SELECT
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "Managers can manage budgets" ON budgets;
CREATE POLICY "Managers can manage budgets" ON budgets
    FOR ALL
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.has_role_any(ARRAY['manager', 'admin', 'owner']::user_role[])
        AND deleted_at IS NULL
    );

-- ============================================================================
-- ADD RLS TO NEW NORMALIZED TABLES
-- ============================================================================

-- Departments policies
DROP POLICY IF EXISTS "Users can view their enterprise's departments" ON departments;
CREATE POLICY "Users can view their enterprise's departments" ON departments
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Admins can manage departments" ON departments
    FOR ALL
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.has_role_any(ARRAY['admin', 'owner']::user_role[])
    );

-- Job titles policies
DROP POLICY IF EXISTS "Users can view their enterprise's job titles" ON job_titles;
CREATE POLICY "Users can view their enterprise's job titles" ON job_titles
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS "Admins can manage job titles" ON job_titles;
CREATE POLICY "Admins can manage job titles" ON job_titles
    FOR ALL
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.has_role_any(ARRAY['admin', 'owner']::user_role[])
    );

-- Addresses policies
DROP POLICY IF EXISTS "Users can view their enterprise's addresses" ON addresses;
CREATE POLICY "Users can view their enterprise's addresses" ON addresses
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS "Users can manage their enterprise's addresses" ON addresses;
CREATE POLICY "Users can manage their enterprise's addresses" ON addresses
    FOR ALL
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.has_role_any(ARRAY['manager', 'admin', 'owner']::user_role[])
    );

-- ============================================================================
-- PERFORMANCE MONITORING FOR RLS
-- ============================================================================

-- Function to analyze RLS policy performance
CREATE OR REPLACE FUNCTION analyze_rls_performance()
RETURNS TABLE(
    table_name text,
    policy_name text,
    operation text,
    estimated_cost numeric,
    recommendation text
) AS $$
BEGIN
    RETURN QUERY
    WITH policy_analysis AS (
        SELECT 
            pc.relname::text as table_name,
            p.polname::text as policy_name,
            CASE p.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
            END::text as operation,
            -- Estimate cost based on policy complexity
            CASE 
                WHEN p.polqual::text LIKE '%EXISTS%' THEN 100
                WHEN p.polqual::text LIKE '%JOIN%' THEN 50
                WHEN p.polqual::text LIKE '%public.current_user_enterprise_id()%' THEN 10
                ELSE 5
            END::numeric as estimated_cost
        FROM pg_policy p
        JOIN pg_class pc ON p.polrelid = pc.oid
        WHERE pc.relnamespace = 'public'::regnamespace
    )
    SELECT 
        table_name,
        policy_name,
        operation,
        estimated_cost,
        CASE 
            WHEN estimated_cost > 50 THEN 'Consider simplifying or adding indexes'
            WHEN estimated_cost > 20 THEN 'Monitor query performance'
            ELSE 'Optimized'
        END::text as recommendation
    FROM policy_analysis
    ORDER BY estimated_cost DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE MATERIALIZED VIEW FOR COMMON RLS LOOKUPS
-- ============================================================================

-- This view caches user permissions for faster RLS checks
CREATE MATERIALIZED VIEW IF NOT EXISTS user_permissions AS
SELECT 
    u.id as user_id,
    u.auth_id,
    u.enterprise_id,
    u.role,
    u.is_active,
    ARRAY_AGG(DISTINCT up.department_id) FILTER (WHERE up.department_id IS NOT NULL) as department_ids,
    ARRAY_AGG(DISTINCT up.job_title_id) FILTER (WHERE up.job_title_id IS NOT NULL) as job_title_ids
FROM users u
LEFT JOIN user_positions up ON u.id = up.user_id AND up.end_date IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.auth_id, u.enterprise_id, u.role, u.is_active;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX idx_user_permissions_auth_id ON user_permissions(auth_id);
CREATE INDEX idx_user_permissions_enterprise ON user_permissions(enterprise_id);

-- Refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_user_permissions()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh on user changes
CREATE OR REPLACE FUNCTION trigger_refresh_user_permissions()
RETURNS trigger AS $$
BEGIN
    -- Schedule async refresh (requires pg_cron or similar)
    -- For now, we'll just mark that it needs refresh
    PERFORM pg_notify('refresh_user_permissions', 'needs_refresh');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_user_permissions_on_user_change
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_user_permissions();

CREATE TRIGGER refresh_user_permissions_on_position_change
AFTER INSERT OR UPDATE OR DELETE ON user_positions
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_user_permissions();

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.current_user_enterprise_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_any(user_role[]) TO authenticated;

-- Grant select on materialized view
GRANT SELECT ON user_permissions TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION public.current_user_enterprise_id() IS 'Cached lookup of current user enterprise_id for RLS policies';
COMMENT ON FUNCTION public.current_user_role() IS 'Cached lookup of current user role for RLS policies';
COMMENT ON FUNCTION public.user_has_role(user_role) IS 'Check if current user has specific role';
COMMENT ON FUNCTION public.has_role_any(user_role[]) IS 'Check if current user has any of the specified roles';
COMMENT ON MATERIALIZED VIEW user_permissions IS 'Cached user permissions for optimized RLS policy evaluation';