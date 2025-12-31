-- Migration 127: Contract Line Items Tariff Extension
-- Purpose: Add HTS code and tariff-related fields to contract_line_items for tariff impact analysis

-- ============================================================================
-- ADD TARIFF COLUMNS TO CONTRACT_LINE_ITEMS
-- ============================================================================

-- HTS Code fields
ALTER TABLE contract_line_items
ADD COLUMN IF NOT EXISTS hts_code VARCHAR(15),
ADD COLUMN IF NOT EXISTS hts_description TEXT,
ADD COLUMN IF NOT EXISTS hts_confidence DECIMAL(3,2) CHECK (hts_confidence IS NULL OR (hts_confidence >= 0 AND hts_confidence <= 1)),
ADD COLUMN IF NOT EXISTS hts_match_method VARCHAR(50);  -- 'ai_suggested', 'manual', 'auto_matched', 'taxonomy_mapped'

-- Origin country fields
ALTER TABLE contract_line_items
ADD COLUMN IF NOT EXISTS origin_country VARCHAR(3),
ADD COLUMN IF NOT EXISTS origin_country_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_usmca_qualifying BOOLEAN DEFAULT false;

-- Calculated tariff fields
ALTER TABLE contract_line_items
ADD COLUMN IF NOT EXISTS tariff_rate DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS tariff_cost DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS tariff_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tariff_calculated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tariff_effective_date DATE;

-- ============================================================================
-- INDEXES FOR TARIFF QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_line_items_hts_code ON contract_line_items(hts_code)
    WHERE hts_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_line_items_origin_country ON contract_line_items(origin_country)
    WHERE origin_country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_line_items_tariff ON contract_line_items(enterprise_id, hts_code, origin_country)
    WHERE hts_code IS NOT NULL AND origin_country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_line_items_tariff_cost ON contract_line_items(enterprise_id, tariff_cost)
    WHERE tariff_cost IS NOT NULL AND tariff_cost > 0;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get line items with tariff information for a contract
CREATE OR REPLACE FUNCTION get_contract_line_items_with_tariffs(p_contract_id UUID)
RETURNS TABLE (
    id UUID,
    line_number INTEGER,
    item_name VARCHAR(255),
    item_description TEXT,
    sku VARCHAR(100),
    taxonomy_code VARCHAR(20),
    quantity DECIMAL(15,4),
    unit VARCHAR(50),
    unit_price DECIMAL(15,4),
    total_price DECIMAL(15,2),
    currency VARCHAR(3),
    hts_code VARCHAR(15),
    hts_description TEXT,
    hts_confidence DECIMAL(3,2),
    hts_match_method VARCHAR(50),
    origin_country VARCHAR(3),
    origin_country_name VARCHAR(100),
    is_usmca_qualifying BOOLEAN,
    tariff_rate DECIMAL(6,2),
    tariff_cost DECIMAL(15,2),
    tariff_breakdown JSONB,
    tariff_calculated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cli.id,
        cli.line_number,
        cli.item_name,
        cli.item_description,
        cli.sku,
        cli.taxonomy_code,
        cli.quantity,
        cli.unit,
        cli.unit_price,
        cli.total_price,
        cli.currency,
        cli.hts_code,
        cli.hts_description,
        cli.hts_confidence,
        cli.hts_match_method,
        cli.origin_country,
        cli.origin_country_name,
        cli.is_usmca_qualifying,
        cli.tariff_rate,
        cli.tariff_cost,
        cli.tariff_breakdown,
        cli.tariff_calculated_at
    FROM contract_line_items cli
    WHERE cli.contract_id = p_contract_id
    ORDER BY cli.line_number;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Calculate tariff for a single line item
CREATE OR REPLACE FUNCTION calculate_line_item_tariff(
    p_line_item_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_line_item RECORD;
    v_tariff_result JSONB;
    v_tariff_rate DECIMAL;
    v_tariff_cost DECIMAL;
BEGIN
    -- Get line item details
    SELECT * INTO v_line_item
    FROM contract_line_items
    WHERE id = p_line_item_id;

    IF v_line_item IS NULL THEN
        RETURN jsonb_build_object('error', 'Line item not found');
    END IF;

    -- Check if we have required fields
    IF v_line_item.hts_code IS NULL OR v_line_item.origin_country IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'Missing HTS code or origin country',
            'hts_code', v_line_item.hts_code,
            'origin_country', v_line_item.origin_country
        );
    END IF;

    -- Calculate tariff using the global function
    v_tariff_result := calculate_total_tariff_rate(
        v_line_item.hts_code,
        v_line_item.origin_country,
        COALESCE(v_line_item.is_usmca_qualifying, false)
    );

    v_tariff_rate := (v_tariff_result->>'total_rate')::DECIMAL;
    v_tariff_cost := ROUND(v_line_item.total_price * (v_tariff_rate / 100), 2);

    -- Update the line item
    UPDATE contract_line_items
    SET
        tariff_rate = v_tariff_rate,
        tariff_cost = v_tariff_cost,
        tariff_breakdown = v_tariff_result->'breakdown',
        tariff_calculated_at = NOW(),
        tariff_effective_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_line_item_id;

    RETURN jsonb_build_object(
        'line_item_id', p_line_item_id,
        'hts_code', v_line_item.hts_code,
        'origin_country', v_line_item.origin_country,
        'total_price', v_line_item.total_price,
        'tariff_rate', v_tariff_rate,
        'tariff_cost', v_tariff_cost,
        'breakdown', v_tariff_result->'breakdown',
        'calculated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Recalculate tariffs for all line items in a contract
CREATE OR REPLACE FUNCTION recalculate_contract_tariffs(
    p_contract_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_line_item RECORD;
    v_results JSONB := '[]'::JSONB;
    v_result JSONB;
    v_total_tariff_cost DECIMAL := 0;
    v_items_calculated INTEGER := 0;
    v_items_skipped INTEGER := 0;
BEGIN
    -- Calculate tariff for each line item with HTS code and origin country
    FOR v_line_item IN
        SELECT id, hts_code, origin_country
        FROM contract_line_items
        WHERE contract_id = p_contract_id
        ORDER BY line_number
    LOOP
        IF v_line_item.hts_code IS NOT NULL AND v_line_item.origin_country IS NOT NULL THEN
            v_result := calculate_line_item_tariff(v_line_item.id);

            IF v_result->>'error' IS NULL THEN
                v_total_tariff_cost := v_total_tariff_cost + COALESCE((v_result->>'tariff_cost')::DECIMAL, 0);
                v_items_calculated := v_items_calculated + 1;
            ELSE
                v_items_skipped := v_items_skipped + 1;
            END IF;

            v_results := v_results || v_result;
        ELSE
            v_items_skipped := v_items_skipped + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'contract_id', p_contract_id,
        'total_tariff_cost', v_total_tariff_cost,
        'items_calculated', v_items_calculated,
        'items_skipped', v_items_skipped,
        'line_item_results', v_results,
        'calculated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Get tariff summary by origin country for a contract
CREATE OR REPLACE FUNCTION get_contract_tariff_by_country(
    p_contract_id UUID
)
RETURNS TABLE (
    origin_country VARCHAR(3),
    origin_country_name VARCHAR(100),
    item_count BIGINT,
    total_value DECIMAL(15,2),
    total_tariff_cost DECIMAL(15,2),
    avg_tariff_rate DECIMAL(6,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cli.origin_country,
        cli.origin_country_name,
        COUNT(*)::BIGINT as item_count,
        SUM(cli.total_price)::DECIMAL(15,2) as total_value,
        SUM(cli.tariff_cost)::DECIMAL(15,2) as total_tariff_cost,
        AVG(cli.tariff_rate)::DECIMAL(6,2) as avg_tariff_rate
    FROM contract_line_items cli
    WHERE cli.contract_id = p_contract_id
    AND cli.origin_country IS NOT NULL
    AND cli.tariff_cost IS NOT NULL
    GROUP BY cli.origin_country, cli.origin_country_name
    ORDER BY total_tariff_cost DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get line items needing HTS classification
CREATE OR REPLACE FUNCTION get_line_items_needing_hts(
    p_enterprise_id UUID,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    contract_id UUID,
    item_name VARCHAR(255),
    item_description TEXT,
    sku VARCHAR(100),
    taxonomy_code VARCHAR(20),
    origin_country VARCHAR(3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cli.id,
        cli.contract_id,
        cli.item_name,
        cli.item_description,
        cli.sku,
        cli.taxonomy_code,
        cli.origin_country
    FROM contract_line_items cli
    INNER JOIN contracts c ON c.id = cli.contract_id
    WHERE cli.enterprise_id = p_enterprise_id
    AND cli.hts_code IS NULL
    AND cli.origin_country IS NOT NULL
    AND c.status NOT IN ('terminated', 'archived')
    ORDER BY c.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN contract_line_items.hts_code IS 'Harmonized Tariff Schedule code for this item';
COMMENT ON COLUMN contract_line_items.hts_description IS 'HTS code description for reference';
COMMENT ON COLUMN contract_line_items.hts_confidence IS 'AI confidence score (0-1) for HTS classification';
COMMENT ON COLUMN contract_line_items.hts_match_method IS 'How HTS code was assigned: ai_suggested, manual, auto_matched, taxonomy_mapped';
COMMENT ON COLUMN contract_line_items.origin_country IS 'ISO 3166-1 alpha-2 country code of item origin';
COMMENT ON COLUMN contract_line_items.is_usmca_qualifying IS 'Whether item qualifies for USMCA preferential treatment';
COMMENT ON COLUMN contract_line_items.tariff_rate IS 'Calculated total tariff rate as percentage';
COMMENT ON COLUMN contract_line_items.tariff_cost IS 'Calculated tariff cost in USD';
COMMENT ON COLUMN contract_line_items.tariff_breakdown IS 'JSON breakdown of tariff components (base, country, product-specific)';

COMMENT ON FUNCTION get_contract_line_items_with_tariffs IS 'Get all line items for a contract with their tariff information';
COMMENT ON FUNCTION calculate_line_item_tariff IS 'Calculate and update tariff for a single line item';
COMMENT ON FUNCTION recalculate_contract_tariffs IS 'Recalculate tariffs for all applicable line items in a contract';
COMMENT ON FUNCTION get_contract_tariff_by_country IS 'Get tariff cost breakdown by origin country for a contract';
COMMENT ON FUNCTION get_line_items_needing_hts IS 'Get line items that have origin country but no HTS code (need classification)';
