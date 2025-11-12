-- Migration 078: Automate Pending Analysis Workflow
-- Description: Automatically set contracts to pending_analysis when uploaded, then to pending_review after AI analysis
-- Author: System
-- Date: 2025-01-29

-- =====================================================
-- PURPOSE: Automate the contract lifecycle workflow
--
-- New Workflow:
-- 1. Upload → pending_analysis (automatic)
-- 2. AI analyzes contract
-- 3. pending_analysis → pending_review (automatic when analysis completes)
-- 4. Approvals → active (existing logic)
-- =====================================================

-- =====================================================
-- FUNCTION: Update contract status trigger (OVERRIDE)
-- Purpose: Set new contracts with files to pending_analysis
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
    v_has_file BOOLEAN;
BEGIN
    -- For INSERT, we don't have access to the record yet in the database
    -- So we do a simplified check based on NEW values directly

    IF TG_OP = 'INSERT' THEN
        -- Check if contract has a file uploaded
        v_has_file := (NEW.storage_id IS NOT NULL AND NEW.storage_id != '');

        -- Simple completeness check for new contracts
        v_is_complete := (
            NEW.title IS NOT NULL AND NEW.title != '' AND
            NEW.vendor_id IS NOT NULL AND
            NEW.start_date IS NOT NULL AND
            NEW.end_date IS NOT NULL AND
            NEW.value IS NOT NULL AND NEW.value > 0 AND
            v_has_file
        );

        v_is_expired := (NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE);

        -- NEW WORKFLOW: Contracts with files automatically go to pending_analysis
        IF v_is_expired THEN
            NEW.status := 'expired';
        ELSIF v_has_file THEN
            -- Any contract with a file should go to pending_analysis first
            NEW.status := 'pending_analysis';
            -- Set analysis_status to pending if not already set
            IF NEW.analysis_status IS NULL THEN
                NEW.analysis_status := 'pending';
            END IF;
        ELSIF v_is_complete THEN
            -- Complete contracts without files go to pending_review
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
            OLD.storage_id IS DISTINCT FROM NEW.storage_id OR
            OLD.analysis_status IS DISTINCT FROM NEW.analysis_status
        ) THEN
            v_has_file := (NEW.storage_id IS NOT NULL AND NEW.storage_id != '');

            -- Do the same simplified check
            v_is_complete := (
                NEW.title IS NOT NULL AND NEW.title != '' AND
                NEW.vendor_id IS NOT NULL AND
                NEW.start_date IS NOT NULL AND
                NEW.end_date IS NOT NULL AND
                NEW.value IS NOT NULL AND NEW.value > 0 AND
                v_has_file
            );

            v_is_expired := (NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE);

            -- Don't override manually set archived/terminated status
            IF NEW.status NOT IN ('archived', 'terminated') THEN
                -- TRANSITION: pending_analysis → pending_review when analysis completes
                IF OLD.status = 'pending_analysis' AND
                   NEW.analysis_status = 'completed' AND
                   v_is_complete THEN
                    NEW.status := 'pending_review';

                -- Handle file upload on existing draft
                ELSIF OLD.status = 'draft' AND
                      NOT (OLD.storage_id IS NOT NULL AND OLD.storage_id != '') AND
                      v_has_file THEN
                    NEW.status := 'pending_analysis';
                    IF NEW.analysis_status IS NULL THEN
                        NEW.analysis_status := 'pending';
                    END IF;

                -- Handle expired contracts
                ELSIF v_is_expired AND OLD.status = 'active' THEN
                    NEW.status := 'expired';

                -- Handle incomplete contracts going back to draft
                ELSIF NOT v_is_complete AND OLD.status NOT IN ('draft', 'pending_analysis') THEN
                    -- Only move back to draft if it was complete before
                    NEW.status := 'draft';

                -- Handle draft becoming complete (without file goes to pending_review)
                ELSIF v_is_complete AND OLD.status = 'draft' AND NOT v_has_file THEN
                    NEW.status := 'pending_review';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_auto_update_contract_status IS
'Automatically updates contract status: Upload → pending_analysis → pending_review → active';

-- The trigger already exists from migration 058, so we don't need to recreate it
-- The function replacement above will be used by the existing trigger

-- =====================================================
-- FUNCTION: Transition contract after analysis
-- Purpose: Called when AI analysis completes to move contract to next stage
-- =====================================================

CREATE OR REPLACE FUNCTION transition_contract_after_analysis(
    p_contract_id UUID,
    p_analysis_status TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_contract RECORD;
    v_old_status contract_status;
    v_new_status contract_status;
    v_result JSONB;
BEGIN
    -- Get contract
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = p_contract_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found: %', p_contract_id;
    END IF;

    v_old_status := v_contract.status;

    -- Update analysis_status
    UPDATE contracts
    SET
        analysis_status = p_analysis_status,
        analyzed_at = CASE WHEN p_analysis_status = 'completed' THEN NOW() ELSE analyzed_at END,
        updated_at = NOW()
    WHERE id = p_contract_id;

    -- The trigger will handle status transition from pending_analysis → pending_review
    -- when analysis_status changes to 'completed'

    -- Get updated status
    SELECT status INTO v_new_status
    FROM contracts
    WHERE id = p_contract_id;

    -- Build result
    v_result := jsonb_build_object(
        'contract_id', p_contract_id,
        'old_status', v_old_status,
        'new_status', v_new_status,
        'analysis_status', p_analysis_status,
        'transitioned', v_old_status != v_new_status
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION transition_contract_after_analysis IS
'Updates contract analysis status and triggers automatic status transition when analysis completes';

-- Grant permissions
GRANT EXECUTE ON FUNCTION transition_contract_after_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION transition_contract_after_analysis TO service_role;

-- =====================================================
-- Update MIGRATION_INDEX.md entry
-- =====================================================
-- | 078 | 078_automate_pending_analysis_workflow.sql | Automate pending_analysis workflow: Upload → pending_analysis → pending_review |
