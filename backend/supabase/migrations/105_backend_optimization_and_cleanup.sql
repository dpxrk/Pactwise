-- Migration: 105_backend_optimization_and_cleanup.sql
-- Description: Comprehensive backend optimization - remove redundant tables, add critical indexes,
--              add missing audit columns, standardize patterns
-- Created: 2025-01-26

-- ============================================================================
-- PART 1: DROP REDUNDANT/UNUSED TABLES
-- ============================================================================
-- These tables are either:
-- 1. Duplicated functionality
-- 2. Over-engineered for the use case
-- 3. Never actually used in edge functions

-- Drop overly complex demo/learning tables (keep industry_benchmarks_master)
DROP TABLE IF EXISTS learning_from_demo CASCADE;
DROP TABLE IF EXISTS demo_data_scenarios CASCADE;

-- Drop redundant rate limiting tables (keep rate_limit_rules and rate_limits)
DROP TABLE IF EXISTS rate_limit_violations CASCADE;
DROP TABLE IF EXISTS rate_limit_metrics CASCADE;
DROP TABLE IF EXISTS rate_limit_requests CASCADE;

-- Drop unused backup tables (Supabase handles backups)
DROP TABLE IF EXISTS backup_schedules CASCADE;
DROP TABLE IF EXISTS backups CASCADE;
DROP TABLE IF EXISTS backup_metadata CASCADE;

-- Drop redundant maintenance table (use scheduled_jobs instead)
DROP TABLE IF EXISTS maintenance_schedule CASCADE;

-- Drop unused A/B testing table (premature optimization)
DROP TABLE IF EXISTS donna_experiments CASCADE;

-- Drop unused ML tables that duplicate functionality
DROP TABLE IF EXISTS donna_optimization_models CASCADE;
DROP TABLE IF EXISTS donna_feature_importance CASCADE;
DROP TABLE IF EXISTS model_performance_metrics CASCADE;

-- Drop duplicate analysis audit log (use main audit_logs)
DROP TABLE IF EXISTS analysis_audit_log CASCADE;

-- Drop duplicate query cache (keep one in 071)
-- Note: query_cache exists in both 063 and 071 migrations
-- We'll keep the one from 071 as it's more recent

-- Drop unused zero trust tables that overlap with security_events
DROP TABLE IF EXISTS user_behavior_patterns CASCADE;
DROP TABLE IF EXISTS zero_trust_sessions CASCADE;

-- Drop unused batch metrics (use audit_logs instead)
DROP TABLE IF EXISTS batch_operation_metrics CASCADE;

-- ============================================================================
-- PART 2: ADD SOFT DELETE TO CRITICAL TABLES
-- ============================================================================

-- Add deleted_at to workflow tables
ALTER TABLE workflow_definitions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE workflow_templates
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to RFQ tables
ALTER TABLE rfqs
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE rfq_bids
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to chat/memory tables
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to notification tables
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to API keys
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to compliance tables
ALTER TABLE compliance_checks
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at to contract line items
ALTER TABLE contract_line_items
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================================
-- PART 3: ADD CRITICAL MISSING INDEXES
-- ============================================================================

-- Contract queries optimization
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_status_enterprise
ON contracts(vendor_id, status, enterprise_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_created_by_status
ON contracts(created_by, status, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_expiring
ON contracts(end_date, status, enterprise_id)
WHERE status = 'active' AND deleted_at IS NULL;

-- Budget tracking optimization
CREATE INDEX IF NOT EXISTS idx_budgets_owner_status
ON budgets(owner_id, status, enterprise_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contract_budget_allocations_budget
ON contract_budget_allocations(budget_id, allocated_amount DESC);

-- Vendor performance optimization
CREATE INDEX IF NOT EXISTS idx_vendors_performance_ranking
ON vendors(enterprise_id, performance_score DESC NULLS LAST)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_compliance_ranking
ON vendors(enterprise_id, compliance_score DESC NULLS LAST)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_kpi_tracking_timeseries
ON vendor_kpi_tracking(vendor_id, measurement_date DESC);

-- Approval workflow optimization
CREATE INDEX IF NOT EXISTS idx_contract_approvals_pending
ON contract_approvals(status, approver_id, enterprise_id)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_contract_approvals_contract
ON contract_approvals(contract_id, approval_type);

CREATE INDEX IF NOT EXISTS idx_approval_escalations_date
ON approval_escalations(escalated_at DESC, enterprise_id);

-- RFQ/RFP optimization
CREATE INDEX IF NOT EXISTS idx_rfqs_active
ON rfqs(status, response_deadline, enterprise_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rfq_bids_evaluation
ON rfq_bids(rfq_id, status, score DESC);

CREATE INDEX IF NOT EXISTS idx_rfq_bids_vendor_history
ON rfq_bids(vendor_id, status, created_at DESC);

-- Agent insights optimization
CREATE INDEX IF NOT EXISTS idx_agent_insights_actionable
ON agent_insights(enterprise_id, is_actionable, action_taken, severity)
WHERE is_actionable = true;

CREATE INDEX IF NOT EXISTS idx_agent_insights_vendor
ON agent_insights(vendor_id, severity DESC NULLS LAST, is_actionable)
WHERE vendor_id IS NOT NULL;

-- Audit optimization
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent
ON audit_logs(created_at DESC);

-- Compliance optimization
CREATE INDEX IF NOT EXISTS idx_compliance_checks_upcoming
ON compliance_checks(next_check_date, enterprise_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_evidence_requirement
ON compliance_evidence(requirement_id, created_at DESC);

-- Line item market comparison
CREATE INDEX IF NOT EXISTS idx_contract_line_items_market
ON contract_line_items(taxonomy_code, unit_price)
WHERE deleted_at IS NULL AND taxonomy_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_line_items_enterprise
ON contract_line_items(enterprise_id, pricing_model, created_at DESC)
WHERE deleted_at IS NULL;

-- Market price history
CREATE INDEX IF NOT EXISTS idx_market_price_history_lookup_date
ON market_price_history(taxonomy_code, effective_date DESC);

-- Collaboration optimization
CREATE INDEX IF NOT EXISTS idx_document_comments_unresolved
ON document_comments(document_id, is_resolved, created_at DESC)
WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_document_suggestions_pending
ON document_suggestions(document_id, status, created_at DESC)
WHERE status = 'pending';

-- Notification optimization
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON notifications(user_id, is_read, is_archived, created_at DESC)
WHERE is_read = false AND is_archived = false AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_queue_pending
ON email_queue(status, created_at)
WHERE status = 'pending';

-- Workflow execution optimization
CREATE INDEX IF NOT EXISTS idx_workflow_executions_active
ON workflow_executions(status, updated_at DESC, enterprise_id)
WHERE status IN ('running', 'pending') AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_step_results_execution
ON workflow_step_results(execution_id, step_id);

-- ============================================================================
-- PART 4: ADD MISSING AUDIT TRIGGERS
-- ============================================================================

-- Ensure updated_at triggers exist for all tables that need them
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables missing them
DO $$
DECLARE
    tables_needing_trigger TEXT[] := ARRAY[
        'vendor_kpi_tracking',
        'compliance_checks',
        'compliance_evidence',
        'vendor_documents',
        'rfq_bids',
        'workflow_step_results',
        'payment_methods',
        'subscription_plans',
        'invoices',
        'contract_line_items',
        'taxonomy_aliases',
        'vendor_slas'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables_needing_trigger
    LOOP
        -- Check if trigger already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'update_' || t || '_updated_at'
        ) THEN
            -- Check if table has updated_at column
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = t AND column_name = 'updated_at'
            ) THEN
                EXECUTE format(
                    'CREATE TRIGGER update_%I_updated_at
                     BEFORE UPDATE ON %I
                     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                    t, t
                );
            END IF;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- PART 5: CREATE ENTERPRISE DASHBOARD STATS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_enterprise_dashboard_stats(p_enterprise_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        -- Contract stats
        'contracts', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE status = 'active'),
                'draft', COUNT(*) FILTER (WHERE status = 'draft'),
                'expired', COUNT(*) FILTER (WHERE status = 'expired'),
                'pending_approval', COUNT(*) FILTER (WHERE status = 'pending_approval'),
                'expiring_30_days', COUNT(*) FILTER (WHERE status = 'active' AND end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'),
                'expiring_90_days', COUNT(*) FILTER (WHERE status = 'active' AND end_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'),
                'total_value', COALESCE(SUM(value), 0),
                'active_value', COALESCE(SUM(value) FILTER (WHERE status = 'active'), 0)
            )
            FROM contracts
            WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL
        ),

        -- Vendor stats
        'vendors', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'active', COUNT(*) FILTER (WHERE status = 'active'),
                'at_risk', COUNT(*) FILTER (WHERE performance_score < 0.6 OR compliance_score < 0.6),
                'avg_performance_score', ROUND(AVG(performance_score)::numeric, 2),
                'avg_compliance_score', ROUND(AVG(compliance_score)::numeric, 2)
            )
            FROM vendors
            WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL
        ),

        -- Budget stats
        'budgets', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'total_allocated', COALESCE(SUM(total_amount), 0),
                'total_spent', COALESCE(SUM(spent_amount), 0),
                'utilization_rate', CASE
                    WHEN SUM(total_amount) > 0
                    THEN ROUND((SUM(spent_amount) / SUM(total_amount) * 100)::numeric, 2)
                    ELSE 0
                END,
                'over_budget_count', COUNT(*) FILTER (WHERE spent_amount > total_amount)
            )
            FROM budgets
            WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL
        ),

        -- Approval stats
        'approvals', (
            SELECT jsonb_build_object(
                'pending', COUNT(*) FILTER (WHERE status = 'pending'),
                'approved_this_month', COUNT(*) FILTER (WHERE status = 'approved' AND approved_at >= DATE_TRUNC('month', NOW())),
                'rejected_this_month', COUNT(*) FILTER (WHERE status = 'rejected' AND rejected_at >= DATE_TRUNC('month', NOW())),
                'avg_approval_time_hours', ROUND(
                    AVG(EXTRACT(EPOCH FROM (COALESCE(approved_at, rejected_at) - requested_at)) / 3600)::numeric,
                    1
                ) FILTER (WHERE status IN ('approved', 'rejected'))
            )
            FROM contract_approvals ca
            JOIN contracts c ON ca.contract_id = c.id
            WHERE c.enterprise_id = p_enterprise_id
        ),

        -- Compliance stats
        'compliance', (
            SELECT jsonb_build_object(
                'checks_due', COUNT(*) FILTER (WHERE next_check_date <= NOW() + INTERVAL '7 days'),
                'checks_overdue', COUNT(*) FILTER (WHERE next_check_date < NOW()),
                'last_check_passed', COUNT(*) FILTER (WHERE status = 'passed'),
                'last_check_failed', COUNT(*) FILTER (WHERE status = 'failed')
            )
            FROM compliance_checks
            WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL
        ),

        -- Market intelligence stats
        'market_intelligence', (
            SELECT jsonb_build_object(
                'line_items_tracked', COUNT(*),
                'categories_covered', COUNT(DISTINCT taxonomy_code) FILTER (WHERE taxonomy_code IS NOT NULL),
                'anomalies_detected', (
                    SELECT COUNT(*)
                    FROM donna_price_anomalies
                    WHERE enterprise_id = p_enterprise_id AND status = 'active'
                ),
                'potential_savings', (
                    SELECT COALESCE(SUM(potential_savings), 0)
                    FROM donna_price_anomalies
                    WHERE enterprise_id = p_enterprise_id AND status = 'active'
                )
            )
            FROM contract_line_items
            WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL
        ),

        -- Activity stats
        'recent_activity', (
            SELECT jsonb_build_object(
                'contracts_created_7d', (
                    SELECT COUNT(*) FROM contracts
                    WHERE enterprise_id = p_enterprise_id
                    AND created_at >= NOW() - INTERVAL '7 days'
                    AND deleted_at IS NULL
                ),
                'contracts_modified_7d', (
                    SELECT COUNT(*) FROM contracts
                    WHERE enterprise_id = p_enterprise_id
                    AND updated_at >= NOW() - INTERVAL '7 days'
                    AND deleted_at IS NULL
                ),
                'vendors_added_7d', (
                    SELECT COUNT(*) FROM vendors
                    WHERE enterprise_id = p_enterprise_id
                    AND created_at >= NOW() - INTERVAL '7 days'
                    AND deleted_at IS NULL
                )
            )
        ),

        -- Timestamps
        'generated_at', NOW()
    ) INTO result;

    RETURN result;
END;
$$;

-- ============================================================================
-- PART 6: CREATE BULK OPERATION FUNCTIONS
-- ============================================================================

-- Bulk update contract status
CREATE OR REPLACE FUNCTION bulk_update_contract_status(
    p_contract_ids UUID[],
    p_new_status VARCHAR(50),
    p_enterprise_id UUID,
    p_user_id UUID
)
RETURNS TABLE(
    updated_count INTEGER,
    failed_ids UUID[],
    errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_failed_ids UUID[] := '{}';
    v_errors TEXT[] := '{}';
    v_contract_id UUID;
BEGIN
    FOREACH v_contract_id IN ARRAY p_contract_ids
    LOOP
        BEGIN
            UPDATE contracts
            SET status = p_new_status,
                updated_at = NOW()
            WHERE id = v_contract_id
            AND enterprise_id = p_enterprise_id
            AND deleted_at IS NULL;

            IF FOUND THEN
                v_updated_count := v_updated_count + 1;

                -- Log status change
                INSERT INTO contract_status_history (contract_id, old_status, new_status, changed_by, reason)
                SELECT id, status, p_new_status, p_user_id, 'Bulk status update'
                FROM contracts WHERE id = v_contract_id;
            ELSE
                v_failed_ids := array_append(v_failed_ids, v_contract_id);
                v_errors := array_append(v_errors, 'Contract not found or access denied: ' || v_contract_id::TEXT);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failed_ids := array_append(v_failed_ids, v_contract_id);
            v_errors := array_append(v_errors, SQLERRM);
        END;
    END LOOP;

    RETURN QUERY SELECT v_updated_count, v_failed_ids, v_errors;
END;
$$;

-- Bulk soft delete contracts
CREATE OR REPLACE FUNCTION bulk_soft_delete_contracts(
    p_contract_ids UUID[],
    p_enterprise_id UUID,
    p_user_id UUID
)
RETURNS TABLE(
    deleted_count INTEGER,
    failed_ids UUID[],
    errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_failed_ids UUID[] := '{}';
    v_errors TEXT[] := '{}';
    v_contract_id UUID;
BEGIN
    FOREACH v_contract_id IN ARRAY p_contract_ids
    LOOP
        BEGIN
            UPDATE contracts
            SET deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = v_contract_id
            AND enterprise_id = p_enterprise_id
            AND deleted_at IS NULL;

            IF FOUND THEN
                v_deleted_count := v_deleted_count + 1;

                -- Also soft delete related line items
                UPDATE contract_line_items
                SET deleted_at = NOW()
                WHERE contract_id = v_contract_id;

                -- Log the deletion
                INSERT INTO audit_logs (enterprise_id, user_id, action, entity_type, entity_id, details)
                VALUES (p_enterprise_id, p_user_id, 'delete', 'contract', v_contract_id,
                        jsonb_build_object('bulk_operation', true));
            ELSE
                v_failed_ids := array_append(v_failed_ids, v_contract_id);
                v_errors := array_append(v_errors, 'Contract not found or already deleted: ' || v_contract_id::TEXT);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failed_ids := array_append(v_failed_ids, v_contract_id);
            v_errors := array_append(v_errors, SQLERRM);
        END;
    END LOOP;

    RETURN QUERY SELECT v_deleted_count, v_failed_ids, v_errors;
END;
$$;

-- Bulk soft delete vendors
CREATE OR REPLACE FUNCTION bulk_soft_delete_vendors(
    p_vendor_ids UUID[],
    p_enterprise_id UUID,
    p_user_id UUID
)
RETURNS TABLE(
    deleted_count INTEGER,
    failed_ids UUID[],
    errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_failed_ids UUID[] := '{}';
    v_errors TEXT[] := '{}';
    v_vendor_id UUID;
    v_contract_count INTEGER;
BEGIN
    FOREACH v_vendor_id IN ARRAY p_vendor_ids
    LOOP
        BEGIN
            -- Check for active contracts
            SELECT COUNT(*) INTO v_contract_count
            FROM contracts
            WHERE vendor_id = v_vendor_id
            AND status = 'active'
            AND deleted_at IS NULL;

            IF v_contract_count > 0 THEN
                v_failed_ids := array_append(v_failed_ids, v_vendor_id);
                v_errors := array_append(v_errors, 'Vendor has ' || v_contract_count || ' active contracts: ' || v_vendor_id::TEXT);
                CONTINUE;
            END IF;

            UPDATE vendors
            SET deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = v_vendor_id
            AND enterprise_id = p_enterprise_id
            AND deleted_at IS NULL;

            IF FOUND THEN
                v_deleted_count := v_deleted_count + 1;

                -- Log the deletion
                INSERT INTO audit_logs (enterprise_id, user_id, action, entity_type, entity_id, details)
                VALUES (p_enterprise_id, p_user_id, 'delete', 'vendor', v_vendor_id,
                        jsonb_build_object('bulk_operation', true));
            ELSE
                v_failed_ids := array_append(v_failed_ids, v_vendor_id);
                v_errors := array_append(v_errors, 'Vendor not found or already deleted: ' || v_vendor_id::TEXT);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failed_ids := array_append(v_failed_ids, v_vendor_id);
            v_errors := array_append(v_errors, SQLERRM);
        END;
    END LOOP;

    RETURN QUERY SELECT v_deleted_count, v_failed_ids, v_errors;
END;
$$;

-- ============================================================================
-- PART 7: ADD USER MANAGEMENT FUNCTIONS
-- ============================================================================

-- Get enterprise users with stats
CREATE OR REPLACE FUNCTION get_enterprise_users(
    p_enterprise_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20,
    p_role VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    users JSONB,
    total_count BIGINT,
    page INTEGER,
    limit_val INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
    v_users JSONB;
    v_total BIGINT;
BEGIN
    v_offset := (p_page - 1) * p_limit;

    -- Get total count
    SELECT COUNT(*) INTO v_total
    FROM users u
    WHERE u.enterprise_id = p_enterprise_id
    AND u.deleted_at IS NULL
    AND (p_role IS NULL OR u.role = p_role)
    AND (p_status IS NULL OR u.status = p_status);

    -- Get users with stats
    SELECT jsonb_agg(user_data ORDER BY last_login DESC NULLS LAST)
    INTO v_users
    FROM (
        SELECT jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'full_name', u.full_name,
            'role', u.role,
            'status', u.status,
            'created_at', u.created_at,
            'last_login', u.last_login,
            'contracts_count', (
                SELECT COUNT(*) FROM contracts c
                WHERE c.created_by = u.id AND c.deleted_at IS NULL
            ),
            'pending_approvals', (
                SELECT COUNT(*) FROM contract_approvals ca
                JOIN contracts c ON ca.contract_id = c.id
                WHERE ca.approver_id = u.id
                AND ca.status = 'pending'
                AND c.enterprise_id = p_enterprise_id
            )
        ) as user_data
        FROM users u
        WHERE u.enterprise_id = p_enterprise_id
        AND u.deleted_at IS NULL
        AND (p_role IS NULL OR u.role = p_role)
        AND (p_status IS NULL OR u.status = p_status)
        ORDER BY u.last_login DESC NULLS LAST
        OFFSET v_offset
        LIMIT p_limit
    ) sub;

    RETURN QUERY SELECT COALESCE(v_users, '[]'::jsonb), v_total, p_page, p_limit;
END;
$$;

-- Update user role
CREATE OR REPLACE FUNCTION update_user_role(
    p_user_id UUID,
    p_new_role VARCHAR(50),
    p_enterprise_id UUID,
    p_updated_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_role VARCHAR(50);
    v_result JSONB;
BEGIN
    -- Get current role
    SELECT role INTO v_old_role
    FROM users
    WHERE id = p_user_id AND enterprise_id = p_enterprise_id AND deleted_at IS NULL;

    IF v_old_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Cannot demote owner
    IF v_old_role = 'owner' AND p_new_role != 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot demote enterprise owner');
    END IF;

    -- Update role
    UPDATE users
    SET role = p_new_role, updated_at = NOW()
    WHERE id = p_user_id AND enterprise_id = p_enterprise_id;

    -- Audit log
    INSERT INTO audit_logs (enterprise_id, user_id, action, entity_type, entity_id, details)
    VALUES (p_enterprise_id, p_updated_by, 'update_role', 'user', p_user_id,
            jsonb_build_object('old_role', v_old_role, 'new_role', p_new_role));

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'old_role', v_old_role,
        'new_role', p_new_role
    );
END;
$$;

-- Invite user to enterprise
CREATE OR REPLACE FUNCTION invite_user_to_enterprise(
    p_email VARCHAR(255),
    p_role VARCHAR(50),
    p_enterprise_id UUID,
    p_invited_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation_id UUID;
    v_existing_user UUID;
BEGIN
    -- Check if user already exists in this enterprise
    SELECT id INTO v_existing_user
    FROM users
    WHERE email = p_email AND enterprise_id = p_enterprise_id AND deleted_at IS NULL;

    IF v_existing_user IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User already exists in this enterprise');
    END IF;

    -- Check for pending invitation
    IF EXISTS (
        SELECT 1 FROM invitations
        WHERE email = p_email AND enterprise_id = p_enterprise_id AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending invitation already exists');
    END IF;

    -- Create invitation
    INSERT INTO invitations (email, role, enterprise_id, invited_by, status, expires_at)
    VALUES (p_email, p_role, p_enterprise_id, p_invited_by, 'pending', NOW() + INTERVAL '7 days')
    RETURNING id INTO v_invitation_id;

    -- Audit log
    INSERT INTO audit_logs (enterprise_id, user_id, action, entity_type, entity_id, details)
    VALUES (p_enterprise_id, p_invited_by, 'invite', 'user', v_invitation_id,
            jsonb_build_object('email', p_email, 'role', p_role));

    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', v_invitation_id,
        'email', p_email,
        'role', p_role,
        'expires_at', NOW() + INTERVAL '7 days'
    );
END;
$$;

-- ============================================================================
-- PART 8: HEALTH CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION system_health_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_db_size TEXT;
    v_connection_count INTEGER;
    v_oldest_pending_job TIMESTAMPTZ;
BEGIN
    -- Get database size
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO v_db_size;

    -- Get connection count
    SELECT count(*) INTO v_connection_count FROM pg_stat_activity;

    -- Get oldest pending job
    SELECT MIN(created_at) INTO v_oldest_pending_job
    FROM agent_tasks WHERE status = 'pending';

    SELECT jsonb_build_object(
        'status', 'healthy',
        'timestamp', NOW(),
        'database', jsonb_build_object(
            'size', v_db_size,
            'connections', v_connection_count,
            'version', version()
        ),
        'tables', jsonb_build_object(
            'contracts', (SELECT COUNT(*) FROM contracts WHERE deleted_at IS NULL),
            'vendors', (SELECT COUNT(*) FROM vendors WHERE deleted_at IS NULL),
            'users', (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
            'enterprises', (SELECT COUNT(*) FROM enterprises WHERE deleted_at IS NULL)
        ),
        'queues', jsonb_build_object(
            'pending_tasks', (SELECT COUNT(*) FROM agent_tasks WHERE status = 'pending'),
            'pending_emails', (SELECT COUNT(*) FROM email_queue WHERE status = 'pending'),
            'oldest_pending_task', v_oldest_pending_job
        ),
        'performance', jsonb_build_object(
            'avg_query_time_ms', (
                SELECT ROUND(AVG(total_exec_time / calls)::numeric, 2)
                FROM pg_stat_statements
                WHERE calls > 100
                LIMIT 1
            )
        )
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'status', 'degraded',
        'timestamp', NOW(),
        'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- PART 9: WEBHOOK MANAGEMENT FUNCTIONS
-- ============================================================================

-- Add webhook secret column if not exists
ALTER TABLE webhooks
ADD COLUMN IF NOT EXISTS secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Register webhook
CREATE OR REPLACE FUNCTION register_webhook(
    p_enterprise_id UUID,
    p_name VARCHAR(255),
    p_url TEXT,
    p_events TEXT[],
    p_headers JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_webhook_id UUID;
    v_secret VARCHAR(255);
BEGIN
    -- Generate secret
    v_secret := encode(gen_random_bytes(32), 'hex');

    INSERT INTO webhooks (enterprise_id, name, url, events, headers, secret, is_active)
    VALUES (p_enterprise_id, p_name, p_url, p_events, p_headers, v_secret, true)
    RETURNING id INTO v_webhook_id;

    RETURN jsonb_build_object(
        'success', true,
        'webhook_id', v_webhook_id,
        'secret', v_secret,
        'events', p_events
    );
END;
$$;

-- List webhooks for enterprise
CREATE OR REPLACE FUNCTION list_webhooks(p_enterprise_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'name', name,
            'url', url,
            'events', events,
            'is_active', is_active,
            'failure_count', failure_count,
            'last_triggered_at', last_triggered_at,
            'created_at', created_at
        ) ORDER BY created_at DESC), '[]'::jsonb)
        FROM webhooks
        WHERE enterprise_id = p_enterprise_id
    );
END;
$$;

-- ============================================================================
-- PART 10: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_enterprise_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_contract_status(UUID[], VARCHAR, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_soft_delete_contracts(UUID[], UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_soft_delete_vendors(UUID[], UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_enterprise_users(UUID, INTEGER, INTEGER, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role(UUID, VARCHAR, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION invite_user_to_enterprise(VARCHAR, VARCHAR, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION system_health_check() TO authenticated;
GRANT EXECUTE ON FUNCTION register_webhook(UUID, VARCHAR, TEXT, TEXT[], JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION list_webhooks(UUID) TO authenticated;

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 105_backend_optimization_and_cleanup completed successfully';
    RAISE NOTICE 'Dropped redundant tables, added indexes, created enterprise functions';
END $$;
