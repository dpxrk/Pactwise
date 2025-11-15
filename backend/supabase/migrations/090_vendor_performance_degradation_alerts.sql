-- =====================================================
-- Vendor Performance Degradation Alerts
-- =====================================================
-- Description: Automatically detect and alert when vendor performance degrades
-- Agents triggered:
--   1. Vendor Agent: Performance remediation analysis (priority 8)
--   2. Risk Assessment Agent: Impact assessment (priority 7)
-- Triggers on: Vendor performance_score or compliance_score drops significantly
-- =====================================================

-- Function to detect vendor performance degradation and queue agent tasks
CREATE OR REPLACE FUNCTION detect_vendor_performance_degradation()
RETURNS TRIGGER AS $$
DECLARE
    v_vendor_agent_id UUID;
    v_risk_agent_id UUID;
    v_performance_drop DECIMAL(3,2);
    v_compliance_drop DECIMAL(3,2);
    v_active_contract_count INTEGER;
    v_total_contract_value DECIMAL(15,2);
    v_is_significant_degradation BOOLEAN := false;
    v_degradation_reason TEXT;
BEGIN
    -- Only process updates (performance changes)
    IF TG_OP != 'UPDATE' THEN
        RETURN NEW;
    END IF;

    -- Calculate performance score change
    v_performance_drop := OLD.performance_score - NEW.performance_score;
    v_compliance_drop := OLD.compliance_score - NEW.compliance_score;

    -- Determine if degradation is significant
    -- Thresholds: performance drop > 0.5 OR compliance drop > 0.3
    IF v_performance_drop >= 0.5 THEN
        v_is_significant_degradation := true;
        v_degradation_reason := format('Performance score dropped by %.2f points (from %.2f to %.2f)',
            v_performance_drop, OLD.performance_score, NEW.performance_score);
    END IF;

    IF v_compliance_drop >= 0.3 THEN
        v_is_significant_degradation := true;
        v_degradation_reason := COALESCE(v_degradation_reason || '; ', '') ||
            format('Compliance score dropped by %.2f points (from %.2f to %.2f)',
                v_compliance_drop, OLD.compliance_score, NEW.compliance_score);
    END IF;

    -- Skip if no significant degradation
    IF NOT v_is_significant_degradation THEN
        RETURN NEW;
    END IF;

    -- Get vendor's active contract metrics
    SELECT
        COUNT(*) FILTER (WHERE status IN ('active', 'pending_review', 'pending_approval')),
        COALESCE(SUM(value) FILTER (WHERE status IN ('active', 'pending_review', 'pending_approval')), 0)
    INTO v_active_contract_count, v_total_contract_value
    FROM contracts
    WHERE vendor_id = NEW.id
    AND deleted_at IS NULL;

    -- Get agent IDs for this enterprise
    SELECT id INTO v_vendor_agent_id
    FROM agents
    WHERE type = 'vendor'
    AND enterprise_id = NEW.enterprise_id
    AND is_active = true
    LIMIT 1;

    SELECT id INTO v_risk_agent_id
    FROM agents
    WHERE type = 'risk-assessment'
    AND enterprise_id = NEW.enterprise_id
    AND is_active = true
    LIMIT 1;

    -- Queue Vendor Agent task: Performance remediation analysis
    IF v_vendor_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_vendor_agent_id,
            'vendor_performance_remediation',
            CASE
                WHEN v_active_contract_count >= 3 OR v_total_contract_value >= 250000 THEN 9  -- Critical: high exposure
                WHEN v_performance_drop >= 1.0 OR v_compliance_drop >= 0.5 THEN 8  -- High: severe degradation
                ELSE 7  -- Medium-high: moderate degradation
            END,
            jsonb_build_object(
                'vendor_id', NEW.id,
                'vendor_name', NEW.name,
                'vendor_category', NEW.category,
                'degradation_reason', v_degradation_reason,
                'old_performance_score', OLD.performance_score,
                'new_performance_score', NEW.performance_score,
                'old_compliance_score', OLD.compliance_score,
                'new_compliance_score', NEW.compliance_score,
                'performance_drop', v_performance_drop,
                'compliance_drop', v_compliance_drop,
                'active_contracts', v_active_contract_count,
                'total_contract_value', v_total_contract_value,
                'analysis_type', 'performance_degradation_analysis',
                'trigger_source', 'vendor_performance_degradation_automation',
                'requested_outputs', jsonb_build_array(
                    'root_cause_analysis',
                    'remediation_recommendations',
                    'vendor_communication_draft',
                    'contract_impact_assessment',
                    'alternative_vendor_suggestions'
                )
            ),
            NEW.id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Queue Risk Assessment Agent task: Impact assessment (if significant exposure)
    IF v_risk_agent_id IS NOT NULL AND (v_active_contract_count >= 2 OR v_total_contract_value >= 100000) THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_risk_agent_id,
            'vendor_degradation_risk_assessment',
            CASE
                WHEN v_active_contract_count >= 5 OR v_total_contract_value >= 500000 THEN 8  -- High priority: significant exposure
                ELSE 7  -- Medium-high priority
            END,
            jsonb_build_object(
                'vendor_id', NEW.id,
                'vendor_name', NEW.name,
                'degradation_reason', v_degradation_reason,
                'performance_drop', v_performance_drop,
                'compliance_drop', v_compliance_drop,
                'active_contracts', v_active_contract_count,
                'total_contract_value', v_total_contract_value,
                'analysis_type', 'vendor_degradation_risk',
                'trigger_source', 'vendor_performance_degradation_automation',
                'requested_outputs', jsonb_build_array(
                    'business_continuity_risk',
                    'contract_exposure_analysis',
                    'mitigation_strategies',
                    'transition_plan_if_needed',
                    'monitoring_recommendations'
                )
            ),
            NEW.id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Create high-priority notification for vendor owner/admins
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
        COALESCE(NEW.created_by, (
            SELECT id FROM users
            WHERE enterprise_id = NEW.enterprise_id
            AND role IN ('admin', 'owner')
            ORDER BY role DESC
            LIMIT 1
        )),
        'vendor_performance_alert',
        format('ALERT: Vendor Performance Degradation - %s', NEW.name),
        format(
            'Vendor "%s" performance has degraded: %s. %s active contracts worth $%s at risk.',
            NEW.name,
            v_degradation_reason,
            v_active_contract_count,
            v_total_contract_value
        ),
        CASE
            WHEN v_performance_drop >= 1.0 OR v_compliance_drop >= 0.5 OR v_total_contract_value >= 500000 THEN 'critical'
            WHEN v_performance_drop >= 0.7 OR v_compliance_drop >= 0.4 OR v_total_contract_value >= 250000 THEN 'high'
            ELSE 'medium'
        END,
        jsonb_build_object(
            'vendor_id', NEW.id,
            'performance_drop', v_performance_drop,
            'compliance_drop', v_compliance_drop,
            'active_contracts', v_active_contract_count,
            'total_value', v_total_contract_value,
            'old_scores', jsonb_build_object(
                'performance', OLD.performance_score,
                'compliance', OLD.compliance_score
            ),
            'new_scores', jsonb_build_object(
                'performance', NEW.performance_score,
                'compliance', NEW.compliance_score
            )
        ),
        NEW.enterprise_id,
        format('/dashboard/vendors/%s', NEW.id)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on vendors table
DROP TRIGGER IF EXISTS trigger_detect_vendor_performance_degradation ON vendors;
CREATE TRIGGER trigger_detect_vendor_performance_degradation
    AFTER UPDATE OF performance_score, compliance_score ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION detect_vendor_performance_degradation();

-- Add comments for documentation
COMMENT ON FUNCTION detect_vendor_performance_degradation() IS
'Automatically detects vendor performance degradation and queues remediation analysis.
Thresholds: performance_score drop ≥ 0.5 OR compliance_score drop ≥ 0.3
Triggers: Vendor Agent (remediation) and Risk Assessment Agent (impact assessment)
Priority escalates based on exposure (contract count × contract value).';

COMMENT ON TRIGGER trigger_detect_vendor_performance_degradation ON vendors IS
'Monitors vendor performance/compliance score changes and triggers automated analysis.
Queues tasks for Vendor Agent (priority 7-9) and Risk Assessment Agent (priority 7-8).
Creates critical/high-severity notifications for vendor degradation.';
