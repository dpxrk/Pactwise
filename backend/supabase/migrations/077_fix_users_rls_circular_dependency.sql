-- Migration: Fix circular dependency in users table RLS policies
-- Description: Add policy to allow users to view their own profile by auth_id
--              This fixes the circular dependency where current_user_enterprise_id()
--              tries to query the same table that's being protected by RLS
-- Created: 2025-11-11

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- Create policy to allow users to read their own profile by auth_id
-- This solves the circular dependency issue where:
-- 1. User tries to fetch profile: SELECT * FROM users WHERE auth_id = ?
-- 2. RLS policy checks: enterprise_id = current_user_enterprise_id()
-- 3. current_user_enterprise_id() tries: SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
-- 4. This creates a circular dependency!
--
-- Solution: Allow direct access to own profile by auth_id
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
TO public
USING (auth_id = auth.uid());

-- Verify the policy was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'users'
        AND policyname = 'Users can view their own profile'
    ) THEN
        RAISE NOTICE '✅ Policy "Users can view their own profile" created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create policy "Users can view their own profile"';
    END IF;
END $$;
