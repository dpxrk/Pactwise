-- =====================================================
-- Approval Workflow Timeout Enforcement
-- =====================================================
-- Description: Automatically escalate approvals that are pending too long
-- Agents triggered:
--   1. Manager Agent: Escalation workflow (priority 7)
--   2. Notifications Agent: Multi-channel notifications (priority 8)
-- Triggers: Daily scheduled check for approvals pending > threshold (5/10/15 days)
-- =====================================================

-- Table to track approval escalations
CREATE TABLE IF NOT EXISTS approval_escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(50) NOT NULL, -- 'contract', 'budget', 'vendor', 'document'
    resource_id UUID NOT NULL,
    original_approver UUID REFERENCES users(id),
    escalated_to UUID REFERENCES users(id),
    escalation_level INTEGER DEFAULT 1, -- 1 = reminder, 2 = manager, 3 = owner
    escalation_reason TEXT,
    days_pending INTEGER,
    escalated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_type VARCHAR(50), -- 'approved', 'rejected', 'timeout_approved', 'reassigned'
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_approval_escalations_resource ON approval_escalations(resource_type, resource_id);
CREATE INDEX idx_approval_escalations_approver ON approval_escalations(original_approver);
CREATE INDEX idx_approval_escalations_enterprise ON approval_escalations(enterprise_id);
CREATE INDEX idx_approval_escalations_unresolved ON approval_escalations(resolved_at) WHERE resolved_at IS NULL;

-- Daily scheduled function to enforce approval timeouts
CREATE OR REPLACE FUNCTION enforce_approval_timeouts_daily()
RETURNS void AS $$
DECLARE
    v_contract RECORD;
    v_budget RECORD;
    v_manager_agent_id UUID;
    v_notifications_agent_id UUID;
    v_days_pending INTEGER;
    v_escalation_level INTEGER;
    v_escalation_target UUID;
    v_escalation_target_name VARCHAR(255);
    v_approver_name VARCHAR(255);
    v_approver_manager UUID;
    v_enterprise_owner UUID;
BEGIN
    -- ===================================
    -- Process pending contract approvals
    -- ===================================
    FOR v_contract IN
        SELECT
            c.*,
            (CURRENT_DATE - c.created_at::DATE) as days_pending,
            u.id as approver_id,
            u.full_name as approver_name,
            u.manager_id as approver_manager
        FROM contracts c
        LEFT JOIN users u ON u.id = c.owner_id
        WHERE c.deleted_at IS NULL
        AND c.status = 'pending_approval'
        AND c.created_at < NOW() - INTERVAL '5 days'
    LOOP
        v_days_pending := v_contract.days_pending;
        v_approver_name := v_contract.approver_name;
        v_approver_manager := v_contract.approver_manager;

        -- Get enterprise owner as final escalation
        SELECT id INTO v_enterprise_owner
        FROM users
        WHERE enterprise_id = v_contract.enterprise_id
        AND role = 'owner'
        ORDER BY created_at
        LIMIT 1;

        -- Determine escalation level and target
        IF v_days_pending >= 15 THEN
            v_escalation_level := 3; -- Escalate to enterprise owner
            v_escalation_target := v_enterprise_owner;
        ELSIF v_days_pending >= 10 THEN
            v_escalation_level := 2; -- Escalate to approver's manager
            v_escalation_target := COALESCE(v_approver_manager, v_enterprise_owner);
        ELSE -- >= 5 days
            v_escalation_level := 1; -- Reminder to original approver
            v_escalation_target := v_contract.approver_id;
        END IF;

        -- Get escalation target name
        SELECT full_name INTO v_escalation_target_name
        FROM users WHERE id = v_escalation_target;

        -- Check if escalation already exists at this level
        IF NOT EXISTS (
            SELECT 1 FROM approval_escalations
            WHERE resource_type = 'contract'
            AND resource_id = v_contract.id
            AND escalation_level = v_escalation_level
            AND created_at > NOW() - INTERVAL '3 days'
        ) THEN
            -- Create escalation record
            INSERT INTO approval_escalations (
                resource_type,
                resource_id,
                original_approver,
                escalated_to,
                escalation_level,
                escalation_reason,
                days_pending,
                enterprise_id
            ) VALUES (
                'contract',
                v_contract.id,
                v_contract.approver_id,
                v_escalation_target,
                v_escalation_level,
                format('Approval pending for %s days', v_days_pending),
                v_days_pending,
                v_contract.enterprise_id
            );

            -- Get agent IDs
            SELECT id INTO v_manager_agent_id
            FROM agents
            WHERE type = 'manager'
            AND enterprise_id = v_contract.enterprise_id
            AND is_active = true
            LIMIT 1;

            SELECT id INTO v_notifications_agent_id
            FROM agents
            WHERE type = 'notifications'
            AND enterprise_id = v_contract.enterprise_id
            AND is_active = true
            LIMIT 1;

            -- Queue Manager Agent task: Escalation workflow
            IF v_manager_agent_id IS NOT NULL AND v_escalation_level >= 2 THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    contract_id,
                    enterprise_id,
                    status
                ) VALUES (
                    v_manager_agent_id,
                    'approval_escalation_workflow',
                    7,
                    jsonb_build_object(
                        'resource_type', 'contract',
                        'resource_id', v_contract.id,
                        'resource_title', v_contract.title,
                        'original_approver', v_contract.approver_id,
                        'escalated_to', v_escalation_target,
                        'escalation_level', v_escalation_level,
                        'days_pending', v_days_pending,
                        'analysis_type', 'escalation_coordination',
                        'trigger_source', 'approval_timeout_automation',
                        'requested_outputs', jsonb_build_array(
                            'escalation_communication',
                            'reassignment_recommendation',
                            'approval_process_analysis',
                            'bottleneck_identification'
                        )
                    ),
                    v_contract.id,
                    v_contract.enterprise_id,
                    'pending'
                );
            END IF;

            -- Queue Notifications Agent task: Multi-channel notification
            IF v_notifications_agent_id IS NOT NULL THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    contract_id,
                    enterprise_id,
                    status
                ) VALUES (
                    v_notifications_agent_id,
                    'approval_escalation_notification',
                    8,
                    jsonb_build_object(
                        'resource_type', 'contract',
                        'resource_id', v_contract.id,
                        'resource_title', v_contract.title,
                        'escalation_target', v_escalation_target,
                        'escalation_level', v_escalation_level,
                        'days_pending', v_days_pending,
                        'channels', jsonb_build_array('email', 'in_app'),
                        'trigger_source', 'approval_timeout_automation'
                    ),
                    v_contract.id,
                    v_contract.enterprise_id,
                    'pending'
                );
            END IF;

            -- Create notification
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
                v_escalation_target,
                'approval_timeout_escalation',
                format('%s: Approval Overdue - %s',
                    CASE v_escalation_level
                        WHEN 3 THEN 'ESCALATED TO YOU'
                        WHEN 2 THEN 'MANAGER ESCALATION'
                        ELSE 'REMINDER'
                    END,
                    v_contract.title
                ),
                format(
                    'Contract "%s" approval pending for %s days. %s',
                    v_contract.title,
                    v_days_pending,
                    CASE v_escalation_level
                        WHEN 3 THEN format('Escalated to you as enterprise owner. Original approver: %s', v_approver_name)
                        WHEN 2 THEN format('Escalated from %s. Please review or reassign.', v_approver_name)
                        ELSE 'Please review and approve/reject.'
                    END
                ),
                CASE
                    WHEN v_escalation_level = 3 THEN 'critical'
                    WHEN v_escalation_level = 2 THEN 'high'
                    ELSE 'medium'
                END,
                jsonb_build_object(
                    'resource_type', 'contract',
                    'resource_id', v_contract.id,
                    'days_pending', v_days_pending,
                    'escalation_level', v_escalation_level,
                    'original_approver', v_contract.approver_id
                ),
                v_contract.enterprise_id,
                format('/dashboard/contracts/%s?action=approve', v_contract.id)
            );
        END IF;
    END LOOP;

    -- ===================================
    -- Process pending budget approvals
    -- ===================================
    FOR v_budget IN
        SELECT
            b.*,
            (CURRENT_DATE - b.created_at::DATE) as days_pending,
            u.id as approver_id,
            u.full_name as approver_name,
            u.manager_id as approver_manager
        FROM budgets b
        LEFT JOIN users u ON u.id = b.owner_id
        WHERE b.deleted_at IS NULL
        AND b.metadata->>'approval_status' = 'pending'
        AND b.created_at < NOW() - INTERVAL '5 days'
    LOOP
        v_days_pending := v_budget.days_pending;

        -- Get enterprise owner
        SELECT id INTO v_enterprise_owner
        FROM users
        WHERE enterprise_id = v_budget.enterprise_id
        AND role = 'owner'
        LIMIT 1;

        -- Determine escalation level
        IF v_days_pending >= 15 THEN
            v_escalation_level := 3;
            v_escalation_target := v_enterprise_owner;
        ELSIF v_days_pending >= 10 THEN
            v_escalation_level := 2;
            v_escalation_target := COALESCE(v_budget.approver_manager, v_enterprise_owner);
        ELSE
            v_escalation_level := 1;
            v_escalation_target := v_budget.approver_id;
        END IF;

        -- Create escalation if not exists
        IF NOT EXISTS (
            SELECT 1 FROM approval_escalations
            WHERE resource_type = 'budget'
            AND resource_id = v_budget.id
            AND escalation_level = v_escalation_level
            AND created_at > NOW() - INTERVAL '3 days'
        ) THEN
            INSERT INTO approval_escalations (
                resource_type,
                resource_id,
                original_approver,
                escalated_to,
                escalation_level,
                escalation_reason,
                days_pending,
                enterprise_id
            ) VALUES (
                'budget',
                v_budget.id,
                v_budget.approver_id,
                v_escalation_target,
                v_escalation_level,
                format('Budget approval pending for %s days', v_days_pending),
                v_days_pending,
                v_budget.enterprise_id
            );

            -- Create notification
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
                v_escalation_target,
                'approval_timeout_escalation',
                format('Budget Approval Overdue: %s', v_budget.name),
                format('Budget "%s" approval pending for %s days. Please review.',
                    v_budget.name,
                    v_days_pending
                ),
                CASE
                    WHEN v_escalation_level = 3 THEN 'critical'
                    WHEN v_escalation_level = 2 THEN 'high'
                    ELSE 'medium'
                END,
                jsonb_build_object(
                    'resource_type', 'budget',
                    'resource_id', v_budget.id,
                    'days_pending', v_days_pending,
                    'escalation_level', v_escalation_level
                ),
                v_budget.enterprise_id,
                format('/dashboard/budgets/%s', v_budget.id)
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get approval timeout dashboard stats
CREATE OR REPLACE FUNCTION get_approval_timeout_stats(p_enterprise_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_overdue', COUNT(*) FILTER (WHERE days_pending >= 5),
        'critical_overdue', COUNT(*) FILTER (WHERE days_pending >= 15),
        'high_overdue', COUNT(*) FILTER (WHERE days_pending >= 10 AND days_pending < 15),
        'medium_overdue', COUNT(*) FILTER (WHERE days_pending >= 5 AND days_pending < 10),
        'avg_days_pending', ROUND(AVG(days_pending), 1),
        'oldest_pending_days', MAX(days_pending),
        'by_resource_type', jsonb_object_agg(
            resource_type,
            count
        )
    ) INTO v_stats
    FROM (
        SELECT
            'contract' as resource_type,
            (CURRENT_DATE - created_at::DATE) as days_pending
        FROM contracts
        WHERE enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
        AND status = 'pending_approval'

        UNION ALL

        SELECT
            'budget' as resource_type,
            (CURRENT_DATE - created_at::DATE) as days_pending
        FROM budgets
        WHERE enterprise_id = p_enterprise_id
        AND deleted_at IS NULL
        AND metadata->>'approval_status' = 'pending'
    ) approvals
    LEFT JOIN LATERAL (
        SELECT resource_type, COUNT(*) as count
        FROM approval_escalations
        WHERE enterprise_id = p_enterprise_id
        AND resolved_at IS NULL
        GROUP BY resource_type
    ) escalations ON true;

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE approval_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view escalations in their enterprise"
    ON approval_escalations FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "System can manage escalations"
    ON approval_escalations FOR ALL
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

-- Add comments
COMMENT ON TABLE approval_escalations IS
'Tracks approval escalations when approvals are pending too long.
Escalation tiers: 5 days (reminder), 10 days (manager), 15 days (owner).
Auto-creates notifications and queues Manager/Notifications agents.';

COMMENT ON FUNCTION enforce_approval_timeouts_daily() IS
'Daily scheduled function to enforce approval timeouts and escalate overdue approvals.
Checks contracts and budgets pending approval for 5/10/15+ days.
Creates escalations, notifications, and queues Manager + Notifications agents.
Should be called via cron job every day at 9 AM.';

COMMENT ON FUNCTION get_approval_timeout_stats(UUID) IS
'Returns approval timeout statistics for dashboard widget.
Includes counts by severity, average pending days, and breakdown by resource type.';
