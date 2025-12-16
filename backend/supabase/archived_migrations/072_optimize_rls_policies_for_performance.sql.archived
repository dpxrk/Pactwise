-- Migration: 072_optimize_rls_policies_for_performance
-- Description: Optimize Row Level Security policies for better query performance
-- Date: 2025-01-30

-- ==================== SECTION 1: Create Helper Functions for RLS ====================

-- Function to get user's enterprise_id from JWT (cached in session)
CREATE OR REPLACE FUNCTION public.current_user_enterprise_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_enterprise_id UUID;
BEGIN
    -- Get from user profile
    SELECT enterprise_id INTO v_enterprise_id
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1;

    RETURN v_enterprise_id;
END;
$$;

COMMENT ON FUNCTION public.current_user_enterprise_id() IS
'Returns the enterprise_id for the current authenticated user. Used by RLS policies.';

-- Function to check if user has minimum role level
CREATE OR REPLACE FUNCTION public.user_has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_user_role TEXT;
    v_role_hierarchy INTEGER;
BEGIN
    -- Get user role
    SELECT role INTO v_user_role
    FROM public.users
    WHERE auth_id = auth.uid()
    LIMIT 1;

    -- Role hierarchy
    v_role_hierarchy := CASE v_user_role
        WHEN 'owner' THEN 5
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'user' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;

    -- Check against required role
    RETURN v_role_hierarchy >= CASE required_role
        WHEN 'owner' THEN 5
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'user' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
END;
$$;

COMMENT ON FUNCTION public.user_has_role(TEXT) IS
'Checks if the current user has at least the specified role level. Used by RLS policies.';

-- ==================== SECTION 2: Optimize Contracts RLS Policies ====================

-- Drop and recreate contracts policies with better performance
DROP POLICY IF EXISTS contracts_select_policy ON public.contracts;
CREATE POLICY contracts_select_policy ON public.contracts
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS contracts_insert_policy ON public.contracts;
CREATE POLICY contracts_insert_policy ON public.contracts
    FOR INSERT
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS contracts_update_policy ON public.contracts;
CREATE POLICY contracts_update_policy ON public.contracts
    FOR UPDATE
    USING (enterprise_id = public.current_user_enterprise_id())
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS contracts_delete_policy ON public.contracts;
CREATE POLICY contracts_delete_policy ON public.contracts
    FOR DELETE
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('manager')
    );

-- ==================== SECTION 3: Optimize Vendors RLS Policies ====================

DROP POLICY IF EXISTS vendors_select_policy ON public.vendors;
CREATE POLICY vendors_select_policy ON public.vendors
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS vendors_insert_policy ON public.vendors;
CREATE POLICY vendors_insert_policy ON public.vendors
    FOR INSERT
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS vendors_update_policy ON public.vendors;
CREATE POLICY vendors_update_policy ON public.vendors
    FOR UPDATE
    USING (enterprise_id = public.current_user_enterprise_id())
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS vendors_delete_policy ON public.vendors;
CREATE POLICY vendors_delete_policy ON public.vendors
    FOR DELETE
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('manager')
    );

-- ==================== SECTION 4: Optimize Agent Tasks RLS Policies ====================

DROP POLICY IF EXISTS agent_tasks_select_policy ON public.agent_tasks;
CREATE POLICY agent_tasks_select_policy ON public.agent_tasks
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS agent_tasks_insert_policy ON public.agent_tasks;
CREATE POLICY agent_tasks_insert_policy ON public.agent_tasks
    FOR INSERT
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS agent_tasks_update_policy ON public.agent_tasks;
CREATE POLICY agent_tasks_update_policy ON public.agent_tasks
    FOR UPDATE
    USING (enterprise_id = public.current_user_enterprise_id())
    WITH CHECK (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS agent_tasks_delete_policy ON public.agent_tasks;
CREATE POLICY agent_tasks_delete_policy ON public.agent_tasks
    FOR DELETE
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('admin')
    );

-- ==================== SECTION 5: Optimize Agent Insights RLS Policies ====================

DROP POLICY IF EXISTS agent_insights_select_policy ON public.agent_insights;
CREATE POLICY agent_insights_select_policy ON public.agent_insights
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS agent_insights_insert_policy ON public.agent_insights;
CREATE POLICY agent_insights_insert_policy ON public.agent_insights
    FOR INSERT
    WITH CHECK (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS agent_insights_update_policy ON public.agent_insights;
CREATE POLICY agent_insights_update_policy ON public.agent_insights
    FOR UPDATE
    USING (enterprise_id = public.current_user_enterprise_id())
    WITH CHECK (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS agent_insights_delete_policy ON public.agent_insights;
CREATE POLICY agent_insights_delete_policy ON public.agent_insights
    FOR DELETE
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('admin')
    );

-- ==================== SECTION 6: Optimize Agent Memory RLS Policies ====================

DROP POLICY IF EXISTS agent_memory_select_policy ON public.agent_memory;
CREATE POLICY agent_memory_select_policy ON public.agent_memory
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS agent_memory_insert_policy ON public.agent_memory;
CREATE POLICY agent_memory_insert_policy ON public.agent_memory
    FOR INSERT
    WITH CHECK (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS agent_memory_update_policy ON public.agent_memory;
CREATE POLICY agent_memory_update_policy ON public.agent_memory
    FOR UPDATE
    USING (enterprise_id = public.current_user_enterprise_id())
    WITH CHECK (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS agent_memory_delete_policy ON public.agent_memory;
CREATE POLICY agent_memory_delete_policy ON public.agent_memory
    FOR DELETE
    USING (enterprise_id = public.current_user_enterprise_id());

-- ==================== SECTION 7: Optimize Notifications RLS Policies ====================

-- Users can only see their own notifications
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
    FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.users
            WHERE auth_id = auth.uid()
            AND enterprise_id = public.current_user_enterprise_id()
        )
    );

DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
    FOR INSERT
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
CREATE POLICY notifications_update_policy ON public.notifications
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM public.users
            WHERE auth_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.users
            WHERE auth_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;
CREATE POLICY notifications_delete_policy ON public.notifications
    FOR DELETE
    USING (
        user_id IN (
            SELECT id FROM public.users
            WHERE auth_id = auth.uid()
        )
    );

-- ==================== SECTION 8: Optimize RFQ/RFP RLS Policies ====================

DROP POLICY IF EXISTS rfqs_select_policy ON public.rfqs;
CREATE POLICY rfqs_select_policy ON public.rfqs
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS rfqs_insert_policy ON public.rfqs;
CREATE POLICY rfqs_insert_policy ON public.rfqs
    FOR INSERT
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS rfqs_update_policy ON public.rfqs;
CREATE POLICY rfqs_update_policy ON public.rfqs
    FOR UPDATE
    USING (enterprise_id = public.current_user_enterprise_id())
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS rfqs_delete_policy ON public.rfqs;
CREATE POLICY rfqs_delete_policy ON public.rfqs
    FOR DELETE
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('manager')
    );

-- Sourcing requests policies
DROP POLICY IF EXISTS sourcing_requests_select_policy ON public.sourcing_requests;
CREATE POLICY sourcing_requests_select_policy ON public.sourcing_requests
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS sourcing_requests_insert_policy ON public.sourcing_requests;
CREATE POLICY sourcing_requests_insert_policy ON public.sourcing_requests
    FOR INSERT
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS sourcing_requests_update_policy ON public.sourcing_requests;
CREATE POLICY sourcing_requests_update_policy ON public.sourcing_requests
    FOR UPDATE
    USING (enterprise_id = public.current_user_enterprise_id())
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS sourcing_requests_delete_policy ON public.sourcing_requests;
CREATE POLICY sourcing_requests_delete_policy ON public.sourcing_requests
    FOR DELETE
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('manager')
    );

-- ==================== SECTION 9: Optimize Vendor Issues RLS Policies ====================

DROP POLICY IF EXISTS vendor_issues_select_policy ON public.vendor_issues;
CREATE POLICY vendor_issues_select_policy ON public.vendor_issues
    FOR SELECT
    USING (enterprise_id = public.current_user_enterprise_id());

DROP POLICY IF EXISTS vendor_issues_insert_policy ON public.vendor_issues;
CREATE POLICY vendor_issues_insert_policy ON public.vendor_issues
    FOR INSERT
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS vendor_issues_update_policy ON public.vendor_issues;
CREATE POLICY vendor_issues_update_policy ON public.vendor_issues
    FOR UPDATE
    USING (enterprise_id = public.current_user_enterprise_id())
    WITH CHECK (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('user')
    );

DROP POLICY IF EXISTS vendor_issues_delete_policy ON public.vendor_issues;
CREATE POLICY vendor_issues_delete_policy ON public.vendor_issues
    FOR DELETE
    USING (
        enterprise_id = public.current_user_enterprise_id()
        AND public.user_has_role('manager')
    );

-- ==================== SECTION 10: Create Indexes to Support RLS Policies ====================

-- These indexes help RLS policies perform better by supporting the WHERE clauses
CREATE INDEX IF NOT EXISTS idx_users_auth_id_enterprise ON public.users(auth_id, enterprise_id);
CREATE INDEX IF NOT EXISTS idx_contracts_enterprise_rls ON public.contracts(enterprise_id) WHERE enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_enterprise_rls ON public.vendors(enterprise_id) WHERE enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_enterprise_rls ON public.agent_tasks(enterprise_id) WHERE enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_insights_enterprise_rls ON public.agent_insights(enterprise_id) WHERE enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_memory_enterprise_rls ON public.agent_memory(enterprise_id) WHERE enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_enterprise ON public.notifications(user_id, enterprise_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_enterprise_rls ON public.rfqs(enterprise_id) WHERE enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sourcing_requests_enterprise_rls ON public.sourcing_requests(enterprise_id) WHERE enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_issues_enterprise_rls ON public.vendor_issues(enterprise_id) WHERE enterprise_id IS NOT NULL;

-- ==================== SECTION 11: Performance Monitoring for RLS ====================

-- View to monitor RLS policy overhead
CREATE OR REPLACE VIEW public.rls_performance_stats AS
SELECT
    schemaname,
    tablename,
    attname AS column_name,
    null_frac,
    avg_width,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND attname IN ('enterprise_id', 'user_id', 'auth_id')
ORDER BY tablename, attname;

COMMENT ON VIEW public.rls_performance_stats IS
'Statistics for columns commonly used in RLS policies to help optimize performance.';

-- ==================== END OF MIGRATION ====================

-- Analyze affected tables
ANALYZE public.users;
ANALYZE public.contracts;
ANALYZE public.vendors;
ANALYZE public.agent_tasks;
ANALYZE public.agent_insights;
ANALYZE public.agent_memory;
ANALYZE public.notifications;
ANALYZE public.rfqs;
ANALYZE public.sourcing_requests;
ANALYZE public.vendor_issues;
