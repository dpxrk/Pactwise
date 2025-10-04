-- Migration 060: Vendor-Contract Relationship Enforcement & Optimization
-- This migration:
-- 1. Makes vendor_id NOT NULL in contracts (enforces requirement)
-- 2. Creates materialized view for vendor metrics (performance optimization)
-- 3. Updates triggers to refresh materialized view efficiently

-- ============================================================================
-- STEP 1: Handle existing contracts without vendors
-- ============================================================================

-- First, check if there are any contracts without vendors
DO $$
DECLARE
    v_orphan_count INTEGER;
    v_default_vendor_id UUID;
BEGIN
    -- Count contracts without vendors
    SELECT COUNT(*) INTO v_orphan_count
    FROM contracts
    WHERE vendor_id IS NULL AND deleted_at IS NULL;

    IF v_orphan_count > 0 THEN
        -- Create a system placeholder vendor for orphaned contracts
        INSERT INTO vendors (
            name,
            category,
            status,
            enterprise_id,
            created_by,
            metadata
        )
        SELECT DISTINCT
            'System - Unassigned Vendor',
            'other',
            'inactive',
            enterprise_id,
            created_by,
            jsonb_build_object('system_generated', true, 'placeholder', true)
        FROM contracts
        WHERE vendor_id IS NULL AND deleted_at IS NULL
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_default_vendor_id;

        -- Assign orphaned contracts to placeholder vendor
        UPDATE contracts
        SET vendor_id = v_default_vendor_id,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('vendor_auto_assigned', true)
        WHERE vendor_id IS NULL AND deleted_at IS NULL;

        RAISE NOTICE 'Assigned % orphaned contracts to placeholder vendor', v_orphan_count;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Make vendor_id NOT NULL
-- ============================================================================

-- Add NOT NULL constraint to vendor_id
ALTER TABLE contracts
ALTER COLUMN vendor_id SET NOT NULL;

-- Add check constraint for additional safety (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'contracts_vendor_id_valid'
    ) THEN
        ALTER TABLE contracts
        ADD CONSTRAINT contracts_vendor_id_valid
        CHECK (vendor_id IS NOT NULL);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN contracts.vendor_id IS 'Required foreign key to vendors table. Every contract must be associated with a vendor.';

-- ============================================================================
-- STEP 3: Create Materialized View for Vendor Metrics
-- ============================================================================

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS vendor_metrics_mv CASCADE;

-- Create optimized materialized view for vendor metrics
CREATE MATERIALIZED VIEW vendor_metrics_mv AS
WITH contract_metrics AS (
    SELECT
        vendor_id,
        COALESCE(SUM(value), 0) AS total_contract_value,
        COUNT(*) FILTER (WHERE status = 'active') AS active_contracts_count,
        COUNT(*) AS total_contracts,
        MAX(updated_at) AS latest_contract_update
    FROM contracts
    WHERE deleted_at IS NULL
    GROUP BY vendor_id
),
compliance_metrics AS (
    SELECT
        vendor_id,
        AVG(CASE
            WHEN passed = true THEN 5.0
            WHEN passed = false THEN 2.0
            ELSE 3.0
        END) AS avg_compliance_score
    FROM compliance_checks
    WHERE performed_at IS NOT NULL
    GROUP BY vendor_id
)
SELECT
    v.id AS vendor_id,
    v.name AS vendor_name,
    v.enterprise_id,
    COALESCE(cm.total_contract_value, 0) AS total_contract_value,
    COALESCE(cm.active_contracts_count, 0) AS active_contracts,
    COALESCE(cm.total_contracts, 0) AS total_contracts,
    COALESCE(comp.avg_compliance_score, 3.0) AS compliance_score,
    -- Calculate performance score based on contracts and compliance
    LEAST(5.0, GREATEST(0.0,
        (CASE
            WHEN COALESCE(cm.active_contracts_count, 0) > 0 THEN 3.5
            ELSE 2.0
        END + COALESCE(comp.avg_compliance_score, 3.0)) / 2
    )) AS performance_score,
    COALESCE(cm.latest_contract_update, v.updated_at) AS last_metric_update,
    NOW() AS metrics_calculated_at
FROM vendors v
LEFT JOIN contract_metrics cm ON v.id = cm.vendor_id
LEFT JOIN compliance_metrics comp ON v.id = comp.vendor_id
WHERE v.deleted_at IS NULL;

-- Create indexes on materialized view for fast lookups
CREATE UNIQUE INDEX idx_vendor_metrics_mv_vendor_id ON vendor_metrics_mv(vendor_id);
CREATE INDEX idx_vendor_metrics_mv_enterprise_id ON vendor_metrics_mv(enterprise_id);
CREATE INDEX idx_vendor_metrics_mv_active_contracts ON vendor_metrics_mv(active_contracts DESC);
CREATE INDEX idx_vendor_metrics_mv_total_value ON vendor_metrics_mv(total_contract_value DESC);

-- Add comment
COMMENT ON MATERIALIZED VIEW vendor_metrics_mv IS 'Materialized view containing pre-calculated vendor metrics for performance. Refreshed on contract changes.';

-- ============================================================================
-- STEP 4: Create Function to Refresh Materialized View Concurrently
-- ============================================================================

-- Function to refresh vendor metrics materialized view
CREATE OR REPLACE FUNCTION refresh_vendor_metrics_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh concurrently to avoid locking
    REFRESH MATERIALIZED VIEW CONCURRENTLY vendor_metrics_mv;
EXCEPTION
    WHEN OTHERS THEN
        -- If concurrent refresh fails (e.g., first time), do regular refresh
        REFRESH MATERIALIZED VIEW vendor_metrics_mv;
END;
$$;

-- ============================================================================
-- STEP 5: Update Trigger Function for Efficient Metrics Updates
-- ============================================================================

-- Replace the old trigger function with one that uses materialized view
CREATE OR REPLACE FUNCTION trigger_update_vendor_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Instead of recalculating immediately, schedule a refresh
    -- This is more efficient as multiple rapid changes trigger only one refresh

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update the vendor's updated_at timestamp to track when refresh is needed
        UPDATE vendors
        SET updated_at = NOW()
        WHERE id = NEW.vendor_id;

        -- If vendor changed, update old vendor too
        IF TG_OP = 'UPDATE' AND OLD.vendor_id IS NOT NULL AND OLD.vendor_id != NEW.vendor_id THEN
            UPDATE vendors
            SET updated_at = NOW()
            WHERE id = OLD.vendor_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vendor_id IS NOT NULL THEN
            UPDATE vendors
            SET updated_at = NOW()
            WHERE id = OLD.vendor_id;
        END IF;
    END IF;

    -- Trigger async refresh of materialized view
    -- Note: In production, this would ideally be done via a job queue
    -- For now, we'll refresh immediately but this could be optimized with pg_cron
    PERFORM refresh_vendor_metrics_mv();

    RETURN NULL;
END;
$$;

-- ============================================================================
-- STEP 6: Add Helper Function to Sync Vendor Table with Materialized View
-- ============================================================================

-- Function to sync vendor table metrics from materialized view
CREATE OR REPLACE FUNCTION sync_vendor_metrics_from_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update vendor table with metrics from materialized view
    UPDATE vendors v
    SET
        total_contract_value = mv.total_contract_value,
        active_contracts = mv.active_contracts,
        compliance_score = mv.compliance_score,
        performance_score = mv.performance_score,
        updated_at = NOW()
    FROM vendor_metrics_mv mv
    WHERE v.id = mv.vendor_id
    AND (
        v.total_contract_value IS DISTINCT FROM mv.total_contract_value OR
        v.active_contracts IS DISTINCT FROM mv.active_contracts OR
        v.compliance_score IS DISTINCT FROM mv.compliance_score OR
        v.performance_score IS DISTINCT FROM mv.performance_score
    );
END;
$$;

-- ============================================================================
-- STEP 7: Initial Refresh
-- ============================================================================

-- Perform initial refresh of materialized view
REFRESH MATERIALIZED VIEW vendor_metrics_mv;

-- Sync vendor table with initial metrics
SELECT sync_vendor_metrics_from_mv();

-- ============================================================================
-- STEP 8: Add Performance Indexes
-- ============================================================================

-- Add index on contracts.vendor_id for faster joins (if not already exists)
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_id ON contracts(vendor_id) WHERE deleted_at IS NULL;

-- Add index on contracts status and vendor for common queries
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_status ON contracts(vendor_id, status) WHERE deleted_at IS NULL;

-- Add index on contracts value for aggregations
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_value ON contracts(vendor_id, value) WHERE deleted_at IS NULL AND value IS NOT NULL;

-- ============================================================================
-- STEP 9: Add Documentation
-- ============================================================================

-- Add documentation comment
DO $$
BEGIN
    EXECUTE format(
        'COMMENT ON CONSTRAINT contracts_vendor_id_valid ON contracts IS %L',
        'Migration 060: Enforces that every contract must have a vendor. Added ' || NOW()::TEXT
    );
END $$;
