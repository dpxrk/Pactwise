-- =====================================================
-- Portfolio Risk Aggregation & Monitoring
-- =====================================================
-- Description: Calculate and monitor portfolio-level risk across all contracts
-- Agents triggered:
--   1. Legal Agent: Portfolio legal risk analysis (priority 6)
--   2. Risk Assessment Agent: Comprehensive risk modeling (priority 7)
-- Triggers: Weekly scheduled + Event (contract with 3+ high-risk clauses)
-- =====================================================

-- Table to store portfolio risk scores
CREATE TABLE IF NOT EXISTS portfolio_risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_risk_score DECIMAL(5,2) NOT NULL, -- 0-100 (higher = more risk)
    contract_risk_score DECIMAL(5,2),
    vendor_risk_score DECIMAL(5,2),
    compliance_risk_score DECIMAL(5,2),
    financial_risk_score DECIMAL(5,2),
    risk_breakdown JSONB DEFAULT '{}', -- Detailed risk categories
    high_risk_contracts INTEGER DEFAULT 0,
    medium_risk_contracts INTEGER DEFAULT 0,
    low_risk_contracts INTEGER DEFAULT 0,
    high_risk_vendors INTEGER DEFAULT 0,
    total_liability_exposure DECIMAL(15,2), -- Sum of all contract values
    risk_concentration JSONB DEFAULT '{}', -- Risk by vendor, category, etc.
    recommendations JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enterprise_id, calculation_date)
);

-- Create indexes
CREATE INDEX idx_portfolio_risk_enterprise ON portfolio_risk_scores(enterprise_id);
CREATE INDEX idx_portfolio_risk_date ON portfolio_risk_scores(calculation_date DESC);
CREATE INDEX idx_portfolio_risk_score ON portfolio_risk_scores(overall_risk_score DESC);

-- Weekly scheduled function to aggregate contract risks
CREATE OR REPLACE FUNCTION aggregate_contract_risks_weekly()
RETURNS void AS $$
DECLARE
    v_enterprise RECORD;
    v_overall_risk DECIMAL(5,2);
    v_contract_risk DECIMAL(5,2);
    v_vendor_risk DECIMAL(5,2);
    v_compliance_risk DECIMAL(5,2);
    v_financial_risk DECIMAL(5,2);
    v_high_risk_contracts INTEGER;
    v_medium_risk_contracts INTEGER;
    v_low_risk_contracts INTEGER;
    v_high_risk_vendors INTEGER;
    v_total_exposure DECIMAL(15,2);
    v_risk_concentration JSONB;
    v_recommendations JSONB := '[]'::jsonb;
    v_legal_agent_id UUID;
    v_risk_agent_id UUID;
BEGIN
    -- Loop through each enterprise
    FOR v_enterprise IN
        SELECT id, name FROM enterprises WHERE deleted_at IS NULL
    LOOP
        -- ===================================
        -- Calculate Contract Risk Score
        -- ===================================
        WITH contract_risks AS (
            SELECT
                c.id,
                c.value,
                c.vendor_id,
                c.category,
                -- Calculate individual contract risk (0-100)
                LEAST(100, (
                    -- High-risk clauses (if metadata tracked)
                    COALESCE((c.metadata->>'high_risk_clauses')::INTEGER * 15, 0) +
                    -- Missing critical info
                    CASE WHEN c.vendor_id IS NULL THEN 20 ELSE 0 END +
                    CASE WHEN c.end_date IS NULL THEN 15 ELSE 0 END +
                    CASE WHEN c.value IS NULL OR c.value = 0 THEN 10 ELSE 0 END +
                    -- Expired or expiring soon
                    CASE WHEN c.end_date < CURRENT_DATE THEN 30
                         WHEN c.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 15
                         ELSE 0 END +
                    -- Status-based risk
                    CASE c.status
                        WHEN 'pending_approval' THEN 10
                        WHEN 'pending_review' THEN 5
                        ELSE 0
                    END
                ))::DECIMAL(5,2) as contract_risk
            FROM contracts c
            WHERE c.enterprise_id = v_enterprise.id
            AND c.deleted_at IS NULL
            AND c.status IN ('active', 'pending_review', 'pending_approval')
        )
        SELECT
            COALESCE(AVG(contract_risk), 0),
            COUNT(*) FILTER (WHERE contract_risk >= 70),
            COUNT(*) FILTER (WHERE contract_risk >= 40 AND contract_risk < 70),
            COUNT(*) FILTER (WHERE contract_risk < 40),
            COALESCE(SUM(value), 0)
        INTO v_contract_risk, v_high_risk_contracts, v_medium_risk_contracts, v_low_risk_contracts, v_total_exposure
        FROM contract_risks;

        -- ===================================
        -- Calculate Vendor Risk Score
        -- ===================================
        WITH vendor_risks AS (
            SELECT
                v.id,
                v.performance_score,
                v.compliance_score,
                COUNT(c.id) as active_contracts,
                COALESCE(SUM(c.value), 0) as total_contract_value,
                -- Calculate vendor risk (inverse of scores)
                LEAST(100, (
                    ((5 - COALESCE(v.performance_score, 3)) / 5 * 40) +
                    ((5 - COALESCE(v.compliance_score, 3)) / 5 * 30) +
                    -- Concentration risk
                    CASE WHEN COUNT(c.id) >= 5 THEN 20
                         WHEN COUNT(c.id) >= 3 THEN 10
                         ELSE 0 END +
                    -- High exposure risk
                    CASE WHEN SUM(c.value) >= 500000 THEN 10
                         ELSE 0 END
                ))::DECIMAL(5,2) as vendor_risk
            FROM vendors v
            LEFT JOIN contracts c ON c.vendor_id = v.id
                AND c.deleted_at IS NULL
                AND c.status IN ('active', 'pending_review')
            WHERE v.enterprise_id = v_enterprise.id
            AND v.deleted_at IS NULL
            GROUP BY v.id, v.performance_score, v.compliance_score
        )
        SELECT
            COALESCE(AVG(vendor_risk), 0),
            COUNT(*) FILTER (WHERE vendor_risk >= 70)
        INTO v_vendor_risk, v_high_risk_vendors
        FROM vendor_risks;

        -- ===================================
        -- Calculate Compliance Risk Score
        -- ===================================
        WITH compliance_gaps AS (
            SELECT
                COUNT(*) FILTER (WHERE ce.status IN ('pending', 'rejected')) as missing_count,
                COUNT(*) FILTER (WHERE ce.expiration_date < CURRENT_DATE) as expired_count,
                COUNT(*) FILTER (WHERE ce.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
                                 AND ce.expiration_date >= CURRENT_DATE) as expiring_soon_count,
                COUNT(*) as total_requirements
            FROM compliance_evidence ce
            WHERE ce.enterprise_id = v_enterprise.id
        )
        SELECT
            LEAST(100, (
                CASE WHEN total_requirements > 0
                     THEN ((missing_count::DECIMAL / total_requirements) * 40) +
                          ((expired_count::DECIMAL / total_requirements) * 30) +
                          ((expiring_soon_count::DECIMAL / total_requirements) * 15)
                     ELSE 0
                END
            ))
        INTO v_compliance_risk
        FROM compliance_gaps;

        -- ===================================
        -- Calculate Financial Risk Score
        -- ===================================
        WITH financial_risks AS (
            SELECT
                COUNT(*) FILTER (WHERE b.status = 'exceeded') as exceeded_budgets,
                COUNT(*) FILTER (WHERE b.status = 'at_risk') as at_risk_budgets,
                COUNT(*) as total_budgets,
                -- Contract variance risk
                COUNT(DISTINCT c.id) FILTER (
                    WHERE ABS((
                        (SELECT COALESCE(SUM(amount), 0) FROM contract_budget_allocations WHERE contract_id = c.id) -
                        c.value
                    ) / NULLIF(c.value, 0)) >= 0.1
                ) as high_variance_contracts
            FROM budgets b
            FULL OUTER JOIN contracts c ON c.enterprise_id = b.enterprise_id
            WHERE (b.enterprise_id = v_enterprise.id OR c.enterprise_id = v_enterprise.id)
            AND (b.deleted_at IS NULL OR b.id IS NULL)
            AND (c.deleted_at IS NULL OR c.id IS NULL)
        )
        SELECT
            LEAST(100, (
                CASE WHEN total_budgets > 0
                     THEN ((exceeded_budgets::DECIMAL / total_budgets) * 40) +
                          ((at_risk_budgets::DECIMAL / total_budgets) * 20)
                     ELSE 0
                END +
                (high_variance_contracts * 5)
            ))
        INTO v_financial_risk
        FROM financial_risks;

        -- ===================================
        -- Calculate Overall Risk Score
        -- ===================================
        v_overall_risk := (
            (v_contract_risk * 0.35) +  -- 35% weight
            (v_vendor_risk * 0.25) +    -- 25% weight
            (v_compliance_risk * 0.25) + -- 25% weight
            (v_financial_risk * 0.15)    -- 15% weight
        )::DECIMAL(5,2);

        -- ===================================
        -- Calculate Risk Concentration
        -- ===================================
        SELECT jsonb_build_object(
            'by_vendor', jsonb_agg(vendor_concentration),
            'by_category', jsonb_agg(category_concentration)
        ) INTO v_risk_concentration
        FROM (
            SELECT jsonb_build_object(
                'vendor_id', vendor_id,
                'contract_count', COUNT(*),
                'total_value', SUM(value),
                'percentage_of_portfolio', (SUM(value) / NULLIF(v_total_exposure, 0) * 100)::DECIMAL(5,2)
            ) as vendor_concentration
            FROM contracts
            WHERE enterprise_id = v_enterprise.id
            AND deleted_at IS NULL
            AND vendor_id IS NOT NULL
            GROUP BY vendor_id
            ORDER BY SUM(value) DESC
            LIMIT 10
        ) vendors
        CROSS JOIN LATERAL (
            SELECT jsonb_build_object(
                'category', category,
                'contract_count', COUNT(*),
                'total_value', SUM(value)
            ) as category_concentration
            FROM contracts
            WHERE enterprise_id = v_enterprise.id
            AND deleted_at IS NULL
            GROUP BY category
        ) categories;

        -- ===================================
        -- Generate Recommendations
        -- ===================================
        IF v_high_risk_contracts > 0 THEN
            v_recommendations := v_recommendations || jsonb_build_object(
                'type', 'high_risk_contracts',
                'severity', 'high',
                'message', format('Review %s high-risk contracts immediately', v_high_risk_contracts)
            );
        END IF;

        IF v_high_risk_vendors > 0 THEN
            v_recommendations := v_recommendations || jsonb_build_object(
                'type', 'high_risk_vendors',
                'severity', 'high',
                'message', format('Evaluate %s high-risk vendor relationships', v_high_risk_vendors)
            );
        END IF;

        IF v_compliance_risk >= 50 THEN
            v_recommendations := v_recommendations || jsonb_build_object(
                'type', 'compliance_gaps',
                'severity', 'critical',
                'message', 'Significant compliance gaps detected - immediate action required'
            );
        END IF;

        IF v_financial_risk >= 60 THEN
            v_recommendations := v_recommendations || jsonb_build_object(
                'type', 'financial_risk',
                'severity', 'high',
                'message', 'Budget overruns and variances require attention'
            );
        END IF;

        -- ===================================
        -- Insert/Update Portfolio Risk Score
        -- ===================================
        INSERT INTO portfolio_risk_scores (
            enterprise_id,
            calculation_date,
            overall_risk_score,
            contract_risk_score,
            vendor_risk_score,
            compliance_risk_score,
            financial_risk_score,
            high_risk_contracts,
            medium_risk_contracts,
            low_risk_contracts,
            high_risk_vendors,
            total_liability_exposure,
            risk_concentration,
            recommendations
        ) VALUES (
            v_enterprise.id,
            CURRENT_DATE,
            v_overall_risk,
            v_contract_risk,
            v_vendor_risk,
            v_compliance_risk,
            v_financial_risk,
            v_high_risk_contracts,
            v_medium_risk_contracts,
            v_low_risk_contracts,
            v_high_risk_vendors,
            v_total_exposure,
            v_risk_concentration,
            v_recommendations
        )
        ON CONFLICT (enterprise_id, calculation_date)
        DO UPDATE SET
            overall_risk_score = EXCLUDED.overall_risk_score,
            contract_risk_score = EXCLUDED.contract_risk_score,
            vendor_risk_score = EXCLUDED.vendor_risk_score,
            compliance_risk_score = EXCLUDED.compliance_risk_score,
            financial_risk_score = EXCLUDED.financial_risk_score,
            high_risk_contracts = EXCLUDED.high_risk_contracts,
            medium_risk_contracts = EXCLUDED.medium_risk_contracts,
            low_risk_contracts = EXCLUDED.low_risk_contracts,
            high_risk_vendors = EXCLUDED.high_risk_vendors,
            total_liability_exposure = EXCLUDED.total_liability_exposure,
            risk_concentration = EXCLUDED.risk_concentration,
            recommendations = EXCLUDED.recommendations,
            created_at = NOW();

        -- ===================================
        -- Queue Agent Tasks if High Risk
        -- ===================================
        IF v_overall_risk >= 60 THEN
            -- Get agent IDs
            SELECT id INTO v_legal_agent_id
            FROM agents
            WHERE type = 'legal'
            AND enterprise_id = v_enterprise.id
            AND is_active = true
            LIMIT 1;

            SELECT id INTO v_risk_agent_id
            FROM agents
            WHERE type = 'risk-assessment'
            AND enterprise_id = v_enterprise.id
            AND is_active = true
            LIMIT 1;

            -- Queue Legal Agent
            IF v_legal_agent_id IS NOT NULL AND v_contract_risk >= 50 THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    enterprise_id,
                    status
                ) VALUES (
                    v_legal_agent_id,
                    'portfolio_legal_risk_analysis',
                    6,
                    jsonb_build_object(
                        'overall_risk_score', v_overall_risk,
                        'contract_risk_score', v_contract_risk,
                        'high_risk_contracts', v_high_risk_contracts,
                        'analysis_type', 'portfolio_risk',
                        'trigger_source', 'portfolio_risk_automation',
                        'requested_outputs', jsonb_build_array(
                            'risk_mitigation_strategy',
                            'contract_review_priorities',
                            'legal_exposure_summary',
                            'risk_transfer_opportunities'
                        )
                    ),
                    v_enterprise.id,
                    'pending'
                );
            END IF;

            -- Queue Risk Assessment Agent
            IF v_risk_agent_id IS NOT NULL THEN
                INSERT INTO agent_tasks (
                    agent_id,
                    task_type,
                    priority,
                    payload,
                    enterprise_id,
                    status
                ) VALUES (
                    v_risk_agent_id,
                    'portfolio_risk_assessment',
                    7,
                    jsonb_build_object(
                        'overall_risk_score', v_overall_risk,
                        'risk_breakdown', jsonb_build_object(
                            'contract', v_contract_risk,
                            'vendor', v_vendor_risk,
                            'compliance', v_compliance_risk,
                            'financial', v_financial_risk
                        ),
                        'total_exposure', v_total_exposure,
                        'recommendations', v_recommendations,
                        'analysis_type', 'comprehensive_portfolio_risk',
                        'trigger_source', 'portfolio_risk_automation',
                        'requested_outputs', jsonb_build_array(
                            'risk_heat_map',
                            'scenario_analysis',
                            'insurance_gap_analysis',
                            'action_plan',
                            'executive_summary'
                        )
                    ),
                    v_enterprise.id,
                    'pending'
                );
            END IF;

            -- Create notification for high risk
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                severity,
                data,
                enterprise_id
            ) VALUES (
                (SELECT id FROM users WHERE enterprise_id = v_enterprise.id AND role = 'owner' LIMIT 1),
                'portfolio_risk_alert',
                format('Portfolio Risk Alert: %s/100', ROUND(v_overall_risk)),
                format(
                    'Portfolio risk score is %s/100. %s high-risk contracts, %s high-risk vendors. Review recommended.',
                    ROUND(v_overall_risk),
                    v_high_risk_contracts,
                    v_high_risk_vendors
                ),
                CASE
                    WHEN v_overall_risk >= 75 THEN 'critical'
                    WHEN v_overall_risk >= 60 THEN 'high'
                    ELSE 'medium'
                END,
                jsonb_build_object(
                    'overall_risk_score', v_overall_risk,
                    'recommendations', v_recommendations
                ),
                v_enterprise.id
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
ALTER TABLE portfolio_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view portfolio risk in their enterprise"
    ON portfolio_risk_scores FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

-- Comments
COMMENT ON TABLE portfolio_risk_scores IS
'Historical portfolio risk scores calculated weekly.
Aggregates contract, vendor, compliance, and financial risk into overall score (0-100).
Includes risk concentration analysis and automated recommendations.';

COMMENT ON FUNCTION aggregate_contract_risks_weekly() IS
'Weekly scheduled function to calculate portfolio-level risk across all enterprises.
Analyzes contracts, vendors, compliance, and financial risk.
Queues Legal Agent and Risk Assessment Agent if overall risk ≥ 60.
Should be called via cron job every Monday at 8 AM.';
