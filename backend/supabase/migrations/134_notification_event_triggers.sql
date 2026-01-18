-- Migration 134: Notification Event Triggers
-- Description: Database triggers that create notifications when business events occur
-- Author: System
-- Date: 2026-01-17

-- ============================================================================
-- CONTRACT EVENT TRIGGERS
-- ============================================================================

-- Trigger function for new contract creation
CREATE OR REPLACE FUNCTION notify_contract_created()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_vendor_name TEXT;
BEGIN
    -- Get vendor name if exists
    SELECT name INTO v_vendor_name
    FROM vendors WHERE id = NEW.vendor_id;

    -- Notify managers, admins, and owners in the enterprise
    FOR v_user IN
        SELECT u.id, u.email, u.first_name, u.last_name
        FROM users u
        WHERE u.enterprise_id = NEW.enterprise_id
        AND u.role IN ('manager', 'admin', 'owner')
        AND u.deleted_at IS NULL
        -- Respect notification preferences
        AND NOT EXISTS (
            SELECT 1 FROM notification_preferences np
            WHERE np.user_id = u.id
            AND np.notification_type = 'contract_created'
            AND np.enabled = false
        )
    LOOP
        -- Create in-app notification
        INSERT INTO notifications (
            user_id,
            enterprise_id,
            type,
            title,
            message,
            data,
            created_at
        ) VALUES (
            v_user.id,
            NEW.enterprise_id,
            'contract',
            'New Contract Created',
            'Contract "' || COALESCE(NEW.title, 'Untitled') || '"' ||
            CASE WHEN v_vendor_name IS NOT NULL THEN ' with ' || v_vendor_name ELSE '' END ||
            ' has been created.',
            jsonb_build_object(
                'contract_id', NEW.id,
                'contract_title', NEW.title,
                'vendor_name', v_vendor_name,
                'value', NEW.value,
                'action_url', '/dashboard/contracts/' || NEW.id
            ),
            NOW()
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contracts table
DROP TRIGGER IF EXISTS trigger_notify_contract_created ON contracts;
CREATE TRIGGER trigger_notify_contract_created
    AFTER INSERT ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION notify_contract_created();

-- ============================================================================
-- CONTRACT STATUS CHANGE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_contract_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_status_label TEXT;
BEGIN
    -- Only notify on significant status changes
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('active', 'expired', 'terminated', 'renewed') THEN
        v_status_label := CASE NEW.status
            WHEN 'active' THEN 'is now active'
            WHEN 'expired' THEN 'has expired'
            WHEN 'terminated' THEN 'has been terminated'
            WHEN 'renewed' THEN 'has been renewed'
            ELSE 'status changed to ' || NEW.status
        END;

        FOR v_user IN
            SELECT u.id, u.email
            FROM users u
            WHERE u.enterprise_id = NEW.enterprise_id
            AND u.role IN ('manager', 'admin', 'owner')
            AND u.deleted_at IS NULL
        LOOP
            INSERT INTO notifications (
                user_id,
                enterprise_id,
                type,
                title,
                message,
                data,
                created_at
            ) VALUES (
                v_user.id,
                NEW.enterprise_id,
                'contract',
                'Contract Status Updated',
                'Contract "' || COALESCE(NEW.title, 'Untitled') || '" ' || v_status_label || '.',
                jsonb_build_object(
                    'contract_id', NEW.id,
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'action_url', '/dashboard/contracts/' || NEW.id
                ),
                NOW()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_contract_status_change ON contracts;
CREATE TRIGGER trigger_notify_contract_status_change
    AFTER UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION notify_contract_status_change();

-- ============================================================================
-- VENDOR EVENT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_vendor_created()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN
        SELECT u.id, u.email
        FROM users u
        WHERE u.enterprise_id = NEW.enterprise_id
        AND u.role IN ('manager', 'admin', 'owner')
        AND u.deleted_at IS NULL
        AND NOT EXISTS (
            SELECT 1 FROM notification_preferences np
            WHERE np.user_id = u.id
            AND np.notification_type = 'vendor_created'
            AND np.enabled = false
        )
    LOOP
        INSERT INTO notifications (
            user_id,
            enterprise_id,
            type,
            title,
            message,
            data,
            created_at
        ) VALUES (
            v_user.id,
            NEW.enterprise_id,
            'vendor',
            'New Vendor Added',
            'Vendor "' || COALESCE(NEW.name, 'Unnamed') || '" has been added to your vendor list.',
            jsonb_build_object(
                'vendor_id', NEW.id,
                'vendor_name', NEW.name,
                'action_url', '/dashboard/vendors/' || NEW.id
            ),
            NOW()
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_vendor_created ON vendors;
CREATE TRIGGER trigger_notify_vendor_created
    AFTER INSERT ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION notify_vendor_created();

-- ============================================================================
-- BUDGET THRESHOLD TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_budget_threshold()
RETURNS TRIGGER AS $$
DECLARE
    v_user RECORD;
    v_old_utilization NUMERIC;
    v_new_utilization NUMERIC;
    v_threshold_crossed INTEGER;
    v_alert_message TEXT;
BEGIN
    -- Calculate utilization percentages
    v_old_utilization := CASE
        WHEN COALESCE(OLD.total_amount, 0) > 0
        THEN (COALESCE(OLD.spent_amount, 0) / OLD.total_amount * 100)
        ELSE 0
    END;

    v_new_utilization := CASE
        WHEN COALESCE(NEW.total_amount, 0) > 0
        THEN (COALESCE(NEW.spent_amount, 0) / NEW.total_amount * 100)
        ELSE 0
    END;

    -- Check which threshold was crossed (80%, 90%, 100%, 110%)
    v_threshold_crossed := NULL;

    IF v_old_utilization < 80 AND v_new_utilization >= 80 AND v_new_utilization < 90 THEN
        v_threshold_crossed := 80;
        v_alert_message := 'Budget "' || NEW.name || '" has reached 80% utilization.';
    ELSIF v_old_utilization < 90 AND v_new_utilization >= 90 AND v_new_utilization < 100 THEN
        v_threshold_crossed := 90;
        v_alert_message := 'WARNING: Budget "' || NEW.name || '" has reached 90% utilization.';
    ELSIF v_old_utilization < 100 AND v_new_utilization >= 100 AND v_new_utilization < 110 THEN
        v_threshold_crossed := 100;
        v_alert_message := 'ALERT: Budget "' || NEW.name || '" is fully utilized (100%).';
    ELSIF v_old_utilization < 110 AND v_new_utilization >= 110 THEN
        v_threshold_crossed := 110;
        v_alert_message := 'CRITICAL: Budget "' || NEW.name || '" has exceeded by ' || ROUND(v_new_utilization - 100, 1) || '%.';
    END IF;

    -- If a threshold was crossed, notify relevant users
    IF v_threshold_crossed IS NOT NULL THEN
        FOR v_user IN
            SELECT u.id, u.email
            FROM users u
            WHERE u.enterprise_id = NEW.enterprise_id
            AND u.role IN ('manager', 'admin', 'owner')
            AND u.deleted_at IS NULL
        LOOP
            INSERT INTO notifications (
                user_id,
                enterprise_id,
                type,
                title,
                message,
                data,
                created_at
            ) VALUES (
                v_user.id,
                NEW.enterprise_id,
                'budget',
                'Budget Alert: ' || v_threshold_crossed || '% Threshold',
                v_alert_message,
                jsonb_build_object(
                    'budget_id', NEW.id,
                    'budget_name', NEW.name,
                    'threshold', v_threshold_crossed,
                    'utilization', ROUND(v_new_utilization, 2),
                    'total_amount', NEW.total_amount,
                    'spent_amount', NEW.spent_amount,
                    'action_url', '/dashboard/budgets/' || NEW.id
                ),
                NOW()
            );

            -- Also queue email for critical thresholds
            IF v_threshold_crossed >= 100 THEN
                PERFORM queue_email_notification(
                    p_to_email => v_user.email,
                    p_subject => 'Budget Alert: ' || NEW.name || ' at ' || v_threshold_crossed || '%',
                    p_template_name => 'budget_alert',
                    p_template_data => jsonb_build_object(
                        'budget_name', NEW.name,
                        'threshold', v_threshold_crossed,
                        'utilization', ROUND(v_new_utilization, 2),
                        'total_amount', NEW.total_amount,
                        'spent_amount', NEW.spent_amount,
                        'action_url', current_setting('app.base_url', true) || '/dashboard/budgets/' || NEW.id
                    ),
                    p_priority => CASE
                        WHEN v_threshold_crossed >= 110 THEN 9
                        ELSE 8
                    END
                );
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_budget_threshold ON budgets;
CREATE TRIGGER trigger_notify_budget_threshold
    AFTER UPDATE ON budgets
    FOR EACH ROW
    WHEN (OLD.spent_amount IS DISTINCT FROM NEW.spent_amount)
    EXECUTE FUNCTION notify_budget_threshold();

-- ============================================================================
-- DOCUMENT UPLOAD NOTIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_document_uploaded()
RETURNS TRIGGER AS $$
DECLARE
    v_contract RECORD;
    v_user RECORD;
BEGIN
    -- Only notify for contract-related documents
    IF NEW.contract_id IS NOT NULL THEN
        SELECT c.title, c.enterprise_id INTO v_contract
        FROM contracts c WHERE c.id = NEW.contract_id;

        IF FOUND THEN
            FOR v_user IN
                SELECT u.id, u.email
                FROM users u
                WHERE u.enterprise_id = v_contract.enterprise_id
                AND u.role IN ('manager', 'admin', 'owner')
                AND u.deleted_at IS NULL
            LOOP
                INSERT INTO notifications (
                    user_id,
                    enterprise_id,
                    type,
                    title,
                    message,
                    data,
                    created_at
                ) VALUES (
                    v_user.id,
                    v_contract.enterprise_id,
                    'document',
                    'New Document Uploaded',
                    'A new document "' || COALESCE(NEW.name, NEW.file_name, 'Untitled') || '" was uploaded to contract "' || v_contract.title || '".',
                    jsonb_build_object(
                        'document_id', NEW.id,
                        'contract_id', NEW.contract_id,
                        'file_name', NEW.file_name,
                        'action_url', '/dashboard/contracts/' || NEW.contract_id || '/documents'
                    ),
                    NOW()
                );
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if documents table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        DROP TRIGGER IF EXISTS trigger_notify_document_uploaded ON documents;
        CREATE TRIGGER trigger_notify_document_uploaded
            AFTER INSERT ON documents
            FOR EACH ROW
            EXECUTE FUNCTION notify_document_uploaded();
    END IF;
END $$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION notify_contract_created() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_contract_status_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_vendor_created() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_budget_threshold() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_document_uploaded() TO authenticated, service_role;
