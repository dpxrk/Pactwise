-- Migration: 006_rls_helper_functions
-- Description: Define RLS helper functions EARLY so they exist before being used in policies
--
-- CRITICAL: These functions are used by RLS policies starting in migration 008.
-- This migration MUST run before 008 to prevent "function does not exist" errors.
--
-- Note: Migration 081 also defines these functions with CREATE OR REPLACE.
-- This is intentional - 081 adds additional comments and ensures consistency.
-- Both migrations are idempotent thanks to CREATE OR REPLACE.

-- ==================== Helper Function 1: Get User's Enterprise ID ====================
CREATE OR REPLACE FUNCTION public.current_user_enterprise_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_enterprise_id UUID;
BEGIN
    -- SECURITY DEFINER allows this function to bypass RLS on users table
    -- This prevents circular dependency: Policy → Function → Query users → Policy → ...
    SELECT enterprise_id INTO v_enterprise_id
    FROM public.users
    WHERE auth_id = auth.uid()
      AND deleted_at IS NULL
    LIMIT 1;

    RETURN v_enterprise_id;
END;
$$;

-- ==================== Helper Function 2: Get User's ID ====================
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- SECURITY DEFINER allows this function to bypass RLS on users table
    SELECT id INTO v_user_id
    FROM public.users
    WHERE auth_id = auth.uid()
      AND deleted_at IS NULL
    LIMIT 1;

    RETURN v_user_id;
END;
$$;

-- ==================== Helper Function 3: Get User's Role ====================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- SECURITY DEFINER allows this function to bypass RLS on users table
    SELECT role::TEXT INTO v_user_role
    FROM public.users
    WHERE auth_id = auth.uid()
      AND deleted_at IS NULL
    LIMIT 1;

    RETURN v_user_role;
END;
$$;

-- ==================== Helper Function 4: Check User Role Permission ====================
CREATE OR REPLACE FUNCTION public.user_has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    v_user_hierarchy INTEGER;
    v_required_hierarchy INTEGER;
BEGIN
    -- SECURITY DEFINER allows this function to bypass RLS on users table
    SELECT role::TEXT INTO v_user_role
    FROM public.users
    WHERE auth_id = auth.uid()
      AND deleted_at IS NULL
    LIMIT 1;

    -- If user not found, deny access
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Role hierarchy: owner (5) > admin (4) > manager (3) > user (2) > viewer (1)
    v_user_hierarchy := CASE v_user_role
        WHEN 'owner' THEN 5
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'user' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;

    v_required_hierarchy := CASE required_role
        WHEN 'owner' THEN 5
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'user' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;

    -- User must have equal or higher role level
    RETURN v_user_hierarchy >= v_required_hierarchy;
END;
$$;

-- ==================== Helper Function 5: Check Multiple Roles ====================
CREATE OR REPLACE FUNCTION public.has_role_any(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    required_role TEXT;
BEGIN
    -- SECURITY DEFINER allows this function to bypass RLS on users table
    SELECT role::TEXT INTO v_user_role
    FROM public.users
    WHERE auth_id = auth.uid()
      AND deleted_at IS NULL
    LIMIT 1;

    -- If user not found, deny access
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user's role matches any of the required roles
    FOREACH required_role IN ARRAY required_roles
    LOOP
        IF user_has_role(required_role) THEN
            RETURN TRUE;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$;

-- ==================== Function Trigger Helper ====================
-- This function is commonly needed by triggers and may be referenced early
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ MIGRATION 006: RLS HELPER FUNCTIONS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Created helper functions for RLS policies:';
    RAISE NOTICE '  • current_user_enterprise_id()';
    RAISE NOTICE '  • current_user_id()';
    RAISE NOTICE '  • current_user_role()';
    RAISE NOTICE '  • user_has_role(TEXT)';
    RAISE NOTICE '  • has_role_any(TEXT[])';
    RAISE NOTICE '  • update_updated_at_column()';
    RAISE NOTICE '';
    RAISE NOTICE 'These functions MUST exist before migration 008 which uses them.';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;
