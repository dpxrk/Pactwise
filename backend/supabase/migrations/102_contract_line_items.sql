-- Migration 102: Contract Line Items System
-- Purpose: Add line-item pricing structure to contracts for granular price tracking
-- This enables comparison of unit prices for specific goods/services across vendors

-- ============================================================================
-- CONTRACT LINE ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

    -- Item identification
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    sku VARCHAR(100),                     -- Optional SKU/part number from vendor

    -- Taxonomy linkage
    taxonomy_code VARCHAR(20) REFERENCES product_service_taxonomy(code) ON DELETE SET NULL,
    taxonomy_confidence DECIMAL(3,2) CHECK (taxonomy_confidence >= 0 AND taxonomy_confidence <= 1),
    taxonomy_match_method VARCHAR(50),    -- 'exact', 'synonym', 'embedding', 'manual'

    -- Quantity and pricing
    quantity DECIMAL(15,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL DEFAULT 'each',
    unit_price DECIMAL(15,4) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Pricing model
    pricing_model VARCHAR(50) DEFAULT 'fixed',
        -- 'fixed', 'tiered', 'volume', 'subscription', 'time_materials', 'cost_plus'
    pricing_frequency VARCHAR(50),
        -- 'one_time', 'hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'per_use'
    pricing_tiers JSONB DEFAULT '[]',     -- For tiered/volume pricing: [{"min_qty": 1, "max_qty": 10, "price": 100}, ...]

    -- Line item metadata
    line_number INTEGER NOT NULL,
    category VARCHAR(100),                -- Optional category within contract
    is_optional BOOLEAN DEFAULT false,    -- Optional line items not included in total
    is_recurring BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,

    -- Discount/adjustment tracking
    discount_pct DECIMAL(5,2) DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    discount_amount DECIMAL(15,2) DEFAULT 0,
    discount_reason TEXT,

    -- AI extraction metadata
    extraction_source VARCHAR(50) DEFAULT 'manual',
        -- 'manual', 'ai_extracted', 'imported', 'rfq_imported'
    extraction_confidence DECIMAL(3,2) CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
    raw_text TEXT,                        -- Original text from contract PDF
    page_number INTEGER,                  -- Page where item was found
    extraction_metadata JSONB DEFAULT '{}', -- Additional extraction details

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    UNIQUE(contract_id, line_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_line_items_contract ON contract_line_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_line_items_enterprise ON contract_line_items(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_line_items_taxonomy ON contract_line_items(taxonomy_code) WHERE taxonomy_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_line_items_pricing_model ON contract_line_items(pricing_model);
CREATE INDEX IF NOT EXISTS idx_line_items_recurring ON contract_line_items(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_line_items_extraction ON contract_line_items(extraction_source);
CREATE INDEX IF NOT EXISTS idx_line_items_item_name_trgm ON contract_line_items USING gin(item_name gin_trgm_ops);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_line_items_enterprise_taxonomy ON contract_line_items(enterprise_id, taxonomy_code)
    WHERE taxonomy_code IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE contract_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enterprise isolation for line items"
    ON contract_line_items
    FOR ALL
    TO authenticated
    USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID)
    WITH CHECK (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID);

-- ============================================================================
-- CONTRACT VALUE UPDATE TRIGGER
-- ============================================================================

-- Function to update contract value from sum of non-optional line items
CREATE OR REPLACE FUNCTION update_contract_value_from_line_items()
RETURNS TRIGGER AS $$
DECLARE
    v_contract_id UUID;
    v_total DECIMAL(15,2);
BEGIN
    -- Get the contract_id (works for INSERT, UPDATE, DELETE)
    v_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);

    -- Calculate total from non-optional line items
    SELECT COALESCE(SUM(
        CASE
            WHEN is_optional = false THEN
                total_price - COALESCE(discount_amount, 0) - (total_price * COALESCE(discount_pct, 0) / 100)
            ELSE 0
        END
    ), 0)
    INTO v_total
    FROM contract_line_items
    WHERE contract_id = v_contract_id;

    -- Update contract value
    UPDATE contracts
    SET value = v_total,
        updated_at = NOW()
    WHERE id = v_contract_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for line items changes
DROP TRIGGER IF EXISTS trg_update_contract_value ON contract_line_items;
CREATE TRIGGER trg_update_contract_value
    AFTER INSERT OR UPDATE OR DELETE ON contract_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_value_from_line_items();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get line items with taxonomy details
CREATE OR REPLACE FUNCTION get_contract_line_items_with_taxonomy(p_contract_id UUID)
RETURNS TABLE (
    id UUID,
    item_name VARCHAR(255),
    item_description TEXT,
    taxonomy_code VARCHAR(20),
    taxonomy_name VARCHAR(255),
    taxonomy_path TEXT,
    quantity DECIMAL(15,4),
    unit VARCHAR(50),
    unit_price DECIMAL(15,4),
    total_price DECIMAL(15,2),
    currency VARCHAR(3),
    pricing_model VARCHAR(50),
    pricing_frequency VARCHAR(50),
    line_number INTEGER,
    is_optional BOOLEAN,
    is_recurring BOOLEAN,
    taxonomy_confidence DECIMAL(3,2),
    extraction_source VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cli.id,
        cli.item_name,
        cli.item_description,
        cli.taxonomy_code,
        pst.name as taxonomy_name,
        (
            SELECT string_agg(tp.name, ' > ' ORDER BY tp.level)
            FROM get_taxonomy_path(cli.taxonomy_code) tp
        ) as taxonomy_path,
        cli.quantity,
        cli.unit,
        cli.unit_price,
        cli.total_price,
        cli.currency,
        cli.pricing_model,
        cli.pricing_frequency,
        cli.line_number,
        cli.is_optional,
        cli.is_recurring,
        cli.taxonomy_confidence,
        cli.extraction_source
    FROM contract_line_items cli
    LEFT JOIN product_service_taxonomy pst ON pst.code = cli.taxonomy_code
    WHERE cli.contract_id = p_contract_id
    ORDER BY cli.line_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get line items by taxonomy code across enterprise
CREATE OR REPLACE FUNCTION get_line_items_by_taxonomy(
    p_enterprise_id UUID,
    p_taxonomy_code VARCHAR(20),
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    contract_id UUID,
    vendor_name VARCHAR(255),
    item_name VARCHAR(255),
    quantity DECIMAL(15,4),
    unit VARCHAR(50),
    unit_price DECIMAL(15,4),
    currency VARCHAR(3),
    contract_date DATE,
    pricing_model VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cli.id,
        cli.contract_id,
        v.name as vendor_name,
        cli.item_name,
        cli.quantity,
        cli.unit,
        cli.unit_price,
        cli.currency,
        c.start_date as contract_date,
        cli.pricing_model
    FROM contract_line_items cli
    INNER JOIN contracts c ON c.id = cli.contract_id
    LEFT JOIN vendors v ON v.id = c.vendor_id
    WHERE cli.enterprise_id = p_enterprise_id
    AND (cli.taxonomy_code = p_taxonomy_code OR cli.taxonomy_code LIKE p_taxonomy_code || '.%')
    AND (p_date_from IS NULL OR c.start_date >= p_date_from)
    AND (p_date_to IS NULL OR c.start_date <= p_date_to)
    ORDER BY c.start_date DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to calculate price statistics for a taxonomy code within enterprise
CREATE OR REPLACE FUNCTION calculate_enterprise_price_stats(
    p_enterprise_id UUID,
    p_taxonomy_code VARCHAR(20)
)
RETURNS TABLE (
    sample_count INTEGER,
    avg_unit_price DECIMAL(15,4),
    median_unit_price DECIMAL(15,4),
    min_unit_price DECIMAL(15,4),
    max_unit_price DECIMAL(15,4),
    std_dev DECIMAL(15,4),
    price_range DECIMAL(15,4)
) AS $$
BEGIN
    RETURN QUERY
    WITH prices AS (
        SELECT cli.unit_price
        FROM contract_line_items cli
        INNER JOIN contracts c ON c.id = cli.contract_id
        WHERE cli.enterprise_id = p_enterprise_id
        AND (cli.taxonomy_code = p_taxonomy_code OR cli.taxonomy_code LIKE p_taxonomy_code || '.%')
        AND c.status NOT IN ('terminated', 'expired')
        ORDER BY cli.unit_price
    ),
    stats AS (
        SELECT
            COUNT(*)::INTEGER as cnt,
            AVG(unit_price)::DECIMAL(15,4) as avg_price,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY unit_price)::DECIMAL(15,4) as median_price,
            MIN(unit_price)::DECIMAL(15,4) as min_price,
            MAX(unit_price)::DECIMAL(15,4) as max_price,
            STDDEV(unit_price)::DECIMAL(15,4) as std_dev_price
        FROM prices
    )
    SELECT
        s.cnt,
        s.avg_price,
        s.median_price,
        s.min_price,
        s.max_price,
        s.std_dev_price,
        (s.max_price - s.min_price)::DECIMAL(15,4) as price_range
    FROM stats s;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_line_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_line_item_updated_at
    BEFORE UPDATE ON contract_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_line_item_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE contract_line_items IS 'Individual line items within contracts with standardized taxonomy codes for market price comparison';
COMMENT ON COLUMN contract_line_items.taxonomy_code IS 'Link to product_service_taxonomy for standardized categorization';
COMMENT ON COLUMN contract_line_items.taxonomy_confidence IS 'AI confidence score (0-1) for taxonomy matching';
COMMENT ON COLUMN contract_line_items.total_price IS 'Computed column: quantity * unit_price (rounded to 2 decimal places)';
COMMENT ON COLUMN contract_line_items.pricing_tiers IS 'JSON array of tiered pricing: [{"min_qty": 1, "max_qty": 10, "price": 100}]';
COMMENT ON COLUMN contract_line_items.extraction_source IS 'How line item was created: manual, ai_extracted, imported, rfq_imported';
