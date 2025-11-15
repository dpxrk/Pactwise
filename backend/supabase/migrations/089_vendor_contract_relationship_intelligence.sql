-- =====================================================
-- Vendor-Contract Relationship Intelligence
-- =====================================================
-- Description: Automatically analyze vendor-contract relationships
-- Agents triggered:
--   1. Vendor Agent: Relationship assessment (priority 5)
--   2. Risk Assessment Agent: Concentration risk check (priority 5)
-- Triggers on: Vendor assigned to contract, multiple contracts to same vendor
-- =====================================================

-- Function to analyze vendor-contract relationships
CREATE OR REPLACE FUNCTION analyze_vendor_contract_relationship()
RETURNS TRIGGER AS $$
DECLARE
    v_vendor_agent_id UUID;
    v_risk_agent_id UUID;
    v_contract_count INTEGER;
    v_total_value DECIMAL(15,2);
    v_vendor_record RECORD;
    v_is_new_relationship BOOLEAN := false;
    v_is_significant_change BOOLEAN := false;
BEGIN
    -- Only process if vendor_id is set and changed
    IF NEW.vendor_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determine if this is a new relationship or vendor change
    IF TG_OP = 'INSERT' THEN
        v_is_new_relationship := true;
        v_is_significant_change := true;
    ELSIF TG_OP = 'UPDATE' AND OLD.vendor_id IS DISTINCT FROM NEW.vendor_id THEN
        v_is_significant_change := true;
    END IF;

    -- Skip if no significant change
    IF NOT v_is_significant_change THEN
        RETURN NEW;
    END IF;

    -- Get vendor details and metrics
    SELECT
        v.*,
        COUNT(c.id) as contract_count,
        COALESCE(SUM(c.value), 0) as total_contract_value
    INTO v_vendor_record
    FROM vendors v
    LEFT JOIN contracts c ON c.vendor_id = v.id
        AND c.deleted_at IS NULL
        AND c.status IN ('active', 'pending_review', 'pending_approval')
    WHERE v.id = NEW.vendor_id
    GROUP BY v.id;

    IF v_vendor_record IS NULL THEN
        RETURN NEW;
    END IF;

    v_contract_count := v_vendor_record.contract_count;
    v_total_value := v_vendor_record.total_contract_value;

    -- Get agent IDs for this enterprise
    SELECT id INTO v_vendor_agent_id
    FROM agents
    WHERE type = 'vendor'
    AND enterprise_id = NEW.enterprise_id
    AND is_active = true
    LIMIT 1;

    SELECT id INTO v_risk_agent_id
    FROM agents
    WHERE type = 'risk-assessment'
    AND enterprise_id = NEW.enterprise_id
    AND is_active = true
    LIMIT 1;

    -- Queue Vendor Agent task: Relationship assessment
    IF v_vendor_agent_id IS NOT NULL THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            contract_id,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_vendor_agent_id,
            'vendor_relationship_analysis',
            5,  -- Medium priority
            jsonb_build_object(
                'contract_id', NEW.id,
                'contract_title', NEW.title,
                'contract_value', NEW.value,
                'vendor_id', NEW.vendor_id,
                'vendor_name', v_vendor_record.name,
                'vendor_category', v_vendor_record.category,
                'is_new_relationship', v_is_new_relationship,
                'contract_count', v_contract_count,
                'total_contract_value', v_total_value,
                'analysis_type', 'relationship_assessment',
                'trigger_source', 'vendor_relationship_automation',
                'requested_outputs', jsonb_build_array(
                    'relationship_score',
                    'performance_summary',
                    'value_for_money_assessment',
                    'consolidation_opportunities',
                    'relationship_recommendations'
                )
            ),
            NEW.id,
            NEW.vendor_id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Queue Risk Assessment Agent task: Concentration risk check
    -- Only queue if vendor has multiple contracts or high total value
    IF v_risk_agent_id IS NOT NULL AND (v_contract_count >= 2 OR v_total_value >= 100000) THEN
        INSERT INTO agent_tasks (
            agent_id,
            task_type,
            priority,
            payload,
            contract_id,
            vendor_id,
            enterprise_id,
            status
        ) VALUES (
            v_risk_agent_id,
            'vendor_concentration_risk_assessment',
            CASE
                WHEN v_contract_count >= 5 OR v_total_value >= 500000 THEN 6  -- Higher priority for significant concentration
                ELSE 5  -- Medium priority
            END,
            jsonb_build_object(
                'contract_id', NEW.id,
                'vendor_id', NEW.vendor_id,
                'vendor_name', v_vendor_record.name,
                'vendor_category', v_vendor_record.category,
                'contract_count', v_contract_count,
                'total_contract_value', v_total_value,
                'new_contract_value', NEW.value,
                'analysis_type', 'concentration_risk',
                'trigger_source', 'vendor_relationship_automation',
                'risk_thresholds', jsonb_build_object(
                    'contract_count_warning', 3,
                    'contract_count_critical', 5,
                    'value_warning', 250000,
                    'value_critical', 500000
                ),
                'requested_outputs', jsonb_build_array(
                    'concentration_risk_score',
                    'diversification_analysis',
                    'single_point_of_failure_assessment',
                    'alternative_vendor_recommendations',
                    'mitigation_strategies'
                )
            ),
            NEW.id,
            NEW.vendor_id,
            NEW.enterprise_id,
            'pending'
        );
    END IF;

    -- Create notification for high concentration risk
    IF v_contract_count >= 5 OR v_total_value >= 500000 THEN
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
            'vendor_concentration_alert',
            'Vendor Concentration Alert',
            format(
                'Vendor "%s" now has %s contracts totaling $%s. Consider diversification.',
                v_vendor_record.name,
                v_contract_count,
                v_total_value
            ),
            CASE
                WHEN v_contract_count >= 10 OR v_total_value >= 1000000 THEN 'high'
                WHEN v_contract_count >= 5 OR v_total_value >= 500000 THEN 'medium'
                ELSE 'low'
            END,
            jsonb_build_object(
                'vendor_id', NEW.vendor_id,
                'contract_count', v_contract_count,
                'total_value', v_total_value,
                'new_contract_id', NEW.id
            ),
            NEW.enterprise_id,
            format('/dashboard/vendors/%s', NEW.vendor_id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contracts table for vendor assignments
DROP TRIGGER IF EXISTS trigger_analyze_vendor_relationship ON contracts;
CREATE TRIGGER trigger_analyze_vendor_relationship
    AFTER INSERT OR UPDATE OF vendor_id ON contracts
    FOR EACH ROW
    WHEN (NEW.vendor_id IS NOT NULL)
    EXECUTE FUNCTION analyze_vendor_contract_relationship();

-- Function to identify consolidation opportunities (run periodically)
CREATE OR REPLACE FUNCTION identify_vendor_consolidation_opportunities()
RETURNS TABLE (
    enterprise_id UUID,
    vendor_id UUID,
    vendor_name VARCHAR,
    category VARCHAR,
    contract_count BIGINT,
    total_value DECIMAL,
    opportunity_score INTEGER,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH vendor_metrics AS (
        SELECT
            v.enterprise_id,
            v.id as vendor_id,
            v.name as vendor_name,
            v.category::VARCHAR as category,
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
        -- Calculate opportunity score (0-100)
        LEAST(100, (
            (vm.contract_count * 10) +  -- More contracts = higher opportunity
            (CASE WHEN vm.total_value > 100000 THEN 30 ELSE (vm.total_value / 10000)::INTEGER * 3 END) +  -- Higher value = higher opportunity
            (vm.performance_score::INTEGER * 10) +  -- Better performance = higher opportunity
            (vm.compliance_score::INTEGER * 10)  -- Better compliance = higher opportunity
        ))::INTEGER as opportunity_score,
        CASE
            WHEN vm.contract_count >= 5 AND vm.total_value >= 500000 THEN
                'HIGH: Consider master service agreement or volume discount negotiation'
            WHEN vm.contract_count >= 3 AND vm.total_value >= 250000 THEN
                'MEDIUM: Potential for contract consolidation and improved terms'
            ELSE
                'LOW: Monitor for future consolidation opportunity'
        END as recommendation
    FROM vendor_metrics vm
    WHERE vm.contract_count >= 2
    ORDER BY opportunity_score DESC, vm.total_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION analyze_vendor_contract_relationship() IS
'Analyzes vendor-contract relationships when vendors are assigned to contracts.
Triggers: Vendor Agent (relationship assessment) and Risk Assessment Agent (concentration risk).
Creates alerts for high vendor concentration (5+ contracts or $500K+ total value).';

COMMENT ON FUNCTION identify_vendor_consolidation_opportunities() IS
'Identifies vendors with multiple contracts that may benefit from consolidation.
Returns opportunity score and recommendations for master agreements or volume discounts.
Should be called periodically for strategic vendor management.';

COMMENT ON TRIGGER trigger_analyze_vendor_relationship ON contracts IS
'Automatically triggers relationship analysis when vendors are assigned to contracts.
Queues tasks for Vendor Agent and Risk Assessment Agent based on concentration thresholds.';
