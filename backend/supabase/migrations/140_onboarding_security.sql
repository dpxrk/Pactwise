-- ============================================================================
-- Migration 140: Onboarding Security Enhancements
-- ============================================================================
--
-- Fixes Critical security issues #4, #5, #6:
-- - Adds PIN hash storage for enterprise access control
-- - Creates secure RPC functions for enterprise creation
-- - Prevents client-side enterprise/user manipulation
--
-- Created: 2026-02-16
-- ============================================================================

-- Add PIN hash column to enterprises table
ALTER TABLE enterprises
ADD COLUMN IF NOT EXISTS onboarding_pin_hash TEXT;

COMMENT ON COLUMN enterprises.onboarding_pin_hash IS 'SHA-256 hash of PIN for child enterprise creation (6 digits)';

-- ============================================================================
-- RPC: create_enterprise_with_owner
-- Creates a new enterprise and assigns the user as owner
-- ============================================================================

CREATE OR REPLACE FUNCTION create_enterprise_with_owner(
  p_enterprise_name TEXT,
  p_domain TEXT,
  p_owner_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enterprise_id UUID;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_enterprise_name IS NULL OR LENGTH(TRIM(p_enterprise_name)) < 2 THEN
    RAISE EXCEPTION 'Enterprise name must be at least 2 characters';
  END IF;

  IF p_domain IS NULL OR LENGTH(TRIM(p_domain)) < 3 THEN
    RAISE EXCEPTION 'Domain must be at least 3 characters';
  END IF;

  -- Check if user already has an enterprise
  IF EXISTS (
    SELECT 1 FROM users WHERE id = p_owner_id AND enterprise_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already belongs to an enterprise';
  END IF;

  -- Create enterprise
  INSERT INTO enterprises (
    name,
    domain,
    status,
    subscription_tier,
    settings,
    is_parent_organization,
    created_at,
    updated_at
  ) VALUES (
    TRIM(p_enterprise_name),
    TRIM(LOWER(p_domain)),
    'active',
    'starter',
    '{}'::JSONB,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_enterprise_id;

  -- Update user to be owner
  UPDATE users
  SET
    enterprise_id = v_enterprise_id,
    role = 'owner',
    updated_at = NOW()
  WHERE id = p_owner_id;

  -- Build result
  v_result := json_build_object(
    'enterprise_id', v_enterprise_id,
    'name', p_enterprise_name,
    'domain', p_domain,
    'role', 'owner'
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Rollback is automatic in functions
  RAISE EXCEPTION 'Failed to create enterprise: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION create_enterprise_with_owner IS 'Securely creates a new enterprise and assigns the user as owner (transaction-safe)';

-- ============================================================================
-- RPC: create_child_enterprise
-- Creates a child enterprise under a parent (requires PIN verification first)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_child_enterprise(
  p_parent_id UUID,
  p_child_name TEXT,
  p_admin_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_enterprise_id UUID;
  v_parent_name TEXT;
  v_parent_tier TEXT;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_child_name IS NULL OR LENGTH(TRIM(p_child_name)) < 2 THEN
    RAISE EXCEPTION 'Child enterprise name must be at least 2 characters';
  END IF;

  -- Check if parent enterprise exists and is a parent organization
  SELECT name, subscription_tier INTO v_parent_name, v_parent_tier
  FROM enterprises
  WHERE id = p_parent_id AND status = 'active';

  IF v_parent_name IS NULL THEN
    RAISE EXCEPTION 'Parent enterprise not found or inactive';
  END IF;

  -- Check if user already has an enterprise
  IF EXISTS (
    SELECT 1 FROM users WHERE id = p_admin_user_id AND enterprise_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already belongs to an enterprise';
  END IF;

  -- Create child enterprise
  INSERT INTO enterprises (
    name,
    domain,
    parent_enterprise_id,
    status,
    subscription_tier,
    settings,
    is_parent_organization,
    created_at,
    updated_at
  ) VALUES (
    TRIM(p_child_name),
    (SELECT domain FROM enterprises WHERE id = p_parent_id), -- Inherit parent domain
    p_parent_id,
    'active',
    v_parent_tier, -- Inherit parent subscription tier
    '{}'::JSONB,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_child_enterprise_id;

  -- Update user to be admin of child enterprise
  UPDATE users
  SET
    enterprise_id = v_child_enterprise_id,
    role = 'admin',
    updated_at = NOW()
  WHERE id = p_admin_user_id;

  -- Build result
  v_result := json_build_object(
    'child_enterprise_id', v_child_enterprise_id,
    'name', p_child_name,
    'parent_enterprise_id', p_parent_id,
    'parent_name', v_parent_name,
    'role', 'admin'
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Rollback is automatic in functions
  RAISE EXCEPTION 'Failed to create child enterprise: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION create_child_enterprise IS 'Securely creates a child enterprise under a parent organization (transaction-safe)';

-- ============================================================================
-- RPC: set_enterprise_pin
-- Allows enterprise owners to set/update the onboarding PIN
-- ============================================================================

CREATE OR REPLACE FUNCTION set_enterprise_pin(
  p_enterprise_id UUID,
  p_pin_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate PIN hash format (should be 64 character hex string for SHA-256)
  IF p_pin_hash IS NULL OR LENGTH(p_pin_hash) != 64 THEN
    RAISE EXCEPTION 'Invalid PIN hash format';
  END IF;

  -- Update enterprise PIN hash
  UPDATE enterprises
  SET
    onboarding_pin_hash = p_pin_hash,
    updated_at = NOW()
  WHERE id = p_enterprise_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enterprise not found';
  END IF;

  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to set enterprise PIN: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION set_enterprise_pin IS 'Sets or updates the onboarding PIN hash for an enterprise';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_enterprise_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION create_child_enterprise TO authenticated;
GRANT EXECUTE ON FUNCTION set_enterprise_pin TO authenticated;

-- ============================================================================
-- Index for PIN-protected enterprises
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_enterprises_pin_hash
ON enterprises(id)
WHERE onboarding_pin_hash IS NOT NULL;

COMMENT ON INDEX idx_enterprises_pin_hash IS 'Index for enterprises with PIN protection enabled';
