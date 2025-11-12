-- Migration 076: Email Notification Triggers and Automation
-- Description: Automated email notifications for contract expiry, budget alerts, and approvals
-- Author: System
-- Date: 2025-11-10

-- ============================================================================
-- CONTRACT EXPIRY NOTIFICATION FUNCTION
-- ============================================================================

-- Function to check and queue contract expiry notifications
CREATE OR REPLACE FUNCTION check_and_queue_contract_expiry_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_contract RECORD;
    v_user RECORD;
    v_days_until_expiry INTEGER;
    v_notifications_queued INTEGER := 0;
    v_template_data JSONB;
BEGIN
    -- Find contracts expiring in 7, 14, 30, or 60 days
    FOR v_contract IN
        SELECT
            c.id,
            c.title,
            c.end_date,
            c.value,
            c.enterprise_id,
            v.name as vendor_name,
            EXTRACT(DAY FROM (c.end_date - CURRENT_DATE))::INTEGER as days_until_expiry
        FROM contracts c
        LEFT JOIN vendors v ON v.id = c.vendor_id
        WHERE c.status = 'active'
        AND c.end_date > CURRENT_DATE
        AND c.end_date <= CURRENT_DATE + INTERVAL '60 days'
        AND EXTRACT(DAY FROM (c.end_date - CURRENT_DATE))::INTEGER IN (7, 14, 30, 60)
        -- Only send once per day for each threshold
        AND NOT EXISTS (
            SELECT 1 FROM email_queue eq
            WHERE eq.template_name = 'contract_expiry'
            AND (eq.template_data->>'contract_id')::UUID = c.id
            AND eq.created_at > CURRENT_DATE
            AND (eq.template_data->>'days_until_expiry')::INTEGER = EXTRACT(DAY FROM (c.end_date - CURRENT_DATE))::INTEGER
        )
    LOOP
        v_days_until_expiry := v_contract.days_until_expiry;

        -- Get users who should be notified (managers, admins, owners)
        FOR v_user IN
            SELECT u.id, u.email, u.first_name, u.last_name
            FROM users u
            WHERE u.enterprise_id = v_contract.enterprise_id
            AND u.role IN ('manager', 'admin', 'owner')
            AND u.deleted_at IS NULL
            -- Check if user has email notifications enabled
            AND NOT EXISTS (
                SELECT 1 FROM notification_preferences np
                WHERE np.user_id = u.id
                AND np.notification_type = 'contract_expiry'
                AND np.enabled = false
            )
        LOOP
            -- Build template data
            v_template_data := jsonb_build_object(
                'contract_id', v_contract.id,
                'user_name', v_user.first_name || ' ' || v_user.last_name,
                'contract_title', v_contract.title,
                'vendor_name', v_contract.vendor_name,
                'expiry_date', to_char(v_contract.end_date, 'Month DD, YYYY'),
                'days_until_expiry', v_days_until_expiry,
                'contract_value', '$' || to_char(v_contract.value, 'FM999,999,999.00'),
                'action_url', current_setting('app.base_url', true) || '/dashboard/contracts/' || v_contract.id
            );

            -- Queue email notification
            PERFORM queue_email_notification(
                p_to_email => v_user.email,
                p_subject => 'Contract Expiring in ' || v_days_until_expiry || ' Days: ' || v_contract.title,
                p_template_name => 'contract_expiry',
                p_template_data => v_template_data,
                p_priority => CASE
                    WHEN v_days_until_expiry <= 7 THEN 9  -- Urgent
                    WHEN v_days_until_expiry <= 14 THEN 8 -- High
                    WHEN v_days_until_expiry <= 30 THEN 7 -- Medium
                    ELSE 5 -- Normal
                END
            );

            v_notifications_queued := v_notifications_queued + 1;
        END LOOP;
    END LOOP;

    RETURN v_notifications_queued;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BUDGET ALERT NOTIFICATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_queue_budget_alert_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_budget RECORD;
    v_user RECORD;
    v_utilization NUMERIC;
    v_alert_type TEXT;
    v_alert_color TEXT;
    v_recommendation TEXT;
    v_notifications_queued INTEGER := 0;
    v_template_data JSONB;
BEGIN
    -- Find budgets exceeding thresholds (80%, 90%, 100%, 110%)
    FOR v_budget IN
        SELECT
            b.id,
            b.name,
            b.total_amount,
            b.spent_amount,
            b.remaining_amount,
            b.enterprise_id,
            (b.spent_amount / NULLIF(b.total_amount, 0) * 100)::NUMERIC(5,2) as utilization_percentage
        FROM budgets b
        WHERE b.deleted_at IS NULL
        AND b.total_amount > 0
        -- Only check budgets with significant utilization
        AND (b.spent_amount / NULLIF(b.total_amount, 0)) >= 0.80
    LOOP
        v_utilization := v_budget.utilization_percentage;

        -- Determine alert type and recommendation
        IF v_utilization >= 110 THEN
            v_alert_type := 'Over Budget';
            v_alert_color := '#DC2626';
            v_recommendation := 'CRITICAL: Budget exceeded by more than 10%. Immediate action required.';
        ELSIF v_utilization >= 100 THEN
            v_alert_type := 'Budget Exceeded';
            v_alert_color := '#EF4444';
            v_recommendation := 'WARNING: Budget fully utilized. Review spending immediately.';
        ELSIF v_utilization >= 90 THEN
            v_alert_type := 'Near Limit';
            v_alert_color := '#F59E0B';
            v_recommendation := 'CAUTION: Budget is 90% utilized. Monitor spending closely.';
        ELSIF v_utilization >= 80 THEN
            v_alert_type := 'Approaching Limit';
            v_alert_color := '#FBBF24';
            v_recommendation := 'NOTICE: Budget is 80% utilized. Plan for remaining allocation.';
        ELSE
            CONTINUE; -- Skip if under 80%
        END IF;

        -- Check if alert already sent today for this threshold
        IF EXISTS (
            SELECT 1 FROM email_queue eq
            WHERE eq.template_name = 'budget_alert'
            AND (eq.template_data->>'budget_id')::UUID = v_budget.id
            AND eq.created_at > CURRENT_DATE
            AND eq.template_data->>'alert_type' = v_alert_type
        ) THEN
            CONTINUE; -- Skip if already notified today
        END IF;

        -- Get users to notify
        FOR v_user IN
            SELECT u.id, u.email, u.first_name, u.last_name
            FROM users u
            WHERE u.enterprise_id = v_budget.enterprise_id
            AND u.role IN ('manager', 'admin', 'owner')
            AND u.deleted_at IS NULL
        LOOP
            v_template_data := jsonb_build_object(
                'budget_id', v_budget.id,
                'user_name', v_user.first_name || ' ' || v_user.last_name,
                'budget_name', v_budget.name,
                'alert_type', v_alert_type,
                'alert_color', v_alert_color,
                'total_budget', '$' || to_char(v_budget.total_amount, 'FM999,999,999.00'),
                'spent_amount', '$' || to_char(v_budget.spent_amount, 'FM999,999,999.00'),
                'remaining_amount', '$' || to_char(v_budget.remaining_amount, 'FM999,999,999.00'),
                'utilization_percentage', v_utilization,
                'recommendation', v_recommendation,
                'action_url', current_setting('app.base_url', true) || '/dashboard/budgets/' || v_budget.id
            );

            PERFORM queue_email_notification(
                p_to_email => v_user.email,
                p_subject => 'Budget Alert: ' || v_budget.name || ' ' || v_alert_type,
                p_template_name => 'budget_alert',
                p_template_data => v_template_data,
                p_priority => CASE
                    WHEN v_utilization >= 110 THEN 9
                    WHEN v_utilization >= 100 THEN 8
                    WHEN v_utilization >= 90 THEN 7
                    ELSE 6
                END
            );

            v_notifications_queued := v_notifications_queued + 1;
        END LOOP;
    END LOOP;

    RETURN v_notifications_queued;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- APPROVAL REQUEST NOTIFICATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_approval_request()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_item_details TEXT;
    v_template_data JSONB;
BEGIN
    -- Only process new approval requests
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
        -- Build item details based on type
        v_item_details := CASE NEW.approval_type
            WHEN 'contract' THEN 'Contract approval required'
            WHEN 'vendor' THEN 'New vendor approval required'
            WHEN 'budget' THEN 'Budget change approval required'
            ELSE 'Approval required'
        END;

        -- Get approver details
        SELECT u.email, u.first_name, u.last_name
        INTO v_user
        FROM users u
        WHERE u.id = NEW.approver_id;

        IF FOUND THEN
            v_template_data := jsonb_build_object(
                'user_name', v_user.first_name || ' ' || v_user.last_name,
                'item_type', NEW.approval_type,
                'item_title', COALESCE(NEW.title, 'Untitled'),
                'item_details', v_item_details,
                'approve_url', current_setting('app.base_url', true) || '/dashboard/approvals/' || NEW.id || '/approve',
                'reject_url', current_setting('app.base_url', true) || '/dashboard/approvals/' || NEW.id || '/reject',
                'view_url', current_setting('app.base_url', true) || '/dashboard/approvals/' || NEW.id
            );

            PERFORM queue_email_notification(
                p_to_email => v_user.email,
                p_subject => 'Approval Required: ' || NEW.approval_type || ' - ' || COALESCE(NEW.title, 'Untitled'),
                p_template_name => 'approval_request',
                p_template_data => v_template_data,
                p_priority => 8 -- High priority
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on approvals table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approvals') THEN
        DROP TRIGGER IF EXISTS trigger_notify_approval_request ON approvals;
        CREATE TRIGGER trigger_notify_approval_request
            AFTER INSERT ON approvals
            FOR EACH ROW
            EXECUTE FUNCTION notify_approval_request();
    END IF;
END $$;

-- ============================================================================
-- EMAIL PROCESSING FUNCTION
-- ============================================================================

-- Function to process email queue and send via Resend API
-- This should be called by a cron job or edge function every minute
CREATE OR REPLACE FUNCTION process_email_queue(p_batch_size INTEGER DEFAULT 10)
RETURNS TABLE(
    processed INTEGER,
    sent INTEGER,
    failed INTEGER
) AS $$
DECLARE
    v_processed INTEGER := 0;
    v_sent INTEGER := 0;
    v_failed INTEGER := 0;
BEGIN
    -- Mark emails for processing (prevents race conditions)
    UPDATE email_queue
    SET status = 'processing'
    WHERE id IN (
        SELECT id FROM email_queue
        WHERE status = 'pending'
        AND scheduled_at <= NOW()
        ORDER BY priority DESC, scheduled_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    );

    -- Return counts (actual sending happens in edge function)
    GET DIAGNOSTICS v_processed = ROW_COUNT;

    RETURN QUERY SELECT v_processed, 0, 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

COMMENT ON TABLE notification_preferences IS 'User preferences for notification types';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION check_and_queue_contract_expiry_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_queue_budget_alert_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION process_email_queue(INTEGER) TO authenticated, service_role;

-- Grant table access
GRANT SELECT, INSERT, UPDATE ON email_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;

-- ============================================================================
-- SETUP APPLICATION SETTING
-- ============================================================================

-- NOTE: The following requires superuser permissions and should be set manually in production
-- Set base URL for email links (update this in production)
-- ALTER DATABASE postgres SET app.base_url = 'http://localhost:3000';
--
-- COMMENT ON DATABASE postgres IS 'app.base_url setting controls email link generation';
--
-- For now, set via environment variable or application config instead
