-- =====================================================
-- Auto-Renewal Deadline Management
-- =====================================================
-- Description: Proactively manage auto-renewing contracts with escalating urgency
-- Agents triggered:
--   1. Legal Agent: Auto-renewal decision analysis (priority 7-9)
--   2. Vendor Agent: Performance review for renewal (priority 6-8)
-- Triggers: Daily scheduled check for auto_renew contracts expiring in 90/60/30 days
-- =====================================================

-- Daily scheduled function to check auto-renewal contracts
CREATE OR REPLACE FUNCTION check_auto_renewal_contracts_daily()
RETURNS void AS $$
DECLARE
    v_contract RECORD;
    v_days_until_expiry INTEGER;
    v_urgency_tier INTEGER; -- 1 = 90 days, 2 = 60 days, 3 = 30 days
    v_legal_agent_id UUID;
    v_vendor_agent_id UUID;
    v_legal_priority INTEGER;
    v_vendor_priority INTEGER;
    v_severity VARCHAR(20);
    v_vendor_name VARCHAR(255);
BEGIN
    -- Loop through all auto-renewing contracts approaching expiration
    FOR v_contract IN
        SELECT
            c.*,
            (c.end_date - CURRENT_DATE) as days_until_expiry
        FROM contracts c
        WHERE c.deleted_at IS NULL
        AND c.auto_renew = true
        AND c.status = 'active'
        AND c.end_date IS NOT NULL
        AND c.end_date >= CURRENT_DATE
        AND c.end_date <= CURRENT_DATE + INTERVAL '90 days'
    LOOP
        v_days_until_expiry := v_contract.days_until_expiry;

        -- Determine urgency tier and priorities
        IF v_days_until_expiry <= 30 THEN
            v_urgency_tier := 3;
            v_legal_priority := 9;  -- Critical
            v_vendor_priority := 8;
            v_severity := 'critical';
        ELSIF v_days_until_expiry <= 60 THEN
            v_urgency_tier := 2;
            v_legal_priority := 8;  -- High
            v_vendor_priority := 7;
            v_severity := 'high';
        ELSE  -- <= 90 days
            v_urgency_tier := 1;
            v_legal_priority := 7;  -- Medium-high
            v_vendor_priority := 6;
            v_severity := 'medium';
        END IF;

        -- Get vendor name if exists
        IF v_contract.vendor_id IS NOT NULL THEN
            SELECT name INTO v_vendor_name FROM vendors WHERE id = v_contract.vendor_id;
        END IF;

        -- Get agent IDs
        SELECT id INTO v_legal_agent_id
        FROM agents
        WHERE type = 'legal'
        AND enterprise_id = v_contract.enterprise_id
        AND is_active = true
        LIMIT 1;

        SELECT id INTO v_vendor_agent_id
        FROM agents
        WHERE type = 'vendor'
        AND enterprise_id = v_contract.enterprise_id
        AND is_active = true
        LIMIT 1;

        -- Queue Legal Agent task: Auto-renewal decision analysis
        IF v_legal_agent_id IS NOT NULL THEN
            -- Check if recent task exists (prevent daily duplicates)
            IF NOT EXISTS (
                SELECT 1 FROM agent_tasks
                WHERE contract_id = v_contract.id
                AND task_type = 'auto_renewal_decision_analysis'
                AND status IN ('pending', 'processing')
                AND created_at > NOW() - INTERVAL '14 days'
            ) THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    contract_id,
                    enterprise_id,
                    status
                ) VALUES (
                    v_legal_agent_id,
                    'auto_renewal_decision_analysis',
                    v_legal_priority,
                    jsonb_build_object(
                        'contract_id', v_contract.id,
                        'contract_title', v_contract.title,
                        'vendor_id', v_contract.vendor_id,
                        'vendor_name', v_vendor_name,
                        'end_date', v_contract.end_date,
                        'days_until_expiry', v_days_until_expiry,
                        'urgency_tier', v_urgency_tier,
                        'current_value', v_contract.value,
                        'payment_terms', v_contract.payment_terms,
                        'analysis_type', 'auto_renewal_decision',
                        'trigger_source', 'auto_renewal_automation',
                        'requested_outputs', jsonb_build_array(
                            'renewal_recommendation',
                            'risk_assessment',
                            'terms_comparison_market',
                            'alternative_options',
                            'cancellation_process_if_needed',
                            'negotiation_opportunities',
                            'decision_deadline'
                        )
                    ),
                    v_contract.id,
                    v_contract.enterprise_id,
                    'pending'
                );
            END IF;
        END IF;

        -- Queue Vendor Agent task: Performance review (if vendor exists)
        IF v_vendor_agent_id IS NOT NULL AND v_contract.vendor_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM agent_tasks
                WHERE contract_id = v_contract.id
                AND vendor_id = v_contract.vendor_id
                AND task_type = 'auto_renewal_vendor_review'
                AND status IN ('pending', 'processing')
                AND created_at > NOW() - INTERVAL '14 days'
            ) THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    contract_id,
                    vendor_id,
                    enterprise_id,
                    status
                ) VALUES (
                    v_vendor_agent_id,
                    'auto_renewal_vendor_review',
                    v_vendor_priority,
                    jsonb_build_object(
                        'contract_id', v_contract.id,
                        'contract_title', v_contract.title,
                        'vendor_id', v_contract.vendor_id,
                        'vendor_name', v_vendor_name,
                        'end_date', v_contract.end_date,
                        'days_until_expiry', v_days_until_expiry,
                        'urgency_tier', v_urgency_tier,
                        'current_value', v_contract.value,
                        'analysis_type', 'auto_renewal_vendor_performance',
                        'trigger_source', 'auto_renewal_automation',
                        'requested_outputs', jsonb_build_array(
                            'vendor_performance_summary',
                            'relationship_quality_score',
                            'renewal_recommendation',
                            'alternative_vendor_comparison',
                            'cost_benefit_analysis',
                            'service_quality_trends'
                        )
                    ),
                    v_contract.id,
                    v_contract.vendor_id,
                    v_contract.enterprise_id,
                    'pending'
                );
            END IF;
        END IF;

        -- Create/update notification based on urgency tier
        -- Only create new notification if tier changed or no recent notification exists
        IF NOT EXISTS (
            SELECT 1 FROM notifications
            WHERE data->>'contract_id' = v_contract.id::text
            AND type = 'auto_renewal_decision_required'
            AND data->>'urgency_tier' = v_urgency_tier::text
            AND created_at > NOW() - INTERVAL '7 days'
        ) THEN
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                severity,
                data,
                enterprise_id,
                action_url
            ) VALUES (
                COALESCE(v_contract.owner_id, v_contract.created_by),
                'auto_renewal_decision_required',
                format('%s: Auto-Renewal Decision Required - %s',
                    CASE v_urgency_tier
                        WHEN 3 THEN 'URGENT'
                        WHEN 2 THEN 'IMPORTANT'
                        ELSE 'NOTICE'
                    END,
                    v_contract.title
                ),
                format(
                    'Contract "%s" is set to auto-renew in %s days (%s). Review performance and decide: renew, renegotiate, or cancel.%s',
                    v_contract.title,
                    v_days_until_expiry,
                    v_contract.end_date,
                    CASE
                        WHEN v_vendor_name IS NOT NULL THEN format(' Vendor: %s', v_vendor_name)
                        ELSE ''
                    END
                ),
                v_severity,
                jsonb_build_object(
                    'contract_id', v_contract.id,
                    'vendor_id', v_contract.vendor_id,
                    'end_date', v_contract.end_date,
                    'days_until_expiry', v_days_until_expiry,
                    'urgency_tier', v_urgency_tier,
                    'current_value', v_contract.value,
                    'action_required', CASE v_urgency_tier
                        WHEN 3 THEN 'immediate_decision'
                        WHEN 2 THEN 'decision_needed'
                        ELSE 'review_recommended'
                    END
                ),
                v_contract.enterprise_id,
                format('/dashboard/contracts/%s?action=renewal-decision', v_contract.id)
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to cancel auto-renewal (requires explicit approval)
CREATE OR REPLACE FUNCTION cancel_auto_renewal(
    p_contract_id UUID,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_enterprise_id UUID;
    v_contract RECORD;
    v_result JSONB;
BEGIN
    -- Get user context
    SELECT id, enterprise_id INTO v_user_id, v_enterprise_id
    FROM users WHERE auth_id = auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get contract
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = p_contract_id
    AND enterprise_id = v_enterprise_id
    AND deleted_at IS NULL;

    IF v_contract.id IS NULL THEN
        RAISE EXCEPTION 'Contract not found or access denied';
    END IF;

    -- Verify user has permission (manager, admin, owner)
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = v_user_id
        AND enterprise_id = v_enterprise_id
        AND role IN ('manager', 'admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to cancel auto-renewal';
    END IF;

    -- Update contract
    UPDATE contracts
    SET
        auto_renew = false,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'auto_renewal_cancelled', true,
            'cancelled_by', v_user_id,
            'cancelled_at', NOW(),
            'cancellation_reason', COALESCE(p_cancellation_reason, 'Manual cancellation')
        ),
        updated_at = NOW()
    WHERE id = p_contract_id;

    -- Create audit notification
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        severity,
        data,
        enterprise_id,
        action_url
    ) VALUES (
        v_contract.owner_id,
        'auto_renewal_cancelled',
        format('Auto-Renewal Cancelled: %s', v_contract.title),
        format('Auto-renewal for contract "%s" has been cancelled. Contract will expire on %s.',
            v_contract.title,
            v_contract.end_date
        ),
        'medium',
        jsonb_build_object(
            'contract_id', p_contract_id,
            'cancelled_by', v_user_id,
            'cancellation_reason', COALESCE(p_cancellation_reason, 'Manual cancellation')
        ),
        v_enterprise_id,
        format('/dashboard/contracts/%s', p_contract_id)
    );

    v_result := jsonb_build_object(
        'success', true,
        'contract_id', p_contract_id,
        'auto_renew', false,
        'message', 'Auto-renewal cancelled successfully'
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION check_auto_renewal_contracts_daily() IS
'Daily scheduled function to proactively manage auto-renewing contracts.
Urgency tiers: 90 days (medium), 60 days (high), 30 days (critical)
Triggers: Legal Agent (renewal analysis) and Vendor Agent (performance review)
Creates escalating notifications requiring explicit renewal decision.';

COMMENT ON FUNCTION cancel_auto_renewal(UUID, TEXT) IS
'Allows authorized users (manager+) to cancel auto-renewal for a contract.
Requires explicit user action to prevent unwanted auto-renewals.
Creates audit trail with cancellation reason and user information.';
