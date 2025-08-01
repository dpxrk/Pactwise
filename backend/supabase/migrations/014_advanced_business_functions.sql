-- Advanced Business Logic Functions

-- ============================================
-- INTELLIGENT CONTRACT ROUTING
-- ============================================

-- Smart contract routing based on value, type, and content
CREATE OR REPLACE FUNCTION route_contract_for_approval(
    p_contract_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_contract RECORD;
    v_routing_rules JSONB;
    v_required_approvals JSONB := '[]'::JSONB;
    v_assigned_approvers JSONB := '[]'::JSONB;
    v_approval_record RECORD;
    v_approver_info JSONB;
BEGIN
    -- Get contract details with extracted data
    SELECT c.*, v.category as vendor_category
    INTO v_contract
    FROM contracts c
    LEFT JOIN vendors v ON v.id = c.vendor_id
    WHERE c.id = p_contract_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;
    
    -- Define routing rules
    v_routing_rules := jsonb_build_array(
        jsonb_build_object(
            'condition', 'high_value',
            'check', v_contract.value > 100000,
            'approval_type', 'finance_review',
            'priority', 'high'
        ),
        jsonb_build_object(
            'condition', 'legal_required',
            'check', v_contract.extracted_key_terms ? 'liability_cap' OR 
                    v_contract.extracted_key_terms ? 'indemnification' OR
                    v_contract.vendor_category = 'legal',
            'approval_type', 'legal_review',
            'priority', 'high'
        ),
        jsonb_build_object(
            'condition', 'technology_vendor',
            'check', v_contract.vendor_category = 'technology' OR 
                    v_contract.contract_type = 'software_license',
            'approval_type', 'technical_review',
            'priority', 'medium'
        ),
        jsonb_build_object(
            'condition', 'standard_review',
            'check', true,
            'approval_type', 'initial_review',
            'priority', 'medium'
        )
    );
    
    -- Determine required approvals
    FOR i IN 0..jsonb_array_length(v_routing_rules) - 1 LOOP
        IF (v_routing_rules->i->>'check')::boolean THEN
            v_required_approvals := v_required_approvals || jsonb_build_object(
                'approval_type', v_routing_rules->i->>'approval_type',
                'priority', v_routing_rules->i->>'priority',
                'reason', v_routing_rules->i->>'condition'
            );
        END IF;
    END LOOP;
    
    -- Auto-assign approvers based on rules and availability
    FOR v_approval_record IN SELECT * FROM jsonb_array_elements(v_required_approvals) LOOP
        -- Find best approver for this type
        WITH eligible_approvers AS (
            SELECT 
                u.id,
                u.first_name || ' ' || u.last_name as name,
                u.role,
                COUNT(ca.id) as current_workload
            FROM users u
            LEFT JOIN contract_approvals ca ON 
                ca.approver_id = u.id 
                AND ca.status = 'pending'
            WHERE u.enterprise_id = v_contract.enterprise_id
            AND u.is_active = true
            AND u.role IN ('manager', 'admin', 'owner')
            AND (
                (v_approval_record.value->>'approval_type' = 'finance_review' AND u.department = 'Finance') OR
                (v_approval_record.value->>'approval_type' = 'legal_review' AND u.department = 'Legal') OR
                (v_approval_record.value->>'approval_type' = 'technical_review' AND u.department = 'Technology') OR
                (v_approval_record.value->>'approval_type' = 'initial_review')
            )
            GROUP BY u.id, u.first_name, u.last_name, u.role
            ORDER BY 
                CASE u.role 
                    WHEN 'owner' THEN 1 
                    WHEN 'admin' THEN 2 
                    WHEN 'manager' THEN 3 
                END,
                current_workload ASC
            LIMIT 1
        )
        INSERT INTO contract_approvals (
            contract_id, approval_type, approver_id, 
            status, enterprise_id
        )
        SELECT 
            p_contract_id,
            (v_approval_record.value->>'approval_type')::approval_type,
            id,
            'pending',
            v_contract.enterprise_id
        FROM eligible_approvers
        RETURNING jsonb_build_object(
            'approval_type', approval_type,
            'approver_id', approver_id,
            'approver_name', (SELECT first_name || ' ' || last_name FROM users WHERE id = approver_id)
        ) INTO v_approver_info;
        
        v_assigned_approvers := v_assigned_approvers || v_approver_info;
    END LOOP;
    
    -- Update contract status
    UPDATE contracts 
    SET status = 'pending_review',
        updated_at = NOW()
    WHERE id = p_contract_id;
    
    -- Create notifications for approvers
    INSERT INTO notifications (
        user_id, type, title, message, severity,
        data, action_url, enterprise_id
    )
    SELECT 
        (elem->>'approver_id')::UUID,
        'approval_request',
        'Contract Approval Required',
        'You have been assigned to review: ' || v_contract.title,
        CASE 
            WHEN v_contract.value > 100000 THEN 'high'
            ELSE 'medium'
        END,
        jsonb_build_object(
            'contract_id', p_contract_id,
            'approval_type', elem->>'approval_type',
            'contract_value', v_contract.value
        ),
        '/contracts/' || p_contract_id || '/approve',
        v_contract.enterprise_id
    FROM jsonb_array_elements(v_assigned_approvers) elem;
    
    RETURN jsonb_build_object(
        'contract_id', p_contract_id,
        'required_approvals', v_required_approvals,
        'assigned_approvers', v_assigned_approvers,
        'routing_completed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VENDOR RELATIONSHIP SCORING
-- ============================================

-- Calculate comprehensive vendor relationship score
CREATE OR REPLACE FUNCTION calculate_vendor_relationship_score(
    p_vendor_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_score_components JSONB;
    v_overall_score DECIMAL(3,2);
    v_relationship_level VARCHAR;
    v_recommendations JSONB := '[]'::JSONB;
BEGIN
    -- Calculate multi-dimensional scoring
    WITH contract_performance AS (
        SELECT 
            COUNT(*) as total_contracts,
            COUNT(*) FILTER (WHERE status = 'active') as active_contracts,
            COUNT(*) FILTER (WHERE end_date < CURRENT_DATE AND status != 'terminated') as completed_contracts,
            COUNT(*) FILTER (WHERE status = 'terminated') as terminated_contracts,
            AVG(CASE 
                WHEN end_date > start_date 
                THEN EXTRACT(DAY FROM end_date - start_date) 
                ELSE 0 
            END) as avg_contract_duration,
            COALESCE(SUM(value), 0) as lifetime_value,
            COALESCE(AVG(value), 0) as avg_contract_value
        FROM contracts
        WHERE vendor_id = p_vendor_id
        AND deleted_at IS NULL
    ),
    compliance_performance AS (
        SELECT 
            COUNT(*) as total_checks,
            COUNT(*) FILTER (WHERE passed = true) as passed_checks,
            COUNT(DISTINCT check_type) as check_types_covered,
            MAX(performed_at) as last_check_date
        FROM compliance_checks
        WHERE vendor_id = p_vendor_id
    ),
    renewal_performance AS (
        SELECT 
            COUNT(*) as renewal_opportunities,
            COUNT(*) FILTER (WHERE renewed.id IS NOT NULL) as actual_renewals
        FROM contracts original
        LEFT JOIN contracts renewed ON 
            renewed.vendor_id = original.vendor_id
            AND renewed.start_date >= original.end_date
            AND renewed.start_date <= original.end_date + INTERVAL '60 days'
            AND renewed.id != original.id
        WHERE original.vendor_id = p_vendor_id
        AND original.end_date < CURRENT_DATE
        AND original.deleted_at IS NULL
    ),
    response_metrics AS (
        SELECT 
            AVG(EXTRACT(EPOCH FROM (first_response.created_at - original.created_at)) / 3600) as avg_response_hours
        FROM notifications original
        LEFT JOIN notifications first_response ON 
            first_response.data->>'parent_id' = original.id::text
            AND first_response.type = 'vendor_response'
        WHERE original.data->>'vendor_id' = p_vendor_id::text
        AND original.type = 'vendor_request'
    ),
    financial_metrics AS (
        SELECT 
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    SUM(CASE WHEN data->>'payment_on_time' = 'true' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)
                ELSE 1
            END as on_time_payment_rate
        FROM audit_logs
        WHERE resource_type = 'vendor_payment'
        AND resource_id = p_vendor_id
    )
    SELECT jsonb_build_object(
        'performance', jsonb_build_object(
            'score', LEAST(100, 
                (cp.total_contracts * 2) + 
                (cp.active_contracts * 5) + 
                (CASE WHEN cp.terminated_contracts = 0 THEN 20 ELSE 0 END)
            ),
            'weight', 0.25,
            'details', row_to_json(cp)
        ),
        'compliance', jsonb_build_object(
            'score', CASE 
                WHEN comp.total_checks > 0 
                THEN ROUND((comp.passed_checks::DECIMAL / comp.total_checks) * 100, 2)
                ELSE 75 -- Default if no checks
            END,
            'weight', 0.20,
            'details', row_to_json(comp)
        ),
        'loyalty', jsonb_build_object(
            'score', CASE 
                WHEN rp.renewal_opportunities > 0 
                THEN ROUND((rp.actual_renewals::DECIMAL / rp.renewal_opportunities) * 100, 2)
                ELSE 50 -- Default if no renewals yet
            END,
            'weight', 0.20,
            'details', row_to_json(rp)
        ),
        'responsiveness', jsonb_build_object(
            'score', CASE 
                WHEN rm.avg_response_hours IS NULL THEN 75
                WHEN rm.avg_response_hours <= 24 THEN 100
                WHEN rm.avg_response_hours <= 48 THEN 80
                WHEN rm.avg_response_hours <= 72 THEN 60
                ELSE 40
            END,
            'weight', 0.15,
            'details', row_to_json(rm)
        ),
        'financial', jsonb_build_object(
            'score', COALESCE(fm.on_time_payment_rate * 100, 85),
            'weight', 0.20,
            'details', row_to_json(fm)
        )
    ) INTO v_score_components
    FROM contract_performance cp
    CROSS JOIN compliance_performance comp
    CROSS JOIN renewal_performance rp
    CROSS JOIN response_metrics rm
    CROSS JOIN financial_metrics fm;
    
    -- Calculate weighted overall score
    v_overall_score := (
        (v_score_components->'performance'->>'score')::DECIMAL * (v_score_components->'performance'->>'weight')::DECIMAL +
        (v_score_components->'compliance'->>'score')::DECIMAL * (v_score_components->'compliance'->>'weight')::DECIMAL +
        (v_score_components->'loyalty'->>'score')::DECIMAL * (v_score_components->'loyalty'->>'weight')::DECIMAL +
        (v_score_components->'responsiveness'->>'score')::DECIMAL * (v_score_components->'responsiveness'->>'weight')::DECIMAL +
        (v_score_components->'financial'->>'score')::DECIMAL * (v_score_components->'financial'->>'weight')::DECIMAL
    ) / 100;
    
    -- Determine relationship level
    v_relationship_level := CASE
        WHEN v_overall_score >= 0.90 THEN 'strategic_partner'
        WHEN v_overall_score >= 0.75 THEN 'preferred_vendor'
        WHEN v_overall_score >= 0.60 THEN 'standard_vendor'
        WHEN v_overall_score >= 0.40 THEN 'monitored_vendor'
        ELSE 'at_risk_vendor'
    END;
    
    -- Generate recommendations
    IF (v_score_components->'compliance'->>'score')::DECIMAL < 70 THEN
        v_recommendations := v_recommendations || jsonb_build_object(
            'type', 'compliance',
            'priority', 'high',
            'action', 'Schedule comprehensive compliance review',
            'reason', 'Low compliance score indicates potential risks'
        );
    END IF;
    
    IF (v_score_components->'loyalty'->>'score')::DECIMAL < 50 THEN
        v_recommendations := v_recommendations || jsonb_build_object(
            'type', 'retention',
            'priority', 'medium',
            'action', 'Engage vendor for relationship improvement',
            'reason', 'Low renewal rate suggests relationship issues'
        );
    END IF;
    
    IF v_overall_score >= 0.85 AND (v_score_components->'performance'->'details'->>'lifetime_value')::DECIMAL > 500000 THEN
        v_recommendations := v_recommendations || jsonb_build_object(
            'type', 'partnership',
            'priority', 'medium',
            'action', 'Consider strategic partnership agreement',
            'reason', 'High performance and significant business value'
        );
    END IF;
    
    -- Update vendor record
    UPDATE vendors 
    SET performance_score = v_overall_score,
        metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
            'relationship_level', v_relationship_level,
            'last_score_update', NOW()
        ),
        updated_at = NOW()
    WHERE id = p_vendor_id;
    
    RETURN jsonb_build_object(
        'vendor_id', p_vendor_id,
        'overall_score', ROUND(v_overall_score, 2),
        'relationship_level', v_relationship_level,
        'score_components', v_score_components,
        'recommendations', v_recommendations,
        'calculated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BUDGET OPTIMIZATION ENGINE
-- ============================================

-- Optimize budget allocation across departments/projects
CREATE OR REPLACE FUNCTION optimize_budget_allocation(
    p_enterprise_id UUID,
    p_optimization_target VARCHAR DEFAULT 'efficiency' -- 'efficiency', 'growth', 'cost_reduction'
) RETURNS JSONB AS $$
DECLARE
    v_total_available DECIMAL(15,2);
    v_current_allocations JSONB;
    v_optimization_result JSONB;
    v_recommendations JSONB := '[]'::JSONB;
    budget RECORD;
BEGIN
    -- Get total available budget
    SELECT SUM(total_budget - allocated_amount)
    INTO v_total_available
    FROM budgets
    WHERE enterprise_id = p_enterprise_id
    AND status != 'closed'
    AND end_date >= CURRENT_DATE
    AND deleted_at IS NULL;
    
    -- Analyze current allocations
    WITH budget_performance AS (
        SELECT 
            b.id,
            b.name,
            b.budget_type,
            b.department,
            b.total_budget,
            b.allocated_amount,
            b.spent_amount,
            b.total_budget - b.allocated_amount as available_amount,
            CASE 
                WHEN b.allocated_amount > 0 
                THEN (b.spent_amount / b.allocated_amount) 
                ELSE 0 
            END as utilization_rate,
            COUNT(DISTINCT cba.contract_id) as contract_count,
            COALESCE(AVG(c.value), 0) as avg_contract_value,
            COALESCE(
                AVG(CASE 
                    WHEN ai.severity = 'critical' THEN 1
                    WHEN ai.severity = 'high' THEN 0.75
                    WHEN ai.severity = 'medium' THEN 0.5
                    ELSE 0.25
                END), 0.5
            ) as risk_score
        FROM budgets b
        LEFT JOIN contract_budget_allocations cba ON cba.budget_id = b.id
        LEFT JOIN contracts c ON c.id = cba.contract_id
        LEFT JOIN agent_insights ai ON 
            ai.data->>'budget_id' = b.id::text
            AND ai.created_at >= b.start_date
        WHERE b.enterprise_id = p_enterprise_id
        AND b.deleted_at IS NULL
        GROUP BY b.id
    ),
    optimization_scores AS (
        SELECT 
            *,
            CASE p_optimization_target
                WHEN 'efficiency' THEN 
                    (utilization_rate * 0.4) + 
                    ((contract_count::DECIMAL / NULLIF(total_budget, 0) * 10000) * 0.3) +
                    ((1 - risk_score) * 0.3)
                WHEN 'growth' THEN 
                    (CASE WHEN department IN ('Sales', 'Marketing', 'R&D') THEN 0.7 ELSE 0.3 END) +
                    (utilization_rate * 0.2) +
                    ((1 - risk_score) * 0.1)
                WHEN 'cost_reduction' THEN 
                    ((1 - utilization_rate) * 0.4) +
                    (available_amount / NULLIF(total_budget, 0) * 0.4) +
                    (risk_score * 0.2)
            END as optimization_score
        FROM budget_performance
    )
    SELECT jsonb_build_object(
        'current_state', jsonb_agg(
            jsonb_build_object(
                'budget_id', id,
                'name', name,
                'type', budget_type,
                'department', department,
                'current_allocation', allocated_amount,
                'utilization_rate', ROUND(utilization_rate * 100, 2),
                'optimization_score', ROUND(optimization_score, 3)
            ) ORDER BY optimization_score DESC
        ),
        'total_budget', SUM(total_budget),
        'total_allocated', SUM(allocated_amount),
        'total_available', v_total_available
    ) INTO v_current_allocations
    FROM optimization_scores;
    
    -- Generate optimization recommendations
    FOR budget IN 
        SELECT * FROM optimization_scores 
        ORDER BY optimization_score DESC
    LOOP
        IF p_optimization_target = 'efficiency' AND budget.utilization_rate < 0.7 THEN
            v_recommendations := v_recommendations || jsonb_build_object(
                'budget_id', budget.id,
                'budget_name', budget.name,
                'action', 'increase_allocation',
                'amount', LEAST(
                    budget.available_amount * 0.5,
                    v_total_available * 0.1
                ),
                'reason', 'Low utilization rate with high efficiency potential',
                'expected_impact', 'Increase utilization by ' || ROUND((1 - budget.utilization_rate) * 50, 0) || '%'
            );
        ELSIF p_optimization_target = 'cost_reduction' AND budget.utilization_rate < 0.5 THEN
            v_recommendations := v_recommendations || jsonb_build_object(
                'budget_id', budget.id,
                'budget_name', budget.name,
                'action', 'reduce_allocation',
                'amount', budget.available_amount * 0.3,
                'reason', 'Consistently low utilization',
                'expected_impact', 'Save ' || TO_CHAR(budget.available_amount * 0.3, 'FM$999,999,999')
            );
        END IF;
    END LOOP;
    
    -- Calculate optimization potential
    v_optimization_result := jsonb_build_object(
        'optimization_target', p_optimization_target,
        'current_allocations', v_current_allocations,
        'recommendations', v_recommendations,
        'potential_savings', (
            SELECT COALESCE(SUM((r->>'amount')::DECIMAL), 0)
            FROM jsonb_array_elements(v_recommendations) r
            WHERE r->>'action' = 'reduce_allocation'
        ),
        'reallocation_opportunities', (
            SELECT COALESCE(SUM((r->>'amount')::DECIMAL), 0)
            FROM jsonb_array_elements(v_recommendations) r
            WHERE r->>'action' = 'increase_allocation'
        ),
        'generated_at', NOW()
    );
    
    -- Generate insight
    IF jsonb_array_length(v_recommendations) > 0 THEN
        INSERT INTO agent_insights (
            agent_id, insight_type, title, description,
            severity, confidence_score, is_actionable,
            data, enterprise_id
        ) VALUES (
            (SELECT id FROM agents WHERE type = 'financial' LIMIT 1),
            'budget_optimization',
            'Budget Optimization Opportunities Identified',
            jsonb_array_length(v_recommendations) || ' budget adjustments recommended for ' || p_optimization_target,
            'medium',
            0.85,
            true,
            v_optimization_result,
            p_enterprise_id
        );
    END IF;
    
    RETURN v_optimization_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RISK ASSESSMENT ENGINE
-- ============================================

-- Comprehensive risk assessment for contracts and vendors
CREATE OR REPLACE FUNCTION assess_enterprise_risk(
    p_enterprise_id UUID,
    p_risk_categories JSONB DEFAULT '["financial", "compliance", "operational", "vendor", "contractual"]'
) RETURNS JSONB AS $$
DECLARE
    v_risk_assessment JSONB := '{}'::JSONB;
    v_overall_risk_score DECIMAL(3,2) := 0;
    v_risk_level VARCHAR;
    v_mitigation_actions JSONB := '[]'::JSONB;
    v_category VARCHAR;
BEGIN
    -- Assess each risk category
    FOR v_category IN SELECT jsonb_array_elements_text(p_risk_categories) LOOP
        CASE v_category
            WHEN 'financial' THEN
                WITH financial_risks AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE value > 1000000 AND status = 'active') as high_value_contracts,
                        SUM(value) FILTER (WHERE end_date < CURRENT_DATE + INTERVAL '30 days') as expiring_value,
                        COUNT(*) FILTER (WHERE b.status = 'exceeded') as exceeded_budgets,
                        AVG(b.spent_amount / NULLIF(b.total_budget, 0)) as avg_budget_utilization
                    FROM contracts c
                    LEFT JOIN budgets b ON b.enterprise_id = c.enterprise_id
                    WHERE c.enterprise_id = p_enterprise_id
                    AND c.deleted_at IS NULL
                )
                SELECT jsonb_build_object(
                    'score', LEAST(1.0, 
                        (high_value_contracts * 0.1) +
                        (CASE WHEN expiring_value > 500000 THEN 0.3 ELSE 0 END) +
                        (exceeded_budgets * 0.2) +
                        (CASE WHEN avg_budget_utilization > 0.9 THEN 0.2 ELSE 0 END)
                    ),
                    'factors', row_to_json(financial_risks)
                ) INTO v_risk_assessment
                FROM financial_risks;
                
            WHEN 'compliance' THEN
                WITH compliance_risks AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE severity = 'critical' AND NOT action_taken) as critical_issues,
                        COUNT(*) FILTER (WHERE passed = false) as failed_checks,
                        COUNT(DISTINCT vendor_id) FILTER (WHERE passed = false) as non_compliant_vendors
                    FROM compliance_checks cc
                    LEFT JOIN agent_insights ai ON ai.data->>'compliance_check_id' = cc.id::text
                    WHERE cc.enterprise_id = p_enterprise_id
                    AND cc.performed_at >= CURRENT_DATE - INTERVAL '90 days'
                )
                SELECT v_risk_assessment || jsonb_build_object(
                    'compliance', jsonb_build_object(
                        'score', LEAST(1.0,
                            (critical_issues * 0.5) +
                            (failed_checks * 0.05) +
                            (non_compliant_vendors * 0.1)
                        ),
                        'factors', row_to_json(compliance_risks)
                    )
                ) INTO v_risk_assessment
                FROM compliance_risks;
                
            WHEN 'vendor' THEN
                WITH vendor_risks AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE performance_score < 0.5) as poor_performers,
                        COUNT(*) FILTER (WHERE compliance_score < 0.6) as compliance_risks,
                        COUNT(*) FILTER (WHERE active_contracts > 5) as concentration_risks,
                        MAX(total_contract_value) as max_vendor_exposure
                    FROM vendors
                    WHERE enterprise_id = p_enterprise_id
                    AND deleted_at IS NULL
                )
                SELECT v_risk_assessment || jsonb_build_object(
                    'vendor', jsonb_build_object(
                        'score', LEAST(1.0,
                            (poor_performers * 0.15) +
                            (compliance_risks * 0.2) +
                            (CASE WHEN concentration_risks > 0 THEN 0.3 ELSE 0 END) +
                            (CASE WHEN max_vendor_exposure > 1000000 THEN 0.2 ELSE 0 END)
                        ),
                        'factors', row_to_json(vendor_risks)
                    )
                ) INTO v_risk_assessment
                FROM vendor_risks;
        END CASE;
    END LOOP;
    
    -- Calculate overall risk score
    SELECT AVG((value->>'score')::DECIMAL)
    INTO v_overall_risk_score
    FROM jsonb_each(v_risk_assessment);
    
    -- Determine risk level
    v_risk_level := CASE
        WHEN v_overall_risk_score >= 0.8 THEN 'critical'
        WHEN v_overall_risk_score >= 0.6 THEN 'high'
        WHEN v_overall_risk_score >= 0.4 THEN 'medium'
        WHEN v_overall_risk_score >= 0.2 THEN 'low'
        ELSE 'minimal'
    END;
    
    -- Generate mitigation actions
    IF v_overall_risk_score >= 0.6 THEN
        -- Financial mitigation
        IF (v_risk_assessment->'financial'->>'score')::DECIMAL > 0.5 THEN
            v_mitigation_actions := v_mitigation_actions || jsonb_build_object(
                'category', 'financial',
                'priority', 'high',
                'action', 'Review and renegotiate high-value contracts',
                'timeline', '30 days'
            );
        END IF;
        
        -- Compliance mitigation
        IF (v_risk_assessment->'compliance'->>'score')::DECIMAL > 0.5 THEN
            v_mitigation_actions := v_mitigation_actions || jsonb_build_object(
                'category', 'compliance',
                'priority', 'critical',
                'action', 'Immediate compliance audit and remediation',
                'timeline', '7 days'
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'enterprise_id', p_enterprise_id,
        'overall_risk_score', ROUND(v_overall_risk_score, 3),
        'risk_level', v_risk_level,
        'risk_categories', v_risk_assessment,
        'mitigation_actions', v_mitigation_actions,
        'assessment_date', NOW(),
        'next_assessment_date', CASE
            WHEN v_risk_level IN ('critical', 'high') THEN CURRENT_DATE + INTERVAL '7 days'
            WHEN v_risk_level = 'medium' THEN CURRENT_DATE + INTERVAL '30 days'
            ELSE CURRENT_DATE + INTERVAL '90 days'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INTELLIGENT NOTIFICATION SYSTEM
-- ============================================

-- Smart notification routing and prioritization
CREATE OR REPLACE FUNCTION send_smart_notification(
    p_event_type VARCHAR,
    p_event_data JSONB,
    p_enterprise_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_notification_rules JSONB;
    v_recipients JSONB := '[]'::JSONB;
    v_notification_id UUID;
    v_sent_count INTEGER := 0;
    recipient RECORD;
BEGIN
    -- Define notification rules based on event type
    v_notification_rules := CASE p_event_type
        WHEN 'contract_expiry' THEN jsonb_build_object(
            'severity', CASE 
                WHEN (p_event_data->>'days_until_expiry')::INT <= 7 THEN 'critical'
                WHEN (p_event_data->>'days_until_expiry')::INT <= 30 THEN 'high'
                ELSE 'medium'
            END,
            'roles', '["owner", "admin", "manager"]',
            'departments', CASE 
                WHEN (p_event_data->>'contract_value')::DECIMAL > 100000 THEN '["Legal", "Finance"]'
                ELSE '[]'
            END,
            'escalation_hours', 24
        )
        WHEN 'budget_exceeded' THEN jsonb_build_object(
            'severity', 'high',
            'roles', '["owner", "admin"]',
            'departments', '["Finance"]',
            'escalation_hours', 4
        )
        WHEN 'vendor_risk' THEN jsonb_build_object(
            'severity', p_event_data->>'risk_level',
            'roles', '["admin", "manager"]',
            'departments', '["Procurement", "Legal"]',
            'escalation_hours', 48
        )
        ELSE jsonb_build_object(
            'severity', 'info',
            'roles', '["user"]',
            'departments', '[]',
            'escalation_hours', 72
        )
    END;
    
    -- Find recipients based on rules
    WITH eligible_recipients AS (
        SELECT DISTINCT
            u.id,
            u.email,
            u.first_name || ' ' || u.last_name as name,
            u.role,
            u.department,
            unp.email_enabled,
            unp.in_app_enabled,
            unp.frequency
        FROM users u
        LEFT JOIN user_notification_preferences unp ON 
            unp.user_id = u.id AND 
            unp.notification_type = p_event_type
        WHERE u.enterprise_id = p_enterprise_id
        AND u.is_active = true
        AND (
            u.role = ANY(SELECT jsonb_array_elements_text(v_notification_rules->'roles')) OR
            u.department = ANY(SELECT jsonb_array_elements_text(v_notification_rules->'departments')) OR
            (p_event_data->>'assigned_user_id' IS NOT NULL AND u.id = (p_event_data->>'assigned_user_id')::UUID)
        )
    )
    SELECT jsonb_agg(row_to_json(eligible_recipients))
    INTO v_recipients
    FROM eligible_recipients;
    
    -- Create notifications for each recipient
    FOR recipient IN SELECT * FROM jsonb_array_elements(v_recipients) LOOP
        -- Check user preferences
        IF COALESCE(recipient->>'in_app_enabled', 'true')::BOOLEAN THEN
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                severity,
                data,
                action_url,
                enterprise_id
            ) VALUES (
                (recipient->>'id')::UUID,
                p_event_type,
                p_event_data->>'title',
                p_event_data->>'message',
                v_notification_rules->>'severity',
                p_event_data,
                p_event_data->>'action_url',
                p_enterprise_id
            ) RETURNING id INTO v_notification_id;
            
            v_sent_count := v_sent_count + 1;
            
            -- Queue email if enabled
            IF COALESCE(recipient->>'email_enabled', 'true')::BOOLEAN AND
               (recipient->>'frequency' = 'immediate' OR recipient->>'frequency' IS NULL) THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    enterprise_id
                ) VALUES (
                    (SELECT id FROM agents WHERE type = 'notifications' LIMIT 1),
                    'send_email',
                    CASE v_notification_rules->>'severity'
                        WHEN 'critical' THEN 10
                        WHEN 'high' THEN 8
                        ELSE 5
                    END,
                    jsonb_build_object(
                        'notification_id', v_notification_id,
                        'recipient_email', recipient->>'email',
                        'template', p_event_type
                    ),
                    p_enterprise_id
                );
            END IF;
        END IF;
    END LOOP;
    
    -- Set up escalation if needed
    IF (v_notification_rules->>'escalation_hours')::INT IS NOT NULL THEN
        INSERT INTO scheduled_jobs (
            job_name,
            job_type,
            cron_expression,
            handler_function,
            parameters,
            next_run_at
        ) VALUES (
            'escalate_notification_' || p_event_type || '_' || gen_random_uuid(),
            'notification_escalation',
            'one_time',
            'escalate_notification',
            jsonb_build_object(
                'original_event', p_event_data,
                'notification_rules', v_notification_rules,
                'enterprise_id', p_enterprise_id
            ),
            NOW() + ((v_notification_rules->>'escalation_hours')::INT || ' hours')::INTERVAL
        );
    END IF;
    
    RETURN jsonb_build_object(
        'event_type', p_event_type,
        'recipients_count', v_sent_count,
        'severity', v_notification_rules->>'severity',
        'notifications_sent', v_sent_count,
        'escalation_scheduled', (v_notification_rules->>'escalation_hours') IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Create supporting indexes
CREATE INDEX IF NOT EXISTS idx_notifications_escalation ON notifications(created_at, severity) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_insights_actionable ON agent_insights(enterprise_id, is_actionable, action_taken) WHERE action_taken = false;