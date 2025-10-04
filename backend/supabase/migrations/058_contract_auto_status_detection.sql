-- Migration 058: Contract Auto-Status Detection
-- Description: Automatically determine and update contract status based on completeness and approvals
-- Author: System
-- Date: 2025-01-29

-- =====================================================
-- FUNCTION: assess_contract_completeness
-- Purpose: Evaluates if a contract is complete enough to be considered "finalized"
-- Returns: JSON object with completeness status and details
-- =====================================================

CREATE OR REPLACE FUNCTION assess_contract_completeness(p_contract_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_contract RECORD;
    v_required_approvals INTEGER;
    v_approved_count INTEGER;
    v_pending_count INTEGER;
    v_rejected_count INTEGER;
    v_is_complete BOOLEAN := true;
    v_missing_fields TEXT[] := ARRAY[]::TEXT[];
    v_result JSONB;
BEGIN
    -- Get contract details
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = p_contract_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found: %', p_contract_id;
    END IF;

    -- Check required fields for a finalized contract
    IF v_contract.title IS NULL OR v_contract.title = '' THEN
        v_is_complete := false;
        v_missing_fields := array_append(v_missing_fields, 'title');
    END IF;

    IF v_contract.vendor_id IS NULL THEN
        v_is_complete := false;
        v_missing_fields := array_append(v_missing_fields, 'vendor_id');
    END IF;

    IF v_contract.start_date IS NULL THEN
        v_is_complete := false;
        v_missing_fields := array_append(v_missing_fields, 'start_date');
    END IF;

    IF v_contract.end_date IS NULL THEN
        v_is_complete := false;
        v_missing_fields := array_append(v_missing_fields, 'end_date');
    END IF;

    IF v_contract.value IS NULL OR v_contract.value <= 0 THEN
        v_is_complete := false;
        v_missing_fields := array_append(v_missing_fields, 'value');
    END IF;

    -- Check if file is uploaded
    IF v_contract.storage_id IS NULL OR v_contract.storage_id = '' THEN
        v_is_complete := false;
        v_missing_fields := array_append(v_missing_fields, 'document_file');
    END IF;

    -- Check approval status (signature completeness)
    SELECT
        COUNT(*) FILTER (WHERE approval_type = 'final_approval'),
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'rejected')
    INTO
        v_required_approvals,
        v_approved_count,
        v_pending_count,
        v_rejected_count
    FROM contract_approvals
    WHERE contract_id = p_contract_id;

    -- Build result object
    v_result := jsonb_build_object(
        'contract_id', p_contract_id,
        'is_complete', v_is_complete,
        'missing_fields', v_missing_fields,
        'approvals', jsonb_build_object(
            'required', v_required_approvals,
            'approved', v_approved_count,
            'pending', v_pending_count,
            'rejected', v_rejected_count,
            'all_approved', (v_required_approvals > 0 AND v_approved_count = v_required_approvals),
            'has_rejections', (v_rejected_count > 0)
        ),
        'current_status', v_contract.status,
        'analysis_status', v_contract.analysis_status
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assess_contract_completeness IS
'Assesses whether a contract has all required fields filled and all necessary approvals';

-- =====================================================
-- FUNCTION: determine_contract_status
-- Purpose: Determines what status a contract should have based on its completeness
-- Returns: The recommended contract_status enum value
-- =====================================================

CREATE OR REPLACE FUNCTION determine_contract_status(p_contract_id UUID)
RETURNS contract_status AS $$
DECLARE
    v_assessment JSONB;
    v_contract RECORD;
    v_new_status contract_status;
    v_all_approved BOOLEAN;
    v_has_rejections BOOLEAN;
    v_is_complete BOOLEAN;
    v_is_expired BOOLEAN;
BEGIN
    -- Get contract
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = p_contract_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found: %', p_contract_id;
    END IF;

    -- Check if expired
    v_is_expired := (v_contract.end_date IS NOT NULL AND v_contract.end_date < CURRENT_DATE);

    -- If already expired, keep or set to expired
    IF v_is_expired AND v_contract.status = 'active' THEN
        RETURN 'expired'::contract_status;
    END IF;

    -- If manually archived or terminated, don't change
    IF v_contract.status IN ('archived', 'terminated') THEN
        RETURN v_contract.status;
    END IF;

    -- Get completeness assessment
    v_assessment := assess_contract_completeness(p_contract_id);
    v_is_complete := (v_assessment->>'is_complete')::BOOLEAN;
    v_all_approved := (v_assessment->'approvals'->>'all_approved')::BOOLEAN;
    v_has_rejections := (v_assessment->'approvals'->>'has_rejections')::BOOLEAN;

    -- Decision logic for status

    -- If has rejections, back to draft for revision
    IF v_has_rejections THEN
        RETURN 'draft'::contract_status;
    END IF;

    -- If not complete, it's a draft
    IF NOT v_is_complete THEN
        RETURN 'draft'::contract_status;
    END IF;

    -- If complete but no approvals exist yet, needs review
    IF v_is_complete AND (v_assessment->'approvals'->>'required')::INTEGER = 0 THEN
        RETURN 'pending_review'::contract_status;
    END IF;

    -- If complete and has pending approvals, it's pending review
    IF v_is_complete AND (v_assessment->'approvals'->>'pending')::INTEGER > 0 THEN
        RETURN 'pending_review'::contract_status;
    END IF;

    -- If complete and all approvals signed, it's active
    IF v_is_complete AND v_all_approved THEN
        -- Check if it has valid dates and is within active period
        IF v_contract.start_date IS NOT NULL AND v_contract.end_date IS NOT NULL THEN
            IF CURRENT_DATE >= v_contract.start_date AND CURRENT_DATE <= v_contract.end_date THEN
                RETURN 'active'::contract_status;
            ELSIF CURRENT_DATE < v_contract.start_date THEN
                -- Future contract, pending to become active
                RETURN 'pending_review'::contract_status;
            ELSE
                RETURN 'expired'::contract_status;
            END IF;
        ELSE
            RETURN 'active'::contract_status;
        END IF;
    END IF;

    -- Default: if unsure, keep current or set to draft
    IF v_contract.status IS NOT NULL THEN
        RETURN v_contract.status;
    ELSE
        RETURN 'draft'::contract_status;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION determine_contract_status IS
'Determines the appropriate status for a contract based on completeness and approvals';

-- =====================================================
-- FUNCTION: update_contract_status_auto
-- Purpose: Updates a contract's status based on automated assessment
-- Returns: The new status that was set
-- =====================================================

CREATE OR REPLACE FUNCTION update_contract_status_auto(p_contract_id UUID)
RETURNS contract_status AS $$
DECLARE
    v_new_status contract_status;
    v_current_status contract_status;
    v_user_id UUID;
    v_contract RECORD;
BEGIN
    -- Get contract and current status
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = p_contract_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found: %', p_contract_id;
    END IF;

    v_current_status := v_contract.status;

    -- Try to get current user, fallback to contract creator
    v_user_id := COALESCE(auth.uid(), v_contract.created_by, v_contract.last_modified_by);

    -- Determine new status
    v_new_status := determine_contract_status(p_contract_id);

    -- Only update if status changed
    IF v_new_status != v_current_status THEN
        UPDATE contracts
        SET
            status = v_new_status,
            updated_at = NOW()
        WHERE id = p_contract_id;

        -- Log status change (only if we have a valid user_id)
        IF v_user_id IS NOT NULL THEN
            INSERT INTO contract_status_history (
                contract_id,
                previous_status,
                new_status,
                changed_by,
                reason
            ) VALUES (
                p_contract_id,
                v_current_status,
                v_new_status,
                v_user_id,
                'Auto-updated based on completeness assessment'
            );
        END IF;
    END IF;

    RETURN v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_contract_status_auto IS
'Automatically updates contract status based on completeness and approval state';

-- =====================================================
-- TRIGGER: auto_update_contract_status
-- Purpose: Automatically updates contract status when relevant fields change
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_auto_update_contract_status()
RETURNS TRIGGER AS $$
DECLARE
    v_assessment JSONB;
    v_is_complete BOOLEAN;
    v_all_approved BOOLEAN;
    v_has_rejections BOOLEAN;
    v_new_status contract_status;
    v_is_expired BOOLEAN;
BEGIN
    -- For INSERT, we don't have access to the record yet in the database
    -- So we do a simplified check based on NEW values directly

    IF TG_OP = 'INSERT' THEN
        -- Simple completeness check for new contracts
        v_is_complete := (
            NEW.title IS NOT NULL AND NEW.title != '' AND
            NEW.vendor_id IS NOT NULL AND
            NEW.start_date IS NOT NULL AND
            NEW.end_date IS NOT NULL AND
            NEW.value IS NOT NULL AND NEW.value > 0 AND
            NEW.storage_id IS NOT NULL AND NEW.storage_id != ''
        );

        v_is_expired := (NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE);

        -- Set initial status based on completeness
        IF v_is_expired THEN
            NEW.status := 'expired';
        ELSIF v_is_complete THEN
            -- Complete contracts should go to pending_review to await approvals
            NEW.status := 'pending_review';
        ELSE
            -- Incomplete contracts are drafts
            NEW.status := 'draft';
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- For UPDATE, only recalculate if relevant fields changed
        IF (
            OLD.title IS DISTINCT FROM NEW.title OR
            OLD.vendor_id IS DISTINCT FROM NEW.vendor_id OR
            OLD.start_date IS DISTINCT FROM NEW.start_date OR
            OLD.end_date IS DISTINCT FROM NEW.end_date OR
            OLD.value IS DISTINCT FROM NEW.value OR
            OLD.storage_id IS DISTINCT FROM NEW.storage_id
        ) THEN
            -- Do the same simplified check
            v_is_complete := (
                NEW.title IS NOT NULL AND NEW.title != '' AND
                NEW.vendor_id IS NOT NULL AND
                NEW.start_date IS NOT NULL AND
                NEW.end_date IS NOT NULL AND
                NEW.value IS NOT NULL AND NEW.value > 0 AND
                NEW.storage_id IS NOT NULL AND NEW.storage_id != ''
            );

            v_is_expired := (NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE);

            -- Don't override manually set archived/terminated status
            IF NEW.status NOT IN ('archived', 'terminated') THEN
                IF v_is_expired AND OLD.status = 'active' THEN
                    NEW.status := 'expired';
                ELSIF NOT v_is_complete AND OLD.status != 'draft' THEN
                    -- Only move back to draft if it was complete before
                    NEW.status := 'draft';
                ELSIF v_is_complete AND OLD.status = 'draft' THEN
                    -- If it becomes complete from draft, move to pending_review
                    NEW.status := 'pending_review';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS auto_update_contract_status_trigger ON contracts;

CREATE TRIGGER auto_update_contract_status_trigger
    BEFORE INSERT OR UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_update_contract_status();

COMMENT ON TRIGGER auto_update_contract_status_trigger ON contracts IS
'Automatically updates contract status when key fields change';

-- =====================================================
-- TRIGGER: auto_update_contract_status_on_approval
-- Purpose: Updates contract status when approvals change
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_auto_update_contract_status_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the associated contract's status
    PERFORM update_contract_status_auto(NEW.contract_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_update_contract_status_on_approval_trigger ON contract_approvals;

CREATE TRIGGER auto_update_contract_status_on_approval_trigger
    AFTER INSERT OR UPDATE ON contract_approvals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_update_contract_status_on_approval();

COMMENT ON TRIGGER auto_update_contract_status_on_approval_trigger ON contract_approvals IS
'Updates contract status when approvals are added or modified';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION assess_contract_completeness TO authenticated;
GRANT EXECUTE ON FUNCTION determine_contract_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_contract_status_auto TO authenticated;