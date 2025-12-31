-- =====================================================
-- Data Quality Continuous Monitoring
-- =====================================================
-- Description: Automatically monitor and report data quality issues
-- Agents triggered:
--   1. Data Quality Agent: Comprehensive quality assessment (priority 5)
--   2. Notifications Agent: Issue reporting (priority 6)
-- Triggers: Daily scheduled check + Event-driven on bulk imports
-- =====================================================

-- Daily scheduled function to check data quality
CREATE OR REPLACE FUNCTION check_data_quality_daily()
RETURNS JSONB AS $$
DECLARE
    v_quality_report JSONB;
    v_issues JSONB := '[]'::jsonb;
    v_missing_fields JSONB;
    v_invalid_dates JSONB;
    v_orphaned_records JSONB;
    v_duplicates JSONB;
    v_total_issues INTEGER := 0;
    v_quality_score INTEGER;
    v_data_quality_agent_id UUID;
    v_notifications_agent_id UUID;
    v_enterprise RECORD;
BEGIN
    -- Loop through each enterprise
    FOR v_enterprise IN
        SELECT id, name FROM enterprises WHERE deleted_at IS NULL
    LOOP
        v_issues := '[]'::jsonb;
        v_total_issues := 0;

        -- ===================================
        -- CHECK 1: Missing Required Fields
        -- ===================================

        -- Contracts missing required fields
        SELECT jsonb_build_object(
            'issue_type', 'missing_required_field',
            'table', 'contracts',
            'field', 'title',
            'count', COUNT(*),
            'severity', 'high',
            'records', jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at))
        ) INTO v_missing_fields
        FROM contracts
        WHERE enterprise_id = v_enterprise.id
        AND deleted_at IS NULL
        AND (title IS NULL OR title = '')
        HAVING COUNT(*) > 0;

        IF v_missing_fields IS NOT NULL THEN
            v_issues := v_issues || v_missing_fields;
            v_total_issues := v_total_issues + (v_missing_fields->>'count')::INTEGER;
        END IF;

        -- Contracts without vendor
        SELECT jsonb_build_object(
            'issue_type', 'missing_required_field',
            'table', 'contracts',
            'field', 'vendor_id',
            'count', COUNT(*),
            'severity', 'medium',
            'records', jsonb_agg(jsonb_build_object('id', id, 'title', title))
        ) INTO v_missing_fields
        FROM contracts
        WHERE enterprise_id = v_enterprise.id
        AND deleted_at IS NULL
        AND vendor_id IS NULL
        AND status IN ('active', 'pending_review')
        HAVING COUNT(*) > 0;

        IF v_missing_fields IS NOT NULL THEN
            v_issues := v_issues || v_missing_fields;
            v_total_issues := v_total_issues + (v_missing_fields->>'count')::INTEGER;
        END IF;

        -- Vendors missing contact information
        SELECT jsonb_build_object(
            'issue_type', 'incomplete_data',
            'table', 'vendors',
            'field', 'contact_info',
            'count', COUNT(*),
            'severity', 'medium',
            'records', jsonb_agg(jsonb_build_object('id', id, 'name', name))
        ) INTO v_missing_fields
        FROM vendors
        WHERE enterprise_id = v_enterprise.id
        AND deleted_at IS NULL
        AND (primary_contact_email IS NULL OR primary_contact_email = '')
        AND (primary_contact_phone IS NULL OR primary_contact_phone = '')
        HAVING COUNT(*) > 0;

        IF v_missing_fields IS NOT NULL THEN
            v_issues := v_issues || v_missing_fields;
            v_total_issues := v_total_issues + (v_missing_fields->>'count')::INTEGER;
        END IF;

        -- ===================================
        -- CHECK 2: Invalid Dates
        -- ===================================

        -- Contracts with start_date > end_date
        SELECT jsonb_build_object(
            'issue_type', 'invalid_date_range',
            'table', 'contracts',
            'description', 'start_date after end_date',
            'count', COUNT(*),
            'severity', 'high',
            'records', jsonb_agg(jsonb_build_object(
                'id', id,
                'title', title,
                'start_date', start_date,
                'end_date', end_date
            ))
        ) INTO v_invalid_dates
        FROM contracts
        WHERE enterprise_id = v_enterprise.id
        AND deleted_at IS NULL
        AND start_date IS NOT NULL
        AND end_date IS NOT NULL
        AND start_date > end_date
        HAVING COUNT(*) > 0;

        IF v_invalid_dates IS NOT NULL THEN
            v_issues := v_issues || v_invalid_dates;
            v_total_issues := v_total_issues + (v_invalid_dates->>'count')::INTEGER;
        END IF;

        -- Budgets with end_date in the past but status still active
        SELECT jsonb_build_object(
            'issue_type', 'stale_data',
            'table', 'budgets',
            'description', 'expired budgets not marked as ended',
            'count', COUNT(*),
            'severity', 'low',
            'records', jsonb_agg(jsonb_build_object('id', id, 'name', name, 'end_date', end_date))
        ) INTO v_invalid_dates
        FROM budgets
        WHERE enterprise_id = v_enterprise.id
        AND deleted_at IS NULL
        AND end_date < CURRENT_DATE
        AND status != 'ended'
        HAVING COUNT(*) > 0;

        IF v_invalid_dates IS NOT NULL THEN
            v_issues := v_issues || v_invalid_dates;
            v_total_issues := v_total_issues + (v_invalid_dates->>'count')::INTEGER;
        END IF;

        -- ===================================
        -- CHECK 3: Orphaned Records
        -- ===================================

        -- Budget allocations referencing deleted contracts
        SELECT jsonb_build_object(
            'issue_type', 'orphaned_record',
            'table', 'contract_budget_allocations',
            'description', 'allocations for deleted contracts',
            'count', COUNT(*),
            'severity', 'medium',
            'action', 'cleanup_required'
        ) INTO v_orphaned_records
        FROM contract_budget_allocations cba
        LEFT JOIN contracts c ON c.id = cba.contract_id
        WHERE (c.id IS NULL OR c.deleted_at IS NOT NULL)
        HAVING COUNT(*) > 0;

        IF v_orphaned_records IS NOT NULL THEN
            v_issues := v_issues || v_orphaned_records;
            v_total_issues := v_total_issues + (v_orphaned_records->>'count')::INTEGER;
        END IF;

        -- ===================================
        -- CHECK 4: Duplicate Detection
        -- ===================================

        -- Duplicate vendors (same name, fuzzy match)
        SELECT jsonb_build_object(
            'issue_type', 'potential_duplicate',
            'table', 'vendors',
            'description', 'vendors with similar names',
            'count', COUNT(*) / 2, -- Divide by 2 since each pair is counted twice
            'severity', 'low',
            'action', 'review_and_merge'
        ) INTO v_duplicates
        FROM (
            SELECT v1.id, v1.name, v2.id as duplicate_id, v2.name as duplicate_name
            FROM vendors v1
            JOIN vendors v2 ON v2.enterprise_id = v1.enterprise_id
                AND v2.id > v1.id
                AND v1.deleted_at IS NULL
                AND v2.deleted_at IS NULL
                AND LOWER(v1.name) = LOWER(v2.name)
            WHERE v1.enterprise_id = v_enterprise.id
        ) duplicates
        HAVING COUNT(*) > 0;

        IF v_duplicates IS NOT NULL THEN
            v_issues := v_issues || v_duplicates;
            v_total_issues := v_total_issues + (v_duplicates->>'count')::INTEGER;
        END IF;

        -- ===================================
        -- Calculate Quality Score (0-100)
        -- ===================================

        -- Get total record count
        DECLARE
            v_total_records INTEGER;
        BEGIN
            SELECT
                (SELECT COUNT(*) FROM contracts WHERE enterprise_id = v_enterprise.id AND deleted_at IS NULL) +
                (SELECT COUNT(*) FROM vendors WHERE enterprise_id = v_enterprise.id AND deleted_at IS NULL) +
                (SELECT COUNT(*) FROM budgets WHERE enterprise_id = v_enterprise.id AND deleted_at IS NULL)
            INTO v_total_records;

            -- Quality score: 100 - (issues / total_records * 100)
            -- Cap at 0-100 range
            IF v_total_records > 0 THEN
                v_quality_score := GREATEST(0, LEAST(100,
                    100 - ((v_total_issues::DECIMAL / v_total_records) * 100)::INTEGER
                ));
            ELSE
                v_quality_score := 100;
            END IF;
        END;

        -- ===================================
        -- Queue Agent Tasks if Issues Found
        -- ===================================

        IF v_total_issues > 0 THEN
            -- Get agent IDs
            SELECT id INTO v_data_quality_agent_id
            FROM agents
            WHERE type = 'data-quality'
            AND enterprise_id = v_enterprise.id
            AND is_active = true
            LIMIT 1;

            SELECT id INTO v_notifications_agent_id
            FROM agents
            WHERE type = 'notifications'
            AND enterprise_id = v_enterprise.id
            AND is_active = true
            LIMIT 1;

            -- Queue Data Quality Agent task
            IF v_data_quality_agent_id IS NOT NULL AND v_quality_score < 90 THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    enterprise_id,
                    status
                ) VALUES (
                    v_data_quality_agent_id,
                    'data_quality_assessment_report',
                    CASE
                        WHEN v_quality_score < 70 THEN 6  -- Medium-high priority
                        ELSE 5  -- Medium priority
                    END,
                    jsonb_build_object(
                        'quality_score', v_quality_score,
                        'total_issues', v_total_issues,
                        'issues', v_issues,
                        'analysis_type', 'comprehensive_quality_assessment',
                        'trigger_source', 'data_quality_automation',
                        'requested_outputs', jsonb_build_array(
                            'issue_prioritization',
                            'remediation_plan',
                            'automated_cleanup_suggestions',
                            'data_governance_recommendations',
                            'quality_trend_analysis'
                        )
                    ),
                    v_enterprise.id,
                    'pending'
                );
            END IF;

            -- Queue Notifications Agent if quality score critical
            IF v_notifications_agent_id IS NOT NULL AND v_quality_score < 70 THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    enterprise_id,
                    status
                ) VALUES (
                    v_notifications_agent_id,
                    'data_quality_alert_notification',
                    6,
                    jsonb_build_object(
                        'quality_score', v_quality_score,
                        'total_issues', v_total_issues,
                        'trigger_source', 'data_quality_automation'
                    ),
                    v_enterprise.id,
                    'pending'
                );
            END IF;

            -- Create notification for enterprise admins
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                severity,
                data,
                enterprise_id
            ) VALUES (
                (SELECT id FROM users WHERE enterprise_id = v_enterprise.id AND role IN ('admin', 'owner') ORDER BY role DESC LIMIT 1),
                'data_quality_alert',
                format('Data Quality: %s%% Score', v_quality_score),
                format('%s data quality issues detected. Quality score: %s/100. Review recommended.',
                    v_total_issues,
                    v_quality_score
                ),
                CASE
                    WHEN v_quality_score < 70 THEN 'high'
                    WHEN v_quality_score < 85 THEN 'medium'
                    ELSE 'low'
                END,
                jsonb_build_object(
                    'quality_score', v_quality_score,
                    'total_issues', v_total_issues,
                    'issues_summary', v_issues
                ),
                v_enterprise.id
            );
        END IF;
    END LOOP;

    -- Return summary report
    v_quality_report := jsonb_build_object(
        'success', true,
        'checked_at', NOW(),
        'message', 'Data quality check completed'
    );

    RETURN v_quality_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get data quality dashboard stats
CREATE OR REPLACE FUNCTION get_data_quality_stats(p_enterprise_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
    v_total_records INTEGER;
    v_quality_score INTEGER;
BEGIN
    -- Get total active records
    SELECT
        (SELECT COUNT(*) FROM contracts WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM vendors WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL) +
        (SELECT COUNT(*) FROM budgets WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL)
    INTO v_total_records;

    -- Calculate quality metrics
    SELECT jsonb_build_object(
        'total_records', v_total_records,
        'missing_fields_count', (
            SELECT COUNT(*) FROM contracts
            WHERE enterprise_id = p_enterprise_id
            AND deleted_at IS NULL
            AND (title IS NULL OR title = '' OR vendor_id IS NULL)
        ),
        'invalid_dates_count', (
            SELECT COUNT(*) FROM contracts
            WHERE enterprise_id = p_enterprise_id
            AND deleted_at IS NULL
            AND start_date > end_date
        ),
        'orphaned_allocations', (
            SELECT COUNT(*)
            FROM contract_budget_allocations cba
            LEFT JOIN contracts c ON c.id = cba.contract_id
            WHERE (c.id IS NULL OR c.deleted_at IS NOT NULL)
        ),
        'duplicate_vendors_count', (
            SELECT COUNT(*) / 2
            FROM vendors v1
            JOIN vendors v2 ON v2.enterprise_id = v1.enterprise_id
                AND v2.id > v1.id
                AND LOWER(v1.name) = LOWER(v2.name)
            WHERE v1.enterprise_id = p_enterprise_id
            AND v1.deleted_at IS NULL
            AND v2.deleted_at IS NULL
        )
    ) INTO v_stats;

    -- Calculate quality score
    IF v_total_records > 0 THEN
        v_quality_score := GREATEST(0, LEAST(100,
            100 - (((v_stats->>'missing_fields_count')::INTEGER +
                    (v_stats->>'invalid_dates_count')::INTEGER +
                    (v_stats->>'orphaned_allocations')::INTEGER +
                    (v_stats->>'duplicate_vendors_count')::INTEGER)::DECIMAL / v_total_records * 100)::INTEGER
        ));
    ELSE
        v_quality_score := 100;
    END IF;

    v_stats := v_stats || jsonb_build_object('quality_score', v_quality_score);

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION check_data_quality_daily() IS
'Daily scheduled function to monitor data quality across all enterprises.
Checks: missing fields, invalid dates, orphaned records, duplicates.
Calculates quality score (0-100) and queues Data Quality + Notifications agents if score < 90.
Should be called via cron job every day at 2 AM.';

COMMENT ON FUNCTION get_data_quality_stats(UUID) IS
'Returns real-time data quality statistics for dashboard widget.
Includes quality score, issue counts by category, and total records.';
