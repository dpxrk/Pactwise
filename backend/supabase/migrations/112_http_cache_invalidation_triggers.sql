-- ============================================================================
-- Migration: 112_http_cache_invalidation_triggers.sql
-- Description: HTTP Cache Invalidation Triggers
--
-- Creates database triggers that notify the cache system when data changes.
-- These triggers send notifications via pg_notify that are picked up by
-- the cache-invalidation-webhook edge function for automatic cache invalidation.
--
-- Supports:
-- - Event-based invalidation on INSERT/UPDATE/DELETE
-- - Cascade invalidation for related data
-- - Performance metrics tracking
-- ============================================================================

-- ============================================================================
-- 1. CACHE INVALIDATION NOTIFICATION FUNCTION
-- ============================================================================

-- Function to send cache invalidation notifications
CREATE OR REPLACE FUNCTION notify_cache_invalidation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enterprise_id uuid;
  v_resource_id uuid;
  v_payload jsonb;
BEGIN
  -- Get enterprise_id and resource_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_enterprise_id := OLD.enterprise_id;
    v_resource_id := OLD.id;
  ELSE
    v_enterprise_id := NEW.enterprise_id;
    v_resource_id := NEW.id;
  END IF;

  -- Skip if no enterprise_id (shouldn't happen due to RLS)
  IF v_enterprise_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build notification payload
  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'enterprise_id', v_enterprise_id,
    'resource_id', v_resource_id,
    'timestamp', NOW()
  );

  -- Add old/new record for UPDATE operations (for cascade detection)
  IF TG_OP = 'UPDATE' THEN
    -- Only include relevant fields for cascade detection
    v_payload := v_payload || jsonb_build_object(
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(to_jsonb(NEW))
        WHERE key IN ('status', 'value', 'vendor_id', 'budget_id', 'category', 'risk_level', 'performance_score')
        AND value IS DISTINCT FROM (to_jsonb(OLD) -> key)
      )
    );
  END IF;

  -- Send notification
  PERFORM pg_notify('cache_invalidation', v_payload::text);

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION notify_cache_invalidation() IS
  'Trigger function that sends cache invalidation notifications via pg_notify';

-- ============================================================================
-- 2. CACHE INVALIDATION TRIGGERS FOR KEY TABLES
-- ============================================================================

-- Contracts table - affects dashboard, vendors, budgets
DROP TRIGGER IF EXISTS tr_contracts_cache_invalidation ON contracts;
CREATE TRIGGER tr_contracts_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation();

-- Vendors table - affects dashboard, contracts
DROP TRIGGER IF EXISTS tr_vendors_cache_invalidation ON vendors;
CREATE TRIGGER tr_vendors_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation();

-- Budgets table - affects dashboard, contracts
DROP TRIGGER IF EXISTS tr_budgets_cache_invalidation ON budgets;
CREATE TRIGGER tr_budgets_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation();

-- Budget allocations - affects budgets and contracts
DROP TRIGGER IF EXISTS tr_budget_allocations_cache_invalidation ON budget_allocations;
CREATE TRIGGER tr_budget_allocations_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON budget_allocations
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation();

-- Compliance checks - affects dashboard
DROP TRIGGER IF EXISTS tr_compliance_checks_cache_invalidation ON compliance_checks;
CREATE TRIGGER tr_compliance_checks_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON compliance_checks
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation();

-- Contract approvals - affects dashboard and contracts
DROP TRIGGER IF EXISTS tr_contract_approvals_cache_invalidation ON contract_approvals;
CREATE TRIGGER tr_contract_approvals_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON contract_approvals
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation();

-- Contract obligations - affects contracts
DROP TRIGGER IF EXISTS tr_contract_obligations_cache_invalidation ON contract_obligations;
CREATE TRIGGER tr_contract_obligations_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON contract_obligations
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation();

-- Clause library - affects contracts
DROP TRIGGER IF EXISTS tr_clause_library_cache_invalidation ON clause_library;
CREATE TRIGGER tr_clause_library_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON clause_library
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation();

-- Enterprises table - affects public metrics
DROP TRIGGER IF EXISTS tr_enterprises_cache_invalidation ON enterprises;
CREATE TRIGGER tr_enterprises_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON enterprises
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation();

-- ============================================================================
-- 3. LIGHTWEIGHT NOTIFICATION FOR HIGH-FREQUENCY TABLES
-- ============================================================================

-- For tables with very high write frequency, use a debounced approach
-- These tables notify less frequently to prevent cache thrashing

CREATE OR REPLACE FUNCTION notify_cache_invalidation_debounced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enterprise_id uuid;
  v_last_notification timestamptz;
  v_debounce_key text;
BEGIN
  -- Get enterprise_id
  IF TG_OP = 'DELETE' THEN
    v_enterprise_id := OLD.enterprise_id;
  ELSE
    v_enterprise_id := NEW.enterprise_id;
  END IF;

  -- Skip if no enterprise_id
  IF v_enterprise_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check debounce (using a simple approach with session variables)
  -- In production, this could use a separate debounce table
  v_debounce_key := 'cache_debounce_' || TG_TABLE_NAME || '_' || v_enterprise_id::text;

  BEGIN
    v_last_notification := current_setting(v_debounce_key, true)::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    v_last_notification := NULL;
  END;

  -- Only notify if more than 5 seconds since last notification
  IF v_last_notification IS NULL OR (NOW() - v_last_notification) > INTERVAL '5 seconds' THEN
    PERFORM pg_notify('cache_invalidation', jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'enterprise_id', v_enterprise_id,
      'debounced', true,
      'timestamp', NOW()
    )::text);

    -- Update debounce timestamp
    PERFORM set_config(v_debounce_key, NOW()::text, false);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION notify_cache_invalidation_debounced() IS
  'Debounced cache invalidation for high-frequency tables (max 1 notification per 5 seconds per enterprise)';

-- Audit logs - high frequency, use debounced
DROP TRIGGER IF EXISTS tr_audit_logs_cache_invalidation ON audit_logs;
CREATE TRIGGER tr_audit_logs_cache_invalidation
  AFTER INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation_debounced();

-- Agent tasks - high frequency, use debounced
DROP TRIGGER IF EXISTS tr_agent_tasks_cache_invalidation ON agent_tasks;
CREATE TRIGGER tr_agent_tasks_cache_invalidation
  AFTER INSERT OR UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_cache_invalidation_debounced();

-- ============================================================================
-- 4. CACHE STATISTICS TABLE
-- ============================================================================

-- Table to track cache invalidation statistics for monitoring
CREATE TABLE IF NOT EXISTS cache_invalidation_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES enterprises(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  invalidation_count integer DEFAULT 0,
  last_invalidation_at timestamptz DEFAULT NOW(),
  hour_bucket timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW(),

  -- Unique constraint for upsert
  CONSTRAINT unique_stats_bucket UNIQUE (enterprise_id, table_name, operation_type, hour_bucket)
);

-- Index for querying by enterprise and time
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_stats_enterprise
  ON cache_invalidation_stats(enterprise_id, hour_bucket DESC);

-- Enable RLS
ALTER TABLE cache_invalidation_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Enterprises can view their own cache stats"
  ON cache_invalidation_stats FOR SELECT
  USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

CREATE POLICY "System can insert cache stats"
  ON cache_invalidation_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update cache stats"
  ON cache_invalidation_stats FOR UPDATE
  USING (true);

-- Function to record cache invalidation statistics
CREATE OR REPLACE FUNCTION record_cache_invalidation_stat(
  p_enterprise_id uuid,
  p_table_name text,
  p_operation_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hour_bucket timestamptz;
BEGIN
  -- Calculate hour bucket
  v_hour_bucket := date_trunc('hour', NOW());

  -- Upsert statistics
  INSERT INTO cache_invalidation_stats (
    enterprise_id,
    table_name,
    operation_type,
    invalidation_count,
    last_invalidation_at,
    hour_bucket
  )
  VALUES (
    p_enterprise_id,
    p_table_name,
    p_operation_type,
    1,
    NOW(),
    v_hour_bucket
  )
  ON CONFLICT (enterprise_id, table_name, operation_type, hour_bucket)
  DO UPDATE SET
    invalidation_count = cache_invalidation_stats.invalidation_count + 1,
    last_invalidation_at = NOW();
END;
$$;

COMMENT ON FUNCTION record_cache_invalidation_stat IS
  'Records cache invalidation statistics for monitoring and analysis';

-- ============================================================================
-- 5. CLEANUP FUNCTION FOR OLD STATISTICS
-- ============================================================================

-- Function to clean up old cache invalidation statistics (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_cache_invalidation_stats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM cache_invalidation_stats
  WHERE hour_bucket < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_cache_invalidation_stats() IS
  'Cleans up cache invalidation statistics older than 30 days';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users for stats functions
GRANT EXECUTE ON FUNCTION record_cache_invalidation_stat TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_cache_invalidation_stats TO service_role;

-- Grant table permissions
GRANT SELECT ON cache_invalidation_stats TO authenticated;
GRANT INSERT, UPDATE ON cache_invalidation_stats TO service_role;

-- ============================================================================
-- 7. ADD TABLE COMMENT
-- ============================================================================

COMMENT ON TABLE cache_invalidation_stats IS
  'Tracks cache invalidation events for monitoring and performance analysis. Statistics are aggregated by hour.';

-- ============================================================================
-- Migration Complete
-- ============================================================================
