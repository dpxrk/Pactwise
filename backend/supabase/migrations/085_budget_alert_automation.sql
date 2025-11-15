-- =====================================================
-- Budget Alert Automation
-- =====================================================
-- Description: Automatically queue agent tasks when budgets reach at-risk or exceeded status
-- Agents triggered:
--   1. Financial Agent: Spending analysis, forecast update (priority 8)
--   2. Analytics Agent: Trend analysis, predictions (priority 6)
-- =====================================================

-- Enhanced function to update budget status AND queue agent tasks
CREATE OR REPLACE FUNCTION update_budget_status(p_budget_id UUID)
RETURNS void AS $$
DECLARE
    v_budget RECORD;
    v_new_status budget_status;
    v_percentage DECIMAL(5,2);
    v_financial_agent_id UUID;
    v_analytics_agent_id UUID;
    v_status_changed BOOLEAN := false;
BEGIN
    -- Get budget details
    SELECT * INTO v_budget FROM budgets WHERE id = p_budget_id;

    -- Calculate percentage used
    v_percentage := CASE
        WHEN v_budget.total_budget = 0 THEN 0
        ELSE (v_budget.spent_amount / v_budget.total_budget) * 100
    END;

    -- Determine new status
    v_new_status := CASE
        WHEN v_percentage >= 100 THEN 'exceeded'
        WHEN v_percentage >= 80 THEN 'at_risk'
        ELSE 'healthy'
    END;

    -- Update if status changed
    IF v_new_status != v_budget.status THEN
        v_status_changed := true;

        UPDATE budgets
        SET status = v_new_status,
            alerts = alerts || jsonb_build_object(
                'timestamp', NOW(),
                'type', 'status_change',
                'old_status', v_budget.status,
                'new_status', v_new_status,
                'percentage_used', v_percentage
            ),
            updated_at = NOW()
        WHERE id = p_budget_id;

        -- Create notification for budget owner
        IF v_budget.owner_id IS NOT NULL THEN
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
                v_budget.owner_id,
                'budget_alert',
                CASE v_new_status
                    WHEN 'exceeded' THEN 'Budget Exceeded!'
                    WHEN 'at_risk' THEN 'Budget At Risk'
                    ELSE 'Budget Status Changed'
                END,
                format('Budget "%s" is now %s (%.1f%% used)', v_budget.name, v_new_status, v_percentage),
                CASE v_new_status
                    WHEN 'exceeded' THEN 'urgent'
                    WHEN 'at_risk' THEN 'high'
                    ELSE 'medium'
                END,
                jsonb_build_object(
                    'budget_id', p_budget_id,
                    'percentage_used', v_percentage,
                    'old_status', v_budget.status,
                    'new_status', v_new_status
                ),
                v_budget.enterprise_id,
                format('/dashboard/budgets/%s', p_budget_id)
            );
        END IF;

        -- Queue agent tasks for at-risk or exceeded budgets
        IF v_new_status IN ('at_risk', 'exceeded') THEN
            -- Get agent IDs for this enterprise
            SELECT id INTO v_financial_agent_id
            FROM agents
            WHERE type = 'financial'
            AND enterprise_id = v_budget.enterprise_id
            AND is_active = true
            LIMIT 1;

            SELECT id INTO v_analytics_agent_id
            FROM agents
            WHERE type = 'analytics'
            AND enterprise_id = v_budget.enterprise_id
            AND is_active = true
            LIMIT 1;

            -- Queue Financial Agent task: Spending analysis and forecast update
            IF v_financial_agent_id IS NOT NULL THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    enterprise_id,
                    status
                ) VALUES (
                    v_financial_agent_id,
                    'budget_analysis',
                    CASE v_new_status
                        WHEN 'exceeded' THEN 9  -- Urgent
                        WHEN 'at_risk' THEN 8   -- High priority
                        ELSE 7
                    END,
                    jsonb_build_object(
                        'budget_id', p_budget_id,
                        'budget_name', v_budget.name,
                        'status', v_new_status,
                        'percentage_used', v_percentage,
                        'total_budget', v_budget.total_budget,
                        'spent_amount', v_budget.spent_amount,
                        'allocated_amount', v_budget.allocated_amount,
                        'committed_amount', v_budget.committed_amount,
                        'department', v_budget.department,
                        'analysis_type', 'spending_analysis',
                        'trigger_source', 'budget_alert_automation',
                        'requested_outputs', jsonb_build_array(
                            'spending_breakdown',
                            'forecast_update',
                            'variance_analysis',
                            'savings_opportunities',
                            'risk_assessment'
                        )
                    ),
                    v_budget.enterprise_id,
                    'pending'
                );
            END IF;

            -- Queue Analytics Agent task: Trend analysis and predictions
            IF v_analytics_agent_id IS NOT NULL THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    enterprise_id,
                    status
                ) VALUES (
                    v_analytics_agent_id,
                    'budget_trend_analysis',
                    CASE v_new_status
                        WHEN 'exceeded' THEN 7  -- High priority
                        WHEN 'at_risk' THEN 6   -- Medium-high priority
                        ELSE 5
                    END,
                    jsonb_build_object(
                        'budget_id', p_budget_id,
                        'budget_name', v_budget.name,
                        'status', v_new_status,
                        'percentage_used', v_percentage,
                        'start_date', v_budget.start_date,
                        'end_date', v_budget.end_date,
                        'department', v_budget.department,
                        'analysis_type', 'trend_prediction',
                        'trigger_source', 'budget_alert_automation',
                        'requested_outputs', jsonb_build_array(
                            'spending_trends',
                            'depletion_forecast',
                            'anomaly_detection',
                            'comparative_analysis',
                            'recommendations'
                        )
                    ),
                    v_budget.enterprise_id,
                    'pending'
                );
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION update_budget_status(UUID) IS
'Updates budget status based on spending percentage and automatically queues agent tasks.
When budget reaches at-risk (80%+) or exceeded (100%+) status:
- Financial Agent analyzes spending patterns and forecasts
- Analytics Agent provides trend analysis and predictions
Also creates notifications for budget owners.';
