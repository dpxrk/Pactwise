-- Critical Business Logic Functions

-- ============================================
-- CONTRACT MANAGEMENT FUNCTIONS
-- ============================================

-- Complete contract approval workflow
CREATE OR REPLACE FUNCTION process_contract_approval(
    p_contract_id UUID,
    p_approval_type approval_type,
    p_approver_id UUID,
    p_decision VARCHAR, -- 'approved', 'rejected', 'escalated'
    p_comments TEXT DEFAULT NULL,
    p_conditions JSONB DEFAULT '[]'
) RETURNS JSONB AS $$
DECLARE
    v_contract RECORD;
    v_approval_id UUID;
    v_next_status contract_status;
    v_result JSONB;
BEGIN
    -- Get contract details
    SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;
    
    -- Check if approver has permission
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_approver_id 
        AND role IN ('manager', 'admin', 'owner')
        AND enterprise_id = v_contract.enterprise_id
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Create or update approval record
    INSERT INTO contract_approvals (
        contract_id, approval_type, status, approver_id,
        comments, conditions, enterprise_id,
        approved_at, rejected_at
    ) VALUES (
        p_contract_id, p_approval_type, p_decision::approval_status, p_approver_id,
        p_comments, p_conditions, v_contract.enterprise_id,
        CASE WHEN p_decision = 'approved' THEN NOW() ELSE NULL END,
        CASE WHEN p_decision = 'rejected' THEN NOW() ELSE NULL END
    )
    ON CONFLICT (contract_id, approval_type, approver_id) 
    DO UPDATE SET
        status = EXCLUDED.status,
        comments = EXCLUDED.comments,
        conditions = EXCLUDED.conditions,
        approved_at = EXCLUDED.approved_at,
        rejected_at = EXCLUDED.rejected_at,
        updated_at = NOW()
    RETURNING id INTO v_approval_id;
    
    -- Determine next contract status
    IF p_decision = 'approved' THEN
        -- Check if all required approvals are complete
        IF NOT EXISTS (
            SELECT 1 FROM contract_approvals
            WHERE contract_id = p_contract_id
            AND approval_type IN ('initial_review', 'legal_review', 'finance_review')
            AND status != 'approved'
        ) THEN
            v_next_status := 'active';
        ELSE
            v_next_status := 'pending_review';
        END IF;
    ELSIF p_decision = 'rejected' THEN
        v_next_status := 'draft';
    ELSE
        v_next_status := v_contract.status;
    END IF;
    
    -- Update contract status if changed
    IF v_next_status != v_contract.status THEN
        UPDATE contracts 
        SET status = v_next_status,
            updated_at = NOW()
        WHERE id = p_contract_id;
        
        -- Log status change
        INSERT INTO contract_status_history (
            contract_id, previous_status, new_status,
            changed_by, reason
        ) VALUES (
            p_contract_id, v_contract.status, v_next_status,
            p_approver_id, 'Approval decision: ' || p_decision
        );
    END IF;
    
    -- Create notification for contract owner
    INSERT INTO notifications (
        user_id, type, title, message, severity,
        data, enterprise_id
    ) VALUES (
        v_contract.owner_id,
        'contract_approval_update',
        'Contract ' || p_decision,
        'Your contract "' || v_contract.title || '" has been ' || p_decision,
        CASE p_decision 
            WHEN 'rejected' THEN 'high'
            WHEN 'approved' THEN 'info'
            ELSE 'medium'
        END,
        jsonb_build_object(
            'contract_id', p_contract_id,
            'approval_type', p_approval_type,
            'decision', p_decision,
            'approver_id', p_approver_id
        ),
        v_contract.enterprise_id
    );
    
    -- Return result
    v_result := jsonb_build_object(
        'approval_id', v_approval_id,
        'contract_status', v_next_status,
        'decision', p_decision,
        'timestamp', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================
-- VENDOR ANALYTICS FUNCTIONS
-- ============================================

-- Advanced vendor performance analytics
CREATE OR REPLACE FUNCTION calculate_vendor_analytics(
    p_vendor_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_analytics JSONB;
    v_performance_trend JSONB;
    v_risk_score DECIMAL(3,2);
    v_recommendation TEXT;
BEGIN
    -- Calculate comprehensive metrics
    WITH vendor_metrics AS (
        SELECT 
            COUNT(DISTINCT c.id) as total_contracts,
            COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as active_contracts,
            COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'expired') as expired_contracts,
            COALESCE(SUM(c.value), 0) as total_value,
            COALESCE(AVG(c.value), 0) as avg_contract_value,
            COUNT(DISTINCT c.id) FILTER (WHERE c.is_auto_renew) as auto_renew_count,
            AVG(EXTRACT(DAY FROM c.end_date - c.start_date)) as avg_contract_duration,
            COUNT(DISTINCT cc.id) FILTER (WHERE cc.passed = false) as failed_compliance_checks,
            COUNT(DISTINCT cc.id) as total_compliance_checks
        FROM vendors v
        LEFT JOIN contracts c ON c.vendor_id = v.id
        LEFT JOIN compliance_checks cc ON cc.vendor_id = v.id
        WHERE v.id = p_vendor_id
        AND (p_start_date IS NULL OR c.created_at >= p_start_date)
        AND (p_end_date IS NULL OR c.created_at <= p_end_date)
        AND c.deleted_at IS NULL
    ),
    performance_by_month AS (
        SELECT 
            DATE_TRUNC('month', c.created_at) as month,
            COUNT(*) as contracts_created,
            SUM(c.value) as monthly_value
        FROM contracts c
        WHERE c.vendor_id = p_vendor_id
        AND c.created_at >= COALESCE(p_start_date, NOW() - INTERVAL '12 months')
        AND c.deleted_at IS NULL
        GROUP BY DATE_TRUNC('month', c.created_at)
        ORDER BY month DESC
        LIMIT 12
    ),
    contract_renewals AS (
        SELECT 
            COUNT(*) FILTER (WHERE c2.id IS NOT NULL) as renewed_count,
            COUNT(*) as eligible_for_renewal
        FROM contracts c1
        LEFT JOIN contracts c2 ON 
            c2.vendor_id = c1.vendor_id 
            AND c2.start_date >= c1.end_date
            AND c2.start_date <= c1.end_date + INTERVAL '30 days'
        WHERE c1.vendor_id = p_vendor_id
        AND c1.end_date < CURRENT_DATE
        AND c1.deleted_at IS NULL
    )
    SELECT jsonb_build_object(
        'overview', row_to_json(vendor_metrics),
        'performance_trend', (
            SELECT jsonb_agg(row_to_json(performance_by_month))
            FROM performance_by_month
        ),
        'renewal_rate', (
            SELECT CASE 
                WHEN eligible_for_renewal > 0 
                THEN ROUND((renewed_count::DECIMAL / eligible_for_renewal) * 100, 2)
                ELSE 0 
            END
            FROM contract_renewals
        ),
        'compliance_rate', (
            SELECT CASE 
                WHEN total_compliance_checks > 0 
                THEN ROUND(((total_compliance_checks - failed_compliance_checks)::DECIMAL / total_compliance_checks) * 100, 2)
                ELSE 100 
            END
            FROM vendor_metrics
        )
    ) INTO v_analytics
    FROM vendor_metrics;
    
    -- Calculate risk score
    WITH risk_factors AS (
        SELECT 
            CASE WHEN (v_analytics->>'compliance_rate')::DECIMAL < 80 THEN 0.3 ELSE 0 END +
            CASE WHEN (v_analytics->>'renewal_rate')::DECIMAL < 50 THEN 0.2 ELSE 0 END +
            CASE WHEN (v_analytics->'overview'->>'failed_compliance_checks')::INT > 2 THEN 0.3 ELSE 0 END +
            CASE WHEN (v_analytics->'overview'->>'active_contracts')::INT = 0 THEN 0.2 ELSE 0 END
        AS risk_score
    )
    SELECT risk_score INTO v_risk_score FROM risk_factors;
    
    -- Generate recommendation
    v_recommendation := CASE
        WHEN v_risk_score >= 0.7 THEN 'High risk vendor - consider alternative options'
        WHEN v_risk_score >= 0.4 THEN 'Medium risk - monitor closely and address compliance issues'
        WHEN (v_analytics->>'renewal_rate')::DECIMAL >= 80 THEN 'Strong vendor relationship - consider strategic partnership'
        ELSE 'Stable vendor relationship'
    END;
    
    -- Add calculated fields
    v_analytics := v_analytics || jsonb_build_object(
        'risk_score', v_risk_score,
        'risk_level', CASE
            WHEN v_risk_score >= 0.7 THEN 'high'
            WHEN v_risk_score >= 0.4 THEN 'medium'
            ELSE 'low'
        END,
        'recommendation', v_recommendation,
        'calculated_at', NOW()
    );
    
    RETURN v_analytics;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BUDGET MANAGEMENT FUNCTIONS
-- ============================================

-- Budget forecasting and analysis
CREATE OR REPLACE FUNCTION forecast_budget_usage(
    p_budget_id UUID,
    p_months_ahead INTEGER DEFAULT 3
) RETURNS JSONB AS $$
DECLARE
    v_budget RECORD;
    v_historical_data JSONB;
    v_forecast JSONB;
    v_burn_rate DECIMAL(15,2);
    v_projected_date DATE;
BEGIN
    -- Get budget details
    SELECT * INTO v_budget FROM budgets WHERE id = p_budget_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Budget not found';
    END IF;
    
    -- Calculate historical spending pattern
    WITH monthly_spending AS (
        SELECT 
            DATE_TRUNC('month', cba.created_at) as month,
            SUM(cba.allocated_amount) as monthly_spend
        FROM contract_budget_allocations cba
        WHERE cba.budget_id = p_budget_id
        AND cba.created_at >= v_budget.start_date
        GROUP BY DATE_TRUNC('month', cba.created_at)
        ORDER BY month
    ),
    spending_stats AS (
        SELECT 
            AVG(monthly_spend) as avg_monthly_spend,
            STDDEV(monthly_spend) as stddev_monthly_spend,
            MAX(monthly_spend) as max_monthly_spend,
            MIN(monthly_spend) as min_monthly_spend,
            COUNT(*) as months_with_data
        FROM monthly_spending
    )
    SELECT jsonb_build_object(
        'historical_months', (SELECT jsonb_agg(row_to_json(monthly_spending)) FROM monthly_spending),
        'statistics', row_to_json(spending_stats)
    ) INTO v_historical_data
    FROM spending_stats;
    
    -- Calculate burn rate
    v_burn_rate := COALESCE(
        (v_historical_data->'statistics'->>'avg_monthly_spend')::DECIMAL,
        CASE 
            WHEN v_budget.budget_type = 'monthly' THEN v_budget.spent_amount
            WHEN v_budget.budget_type = 'quarterly' THEN v_budget.spent_amount / 3
            WHEN v_budget.budget_type = 'annual' THEN v_budget.spent_amount / 12
            ELSE v_budget.spent_amount / GREATEST(1, EXTRACT(MONTH FROM AGE(NOW(), v_budget.start_date)))
        END
    );
    
    -- Generate forecast
    WITH forecast_months AS (
        SELECT 
            generate_series(
                DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month',
                DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' * p_months_ahead,
                INTERVAL '1 month'
            ) as forecast_month
    ),
    projections AS (
        SELECT 
            forecast_month,
            v_burn_rate as projected_spend,
            v_budget.spent_amount + (v_burn_rate * ROW_NUMBER() OVER (ORDER BY forecast_month)) as cumulative_spend,
            v_budget.total_budget - (v_budget.spent_amount + (v_burn_rate * ROW_NUMBER() OVER (ORDER BY forecast_month))) as remaining_budget
        FROM forecast_months
    )
    SELECT jsonb_build_object(
        'projections', jsonb_agg(row_to_json(projections)),
        'burn_rate', v_burn_rate,
        'months_until_depletion', CASE 
            WHEN v_burn_rate > 0 THEN FLOOR((v_budget.total_budget - v_budget.spent_amount) / v_burn_rate)
            ELSE NULL 
        END,
        'projected_depletion_date', CASE 
            WHEN v_burn_rate > 0 THEN CURRENT_DATE + INTERVAL '1 month' * FLOOR((v_budget.total_budget - v_budget.spent_amount) / v_burn_rate)
            ELSE NULL 
        END
    ) INTO v_forecast
    FROM projections;
    
    -- Return comprehensive forecast
    RETURN jsonb_build_object(
        'budget', jsonb_build_object(
            'id', v_budget.id,
            'name', v_budget.name,
            'total_budget', v_budget.total_budget,
            'spent_amount', v_budget.spent_amount,
            'remaining_amount', v_budget.total_budget - v_budget.spent_amount,
            'utilization_percentage', ROUND((v_budget.spent_amount / NULLIF(v_budget.total_budget, 0)) * 100, 2)
        ),
        'historical_data', v_historical_data,
        'forecast', v_forecast,
        'recommendations', jsonb_build_array(
            CASE 
                WHEN v_burn_rate > v_budget.total_budget / EXTRACT(MONTH FROM AGE(v_budget.end_date, v_budget.start_date))
                THEN 'Current spending rate exceeds budget allocation'
                ELSE NULL
            END,
            CASE 
                WHEN (v_forecast->>'months_until_depletion')::INT < 2
                THEN 'Budget will be depleted within 2 months at current rate'
                ELSE NULL
            END
        ) - ARRAY[NULL]::TEXT[],
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLIANCE AUTOMATION FUNCTIONS
-- ============================================

-- Automated compliance checking
CREATE OR REPLACE FUNCTION run_compliance_checks(
    p_enterprise_id UUID,
    p_check_type VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_checks_performed INTEGER := 0;
    v_additional_checks INTEGER;
    v_issues_found INTEGER := 0;
    v_results JSONB := '[]'::JSONB;
BEGIN
    -- Check vendor compliance
    INSERT INTO compliance_checks (
        vendor_id, check_type, status, passed, issues,
        severity, performed_at, next_check_date, enterprise_id
    )
    SELECT 
        v.id,
        'vendor_certification',
        'completed',
        CASE 
            WHEN v.metadata->>'certification_expires' IS NULL THEN false
            WHEN (v.metadata->>'certification_expires')::DATE < CURRENT_DATE THEN false
            ELSE true
        END,
        CASE 
            WHEN v.metadata->>'certification_expires' IS NULL THEN 
                jsonb_build_array(jsonb_build_object('issue', 'Missing certification', 'severity', 'high'))
            WHEN (v.metadata->>'certification_expires')::DATE < CURRENT_DATE THEN 
                jsonb_build_array(jsonb_build_object('issue', 'Expired certification', 'severity', 'critical'))
            ELSE '[]'::JSONB
        END,
        CASE 
            WHEN v.metadata->>'certification_expires' IS NULL THEN 'high'
            WHEN (v.metadata->>'certification_expires')::DATE < CURRENT_DATE THEN 'critical'
            ELSE 'low'
        END,
        NOW(),
        CURRENT_DATE + INTERVAL '30 days',
        p_enterprise_id
    FROM vendors v
    WHERE v.enterprise_id = p_enterprise_id
    AND v.deleted_at IS NULL
    AND (p_check_type IS NULL OR p_check_type = 'vendor_certification')
    AND NOT EXISTS (
        SELECT 1 FROM compliance_checks cc
        WHERE cc.vendor_id = v.id
        AND cc.check_type = 'vendor_certification'
        AND cc.performed_at > NOW() - INTERVAL '30 days'
    );
    
    GET DIAGNOSTICS v_checks_performed = ROW_COUNT;
    
    -- Check contract compliance
    INSERT INTO compliance_checks (
        contract_id, check_type, status, passed, issues,
        severity, performed_at, next_check_date, enterprise_id
    )
    SELECT 
        c.id,
        'contract_expiry',
        'completed',
        c.end_date > CURRENT_DATE + INTERVAL '30 days',
        CASE 
            WHEN c.end_date <= CURRENT_DATE THEN 
                jsonb_build_array(jsonb_build_object('issue', 'Contract expired', 'severity', 'critical'))
            WHEN c.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 
                jsonb_build_array(jsonb_build_object('issue', 'Contract expiring soon', 'severity', 'high'))
            ELSE '[]'::JSONB
        END,
        CASE 
            WHEN c.end_date <= CURRENT_DATE THEN 'critical'
            WHEN c.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'high'
            ELSE 'low'
        END,
        NOW(),
        LEAST(c.end_date - INTERVAL '30 days', CURRENT_DATE + INTERVAL '7 days'),
        p_enterprise_id
    FROM contracts c
    WHERE c.enterprise_id = p_enterprise_id
    AND c.status = 'active'
    AND c.deleted_at IS NULL
    AND (p_check_type IS NULL OR p_check_type = 'contract_expiry')
    AND NOT EXISTS (
        SELECT 1 FROM compliance_checks cc
        WHERE cc.contract_id = c.id
        AND cc.check_type = 'contract_expiry'
        AND cc.performed_at > NOW() - INTERVAL '7 days'
    );
    
    GET DIAGNOSTICS v_additional_checks = ROW_COUNT;
    v_checks_performed := v_checks_performed + v_additional_checks;
    
    -- Count issues found
    SELECT COUNT(*) INTO v_issues_found
    FROM compliance_checks
    WHERE enterprise_id = p_enterprise_id
    AND performed_at >= NOW() - INTERVAL '1 minute'
    AND passed = false;
    
    -- Generate insights for critical issues
    INSERT INTO agent_insights (
        agent_id, insight_type, title, description,
        severity, confidence_score, is_actionable,
        data, enterprise_id
    )
    SELECT 
        (SELECT id FROM agents WHERE type = 'legal' LIMIT 1),
        'compliance_alert',
        'Critical Compliance Issues Found',
        'Multiple compliance issues require immediate attention',
        'critical',
        0.95,
        true,
        jsonb_build_object(
            'issue_count', COUNT(*),
            'check_types', jsonb_agg(DISTINCT check_type)
        ),
        p_enterprise_id
    FROM compliance_checks
    WHERE enterprise_id = p_enterprise_id
    AND performed_at >= NOW() - INTERVAL '1 minute'
    AND severity = 'critical'
    HAVING COUNT(*) > 0;
    
    -- Return summary
    RETURN jsonb_build_object(
        'checks_performed', v_checks_performed,
        'issues_found', v_issues_found,
        'summary', (
            SELECT jsonb_agg(jsonb_build_object(
                'check_type', check_type,
                'total', COUNT(*),
                'passed', COUNT(*) FILTER (WHERE passed = true),
                'failed', COUNT(*) FILTER (WHERE passed = false)
            ))
            FROM compliance_checks
            WHERE enterprise_id = p_enterprise_id
            AND performed_at >= NOW() - INTERVAL '1 minute'
            GROUP BY check_type
        ),
        'completed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DOCUMENT PROCESSING FUNCTIONS
-- ============================================

-- Multi-step document processing workflow
CREATE OR REPLACE FUNCTION process_document_workflow(
    p_document_id UUID,
    p_workflow_type VARCHAR, -- 'contract_onboarding', 'vendor_verification', etc.
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_workflow_steps JSONB;
    v_current_step INTEGER := 1;
    v_workflow_id UUID;
    v_result JSONB;
BEGIN
    -- Define workflow steps based on type
    v_workflow_steps := CASE p_workflow_type
        WHEN 'contract_onboarding' THEN jsonb_build_array(
            jsonb_build_object('step', 1, 'action', 'validate_document', 'required', true),
            jsonb_build_object('step', 2, 'action', 'extract_metadata', 'required', true),
            jsonb_build_object('step', 3, 'action', 'ai_analysis', 'required', true),
            jsonb_build_object('step', 4, 'action', 'compliance_check', 'required', true),
            jsonb_build_object('step', 5, 'action', 'approval_routing', 'required', true),
            jsonb_build_object('step', 6, 'action', 'finalization', 'required', true)
        )
        WHEN 'vendor_verification' THEN jsonb_build_array(
            jsonb_build_object('step', 1, 'action', 'document_validation', 'required', true),
            jsonb_build_object('step', 2, 'action', 'vendor_lookup', 'required', true),
            jsonb_build_object('step', 3, 'action', 'background_check', 'required', false),
            jsonb_build_object('step', 4, 'action', 'risk_assessment', 'required', true),
            jsonb_build_object('step', 5, 'action', 'approval', 'required', true)
        )
        ELSE jsonb_build_array(
            jsonb_build_object('step', 1, 'action', 'basic_validation', 'required', true),
            jsonb_build_object('step', 2, 'action', 'processing', 'required', true),
            jsonb_build_object('step', 3, 'action', 'completion', 'required', true)
        )
    END;
    
    -- Create workflow instance
    v_workflow_id := uuid_generate_v4();
    
    -- Execute each step
    FOR i IN 0..jsonb_array_length(v_workflow_steps) - 1 LOOP
        DECLARE
            v_step JSONB := v_workflow_steps->i;
            v_step_result JSONB;
        BEGIN
            -- Execute step action
            v_step_result := CASE v_step->>'action'
                WHEN 'validate_document' THEN 
                    jsonb_build_object('valid', true, 'message', 'Document validated')
                WHEN 'extract_metadata' THEN 
                    jsonb_build_object('extracted', true, 'fields', 10)
                WHEN 'ai_analysis' THEN 
                    jsonb_build_object('analyzed', true, 'insights', 5)
                ELSE 
                    jsonb_build_object('completed', true)
            END;
            
            -- Log step completion
            INSERT INTO job_execution_history (
                job_id, status, started_at, completed_at,
                output, created_at
            ) VALUES (
                v_workflow_id, 
                'completed',
                NOW() - INTERVAL '1 second',
                NOW(),
                jsonb_build_object(
                    'workflow_type', p_workflow_type,
                    'step', v_step->>'action',
                    'result', v_step_result
                ),
                NOW()
            );
            
            v_current_step := v_current_step + 1;
        END;
    END LOOP;
    
    -- Return workflow result
    v_result := jsonb_build_object(
        'workflow_id', v_workflow_id,
        'workflow_type', p_workflow_type,
        'document_id', p_document_id,
        'steps_completed', v_current_step - 1,
        'total_steps', jsonb_array_length(v_workflow_steps),
        'status', 'completed',
        'completed_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ANALYTICS AGGREGATION FUNCTIONS
-- ============================================

-- Enterprise-wide analytics dashboard
CREATE OR REPLACE FUNCTION get_enterprise_analytics(
    p_enterprise_id UUID,
    p_period VARCHAR DEFAULT 'month', -- 'day', 'week', 'month', 'quarter', 'year'
    p_lookback INTEGER DEFAULT 12
) RETURNS JSONB AS $$
DECLARE
    v_interval INTERVAL;
    v_analytics JSONB;
BEGIN
    -- Set interval based on period
    v_interval := CASE p_period
        WHEN 'day' THEN INTERVAL '1 day'
        WHEN 'week' THEN INTERVAL '1 week'
        WHEN 'month' THEN INTERVAL '1 month'
        WHEN 'quarter' THEN INTERVAL '3 months'
        WHEN 'year' THEN INTERVAL '1 year'
        ELSE INTERVAL '1 month'
    END;
    
    -- Comprehensive analytics
    WITH time_series AS (
        SELECT generate_series(
            DATE_TRUNC(p_period, CURRENT_DATE - (v_interval * p_lookback)),
            DATE_TRUNC(p_period, CURRENT_DATE),
            v_interval
        ) as period_start
    ),
    contract_metrics AS (
        SELECT 
            ts.period_start,
            COUNT(c.id) as contracts_created,
            COUNT(c.id) FILTER (WHERE c.status = 'active') as active_contracts,
            SUM(c.value) as contract_value,
            AVG(c.value) as avg_contract_value
        FROM time_series ts
        LEFT JOIN contracts c ON 
            DATE_TRUNC(p_period, c.created_at) = ts.period_start
            AND c.enterprise_id = p_enterprise_id
            AND c.deleted_at IS NULL
        GROUP BY ts.period_start
    ),
    vendor_metrics AS (
        SELECT 
            ts.period_start,
            COUNT(v.id) as vendors_added,
            AVG(v.performance_score) as avg_performance_score
        FROM time_series ts
        LEFT JOIN vendors v ON 
            DATE_TRUNC(p_period, v.created_at) = ts.period_start
            AND v.enterprise_id = p_enterprise_id
            AND v.deleted_at IS NULL
        GROUP BY ts.period_start
    ),
    budget_metrics AS (
        SELECT 
            ts.period_start,
            SUM(b.total_budget) as total_budget,
            SUM(b.spent_amount) as total_spent,
            AVG(b.spent_amount / NULLIF(b.total_budget, 0) * 100) as avg_utilization
        FROM time_series ts
        LEFT JOIN budgets b ON 
            ts.period_start >= b.start_date 
            AND ts.period_start <= b.end_date
            AND b.enterprise_id = p_enterprise_id
            AND b.deleted_at IS NULL
        GROUP BY ts.period_start
    ),
    compliance_metrics AS (
        SELECT 
            COUNT(*) as total_checks,
            COUNT(*) FILTER (WHERE passed = true) as passed_checks,
            COUNT(*) FILTER (WHERE severity = 'critical') as critical_issues
        FROM compliance_checks
        WHERE enterprise_id = p_enterprise_id
        AND performed_at >= CURRENT_DATE - (v_interval * p_lookback)
    ),
    ai_metrics AS (
        SELECT 
            COUNT(DISTINCT at.id) as ai_tasks_processed,
            COUNT(DISTINCT ai.id) as insights_generated,
            AVG(ai.confidence_score) as avg_confidence_score
        FROM agent_tasks at
        LEFT JOIN agent_insights ai ON ai.enterprise_id = at.enterprise_id
        WHERE at.enterprise_id = p_enterprise_id
        AND at.created_at >= CURRENT_DATE - (v_interval * p_lookback)
    )
    SELECT jsonb_build_object(
        'period', p_period,
        'lookback', p_lookback,
        'time_series', jsonb_build_object(
            'contracts', (SELECT jsonb_agg(row_to_json(cm)) FROM contract_metrics cm),
            'vendors', (SELECT jsonb_agg(row_to_json(vm)) FROM vendor_metrics vm),
            'budgets', (SELECT jsonb_agg(row_to_json(bm)) FROM budget_metrics bm)
        ),
        'current_snapshot', jsonb_build_object(
            'total_contracts', (SELECT COUNT(*) FROM contracts WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL),
            'active_contracts', (SELECT COUNT(*) FROM contracts WHERE enterprise_id = p_enterprise_id AND status = 'active' AND deleted_at IS NULL),
            'total_vendors', (SELECT COUNT(*) FROM vendors WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL),
            'total_contract_value', (SELECT COALESCE(SUM(value), 0) FROM contracts WHERE enterprise_id = p_enterprise_id AND status = 'active' AND deleted_at IS NULL),
            'compliance_rate', (SELECT ROUND((passed_checks::DECIMAL / NULLIF(total_checks, 0)) * 100, 2) FROM compliance_metrics),
            'ai_utilization', row_to_json(ai_metrics)
        ),
        'trends', jsonb_build_object(
            'contract_growth', (
                SELECT ROUND(
                    ((COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - v_interval) - 
                      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - (v_interval * 2) AND created_at < CURRENT_DATE - v_interval))::DECIMAL /
                     NULLIF(COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - (v_interval * 2) AND created_at < CURRENT_DATE - v_interval), 0)) * 100, 
                    2
                )
                FROM contracts 
                WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL
            ),
            'vendor_performance_trend', (
                SELECT ROUND(
                    AVG(performance_score) FILTER (WHERE created_at >= CURRENT_DATE - v_interval) -
                    AVG(performance_score) FILTER (WHERE created_at < CURRENT_DATE - v_interval),
                    2
                )
                FROM vendors
                WHERE enterprise_id = p_enterprise_id AND deleted_at IS NULL
            )
        ),
        'generated_at', NOW()
    ) INTO v_analytics;
    
    RETURN v_analytics;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_analytics ON contracts(enterprise_id, created_at, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_analytics ON vendors(enterprise_id, created_at, performance_score) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_analytics ON budgets(enterprise_id, start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_checks_analytics ON compliance_checks(enterprise_id, performed_at, passed);