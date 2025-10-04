-- Migration 059: Optimize Contract Auto-Status Detection
-- Description: Performance optimizations and security improvements for auto-status detection
-- Author: System
-- Date: 2025-01-29

-- =====================================================
-- INDEXES for Performance
-- =====================================================

-- Index for approval lookups during status determination
CREATE INDEX IF NOT EXISTS idx_contract_approvals_contract_status
ON contract_approvals(contract_id, status, approval_type)
WHERE status IN ('approved', 'rejected');

-- Index for finding contracts needing status updates
CREATE INDEX IF NOT EXISTS idx_contracts_status_fields
ON contracts(status, end_date, start_date, deleted_at)
WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_contract_approvals_contract_status IS
'Optimizes approval status lookups during contract status determination';

COMMENT ON INDEX idx_contracts_status_fields IS
'Optimizes contract status queries and expiry checks';

-- =====================================================
-- OPTIMIZED FUNCTION: assess_contract_completeness_fast
-- Purpose: Lightweight version that returns only what's needed
-- =====================================================

CREATE OR REPLACE FUNCTION assess_contract_completeness_fast(
    p_title TEXT,
    p_vendor_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_value NUMERIC,
    p_storage_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        p_title IS NOT NULL AND p_title != '' AND
        p_vendor_id IS NOT NULL AND
        p_start_date IS NOT NULL AND
        p_end_date IS NOT NULL AND
        p_value IS NOT NULL AND p_value > 0 AND
        p_storage_id IS NOT NULL AND p_storage_id != ''
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

COMMENT ON FUNCTION assess_contract_completeness_fast IS
'Fast inline completeness check without database lookups';

-- =====================================================
-- OPTIMIZED FUNCTION: get_approval_summary
-- Purpose: Single query to get all approval info
-- =====================================================

CREATE OR REPLACE FUNCTION get_approval_summary(p_contract_id UUID)
RETURNS TABLE (
    total_approvals BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT,
    pending_count BIGINT,
    has_final_approval BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_approvals,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        BOOL_OR(approval_type = 'final_approval' AND status = 'approved') as has_final_approval
    FROM contract_approvals
    WHERE contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

COMMENT ON FUNCTION get_approval_summary IS
'Single query to get all approval information for a contract';

-- =====================================================
-- OPTIMIZED FUNCTION: determine_contract_status_optimized
-- Purpose: Faster status determination with fewer queries
-- =====================================================

CREATE OR REPLACE FUNCTION determine_contract_status_optimized(
    p_contract_id UUID,
    p_title TEXT DEFAULT NULL,
    p_vendor_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_value NUMERIC DEFAULT NULL,
    p_storage_id TEXT DEFAULT NULL,
    p_current_status contract_status DEFAULT NULL
)
RETURNS contract_status AS $$
DECLARE
    v_title TEXT;
    v_vendor_id UUID;
    v_start_date DATE;
    v_end_date DATE;
    v_value NUMERIC;
    v_storage_id TEXT;
    v_status contract_status;
    v_is_complete BOOLEAN;
    v_approval_summary RECORD;
BEGIN
    -- If parameters not provided, fetch from database (UPDATE case)
    IF p_title IS NULL THEN
        SELECT
            title, vendor_id, start_date, end_date, value, storage_id, status
        INTO v_title, v_vendor_id, v_start_date, v_end_date, v_value, v_storage_id, v_status
        FROM contracts
        WHERE id = p_contract_id AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Contract not found: %', p_contract_id;
        END IF;
    ELSE
        -- Use provided parameters (INSERT/UPDATE trigger case)
        v_title := p_title;
        v_vendor_id := p_vendor_id;
        v_start_date := p_start_date;
        v_end_date := p_end_date;
        v_value := p_value;
        v_storage_id := p_storage_id;
        v_status := COALESCE(p_current_status, 'draft');
    END IF;

    -- Don't change manually set terminal states
    IF v_status IN ('archived', 'terminated') THEN
        RETURN v_status;
    END IF;

    -- Check if expired (fast check first)
    IF v_end_date IS NOT NULL AND v_end_date < CURRENT_DATE THEN
        RETURN 'expired'::contract_status;
    END IF;

    -- Fast completeness check
    v_is_complete := assess_contract_completeness_fast(
        v_title,
        v_vendor_id,
        v_start_date,
        v_end_date,
        v_value,
        v_storage_id
    );

    -- If not complete, it's a draft
    IF NOT v_is_complete THEN
        RETURN 'draft'::contract_status;
    END IF;

    -- Get approval summary in one query
    SELECT * INTO v_approval_summary
    FROM get_approval_summary(p_contract_id);

    -- If any rejections, back to draft
    IF v_approval_summary.rejected_count > 0 THEN
        RETURN 'draft'::contract_status;
    END IF;

    -- If no approvals required yet, needs review
    IF v_approval_summary.total_approvals = 0 THEN
        RETURN 'pending_review'::contract_status;
    END IF;

    -- If pending approvals exist, still in review
    IF v_approval_summary.pending_count > 0 THEN
        RETURN 'pending_review'::contract_status;
    END IF;

    -- If has final approval and all are approved, it's active
    IF v_approval_summary.has_final_approval THEN
        -- Check date range for active status
        IF v_start_date IS NOT NULL AND v_end_date IS NOT NULL THEN
            IF CURRENT_DATE >= v_start_date AND CURRENT_DATE <= v_end_date THEN
                RETURN 'active'::contract_status;
            ELSIF CURRENT_DATE < v_start_date THEN
                -- Future contract
                RETURN 'pending_review'::contract_status;
            END IF;
        ELSE
            RETURN 'active'::contract_status;
        END IF;
    END IF;

    -- Default: keep current or set to pending_review
    RETURN COALESCE(v_status, 'pending_review'::contract_status);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION determine_contract_status_optimized IS
'Optimized contract status determination with minimal database queries';

-- =====================================================
-- OPTIMIZED TRIGGER: Smart status updates
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_auto_update_contract_status_optimized()
RETURNS TRIGGER AS $$
DECLARE
    v_new_status contract_status;
    v_status_changed BOOLEAN := FALSE;
BEGIN
    -- Only process if relevant fields changed or new insert
    IF TG_OP = 'INSERT' OR (
        TG_OP = 'UPDATE' AND (
            OLD.title IS DISTINCT FROM NEW.title OR
            OLD.vendor_id IS DISTINCT FROM NEW.vendor_id OR
            OLD.start_date IS DISTINCT FROM NEW.start_date OR
            OLD.end_date IS DISTINCT FROM NEW.end_date OR
            OLD.value IS DISTINCT FROM NEW.value OR
            OLD.storage_id IS DISTINCT FROM NEW.storage_id
        )
    ) THEN
        -- Determine new status with provided values (avoids extra SELECT)
        v_new_status := determine_contract_status_optimized(
            NEW.id,
            NEW.title,
            NEW.vendor_id,
            NEW.start_date,
            NEW.end_date,
            NEW.value,
            NEW.storage_id,
            NEW.status
        );

        -- Only update if status actually changed
        IF TG_OP = 'INSERT' OR v_new_status IS DISTINCT FROM OLD.status THEN
            NEW.status := v_new_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace old trigger
DROP TRIGGER IF EXISTS auto_update_contract_status_trigger ON contracts;
CREATE TRIGGER auto_update_contract_status_trigger
    BEFORE INSERT OR UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_update_contract_status_optimized();

COMMENT ON TRIGGER auto_update_contract_status_trigger ON contracts IS
'Optimized automatic contract status updates';

-- =====================================================
-- OPTIMIZED TRIGGER: Approval-based status updates
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_auto_update_on_approval_optimized()
RETURNS TRIGGER AS $$
DECLARE
    v_new_status contract_status;
    v_contract RECORD;
    v_user_id UUID;
BEGIN
    -- Only process if status changed to approved/rejected
    IF TG_OP = 'INSERT' OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN

        -- Get contract details in one query
        SELECT
            id, title, vendor_id, start_date, end_date, value,
            storage_id, status, created_by, last_modified_by
        INTO v_contract
        FROM contracts
        WHERE id = NEW.contract_id AND deleted_at IS NULL;

        IF FOUND THEN
            -- Determine new status
            v_new_status := determine_contract_status_optimized(
                v_contract.id,
                v_contract.title,
                v_contract.vendor_id,
                v_contract.start_date,
                v_contract.end_date,
                v_contract.value,
                v_contract.storage_id,
                v_contract.status
            );

            -- Update if changed
            IF v_new_status IS DISTINCT FROM v_contract.status THEN
                UPDATE contracts
                SET status = v_new_status, updated_at = NOW()
                WHERE id = v_contract.id;

                -- Log change
                v_user_id := COALESCE(
                    auth.uid(),
                    NEW.approver_id,
                    v_contract.created_by,
                    v_contract.last_modified_by
                );

                IF v_user_id IS NOT NULL THEN
                    INSERT INTO contract_status_history (
                        contract_id,
                        previous_status,
                        new_status,
                        changed_by,
                        reason,
                        metadata
                    ) VALUES (
                        v_contract.id,
                        v_contract.status,
                        v_new_status,
                        v_user_id,
                        'Auto-updated after approval change',
                        jsonb_build_object(
                            'approval_id', NEW.id,
                            'approval_type', NEW.approval_type,
                            'approval_status', NEW.status
                        )
                    );
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace old trigger
DROP TRIGGER IF EXISTS auto_update_contract_status_on_approval_trigger ON contract_approvals;
CREATE TRIGGER auto_update_contract_status_on_approval_trigger
    AFTER INSERT OR UPDATE ON contract_approvals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_update_on_approval_optimized();

COMMENT ON TRIGGER auto_update_contract_status_on_approval_trigger ON contract_approvals IS
'Optimized contract status updates when approvals change';

-- =====================================================
-- UTILITY FUNCTION: Bulk status update for existing contracts
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_all_contract_statuses(
    p_enterprise_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    contract_id UUID,
    old_status contract_status,
    new_status contract_status,
    updated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH contract_updates AS (
        SELECT
            c.id,
            c.status as current_status,
            determine_contract_status_optimized(
                c.id,
                c.title,
                c.vendor_id,
                c.start_date,
                c.end_date,
                c.value,
                c.storage_id,
                c.status
            ) as calculated_status
        FROM contracts c
        WHERE c.deleted_at IS NULL
          AND (p_enterprise_id IS NULL OR c.enterprise_id = p_enterprise_id)
          AND c.status NOT IN ('archived', 'terminated')
        LIMIT p_limit
    )
    SELECT
        cu.id::UUID,
        cu.current_status,
        cu.calculated_status,
        (cu.current_status IS DISTINCT FROM cu.calculated_status) as updated
    FROM contract_updates cu;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_all_contract_statuses IS
'Utility to recalculate and preview status changes for existing contracts';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION assess_contract_completeness_fast TO authenticated;
GRANT EXECUTE ON FUNCTION get_approval_summary TO authenticated;
GRANT EXECUTE ON FUNCTION determine_contract_status_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_contract_statuses TO authenticated;