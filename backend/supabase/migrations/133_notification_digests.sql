-- Migration 133: Notification Digests Table
-- Description: Stores generated notification digest records and history
-- Author: System
-- Date: 2026-01-17

-- ============================================================================
-- NOTIFICATION DIGESTS TABLE
-- ============================================================================
-- Stores records of generated digests (daily, weekly, monthly summaries)

CREATE TABLE IF NOT EXISTS notification_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    digest_type VARCHAR(20) NOT NULL CHECK (digest_type IN ('daily', 'weekly', 'monthly')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    -- Statistics and summary data
    statistics JSONB DEFAULT '{}'::JSONB,
    -- Included notification IDs for reference
    notification_ids UUID[] DEFAULT '{}',
    notification_count INTEGER DEFAULT 0,
    -- Email delivery tracking
    email_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    email_id UUID, -- Reference to email_queue.id
    -- Error tracking
    error_message TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE notification_digests IS 'Stores generated notification digest records and delivery status';
COMMENT ON COLUMN notification_digests.digest_type IS 'Type of digest: daily, weekly, or monthly';
COMMENT ON COLUMN notification_digests.period_start IS 'Start of the digest period';
COMMENT ON COLUMN notification_digests.period_end IS 'End of the digest period';
COMMENT ON COLUMN notification_digests.statistics IS 'Summary statistics (contracts expiring, budgets, alerts, etc.)';
COMMENT ON COLUMN notification_digests.notification_ids IS 'Array of notification IDs included in this digest';
COMMENT ON COLUMN notification_digests.email_id IS 'Reference to the queued email';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Query digests by user and type
CREATE INDEX idx_notification_digests_user_type
    ON notification_digests(user_id, digest_type);

-- Query digests by enterprise for admin views
CREATE INDEX idx_notification_digests_enterprise
    ON notification_digests(enterprise_id, created_at DESC);

-- Find unsent digests (for retry logic)
CREATE INDEX idx_notification_digests_unsent
    ON notification_digests(email_sent, created_at)
    WHERE email_sent = false;

-- Find digests by period for deduplication
CREATE INDEX idx_notification_digests_period
    ON notification_digests(user_id, digest_type, period_start, period_end);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notification_digests ENABLE ROW LEVEL SECURITY;

-- Users can view their own digests
CREATE POLICY "Users can view their own digests" ON notification_digests
    FOR SELECT USING (user_id = public.current_user_id());

-- Admins can view enterprise digests
CREATE POLICY "Admins can view enterprise digests" ON notification_digests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_id = auth.uid()
            AND u.enterprise_id = notification_digests.enterprise_id
            AND u.role IN ('admin', 'owner')
        )
    );

-- Service role can manage all digests
CREATE POLICY "Service role can manage digests" ON notification_digests
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_notification_digests_updated_at
    BEFORE UPDATE ON notification_digests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate a digest for a user
CREATE OR REPLACE FUNCTION generate_user_digest(
    p_user_id UUID,
    p_digest_type VARCHAR(20),
    p_period_start TIMESTAMPTZ DEFAULT NULL,
    p_period_end TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_digest_id UUID;
    v_enterprise_id UUID;
    v_notifications UUID[];
    v_notification_count INTEGER;
    v_statistics JSONB;
    v_contracts_expiring INTEGER;
    v_budget_alerts INTEGER;
    v_new_contracts INTEGER;
    v_approval_requests INTEGER;
    v_actual_period_start TIMESTAMPTZ;
    v_actual_period_end TIMESTAMPTZ;
BEGIN
    -- Get user's enterprise
    SELECT enterprise_id INTO v_enterprise_id
    FROM users WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Calculate period based on digest type
    v_actual_period_end := COALESCE(p_period_end, NOW());
    v_actual_period_start := COALESCE(p_period_start, CASE p_digest_type
        WHEN 'daily' THEN v_actual_period_end - INTERVAL '1 day'
        WHEN 'weekly' THEN v_actual_period_end - INTERVAL '7 days'
        WHEN 'monthly' THEN v_actual_period_end - INTERVAL '30 days'
        ELSE v_actual_period_end - INTERVAL '1 day'
    END);

    -- Check if digest already exists for this period
    IF EXISTS (
        SELECT 1 FROM notification_digests
        WHERE user_id = p_user_id
        AND digest_type = p_digest_type
        AND period_start = v_actual_period_start
        AND period_end = v_actual_period_end
    ) THEN
        -- Return existing digest ID
        SELECT id INTO v_digest_id
        FROM notification_digests
        WHERE user_id = p_user_id
        AND digest_type = p_digest_type
        AND period_start = v_actual_period_start
        AND period_end = v_actual_period_end;
        RETURN v_digest_id;
    END IF;

    -- Collect notifications from the period
    SELECT ARRAY_AGG(n.id), COUNT(*)
    INTO v_notifications, v_notification_count
    FROM notifications n
    WHERE n.user_id = p_user_id
    AND n.created_at BETWEEN v_actual_period_start AND v_actual_period_end;

    -- Calculate statistics
    SELECT COUNT(*) INTO v_contracts_expiring
    FROM contracts c
    WHERE c.enterprise_id = v_enterprise_id
    AND c.status = 'active'
    AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';

    SELECT COUNT(*) INTO v_budget_alerts
    FROM budgets b
    WHERE b.enterprise_id = v_enterprise_id
    AND b.deleted_at IS NULL
    AND b.total_amount > 0
    AND (b.spent_amount / NULLIF(b.total_amount, 0)) >= 0.80;

    SELECT COUNT(*) INTO v_new_contracts
    FROM contracts c
    WHERE c.enterprise_id = v_enterprise_id
    AND c.created_at BETWEEN v_actual_period_start AND v_actual_period_end;

    SELECT COUNT(*) INTO v_approval_requests
    FROM approvals a
    WHERE a.approver_id = p_user_id
    AND a.status = 'pending'
    AND a.created_at BETWEEN v_actual_period_start AND v_actual_period_end;

    -- Build statistics JSON
    v_statistics := jsonb_build_object(
        'contracts_expiring_soon', COALESCE(v_contracts_expiring, 0),
        'budget_alerts', COALESCE(v_budget_alerts, 0),
        'new_contracts', COALESCE(v_new_contracts, 0),
        'pending_approvals', COALESCE(v_approval_requests, 0),
        'total_notifications', COALESCE(v_notification_count, 0),
        'period_type', p_digest_type,
        'generated_at', NOW()
    );

    -- Create the digest record
    INSERT INTO notification_digests (
        enterprise_id,
        user_id,
        digest_type,
        period_start,
        period_end,
        statistics,
        notification_ids,
        notification_count
    ) VALUES (
        v_enterprise_id,
        p_user_id,
        p_digest_type,
        v_actual_period_start,
        v_actual_period_end,
        v_statistics,
        COALESCE(v_notifications, '{}'),
        COALESCE(v_notification_count, 0)
    ) RETURNING id INTO v_digest_id;

    RETURN v_digest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark digest as sent
CREATE OR REPLACE FUNCTION mark_digest_sent(
    p_digest_id UUID,
    p_email_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notification_digests
    SET email_sent = true,
        sent_at = NOW(),
        email_id = p_email_id,
        updated_at = NOW()
    WHERE id = p_digest_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON notification_digests TO authenticated;
GRANT EXECUTE ON FUNCTION generate_user_digest(UUID, VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_digest_sent(UUID, UUID) TO authenticated, service_role;
