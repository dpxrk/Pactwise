-- Migration: 137_user_ai_limits.sql
-- Description: Add per-user AI usage limits for cost control
-- This extends the enterprise-level budgets to include user-specific limits

-- ==================== User AI Limits Table ====================
-- Stores per-user overrides for AI usage limits
CREATE TABLE IF NOT EXISTS user_ai_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

    -- Per-user overrides (null = use role default)
    daily_limit DECIMAL(10, 4),          -- $ per day limit (null = use role default)
    monthly_limit DECIMAL(10, 4),        -- $ per month limit (null = use role default)
    max_tokens_per_request INTEGER,      -- Max tokens per single request (null = use role default)

    -- Enabled/disabled flag for manual control
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Reason for custom limit (audit trail)
    reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Unique constraint: one limit config per user per enterprise
    CONSTRAINT unique_user_enterprise_limit UNIQUE(user_id, enterprise_id)
);

-- ==================== Add Role-Based Limits to Enterprises ====================
-- Default limits by role (can be customized per enterprise)
ALTER TABLE enterprises
    ADD COLUMN IF NOT EXISTS ai_role_limits JSONB DEFAULT '{
        "owner": { "daily": 50, "monthly": 500, "maxTokens": 8000 },
        "admin": { "daily": 20, "monthly": 200, "maxTokens": 8000 },
        "manager": { "daily": 10, "monthly": 100, "maxTokens": 4000 },
        "user": { "daily": 5, "monthly": 50, "maxTokens": 4000 },
        "viewer": { "daily": 1, "monthly": 10, "maxTokens": 2000 }
    }';

-- ==================== Indexes ====================
-- Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_ai_limits_user
    ON user_ai_limits(user_id);

-- Fast lookup by enterprise
CREATE INDEX IF NOT EXISTS idx_user_ai_limits_enterprise
    ON user_ai_limits(enterprise_id);

-- Composite for direct lookup
CREATE INDEX IF NOT EXISTS idx_user_ai_limits_user_enterprise
    ON user_ai_limits(user_id, enterprise_id);

-- Index for ai_usage_logs user+date queries (for efficient daily/monthly aggregation)
-- Note: Can't use DATE_TRUNC in index, use simple columns for query-time aggregation
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created
    ON ai_usage_logs(user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

-- Note: Can't use DATE_TRUNC in index, use simple columns for query-time aggregation
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_monthly
    ON ai_usage_logs(user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

-- ==================== RLS Policies ====================
ALTER TABLE user_ai_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own limits
CREATE POLICY "Users can view their own AI limits"
    ON user_ai_limits
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        -- Admins/owners can view limits for their enterprise
        enterprise_id IN (
            SELECT enterprise_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Only admins/owners can modify limits
CREATE POLICY "Admins can manage AI limits"
    ON user_ai_limits
    FOR ALL
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        enterprise_id IN (
            SELECT enterprise_id FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- ==================== Functions ====================

-- Get the effective AI limits for a user (considers role defaults and custom overrides)
CREATE OR REPLACE FUNCTION get_user_ai_limits(
    p_user_id UUID,
    p_enterprise_id UUID
)
RETURNS TABLE (
    daily_limit DECIMAL,
    monthly_limit DECIMAL,
    max_tokens_per_request INTEGER,
    source VARCHAR(20)  -- 'custom', 'role', or 'default'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_role_limits JSONB;
    v_custom_limits RECORD;
    v_role_config JSONB;
BEGIN
    -- Get the user's role
    SELECT role INTO v_user_role
    FROM users
    WHERE id = p_user_id AND enterprise_id = p_enterprise_id;

    IF v_user_role IS NULL THEN
        -- User not found, return defaults
        RETURN QUERY SELECT
            5.0::DECIMAL AS daily_limit,
            50.0::DECIMAL AS monthly_limit,
            4000::INTEGER AS max_tokens_per_request,
            'default'::VARCHAR(20) AS source;
        RETURN;
    END IF;

    -- Check for custom user limits first
    SELECT * INTO v_custom_limits
    FROM user_ai_limits
    WHERE user_id = p_user_id
      AND enterprise_id = p_enterprise_id
      AND enabled = true;

    -- Get role-based limits from enterprise config
    SELECT ai_role_limits INTO v_role_limits
    FROM enterprises
    WHERE id = p_enterprise_id;

    -- Get the specific role config, with fallback to 'user' role
    v_role_config := COALESCE(
        v_role_limits->v_user_role,
        v_role_limits->'user',
        '{"daily": 5, "monthly": 50, "maxTokens": 4000}'::JSONB
    );

    -- Return limits with priority: custom > role > default
    IF v_custom_limits IS NOT NULL THEN
        RETURN QUERY SELECT
            COALESCE(v_custom_limits.daily_limit, (v_role_config->>'daily')::DECIMAL, 5.0) AS daily_limit,
            COALESCE(v_custom_limits.monthly_limit, (v_role_config->>'monthly')::DECIMAL, 50.0) AS monthly_limit,
            COALESCE(v_custom_limits.max_tokens_per_request, (v_role_config->>'maxTokens')::INTEGER, 4000) AS max_tokens_per_request,
            'custom'::VARCHAR(20) AS source;
    ELSE
        RETURN QUERY SELECT
            COALESCE((v_role_config->>'daily')::DECIMAL, 5.0) AS daily_limit,
            COALESCE((v_role_config->>'monthly')::DECIMAL, 50.0) AS monthly_limit,
            COALESCE((v_role_config->>'maxTokens')::INTEGER, 4000) AS max_tokens_per_request,
            'role'::VARCHAR(20) AS source;
    END IF;
END;
$$;

-- Get user's current AI usage (today and this month)
CREATE OR REPLACE FUNCTION get_user_ai_usage(
    p_user_id UUID,
    p_enterprise_id UUID
)
RETURNS TABLE (
    today_cost DECIMAL,
    today_tokens BIGINT,
    today_requests BIGINT,
    month_cost DECIMAL,
    month_tokens BIGINT,
    month_requests BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('day', NOW()) THEN cost ELSE 0 END), 0) AS today_cost,
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('day', NOW()) THEN input_tokens + output_tokens ELSE 0 END), 0) AS today_tokens,
        COALESCE(COUNT(CASE WHEN created_at >= DATE_TRUNC('day', NOW()) THEN 1 END), 0) AS today_requests,
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN cost ELSE 0 END), 0) AS month_cost,
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN input_tokens + output_tokens ELSE 0 END), 0) AS month_tokens,
        COALESCE(COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END), 0) AS month_requests
    FROM ai_usage_logs
    WHERE user_id = p_user_id
      AND enterprise_id = p_enterprise_id;
END;
$$;

-- Check if user can perform an AI operation
CREATE OR REPLACE FUNCTION check_user_ai_budget(
    p_user_id UUID,
    p_enterprise_id UUID,
    p_estimated_cost DECIMAL DEFAULT 0,
    p_estimated_tokens INTEGER DEFAULT 0
)
RETURNS TABLE (
    allowed BOOLEAN,
    block_reason TEXT,
    daily_limit DECIMAL,
    daily_used DECIMAL,
    daily_remaining DECIMAL,
    monthly_limit DECIMAL,
    monthly_used DECIMAL,
    monthly_remaining DECIMAL,
    max_tokens INTEGER,
    limit_source VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limits RECORD;
    v_usage RECORD;
    v_block_reason TEXT := NULL;
    v_allowed BOOLEAN := true;
BEGIN
    -- Get user's limits
    SELECT * INTO v_limits FROM get_user_ai_limits(p_user_id, p_enterprise_id);

    -- Get user's current usage
    SELECT * INTO v_usage FROM get_user_ai_usage(p_user_id, p_enterprise_id);

    -- Check token limit first (hard cap on request size)
    IF p_estimated_tokens > 0 AND p_estimated_tokens > v_limits.max_tokens_per_request THEN
        v_allowed := false;
        v_block_reason := 'Request exceeds maximum tokens per request (' || v_limits.max_tokens_per_request || ')';
    -- Check daily limit
    ELSIF v_usage.today_cost + p_estimated_cost > v_limits.daily_limit THEN
        v_allowed := false;
        v_block_reason := 'Daily AI budget exceeded ($' || ROUND(v_limits.daily_limit, 2) || ' limit)';
    -- Check monthly limit
    ELSIF v_usage.month_cost + p_estimated_cost > v_limits.monthly_limit THEN
        v_allowed := false;
        v_block_reason := 'Monthly AI budget exceeded ($' || ROUND(v_limits.monthly_limit, 2) || ' limit)';
    END IF;

    RETURN QUERY SELECT
        v_allowed AS allowed,
        v_block_reason AS block_reason,
        v_limits.daily_limit,
        v_usage.today_cost AS daily_used,
        GREATEST(v_limits.daily_limit - v_usage.today_cost, 0) AS daily_remaining,
        v_limits.monthly_limit,
        v_usage.month_cost AS monthly_used,
        GREATEST(v_limits.monthly_limit - v_usage.month_cost, 0) AS monthly_remaining,
        v_limits.max_tokens_per_request AS max_tokens,
        v_limits.source AS limit_source;
END;
$$;

-- Set custom limits for a user (admin function)
CREATE OR REPLACE FUNCTION set_user_ai_limits(
    p_user_id UUID,
    p_enterprise_id UUID,
    p_daily_limit DECIMAL DEFAULT NULL,
    p_monthly_limit DECIMAL DEFAULT NULL,
    p_max_tokens INTEGER DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_admin_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit_id UUID;
BEGIN
    -- Verify user belongs to enterprise
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id AND enterprise_id = p_enterprise_id
    ) THEN
        RAISE EXCEPTION 'User does not belong to this enterprise';
    END IF;

    -- Upsert the limit configuration
    INSERT INTO user_ai_limits (
        user_id,
        enterprise_id,
        daily_limit,
        monthly_limit,
        max_tokens_per_request,
        reason,
        created_by
    )
    VALUES (
        p_user_id,
        p_enterprise_id,
        p_daily_limit,
        p_monthly_limit,
        p_max_tokens,
        p_reason,
        p_admin_user_id
    )
    ON CONFLICT (user_id, enterprise_id)
    DO UPDATE SET
        daily_limit = COALESCE(p_daily_limit, user_ai_limits.daily_limit),
        monthly_limit = COALESCE(p_monthly_limit, user_ai_limits.monthly_limit),
        max_tokens_per_request = COALESCE(p_max_tokens, user_ai_limits.max_tokens_per_request),
        reason = COALESCE(p_reason, user_ai_limits.reason),
        updated_at = NOW()
    RETURNING id INTO v_limit_id;

    RETURN v_limit_id;
END;
$$;

-- Update enterprise role limits (admin function)
CREATE OR REPLACE FUNCTION update_enterprise_role_limits(
    p_enterprise_id UUID,
    p_role VARCHAR(50),
    p_daily DECIMAL DEFAULT NULL,
    p_monthly DECIMAL DEFAULT NULL,
    p_max_tokens INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_limits JSONB;
    v_role_config JSONB;
BEGIN
    -- Get current limits
    SELECT ai_role_limits INTO v_current_limits
    FROM enterprises
    WHERE id = p_enterprise_id;

    -- Build new role config
    v_role_config := COALESCE(v_current_limits->p_role, '{}'::JSONB);

    IF p_daily IS NOT NULL THEN
        v_role_config := jsonb_set(v_role_config, '{daily}', to_jsonb(p_daily));
    END IF;

    IF p_monthly IS NOT NULL THEN
        v_role_config := jsonb_set(v_role_config, '{monthly}', to_jsonb(p_monthly));
    END IF;

    IF p_max_tokens IS NOT NULL THEN
        v_role_config := jsonb_set(v_role_config, '{maxTokens}', to_jsonb(p_max_tokens));
    END IF;

    -- Update the enterprise
    UPDATE enterprises
    SET ai_role_limits = jsonb_set(COALESCE(ai_role_limits, '{}'::JSONB), ARRAY[p_role], v_role_config),
        updated_at = NOW()
    WHERE id = p_enterprise_id;

    RETURN FOUND;
END;
$$;

-- ==================== Updated At Trigger ====================
CREATE TRIGGER set_user_ai_limits_updated_at
    BEFORE UPDATE ON user_ai_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================== Comments ====================
COMMENT ON TABLE user_ai_limits IS 'Per-user AI usage limits (overrides role-based defaults)';
COMMENT ON COLUMN user_ai_limits.daily_limit IS 'Maximum AI cost per day in USD (null = use role default)';
COMMENT ON COLUMN user_ai_limits.monthly_limit IS 'Maximum AI cost per month in USD (null = use role default)';
COMMENT ON COLUMN user_ai_limits.max_tokens_per_request IS 'Maximum tokens per single API request (null = use role default)';
COMMENT ON COLUMN enterprises.ai_role_limits IS 'Role-based AI limits configuration (daily/monthly cost, max tokens)';
COMMENT ON FUNCTION get_user_ai_limits IS 'Get effective AI limits for a user (custom overrides > role defaults)';
COMMENT ON FUNCTION get_user_ai_usage IS 'Get user AI usage for today and current month';
COMMENT ON FUNCTION check_user_ai_budget IS 'Verify user is within AI budget limits before operation';
COMMENT ON FUNCTION set_user_ai_limits IS 'Set custom AI limits for a specific user';
COMMENT ON FUNCTION update_enterprise_role_limits IS 'Update AI limits for a specific role in an enterprise';
