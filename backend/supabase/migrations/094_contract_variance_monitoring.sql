-- =====================================================
-- Contract Value Variance Monitoring
-- =====================================================
-- Description: Automatically detect when actual contract spending deviates from expected value
-- Agents triggered:
--   1. Financial Agent: Variance investigation (priority 8)
--   2. Risk Assessment Agent: Budget impact assessment (priority 7)
-- Triggers: Event-driven (budget allocation changes) + Monthly scheduled variance check
-- =====================================================

-- Function to detect contract variance on budget allocation changes
CREATE OR REPLACE FUNCTION detect_contract_variance()
RETURNS TRIGGER AS $$
DECLARE
    v_financial_agent_id UUID;
    v_risk_agent_id UUID;
    v_contract RECORD;
    v_total_allocated DECIMAL(15,2);
    v_expected_value DECIMAL(15,2);
    v_variance_amount DECIMAL(15,2);
    v_variance_percent DECIMAL(5,2);
    v_is_significant_variance BOOLEAN := false;
    v_variance_type VARCHAR(50);
BEGIN
    -- Get contract details and total allocated amount
    SELECT
        c.*,
        COALESCE(SUM(cba.amount), 0) as total_allocated
    INTO v_contract
    FROM contracts c
    LEFT JOIN contract_budget_allocations cba ON cba.contract_id = c.id
    WHERE c.id = COALESCE(NEW.contract_id, OLD.contract_id)
    GROUP BY c.id;

    v_total_allocated := v_contract.total_allocated;
    v_expected_value := COALESCE(v_contract.value, 0);

    -- Skip if no expected value set
    IF v_expected_value = 0 THEN
        RETURN NEW;
    END IF;

    -- Calculate variance
    v_variance_amount := v_total_allocated - v_expected_value;
    v_variance_percent := (v_variance_amount / v_expected_value) * 100;

    -- Determine if variance is significant
    -- Alert if: actual > expected by 5%+ OR actual < expected by 10%+
    IF v_variance_percent >= 5 THEN
        v_is_significant_variance := true;
        v_variance_type := 'overspending';
    ELSIF v_variance_percent <= -10 THEN
        v_is_significant_variance := true;
        v_variance_type := 'underspending';
    END IF;

    -- Skip if no significant variance
    IF NOT v_is_significant_variance THEN
        RETURN NEW;
    END IF;

    -- Get agent IDs
    SELECT id INTO v_financial_agent_id
    FROM agents
    WHERE type = 'financial'
    AND enterprise_id = v_contract.enterprise_id
    AND is_active = true
    LIMIT 1;

    SELECT id INTO v_risk_agent_id
    FROM agents
    WHERE type = 'risk-assessment'
    AND enterprise_id = v_contract.enterprise_id
    AND is_active = true
    LIMIT 1;

    -- Queue Financial Agent task: Variance investigation
    IF v_financial_agent_id IS NOT NULL THEN
        -- Check if task already exists (prevent duplicates)
        IF NOT EXISTS (
            SELECT 1 FROM agent_tasks
            WHERE contract_id = v_contract.id
            AND task_type = 'contract_variance_investigation'
            AND status IN ('pending', 'processing')
            AND created_at > NOW() - INTERVAL '7 days'
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
                v_financial_agent_id,
                'contract_variance_investigation',
                CASE
                    WHEN ABS(v_variance_percent) >= 20 THEN 9  -- Critical variance
                    WHEN ABS(v_variance_percent) >= 10 THEN 8  -- High variance
                    ELSE 7  -- Medium-high variance
                END,
                jsonb_build_object(
                    'contract_id', v_contract.id,
                    'contract_title', v_contract.title,
                    'vendor_id', v_contract.vendor_id,
                    'expected_value', v_expected_value,
                    'actual_allocated', v_total_allocated,
                    'variance_amount', v_variance_amount,
                    'variance_percent', v_variance_percent,
                    'variance_type', v_variance_type,
                    'analysis_type', 'variance_investigation',
                    'trigger_source', 'contract_variance_automation',
                    'requested_outputs', jsonb_build_array(
                        'root_cause_analysis',
                        'billing_error_check',
                        'scope_creep_assessment',
                        'budget_adjustment_recommendation',
                        'vendor_communication_needed'
                    )
                ),
                v_contract.id,
                v_contract.enterprise_id,
                'pending'
            );
        END IF;
    END IF;

    -- Queue Risk Assessment Agent task: Budget impact assessment (if overspending)
    IF v_risk_agent_id IS NOT NULL AND v_variance_type = 'overspending' THEN
        IF NOT EXISTS (
            SELECT 1 FROM agent_tasks
            WHERE contract_id = v_contract.id
            AND task_type = 'contract_variance_risk_assessment'
            AND status IN ('pending', 'processing')
            AND created_at > NOW() - INTERVAL '7 days'
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
                v_risk_agent_id,
                'contract_variance_risk_assessment',
                CASE
                    WHEN v_variance_percent >= 20 THEN 8  -- High risk
                    ELSE 7  -- Medium-high risk
                END,
                jsonb_build_object(
                    'contract_id', v_contract.id,
                    'contract_title', v_contract.title,
                    'variance_amount', v_variance_amount,
                    'variance_percent', v_variance_percent,
                    'expected_value', v_expected_value,
                    'actual_allocated', v_total_allocated,
                    'analysis_type', 'variance_risk',
                    'trigger_source', 'contract_variance_automation',
                    'requested_outputs', jsonb_build_array(
                        'budget_impact_severity',
                        'cash_flow_risk',
                        'budget_reallocation_options',
                        'escalation_requirements',
                        'contract_amendment_needed'
                    )
                ),
                v_contract.id,
                v_contract.enterprise_id,
                'pending'
            );
        END IF;
    END IF;

    -- Create notification for contract owner
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
        'contract_variance_alert',
        format('%s Detected: %s',
            CASE WHEN v_variance_type = 'overspending' THEN 'Overspending' ELSE 'Underspending' END,
            v_contract.title
        ),
        format(
            'Contract "%s" shows %.1f%% variance. Expected: $%s, Actual: $%s (Difference: $%s)',
            v_contract.title,
            ABS(v_variance_percent),
            v_expected_value,
            v_total_allocated,
            ABS(v_variance_amount)
        ),
        CASE
            WHEN ABS(v_variance_percent) >= 20 THEN 'critical'
            WHEN ABS(v_variance_percent) >= 10 THEN 'high'
            ELSE 'medium'
        END,
        jsonb_build_object(
            'contract_id', v_contract.id,
            'expected_value', v_expected_value,
            'actual_allocated', v_total_allocated,
            'variance_amount', v_variance_amount,
            'variance_percent', v_variance_percent,
            'variance_type', v_variance_type
        ),
        v_contract.enterprise_id,
        format('/dashboard/contracts/%s', v_contract.id)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Monthly scheduled function to check all contract variances
CREATE OR REPLACE FUNCTION analyze_contract_variance_monthly()
RETURNS TABLE (
    enterprise_id UUID,
    contract_id UUID,
    contract_title VARCHAR,
    expected_value DECIMAL,
    actual_allocated DECIMAL,
    variance_amount DECIMAL,
    variance_percent DECIMAL,
    variance_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH contract_allocations AS (
        SELECT
            c.enterprise_id,
            c.id as contract_id,
            c.title as contract_title,
            c.value as expected_value,
            COALESCE(SUM(cba.amount), 0) as actual_allocated
        FROM contracts c
        LEFT JOIN contract_budget_allocations cba ON cba.contract_id = c.id
        WHERE c.deleted_at IS NULL
        AND c.status IN ('active', 'pending_review', 'pending_approval')
        AND c.value > 0
        GROUP BY c.id, c.enterprise_id, c.title, c.value
    )
    SELECT
        ca.enterprise_id,
        ca.contract_id,
        ca.contract_title,
        ca.expected_value,
        ca.actual_allocated,
        (ca.actual_allocated - ca.expected_value) as variance_amount,
        ((ca.actual_allocated - ca.expected_value) / ca.expected_value * 100)::DECIMAL(5,2) as variance_percent,
        CASE
            WHEN ca.actual_allocated > ca.expected_value THEN 'overspending'::VARCHAR
            ELSE 'underspending'::VARCHAR
        END as variance_type
    FROM contract_allocations ca
    WHERE (
        -- Overspending by 5%+
        (ca.actual_allocated - ca.expected_value) / ca.expected_value * 100 >= 5
        OR
        -- Underspending by 10%+
        (ca.actual_allocated - ca.expected_value) / ca.expected_value * 100 <= -10
    )
    ORDER BY ABS((ca.actual_allocated - ca.expected_value) / ca.expected_value) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contract_budget_allocations table
DROP TRIGGER IF EXISTS trigger_detect_contract_variance ON contract_budget_allocations;
CREATE TRIGGER trigger_detect_contract_variance
    AFTER INSERT OR UPDATE OR DELETE ON contract_budget_allocations
    FOR EACH ROW
    EXECUTE FUNCTION detect_contract_variance();

-- Add comments for documentation
COMMENT ON FUNCTION detect_contract_variance() IS
'Automatically detects significant contract value variance when budget allocations change.
Thresholds: overspending ≥5% OR underspending ≥10%
Triggers: Financial Agent (variance investigation) and Risk Assessment Agent (if overspending)
Priority escalates with variance severity (≥20% = critical).';

COMMENT ON FUNCTION analyze_contract_variance_monthly() IS
'Monthly scheduled function to identify all contracts with significant variance.
Returns contracts ranked by variance severity.
Should be called via cron job on the 1st of each month.';

COMMENT ON TRIGGER trigger_detect_contract_variance ON contract_budget_allocations IS
'Triggers variance analysis when contract budget allocations change.
Queues Financial Agent (priority 7-9) and Risk Assessment Agent (priority 7-8) for significant variances.';
