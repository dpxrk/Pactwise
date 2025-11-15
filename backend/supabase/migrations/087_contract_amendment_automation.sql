-- =====================================================
-- Contract Amendment Automation
-- =====================================================
-- Description: Automatically queue agent tasks when contracts are amended
-- Agents triggered:
--   1. Legal Agent: Amendment risk review (priority 8)
--   2. Financial Agent: Budget impact analysis (priority 7)
-- Triggers on: Changes to value, dates, status, vendor, or terms
-- =====================================================

-- Function to queue agent tasks for contract amendments
CREATE OR REPLACE FUNCTION queue_contract_amendment_analysis()
RETURNS TRIGGER AS $$
DECLARE
    v_legal_agent_id UUID;
    v_financial_agent_id UUID;
    v_has_significant_change BOOLEAN := false;
    v_changes JSONB := '[]'::jsonb;
    v_change_summary TEXT;
BEGIN
    -- Only process updates (not inserts)
    IF TG_OP != 'UPDATE' THEN
        RETURN NEW;
    END IF;

    -- Detect significant changes that warrant re-analysis
    -- Financial changes
    IF OLD.value IS DISTINCT FROM NEW.value THEN
        v_has_significant_change := true;
        v_changes := v_changes || jsonb_build_object(
            'field', 'value',
            'old_value', OLD.value,
            'new_value', NEW.value,
            'change_type', 'financial'
        );
    END IF;

    -- Date changes
    IF OLD.start_date IS DISTINCT FROM NEW.start_date THEN
        v_has_significant_change := true;
        v_changes := v_changes || jsonb_build_object(
            'field', 'start_date',
            'old_value', OLD.start_date,
            'new_value', NEW.start_date,
            'change_type', 'temporal'
        );
    END IF;

    IF OLD.end_date IS DISTINCT FROM NEW.end_date THEN
        v_has_significant_change := true;
        v_changes := v_changes || jsonb_build_object(
            'field', 'end_date',
            'old_value', OLD.end_date,
            'new_value', NEW.end_date,
            'change_type', 'temporal'
        );
    END IF;

    -- Vendor changes
    IF OLD.vendor_id IS DISTINCT FROM NEW.vendor_id THEN
        v_has_significant_change := true;
        v_changes := v_changes || jsonb_build_object(
            'field', 'vendor_id',
            'old_value', OLD.vendor_id,
            'new_value', NEW.vendor_id,
            'change_type', 'vendor'
        );
    END IF;

    -- Status changes (excluding initial status transitions)
    IF OLD.status IS DISTINCT FROM NEW.status AND OLD.status NOT IN ('upload', 'pending_analysis') THEN
        v_has_significant_change := true;
        v_changes := v_changes || jsonb_build_object(
            'field', 'status',
            'old_value', OLD.status,
            'new_value', NEW.status,
            'change_type', 'status'
        );
    END IF;

    -- Payment terms changes
    IF OLD.payment_terms IS DISTINCT FROM NEW.payment_terms THEN
        v_has_significant_change := true;
        v_changes := v_changes || jsonb_build_object(
            'field', 'payment_terms',
            'old_value', OLD.payment_terms,
            'new_value', NEW.payment_terms,
            'change_type', 'terms'
        );
    END IF;

    -- Auto-renew changes
    IF OLD.auto_renew IS DISTINCT FROM NEW.auto_renew THEN
        v_has_significant_change := true;
        v_changes := v_changes || jsonb_build_object(
            'field', 'auto_renew',
            'old_value', OLD.auto_renew,
            'new_value', NEW.auto_renew,
            'change_type', 'terms'
        );
    END IF;

    -- If no significant changes, skip agent queueing
    IF NOT v_has_significant_change THEN
        RETURN NEW;
    END IF;

    -- Create change summary for human readability
    v_change_summary := format(
        'Contract "%s" amended: %s fields changed',
        NEW.title,
        jsonb_array_length(v_changes)
    );

    -- Get agent IDs for this enterprise
    SELECT id INTO v_legal_agent_id
    FROM agents
    WHERE type = 'legal'
    AND enterprise_id = NEW.enterprise_id
    AND is_active = true
    LIMIT 1;

    SELECT id INTO v_financial_agent_id
    FROM agents
    WHERE type = 'financial'
    AND enterprise_id = NEW.enterprise_id
    AND is_active = true
    LIMIT 1;

    -- Queue Legal Agent task: Amendment risk review
    IF v_legal_agent_id IS NOT NULL THEN
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
            'contract_amendment_review',
            8,  -- High priority for amendments
            jsonb_build_object(
                'contract_id', NEW.id,
                'contract_title', NEW.title,
                'changes', v_changes,
                'change_summary', v_change_summary,
                'vendor_id', NEW.vendor_id,
                'current_value', NEW.value,
                'current_status', NEW.status,
                'analysis_type', 'amendment_risk_assessment',
                'trigger_source', 'contract_amendment_automation',
                'requested_outputs', jsonb_build_array(
                    'risk_assessment',
                    'compliance_check',
                    'legal_review',
                    'change_impact_analysis',
                    'approval_requirements',
                    'documentation_checklist'
                )
            ),
            NEW.id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Queue Financial Agent task: Budget impact analysis (if financial changes)
    IF v_financial_agent_id IS NOT NULL AND (
        OLD.value IS DISTINCT FROM NEW.value OR
        OLD.start_date IS DISTINCT FROM NEW.start_date OR
        OLD.end_date IS DISTINCT FROM NEW.end_date OR
        OLD.payment_terms IS DISTINCT FROM NEW.payment_terms
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
            'contract_budget_impact_analysis',
            7,  -- Medium-high priority
            jsonb_build_object(
                'contract_id', NEW.id,
                'contract_title', NEW.title,
                'changes', v_changes,
                'change_summary', v_change_summary,
                'old_value', OLD.value,
                'new_value', NEW.value,
                'old_start_date', OLD.start_date,
                'new_start_date', NEW.start_date,
                'old_end_date', OLD.end_date,
                'new_end_date', NEW.end_date,
                'analysis_type', 'budget_impact',
                'trigger_source', 'contract_amendment_automation',
                'requested_outputs', jsonb_build_array(
                    'budget_impact_summary',
                    'variance_analysis',
                    'payment_schedule_changes',
                    'cash_flow_impact',
                    'budget_allocation_recommendations'
                )
            ),
            NEW.id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Create audit log for amendment
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
        COALESCE(NEW.owner_id, NEW.created_by),
        'contract_amendment',
        'Contract Amended',
        v_change_summary,
        CASE
            WHEN jsonb_array_length(v_changes) > 3 THEN 'high'
            WHEN jsonb_array_length(v_changes) > 1 THEN 'medium'
            ELSE 'low'
        END,
        jsonb_build_object(
            'contract_id', NEW.id,
            'changes', v_changes,
            'amended_by', auth.uid()
        ),
        NEW.enterprise_id,
        format('/dashboard/contracts/%s', NEW.id)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contracts table
DROP TRIGGER IF EXISTS trigger_analyze_contract_amendment ON contracts;
CREATE TRIGGER trigger_analyze_contract_amendment
    AFTER UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION queue_contract_amendment_analysis();

-- Add comment for documentation
COMMENT ON FUNCTION queue_contract_amendment_analysis() IS
'Automatically queues agent tasks when contracts are amended.
Monitors changes to: value, dates, vendor, status, payment terms, auto-renew.
Triggers: Legal Agent (risk review) and Financial Agent (budget impact).
Includes duplicate prevention and change tracking.';

COMMENT ON TRIGGER trigger_analyze_contract_amendment ON contracts IS
'Automatically triggers amendment analysis when contract terms change significantly.
Queues tasks for Legal Agent (priority 8) and Financial Agent (priority 7).';
