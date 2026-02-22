-- Migration: Safe Vendor Merge with Transaction Safety
-- Description: Comprehensive vendor merge function that updates all foreign key references atomically
-- Author: System
-- Date: 2026-02-16

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS merge_vendors(UUID, UUID, UUID, UUID);

-- Create comprehensive vendor merge function with full transaction safety
CREATE OR REPLACE FUNCTION merge_vendors(
    p_source_vendor_id UUID,
    p_target_vendor_id UUID,
    p_enterprise_id UUID,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_source_vendor RECORD;
    v_target_vendor RECORD;
    v_contracts_updated INT;
    v_total_updates INT := 0;
    v_result JSONB;
BEGIN
    -- Validate both vendors exist and belong to same enterprise
    SELECT * INTO v_source_vendor FROM vendors
    WHERE id = p_source_vendor_id
    AND enterprise_id = p_enterprise_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source vendor not found or already deleted';
    END IF;

    SELECT * INTO v_target_vendor FROM vendors
    WHERE id = p_target_vendor_id
    AND enterprise_id = p_enterprise_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target vendor not found or already deleted';
    END IF;

    -- Prevent self-merge
    IF p_source_vendor_id = p_target_vendor_id THEN
        RAISE EXCEPTION 'Cannot merge vendor with itself';
    END IF;

    -- Update all foreign key references to point to target vendor
    -- This is done in a transaction, so if any fail, all rollback

    -- 1. Contracts
    WITH updated AS (
        UPDATE contracts
        SET vendor_id = p_target_vendor_id,
            updated_at = NOW()
        WHERE vendor_id = p_source_vendor_id
        AND enterprise_id = p_enterprise_id
        RETURNING id
    )
    SELECT COUNT(*) INTO v_contracts_updated FROM updated;
    v_total_updates := v_total_updates + v_contracts_updated;

    -- 2. Compliance Evidence
    UPDATE compliance_evidence
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 3. Quotes
    UPDATE quotes
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 4. Signature Requests
    UPDATE signature_requests
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 5. Batch Upload Items (matched_vendor_id and created_vendor_id)
    UPDATE batch_upload_items
    SET matched_vendor_id = p_target_vendor_id
    WHERE matched_vendor_id = p_source_vendor_id;

    UPDATE batch_upload_items
    SET created_vendor_id = p_target_vendor_id
    WHERE created_vendor_id = p_source_vendor_id;

    -- 6. Extracted Documents
    UPDATE extracted_documents
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 7. Document Extraction Reviews
    UPDATE document_extraction_reviews
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 8. Document Processing Queue (auto_assigned_vendor_id and target_vendor_id)
    UPDATE document_processing_queue
    SET auto_assigned_vendor_id = p_target_vendor_id
    WHERE auto_assigned_vendor_id = p_source_vendor_id;

    UPDATE document_processing_queue
    SET target_vendor_id = p_target_vendor_id
    WHERE target_vendor_id = p_source_vendor_id;

    -- 9. Contract Intake Submissions
    UPDATE contract_intake_submissions
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 10. Agent Memory
    UPDATE agent_memory
    SET related_vendor_id = p_target_vendor_id
    WHERE related_vendor_id = p_source_vendor_id;

    -- 11. Temporal Events
    UPDATE temporal_events
    SET related_vendor_id = p_target_vendor_id
    WHERE related_vendor_id = p_source_vendor_id;

    -- 12. Market Intelligence
    UPDATE market_intelligence
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 13. Workflow Instances
    UPDATE workflow_instances
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 14. Agent Tasks (two vendor_id columns)
    UPDATE agent_tasks
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- Note: agent_tasks may have a different vendor column - check schema

    -- 15. Spend Transactions
    UPDATE spend_transactions
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 16. Vendor Scorecards
    UPDATE vendor_scorecards
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 17. Scorecard Metrics
    UPDATE scorecard_metrics
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- 18. Scorecard History
    UPDATE scorecard_history
    SET vendor_id = p_target_vendor_id
    WHERE vendor_id = p_source_vendor_id;

    -- Soft delete source vendor with merge metadata
    UPDATE vendors
    SET deleted_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'merged_into', p_target_vendor_id,
            'merged_by', p_user_id,
            'merged_at', NOW(),
            'contracts_migrated', v_contracts_updated
        )
    WHERE id = p_source_vendor_id
    AND enterprise_id = p_enterprise_id;

    -- Update target vendor performance metrics
    -- This recalculates metrics based on all contracts now pointing to target
    PERFORM update_vendor_performance_metrics(p_target_vendor_id);

    -- Build result JSON
    v_result := jsonb_build_object(
        'success', true,
        'source_vendor_id', p_source_vendor_id,
        'target_vendor_id', p_target_vendor_id,
        'contracts_migrated', v_contracts_updated,
        'total_updates', v_total_updates,
        'merged_at', NOW()
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Any error rolls back the entire transaction
        RAISE EXCEPTION 'Vendor merge failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION merge_vendors(UUID, UUID, UUID, UUID) IS
'Atomically merges source vendor into target vendor, updating all foreign key references across all tables. Wrapped in transaction to ensure data consistency. Soft deletes source vendor on success.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION merge_vendors(UUID, UUID, UUID, UUID) TO authenticated;
