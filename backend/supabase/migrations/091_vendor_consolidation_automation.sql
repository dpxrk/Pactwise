-- =====================================================
-- Vendor Consolidation Opportunity Analysis
-- =====================================================
-- Description: Automatically identify vendor consolidation and volume discount opportunities
-- Agents triggered:
--   1. Financial Agent: Cost consolidation analysis (priority 6)
--   2. Vendor Agent: Relationship optimization (priority 6)
--   3. Analytics Agent: Trend and benchmark analysis (priority 5)
-- Triggers: Weekly scheduled + Event (3rd+ contract assigned to vendor)
-- =====================================================

-- Function to analyze vendor consolidation opportunities (event-driven)
CREATE OR REPLACE FUNCTION analyze_vendor_consolidation_opportunity()
RETURNS TRIGGER AS $$
DECLARE
    v_financial_agent_id UUID;
    v_vendor_agent_id UUID;
    v_analytics_agent_id UUID;
    v_contract_count INTEGER;
    v_total_value DECIMAL(15,2);
    v_avg_value DECIMAL(15,2);
    v_consolidation_score INTEGER;
    v_vendor_record RECORD;
BEGIN
    -- Only process when vendor_id is assigned
    IF NEW.vendor_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get vendor metrics
    SELECT
        v.*,
        COUNT(c.id) as contract_count,
        COALESCE(SUM(c.value), 0) as total_value,
        COALESCE(AVG(c.value), 0) as avg_value
    INTO v_vendor_record
    FROM vendors v
    LEFT JOIN contracts c ON c.vendor_id = v.id
        AND c.deleted_at IS NULL
        AND c.status IN ('active', 'pending_review', 'pending_approval')
    WHERE v.id = NEW.vendor_id
    GROUP BY v.id;

    v_contract_count := v_vendor_record.contract_count;
    v_total_value := v_vendor_record.total_value;
    v_avg_value := v_vendor_record.avg_value;

    -- Only trigger if vendor has 3+ contracts (consolidation opportunity threshold)
    IF v_contract_count < 3 THEN
        RETURN NEW;
    END IF;

    -- Calculate consolidation score (0-100)
    -- Formula: (contract_count * 10) + (total_value / 10000) + (performance_score * 10)
    v_consolidation_score := LEAST(100, (
        (v_contract_count * 10) +
        LEAST(30, (v_total_value / 10000)::INTEGER) +
        (COALESCE(v_vendor_record.performance_score, 3.0)::INTEGER * 10)
    ));

    -- Get agent IDs
    SELECT id INTO v_financial_agent_id FROM agents
    WHERE type = 'financial' AND enterprise_id = NEW.enterprise_id AND is_active = true LIMIT 1;

    SELECT id INTO v_vendor_agent_id FROM agents
    WHERE type = 'vendor' AND enterprise_id = NEW.enterprise_id AND is_active = true LIMIT 1;

    SELECT id INTO v_analytics_agent_id FROM agents
    WHERE type = 'analytics' AND enterprise_id = NEW.enterprise_id AND is_active = true LIMIT 1;

    -- Queue Financial Agent task: Cost consolidation analysis
    IF v_financial_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_financial_agent_id,
            'vendor_consolidation_opportunity_analysis',
            CASE
                WHEN v_consolidation_score >= 70 THEN 7  -- High opportunity
                ELSE 6  -- Medium opportunity
            END,
            jsonb_build_object(
                'vendor_id', NEW.vendor_id,
                'vendor_name', v_vendor_record.name,
                'vendor_category', v_vendor_record.category,
                'contract_count', v_contract_count,
                'total_value', v_total_value,
                'avg_value', v_avg_value,
                'consolidation_score', v_consolidation_score,
                'performance_score', v_vendor_record.performance_score,
                'analysis_type', 'cost_consolidation',
                'trigger_source', 'vendor_consolidation_automation',
                'requested_outputs', jsonb_build_array(
                    'volume_discount_potential',
                    'master_agreement_recommendation',
                    'cost_savings_estimate',
                    'payment_terms_optimization',
                    'negotiation_strategy'
                )
            ),
            NEW.vendor_id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Queue Vendor Agent task: Relationship optimization
    IF v_vendor_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_vendor_agent_id,
            'vendor_relationship_optimization',
            6,
            jsonb_build_object(
                'vendor_id', NEW.vendor_id,
                'vendor_name', v_vendor_record.name,
                'contract_count', v_contract_count,
                'total_value', v_total_value,
                'consolidation_score', v_consolidation_score,
                'analysis_type', 'relationship_optimization',
                'trigger_source', 'vendor_consolidation_automation',
                'requested_outputs', jsonb_build_array(
                    'partnership_tier_recommendation',
                    'strategic_vendor_classification',
                    'relationship_enhancement_opportunities',
                    'preferred_vendor_status_assessment',
                    'contract_consolidation_roadmap'
                )
            ),
            NEW.vendor_id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Queue Analytics Agent task: Trend analysis (if score >= 60)
    IF v_analytics_agent_id IS NOT NULL AND v_consolidation_score >= 60 THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_analytics_agent_id,
            'vendor_consolidation_trend_analysis',
            5,
            jsonb_build_object(
                'vendor_id', NEW.vendor_id,
                'vendor_name', v_vendor_record.name,
                'vendor_category', v_vendor_record.category,
                'contract_count', v_contract_count,
                'total_value', v_total_value,
                'consolidation_score', v_consolidation_score,
                'analysis_type', 'consolidation_trends',
                'trigger_source', 'vendor_consolidation_automation',
                'requested_outputs', jsonb_build_array(
                    'spending_trend_analysis',
                    'category_benchmark_comparison',
                    'forecast_future_spend',
                    'roi_projection',
                    'market_positioning'
                )
            ),
            NEW.vendor_id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Create notification if consolidation score is high (>= 70)
    IF v_consolidation_score >= 70 THEN
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
            COALESCE(NEW.owner_id, NEW.created_by),
            'vendor_consolidation_opportunity',
            format('Consolidation Opportunity: %s', v_vendor_record.name),
            format(
                'Vendor "%s" now has %s contracts worth $%s. High consolidation potential (score: %s/100).',
                v_vendor_record.name,
                v_contract_count,
                v_total_value,
                v_consolidation_score
            ),
            'medium',
            jsonb_build_object(
                'vendor_id', NEW.vendor_id,
                'contract_count', v_contract_count,
                'total_value', v_total_value,
                'consolidation_score', v_consolidation_score
            ),
            NEW.enterprise_id,
            format('/dashboard/vendors/%s', NEW.vendor_id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Weekly scheduled consolidation analysis (for all vendors with 2+ contracts)
CREATE OR REPLACE FUNCTION analyze_vendor_consolidation_weekly()
RETURNS TABLE (
    enterprise_id UUID,
    vendor_id UUID,
    vendor_name VARCHAR,
    category VARCHAR,
    contract_count BIGINT,
    total_value DECIMAL,
    consolidation_score INTEGER,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH vendor_metrics AS (
        SELECT
            v.enterprise_id,
            v.id as vendor_id,
            v.name as vendor_name,
            v.category::VARCHAR,
            COUNT(c.id) as contract_count,
            COALESCE(SUM(c.value), 0) as total_value,
            v.performance_score,
            v.compliance_score
        FROM vendors v
        LEFT JOIN contracts c ON c.vendor_id = v.id
            AND c.deleted_at IS NULL
            AND c.status IN ('active', 'pending_review', 'pending_approval')
        WHERE v.deleted_at IS NULL
        AND v.status = 'active'
        GROUP BY v.id, v.enterprise_id, v.name, v.category, v.performance_score, v.compliance_score
        HAVING COUNT(c.id) >= 2
    )
    SELECT
        vm.enterprise_id,
        vm.vendor_id,
        vm.vendor_name,
        vm.category,
        vm.contract_count,
        vm.total_value,
        -- Calculate consolidation score (0-100)
        LEAST(100, (
            (vm.contract_count * 10) +
            LEAST(30, (vm.total_value / 10000)::INTEGER) +
            (COALESCE(vm.performance_score, 3.0)::INTEGER * 10)
        ))::INTEGER as consolidation_score,
        CASE
            WHEN vm.contract_count >= 5 AND vm.total_value >= 500000 THEN
                'HIGH PRIORITY: Master Service Agreement + Volume Discount Negotiation'
            WHEN vm.contract_count >= 3 AND vm.total_value >= 250000 THEN
                'MEDIUM: Contract Consolidation + Improved Terms'
            ELSE
                'LOW: Monitor for Future Consolidation'
        END as recommendation
    FROM vendor_metrics vm
    WHERE vm.contract_count >= 2
    ORDER BY consolidation_score DESC, vm.total_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contracts table
DROP TRIGGER IF EXISTS trigger_analyze_vendor_consolidation ON contracts;
CREATE TRIGGER trigger_analyze_vendor_consolidation
    AFTER INSERT OR UPDATE OF vendor_id ON contracts
    FOR EACH ROW
    WHEN (NEW.vendor_id IS NOT NULL)
    EXECUTE FUNCTION analyze_vendor_consolidation_opportunity();

-- Add comments
COMMENT ON FUNCTION analyze_vendor_consolidation_opportunity() IS
'Event-driven consolidation analysis when vendor reaches 3+ active contracts.
Calculates consolidation score (0-100) based on contract count, total value, and vendor performance.
Queues Financial Agent, Vendor Agent, and Analytics Agent for comprehensive analysis.';

COMMENT ON FUNCTION analyze_vendor_consolidation_weekly() IS
'Weekly scheduled function to identify all vendor consolidation opportunities.
Returns vendors with 2+ contracts ranked by consolidation score.
Should be called via cron job every Monday morning.';

COMMENT ON TRIGGER trigger_analyze_vendor_consolidation ON contracts IS
'Triggers consolidation analysis when vendor is assigned to contract (3+ contracts threshold).
Queues tasks for Financial Agent (priority 6-7), Vendor Agent (priority 6), Analytics Agent (priority 5).';
