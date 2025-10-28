-- Migration: Batch Update Expired Contracts
-- Description: Creates a function to batch update all active contracts that have passed their end_date
-- Purpose: Fix contract status display bug where expired contracts show as "Expiring Soon"
-- Date: 2025-10-27

-- =====================================================
-- FUNCTION: batch_update_expired_contracts
-- Purpose: Find all active contracts with end_date < current_date and update to expired
-- Returns: JSONB with statistics about updated contracts
-- =====================================================

CREATE OR REPLACE FUNCTION batch_update_expired_contracts()
RETURNS JSONB AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_contract_ids UUID[];
    v_contract_id UUID;
    v_result JSONB;
BEGIN
    -- Find all active contracts that should be expired
    SELECT ARRAY_AGG(id) INTO v_contract_ids
    FROM contracts
    WHERE status = 'active'
      AND end_date IS NOT NULL
      AND end_date < CURRENT_DATE
      AND deleted_at IS NULL;

    -- If no contracts to update, return early
    IF v_contract_ids IS NULL OR array_length(v_contract_ids, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'updated_count', 0,
            'message', 'No expired contracts found',
            'timestamp', NOW()
        );
    END IF;

    -- Update all expired contracts
    FOREACH v_contract_id IN ARRAY v_contract_ids
    LOOP
        BEGIN
            -- Use existing function to update status (includes logging)
            PERFORM update_contract_status_auto(v_contract_id);
            v_updated_count := v_updated_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but continue with other contracts
                RAISE NOTICE 'Failed to update contract %: %', v_contract_id, SQLERRM;
        END;
    END LOOP;

    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'total_found', array_length(v_contract_ids, 1),
        'contract_ids', v_contract_ids,
        'message', format('%s contracts updated from active to expired', v_updated_count),
        'timestamp', NOW()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION batch_update_expired_contracts IS
'Batch updates all active contracts that have passed their end_date to expired status';

-- Grant execute permissions to service role (for Edge Functions)
GRANT EXECUTE ON FUNCTION batch_update_expired_contracts TO service_role;
GRANT EXECUTE ON FUNCTION batch_update_expired_contracts TO authenticated;

-- =====================================================
-- Test the function (commented out - uncomment to test manually)
-- =====================================================
-- SELECT batch_update_expired_contracts();
