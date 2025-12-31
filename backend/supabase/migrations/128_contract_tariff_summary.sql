-- Migration 128: Contract Tariff Summary
-- Purpose: Add tariff summary fields to contracts table for quick visibility and risk assessment

-- ============================================================================
-- ADD TARIFF SUMMARY COLUMNS TO CONTRACTS
-- ============================================================================

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS total_tariff_exposure DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tariff_by_country JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tariff_risk_level VARCHAR(20) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS tariff_last_calculated TIMESTAMPTZ;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contracts_tariff_exposure ON contracts(enterprise_id, total_tariff_exposure)
    WHERE total_tariff_exposure > 0;

CREATE INDEX IF NOT EXISTS idx_contracts_tariff_risk ON contracts(enterprise_id, tariff_risk_level)
    WHERE tariff_risk_level IN ('high', 'critical');

-- ============================================================================
-- TARIFF SUMMARY CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_contract_tariff_totals(
    p_contract_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_contract RECORD;
    v_total DECIMAL(15,2) := 0;
    v_by_country JSONB := '{}';
    v_risk_level VARCHAR(20) := 'unknown';
    v_tariff_percentage DECIMAL;
BEGIN
    -- Get contract info
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = p_contract_id;

    IF v_contract IS NULL THEN
        RETURN jsonb_build_object('error', 'Contract not found');
    END IF;

    -- Calculate total tariff cost and breakdown by country
    SELECT
        COALESCE(SUM(tariff_cost), 0),
        COALESCE(
            jsonb_object_agg(
                origin_country,
                country_total
            ) FILTER (WHERE origin_country IS NOT NULL),
            '{}'::jsonb
        )
    INTO v_total, v_by_country
    FROM (
        SELECT
            origin_country,
            SUM(tariff_cost) as country_total
        FROM contract_line_items
        WHERE contract_id = p_contract_id
        AND tariff_cost IS NOT NULL
        GROUP BY origin_country
    ) country_totals;

    -- Determine risk level based on tariff as percentage of contract value
    IF v_contract.value IS NULL OR v_contract.value = 0 THEN
        v_risk_level := 'unknown';
    ELSE
        v_tariff_percentage := (v_total / v_contract.value) * 100;

        IF v_tariff_percentage > 25 THEN
            v_risk_level := 'critical';
        ELSIF v_tariff_percentage > 15 THEN
            v_risk_level := 'high';
        ELSIF v_tariff_percentage > 5 THEN
            v_risk_level := 'medium';
        ELSIF v_tariff_percentage > 0 THEN
            v_risk_level := 'low';
        ELSE
            v_risk_level := 'none';
        END IF;
    END IF;

    -- Update contract
    UPDATE contracts
    SET
        total_tariff_exposure = v_total,
        tariff_by_country = v_by_country,
        tariff_risk_level = v_risk_level,
        tariff_last_calculated = NOW(),
        updated_at = NOW()
    WHERE id = p_contract_id;

    RETURN jsonb_build_object(
        'contract_id', p_contract_id,
        'contract_value', v_contract.value,
        'total_tariff_exposure', v_total,
        'tariff_by_country', v_by_country,
        'tariff_risk_level', v_risk_level,
        'tariff_percentage', ROUND(COALESCE(v_tariff_percentage, 0), 2),
        'calculated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER TO AUTO-UPDATE TARIFF SUMMARY
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contract_tariff_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Only recalculate if tariff-related fields changed
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_contract_tariff_totals(OLD.contract_id);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.tariff_cost IS NOT NULL THEN
            PERFORM calculate_contract_tariff_totals(NEW.contract_id);
        END IF;
        RETURN NEW;
    ELSE -- UPDATE
        IF OLD.tariff_cost IS DISTINCT FROM NEW.tariff_cost
           OR OLD.origin_country IS DISTINCT FROM NEW.origin_country THEN
            PERFORM calculate_contract_tariff_totals(NEW.contract_id);
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only fires when tariff-related changes occur)
DROP TRIGGER IF EXISTS trg_update_contract_tariff_summary ON contract_line_items;
CREATE TRIGGER trg_update_contract_tariff_summary
    AFTER INSERT OR UPDATE OF tariff_cost, origin_country OR DELETE
    ON contract_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_tariff_summary();

-- ============================================================================
-- ENTERPRISE-WIDE TARIFF ANALYTICS
-- ============================================================================

-- Get enterprise tariff exposure summary
CREATE OR REPLACE FUNCTION get_enterprise_tariff_summary(
    p_enterprise_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'enterprise_id', p_enterprise_id,
        'total_tariff_exposure', COALESCE(SUM(total_tariff_exposure), 0),
        'contracts_with_tariffs', COUNT(*) FILTER (WHERE total_tariff_exposure > 0),
        'total_contracts', COUNT(*),
        'risk_distribution', jsonb_build_object(
            'critical', COUNT(*) FILTER (WHERE tariff_risk_level = 'critical'),
            'high', COUNT(*) FILTER (WHERE tariff_risk_level = 'high'),
            'medium', COUNT(*) FILTER (WHERE tariff_risk_level = 'medium'),
            'low', COUNT(*) FILTER (WHERE tariff_risk_level = 'low'),
            'none', COUNT(*) FILTER (WHERE tariff_risk_level = 'none'),
            'unknown', COUNT(*) FILTER (WHERE tariff_risk_level = 'unknown')
        ),
        'calculated_at', NOW()
    )
    INTO v_result
    FROM contracts
    WHERE enterprise_id = p_enterprise_id
    AND status NOT IN ('terminated', 'archived');

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get top tariff exposure contracts
CREATE OR REPLACE FUNCTION get_top_tariff_contracts(
    p_enterprise_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    contract_id UUID,
    title VARCHAR(255),
    vendor_id UUID,
    contract_value DECIMAL(15,2),
    total_tariff_exposure DECIMAL(15,2),
    tariff_percentage DECIMAL(5,2),
    tariff_risk_level VARCHAR(20),
    top_countries JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as contract_id,
        c.title,
        c.vendor_id,
        c.value as contract_value,
        c.total_tariff_exposure,
        CASE
            WHEN c.value > 0 THEN ROUND((c.total_tariff_exposure / c.value * 100)::DECIMAL, 2)
            ELSE 0
        END as tariff_percentage,
        c.tariff_risk_level,
        c.tariff_by_country as top_countries
    FROM contracts c
    WHERE c.enterprise_id = p_enterprise_id
    AND c.total_tariff_exposure > 0
    AND c.status NOT IN ('terminated', 'archived')
    ORDER BY c.total_tariff_exposure DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get tariff exposure by country across enterprise
CREATE OR REPLACE FUNCTION get_enterprise_tariff_by_country(
    p_enterprise_id UUID
)
RETURNS TABLE (
    origin_country VARCHAR(3),
    country_name VARCHAR(100),
    contract_count BIGINT,
    total_value DECIMAL(15,2),
    total_tariff_cost DECIMAL(15,2),
    avg_tariff_rate DECIMAL(6,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cli.origin_country,
        COALESCE(cli.origin_country_name, ctr.country_name, cli.origin_country) as country_name,
        COUNT(DISTINCT cli.contract_id)::BIGINT as contract_count,
        SUM(cli.total_price)::DECIMAL(15,2) as total_value,
        SUM(cli.tariff_cost)::DECIMAL(15,2) as total_tariff_cost,
        AVG(cli.tariff_rate)::DECIMAL(6,2) as avg_tariff_rate
    FROM contract_line_items cli
    INNER JOIN contracts c ON c.id = cli.contract_id
    LEFT JOIN country_tariff_rules ctr ON ctr.country_code = cli.origin_country
    WHERE cli.enterprise_id = p_enterprise_id
    AND cli.origin_country IS NOT NULL
    AND cli.tariff_cost IS NOT NULL
    AND c.status NOT IN ('terminated', 'archived')
    GROUP BY cli.origin_country, COALESCE(cli.origin_country_name, ctr.country_name, cli.origin_country)
    ORDER BY total_tariff_cost DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN contracts.total_tariff_exposure IS 'Sum of all tariff costs from line items in this contract';
COMMENT ON COLUMN contracts.tariff_by_country IS 'JSON breakdown of tariff costs by origin country';
COMMENT ON COLUMN contracts.tariff_risk_level IS 'Risk level based on tariff as percentage of contract value: none, low, medium, high, critical, unknown';
COMMENT ON COLUMN contracts.tariff_last_calculated IS 'Timestamp of last tariff calculation';

COMMENT ON FUNCTION calculate_contract_tariff_totals IS 'Calculate and update contract-level tariff summary from line items';
COMMENT ON FUNCTION get_enterprise_tariff_summary IS 'Get enterprise-wide tariff exposure summary with risk distribution';
COMMENT ON FUNCTION get_top_tariff_contracts IS 'Get contracts with highest tariff exposure for an enterprise';
COMMENT ON FUNCTION get_enterprise_tariff_by_country IS 'Get tariff exposure breakdown by origin country across enterprise';
