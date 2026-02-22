-- ============================================================================
-- Migration 143: Atomic Operation Functions
-- ============================================================================
--
-- Creates PL/pgSQL functions for multi-table operations that must be atomic.
-- These functions are called via supabase.rpc() from edge functions.
--
-- Pattern: Each function handles a complete business operation within a single
-- database transaction. If any step fails, the entire operation rolls back
-- automatically (PostgreSQL function-level transaction semantics).
--
-- Created: 2026-02-22
-- ============================================================================

-- ============================================================================
-- 1. Atomic Contract Creation
-- Creates a contract with its line items and obligations in one transaction.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_contract_with_items(
  p_contract JSONB,
  p_line_items JSONB DEFAULT '[]'::JSONB,
  p_obligations JSONB DEFAULT '[]'::JSONB,
  p_enterprise_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id UUID;
  v_enterprise_id UUID;
  v_line_item JSONB;
  v_obligation JSONB;
  v_result JSON;
BEGIN
  -- Resolve enterprise_id from parameter or contract payload
  v_enterprise_id := COALESCE(p_enterprise_id, (p_contract->>'enterprise_id')::UUID);

  IF v_enterprise_id IS NULL THEN
    RAISE EXCEPTION 'enterprise_id is required';
  END IF;

  -- Insert contract
  INSERT INTO contracts (
    enterprise_id,
    title,
    vendor_id,
    contract_type,
    status,
    start_date,
    end_date,
    total_value,
    currency,
    description,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_enterprise_id,
    p_contract->>'title',
    (p_contract->>'vendor_id')::UUID,
    COALESCE(p_contract->>'contract_type', 'standard'),
    COALESCE(p_contract->>'status', 'draft'),
    (p_contract->>'start_date')::DATE,
    (p_contract->>'end_date')::DATE,
    (p_contract->>'total_value')::NUMERIC,
    COALESCE(p_contract->>'currency', 'USD'),
    p_contract->>'description',
    COALESCE(p_contract->'metadata', '{}'::JSONB),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_contract_id;

  -- Insert line items
  FOR v_line_item IN SELECT * FROM jsonb_array_elements(p_line_items)
  LOOP
    INSERT INTO contract_line_items (
      contract_id,
      enterprise_id,
      description,
      quantity,
      unit_price,
      total_price,
      currency,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      v_contract_id,
      v_enterprise_id,
      v_line_item->>'description',
      COALESCE((v_line_item->>'quantity')::NUMERIC, 1),
      COALESCE((v_line_item->>'unit_price')::NUMERIC, 0),
      COALESCE((v_line_item->>'total_price')::NUMERIC, 0),
      COALESCE(v_line_item->>'currency', 'USD'),
      COALESCE(v_line_item->'metadata', '{}'::JSONB),
      NOW(),
      NOW()
    );
  END LOOP;

  -- Insert obligations
  FOR v_obligation IN SELECT * FROM jsonb_array_elements(p_obligations)
  LOOP
    INSERT INTO obligations (
      contract_id,
      enterprise_id,
      title,
      description,
      due_date,
      status,
      priority,
      assigned_to,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      v_contract_id,
      v_enterprise_id,
      v_obligation->>'title',
      v_obligation->>'description',
      (v_obligation->>'due_date')::DATE,
      COALESCE(v_obligation->>'status', 'pending'),
      COALESCE(v_obligation->>'priority', 'medium'),
      (v_obligation->>'assigned_to')::UUID,
      COALESCE(v_obligation->'metadata', '{}'::JSONB),
      NOW(),
      NOW()
    );
  END LOOP;

  -- Build result
  v_result := json_build_object(
    'contract_id', v_contract_id,
    'line_items_count', jsonb_array_length(p_line_items),
    'obligations_count', jsonb_array_length(p_obligations)
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to create contract: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION create_contract_with_items IS
  'Atomically creates a contract with line items and obligations. Rolls back completely on any failure.';

GRANT EXECUTE ON FUNCTION create_contract_with_items TO authenticated;

-- ============================================================================
-- 2. Atomic Bulk Contract Import
-- Imports multiple contracts in a single transaction.
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_import_contracts(
  p_contracts JSONB,
  p_enterprise_id UUID,
  p_imported_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract JSONB;
  v_contract_id UUID;
  v_imported_count INT := 0;
  v_failed_count INT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_result JSON;
BEGIN
  IF p_enterprise_id IS NULL THEN
    RAISE EXCEPTION 'enterprise_id is required';
  END IF;

  FOR v_contract IN SELECT * FROM jsonb_array_elements(p_contracts)
  LOOP
    BEGIN
      INSERT INTO contracts (
        enterprise_id,
        title,
        vendor_id,
        contract_type,
        status,
        start_date,
        end_date,
        total_value,
        currency,
        description,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        p_enterprise_id,
        v_contract->>'title',
        (v_contract->>'vendor_id')::UUID,
        COALESCE(v_contract->>'contract_type', 'standard'),
        'draft',
        (v_contract->>'start_date')::DATE,
        (v_contract->>'end_date')::DATE,
        (v_contract->>'total_value')::NUMERIC,
        COALESCE(v_contract->>'currency', 'USD'),
        v_contract->>'description',
        jsonb_build_object(
          'imported', true,
          'imported_by', p_imported_by,
          'imported_at', NOW()
        ),
        NOW(),
        NOW()
      )
      RETURNING id INTO v_contract_id;

      v_imported_count := v_imported_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'title', v_contract->>'title',
        'error', SQLERRM
      );
    END;
  END LOOP;

  v_result := json_build_object(
    'imported', v_imported_count,
    'failed', v_failed_count,
    'errors', v_errors,
    'total', jsonb_array_length(p_contracts)
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION bulk_import_contracts IS
  'Imports multiple contracts atomically. Individual contract failures are tracked but do not abort the batch.';

GRANT EXECUTE ON FUNCTION bulk_import_contracts TO authenticated;

-- ============================================================================
-- 3. Atomic User Onboarding
-- Creates enterprise + assigns user as owner in one transaction.
-- (Supplements the existing create_enterprise_with_owner from migration 142)
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_user_onboarding(
  p_user_id UUID,
  p_enterprise_name TEXT,
  p_domain TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL
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

  -- Check user doesn't already have an enterprise
  IF EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id AND enterprise_id IS NOT NULL
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

  -- Update user as owner with profile info
  UPDATE users
  SET
    enterprise_id = v_enterprise_id,
    role = 'owner',
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    department = COALESCE(p_department, department),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Create default agent configurations for the new enterprise
  INSERT INTO agents (enterprise_id, agent_type, name, status, config, created_at, updated_at)
  VALUES
    (v_enterprise_id, 'secretary', 'Secretary Agent', 'active', '{}'::JSONB, NOW(), NOW()),
    (v_enterprise_id, 'legal', 'Legal Agent', 'active', '{}'::JSONB, NOW(), NOW()),
    (v_enterprise_id, 'financial', 'Financial Agent', 'active', '{}'::JSONB, NOW(), NOW()),
    (v_enterprise_id, 'vendor', 'Vendor Agent', 'active', '{}'::JSONB, NOW(), NOW()),
    (v_enterprise_id, 'manager', 'Manager Agent', 'active', '{}'::JSONB, NOW(), NOW()),
    (v_enterprise_id, 'analytics', 'Analytics Agent', 'active', '{}'::JSONB, NOW(), NOW()),
    (v_enterprise_id, 'notifications', 'Notifications Agent', 'active', '{}'::JSONB, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  v_result := json_build_object(
    'enterprise_id', v_enterprise_id,
    'enterprise_name', p_enterprise_name,
    'user_id', p_user_id,
    'role', 'owner',
    'agents_created', 7
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Onboarding failed: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION complete_user_onboarding IS
  'Atomically creates enterprise, assigns user as owner, and provisions default agents.';

GRANT EXECUTE ON FUNCTION complete_user_onboarding TO authenticated;
