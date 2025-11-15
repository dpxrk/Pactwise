-- =====================================================
-- Contract Expiration Automation
-- =====================================================
-- Description: Automatically queue agent tasks when contracts are approaching expiration
-- Agents triggered:
--   1. Legal Agent: Renewal analysis (priority 7-9 based on urgency)
--   2. Vendor Agent: Performance review for renewal decision (priority 6)
-- Timing: 60/30/7 days before expiration
-- =====================================================

-- Enhanced function to handle contract expiry notifications AND queue agent tasks
CREATE OR REPLACE FUNCTION trigger_contract_expiry_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_days_until_expiry INTEGER;
    v_legal_agent_id UUID;
    v_vendor_agent_id UUID;
    v_task_priority INTEGER;
    v_severity TEXT;
    v_should_queue_agents BOOLEAN := false;
BEGIN
    IF NEW.status = 'active' AND NEW.end_date IS NOT NULL THEN
        -- Calculate days until expiry
        v_days_until_expiry := NEW.end_date - CURRENT_DATE;

        -- Check if notification already exists (prevent duplicate notifications)
        IF NOT EXISTS (
            SELECT 1 FROM notifications
            WHERE data->>'contract_id' = NEW.id::text
            AND type = 'contract_expiry_warning'
            AND created_at > NOW() - INTERVAL '7 days'
        ) THEN
            -- Create notifications at different intervals (60, 30, 7 days)
            IF NEW.end_date <= CURRENT_DATE + INTERVAL '60 days' THEN
                -- Determine severity and priority based on urgency
                IF v_days_until_expiry <= 7 THEN
                    v_severity := 'critical';
                    v_task_priority := 9;  -- Urgent
                    v_should_queue_agents := true;
                ELSIF v_days_until_expiry <= 30 THEN
                    v_severity := 'high';
                    v_task_priority := 8;  -- High priority
                    v_should_queue_agents := true;
                ELSIF v_days_until_expiry <= 60 THEN
                    v_severity := 'medium';
                    v_task_priority := 7;  -- Medium-high priority
                    v_should_queue_agents := true;
                ELSE
                    v_severity := 'low';
                    v_task_priority := 6;
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
                    COALESCE(NEW.owner_id, NEW.created_by),
                    'contract_expiry_warning',
                    CASE
                        WHEN v_days_until_expiry <= 7 THEN 'URGENT: Contract Expiring This Week!'
                        WHEN v_days_until_expiry <= 30 THEN 'Contract Expiring Soon'
                        ELSE 'Contract Expiring in 60 Days'
                    END,
                    format('Contract "%s" expires on %s (%s days)', NEW.title, NEW.end_date, v_days_until_expiry),
                    v_severity,
                    jsonb_build_object(
                        'contract_id', NEW.id,
                        'end_date', NEW.end_date,
                        'days_until_expiry', v_days_until_expiry,
                        'vendor_id', NEW.vendor_id
                    ),
                    NEW.enterprise_id,
                    format('/dashboard/contracts/%s', NEW.id)
                );

                -- Queue agent tasks for expiring contracts
                IF v_should_queue_agents THEN
                    -- Get agent IDs for this enterprise
                    SELECT id INTO v_legal_agent_id
                    FROM agents
                    WHERE type = 'legal'
                    AND enterprise_id = NEW.enterprise_id
                    AND is_active = true
                    LIMIT 1;

                    SELECT id INTO v_vendor_agent_id
                    FROM agents
                    WHERE type = 'vendor'
                    AND enterprise_id = NEW.enterprise_id
                    AND is_active = true
                    LIMIT 1;

                    -- Queue Legal Agent task: Renewal analysis
                    IF v_legal_agent_id IS NOT NULL THEN
                        -- Check if task already exists for this contract (prevent duplicates)
                        IF NOT EXISTS (
                            SELECT 1 FROM agent_tasks
                            WHERE contract_id = NEW.id
                            AND task_type = 'contract_renewal_analysis'
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
                                'contract_renewal_analysis',
                                v_task_priority,
                                jsonb_build_object(
                                    'contract_id', NEW.id,
                                    'contract_title', NEW.title,
                                    'end_date', NEW.end_date,
                                    'days_until_expiry', v_days_until_expiry,
                                    'vendor_id', NEW.vendor_id,
                                    'current_value', NEW.value,
                                    'analysis_type', 'renewal_assessment',
                                    'trigger_source', 'contract_expiration_automation',
                                    'requested_outputs', jsonb_build_array(
                                        'renewal_recommendation',
                                        'risk_assessment',
                                        'terms_comparison',
                                        'compliance_check',
                                        'negotiation_points'
                                    )
                                ),
                                NEW.id,
                                NEW.enterprise_id,
                                'pending'
                            );
                        END IF;
                    END IF;

                    -- Queue Vendor Agent task: Performance review for renewal decision
                    IF v_vendor_agent_id IS NOT NULL AND NEW.vendor_id IS NOT NULL THEN
                        -- Check if task already exists (prevent duplicates)
                        IF NOT EXISTS (
                            SELECT 1 FROM agent_tasks
                            WHERE contract_id = NEW.id
                            AND vendor_id = NEW.vendor_id
                            AND task_type = 'vendor_renewal_review'
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
                                'vendor_renewal_review',
                                GREATEST(v_task_priority - 1, 6),  -- Slightly lower priority than legal
                                jsonb_build_object(
                                    'contract_id', NEW.id,
                                    'contract_title', NEW.title,
                                    'vendor_id', NEW.vendor_id,
                                    'end_date', NEW.end_date,
                                    'days_until_expiry', v_days_until_expiry,
                                    'current_value', NEW.value,
                                    'analysis_type', 'renewal_performance_review',
                                    'trigger_source', 'contract_expiration_automation',
                                    'requested_outputs', jsonb_build_array(
                                        'performance_summary',
                                        'relationship_score',
                                        'renewal_recommendation',
                                        'alternative_vendors',
                                        'negotiation_leverage'
                                    )
                                ),
                                NEW.id,
                                NEW.vendor_id,
                                NEW.enterprise_id,
                                'pending'
                            );
                        END IF;
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure it uses the new function
DROP TRIGGER IF EXISTS contract_expiry_notification ON contracts;
CREATE TRIGGER contract_expiry_notification
    AFTER INSERT OR UPDATE OF status, end_date ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_contract_expiry_notification();

-- Add comment for documentation
COMMENT ON FUNCTION trigger_contract_expiry_notification() IS
'Creates notifications and queues agent tasks when contracts approach expiration.
Triggers at 60/30/7 days before expiration:
- Legal Agent: Renewal analysis and risk assessment
- Vendor Agent: Performance review for renewal decision
Includes duplicate prevention for both notifications and agent tasks.';

COMMENT ON TRIGGER contract_expiry_notification ON contracts IS
'Automatically triggers renewal workflow when contracts approach expiration (60/30/7 days).
Queues tasks for Legal Agent and Vendor Agent with urgency-based priorities.';
