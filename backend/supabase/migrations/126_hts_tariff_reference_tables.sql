-- Migration 126: HTS Tariff Reference Tables
-- Purpose: Add global HTS code reference data and tariff rules for tariff impact analysis on contracts
-- These tables are NOT enterprise-isolated - they contain shared reference data

-- ============================================================================
-- HTS CODES REFERENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hts_codes (
    code VARCHAR(15) PRIMARY KEY,
    description TEXT NOT NULL,
    full_description TEXT,

    -- HTS Structure (10-digit breakdown)
    chapter VARCHAR(2),           -- First 2 digits (e.g., '84' for machinery)
    heading VARCHAR(4),           -- First 4 digits
    subheading VARCHAR(6),        -- First 6 digits (international)
    suffix VARCHAR(10),           -- Full US statistical suffix

    -- Rate Columns
    general_rate_text VARCHAR(100),      -- Column 1-General (e.g., "16.5%", "Free")
    general_rate_numeric DECIMAL(6,3),   -- Numeric rate for calculations
    special_rate_text VARCHAR(255),      -- Column 1-Special (e.g., "Free (A,AU,BH,CA)")
    column_2_rate VARCHAR(100),          -- Column 2 rate for certain countries

    -- Unit of Measure
    unit VARCHAR(50),

    -- Semantic Search
    embedding vector(1536),       -- OpenAI text-embedding-3-small

    -- Metadata
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    source VARCHAR(50) DEFAULT 'usitc',
    effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COUNTRY TARIFF RULES (2025 Rates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS country_tariff_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL UNIQUE,
    country_name VARCHAR(100) NOT NULL,

    -- 2025 Additional Tariffs
    base_additional_rate DECIMAL(6,2) DEFAULT 0,

    -- IEEPA Tariffs (February-March 2025)
    ieepa_rate DECIMAL(6,2) DEFAULT 0,

    -- Reciprocal Tariffs (April 2025)
    reciprocal_rate DECIMAL(6,2) DEFAULT 0,

    -- Trade Agreement Info
    has_fta BOOLEAN DEFAULT false,
    fta_name VARCHAR(100),

    -- USMCA Specific
    is_usmca_country BOOLEAN DEFAULT false,
    usmca_rate DECIMAL(6,2) DEFAULT 0,        -- 0% if qualifying
    non_usmca_rate DECIMAL(6,2) DEFAULT 0,    -- Higher rate if not qualifying

    -- Metadata
    notes TEXT,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT-SPECIFIC TARIFFS (Section 232, 301, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_specific_tariffs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Tariff Type
    tariff_type VARCHAR(50) NOT NULL,  -- 'SECTION_232_STEEL', 'SECTION_232_ALUMINUM', 'SECTION_301', etc.

    -- Product Identification
    hts_chapter VARCHAR(2),            -- e.g., '72', '73' for steel
    hts_pattern VARCHAR(20),           -- Pattern match for HTS codes (e.g., '7306%')

    -- Tariff Rate
    additional_rate DECIMAL(6,2) NOT NULL,

    -- Applicability
    applies_to_all_countries BOOLEAN DEFAULT true,
    country_exceptions VARCHAR(3)[],   -- Countries exempt from this tariff

    -- Metadata
    description TEXT,
    legal_reference TEXT,              -- e.g., "Section 232 Steel Tariffs - March 12, 2025"
    effective_date DATE,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 301 EXCLUSIONS (China-specific)
-- ============================================================================

CREATE TABLE IF NOT EXISTS section_301_exclusions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hts_code VARCHAR(15) NOT NULL,
    description TEXT,
    exclusion_rate DECIMAL(6,2) DEFAULT 0,   -- Rate to apply instead of full Section 301
    exclusion_start_date DATE,
    exclusion_end_date DATE,
    ustr_notice_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- HTS Codes indexes
CREATE INDEX IF NOT EXISTS idx_hts_codes_chapter ON hts_codes(chapter);
CREATE INDEX IF NOT EXISTS idx_hts_codes_heading ON hts_codes(heading);
CREATE INDEX IF NOT EXISTS idx_hts_codes_subheading ON hts_codes(subheading);
CREATE INDEX IF NOT EXISTS idx_hts_codes_general_rate ON hts_codes(general_rate_numeric);
CREATE INDEX IF NOT EXISTS idx_hts_codes_description_trgm ON hts_codes USING gin(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hts_codes_embedding ON hts_codes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Country tariff rules indexes
-- Note: Cannot use CURRENT_DATE in partial index (not IMMUTABLE), using plain index instead
CREATE INDEX IF NOT EXISTS idx_country_tariff_active ON country_tariff_rules(country_code, expiration_date);

-- Product-specific tariffs indexes
CREATE INDEX IF NOT EXISTS idx_product_tariffs_type ON product_specific_tariffs(tariff_type);
CREATE INDEX IF NOT EXISTS idx_product_tariffs_chapter ON product_specific_tariffs(hts_chapter);
CREATE INDEX IF NOT EXISTS idx_product_tariffs_active ON product_specific_tariffs(tariff_type, hts_chapter)
    WHERE is_active = true;

-- Section 301 exclusions indexes
CREATE INDEX IF NOT EXISTS idx_section_301_hts ON section_301_exclusions(hts_code);
CREATE INDEX IF NOT EXISTS idx_section_301_active ON section_301_exclusions(hts_code)
    WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY (Read-only for authenticated users)
-- ============================================================================

ALTER TABLE hts_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_tariff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specific_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_301_exclusions ENABLE ROW LEVEL SECURITY;

-- HTS Codes - Public Read
CREATE POLICY "Authenticated users can view HTS codes"
    ON hts_codes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Service role can manage HTS codes"
    ON hts_codes FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Country Tariff Rules - Public Read
CREATE POLICY "Authenticated users can view country tariff rules"
    ON country_tariff_rules FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Service role can manage country tariff rules"
    ON country_tariff_rules FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Product-Specific Tariffs - Public Read
CREATE POLICY "Authenticated users can view product tariffs"
    ON product_specific_tariffs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Service role can manage product tariffs"
    ON product_specific_tariffs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Section 301 Exclusions - Public Read
CREATE POLICY "Authenticated users can view Section 301 exclusions"
    ON section_301_exclusions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Service role can manage Section 301 exclusions"
    ON section_301_exclusions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_hts_reference_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hts_codes_updated_at
    BEFORE UPDATE ON hts_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_hts_reference_timestamp();

CREATE TRIGGER trg_country_tariff_rules_updated_at
    BEFORE UPDATE ON country_tariff_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_hts_reference_timestamp();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Semantic search for HTS codes
CREATE OR REPLACE FUNCTION search_hts_codes_by_embedding(
    p_embedding vector(1536),
    p_match_threshold DECIMAL DEFAULT 0.5,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    code VARCHAR(15),
    description TEXT,
    chapter VARCHAR(2),
    general_rate_numeric DECIMAL(6,3),
    unit VARCHAR(50),
    similarity DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.code,
        h.description,
        h.chapter,
        h.general_rate_numeric,
        h.unit,
        (1 - (h.embedding <=> p_embedding))::DECIMAL as similarity
    FROM hts_codes h
    WHERE h.embedding IS NOT NULL
    AND h.is_active = true
    AND (1 - (h.embedding <=> p_embedding)) > p_match_threshold
    ORDER BY h.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Text search for HTS codes
CREATE OR REPLACE FUNCTION search_hts_codes_by_text(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    code VARCHAR(15),
    description TEXT,
    chapter VARCHAR(2),
    general_rate_numeric DECIMAL(6,3),
    unit VARCHAR(50),
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.code,
        h.description,
        h.chapter,
        h.general_rate_numeric,
        h.unit,
        ts_rank(to_tsvector('english', h.description), plainto_tsquery('english', p_query)) as rank
    FROM hts_codes h
    WHERE h.is_active = true
    AND (
        h.code LIKE p_query || '%'
        OR to_tsvector('english', h.description) @@ plainto_tsquery('english', p_query)
        OR h.description ILIKE '%' || p_query || '%'
    )
    ORDER BY
        CASE WHEN h.code LIKE p_query || '%' THEN 0 ELSE 1 END,
        rank DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate total tariff rate with 2025 stacking rules
CREATE OR REPLACE FUNCTION calculate_total_tariff_rate(
    p_hts_code TEXT,
    p_origin_country TEXT,
    p_is_usmca_qualifying BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_base_rate DECIMAL := 0;
    v_country_rate DECIMAL := 0;
    v_product_rate DECIMAL := 0;
    v_total_rate DECIMAL := 0;
    v_hts_chapter TEXT;
    v_breakdown JSONB := '[]'::JSONB;
    v_product_record RECORD;
BEGIN
    -- Extract chapter from HTS code (first 2 digits)
    v_hts_chapter := SUBSTRING(p_hts_code FROM 1 FOR 2);

    -- Step 1: Get base HTS rate
    SELECT COALESCE(general_rate_numeric, 0)
    INTO v_base_rate
    FROM hts_codes
    WHERE code = p_hts_code
    LIMIT 1;

    v_breakdown := v_breakdown || jsonb_build_object(
        'type', 'Base HTS Rate',
        'rate', COALESCE(v_base_rate, 0),
        'description', 'Column 1-General duty rate'
    );

    -- Step 2: Get country-specific tariff
    IF p_is_usmca_qualifying AND p_origin_country IN ('CA', 'MX') THEN
        -- USMCA qualifying = 0% country tariff
        v_country_rate := 0;
        v_breakdown := v_breakdown || jsonb_build_object(
            'type', 'USMCA Qualifying',
            'rate', 0,
            'description', 'Exempt from country-specific tariff'
        );
    ELSE
        -- Get country tariff (or DEFAULT if country not found)
        SELECT COALESCE(base_additional_rate, 0)
        INTO v_country_rate
        FROM country_tariff_rules
        WHERE country_code = p_origin_country
           OR (country_code = 'DEFAULT' AND NOT EXISTS (
             SELECT 1 FROM country_tariff_rules WHERE country_code = p_origin_country
           ))
        ORDER BY CASE WHEN country_code = p_origin_country THEN 1 ELSE 2 END
        LIMIT 1;

        v_breakdown := v_breakdown || jsonb_build_object(
            'type', 'Country Additional Rate',
            'rate', COALESCE(v_country_rate, 0),
            'country', p_origin_country
        );
    END IF;

    -- Step 3: Get product-specific tariffs (Section 232, etc.)
    FOR v_product_record IN
        SELECT tariff_type, additional_rate, description
        FROM product_specific_tariffs
        WHERE is_active = true
        AND (hts_chapter = v_hts_chapter OR hts_pattern IS NOT NULL AND p_hts_code LIKE REPLACE(hts_pattern, '%', '%%'))
        AND (applies_to_all_countries = true OR NOT (p_origin_country = ANY(country_exceptions)))
        AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
    LOOP
        v_product_rate := v_product_rate + v_product_record.additional_rate;
        v_breakdown := v_breakdown || jsonb_build_object(
            'type', v_product_record.tariff_type,
            'rate', v_product_record.additional_rate,
            'description', v_product_record.description
        );
    END LOOP;

    -- Calculate total rate (stacking)
    v_total_rate := COALESCE(v_base_rate, 0) + COALESCE(v_country_rate, 0) + COALESCE(v_product_rate, 0);

    -- Return result
    RETURN jsonb_build_object(
        'hts_code', p_hts_code,
        'origin_country', p_origin_country,
        'is_usmca_qualifying', p_is_usmca_qualifying,
        'base_rate', COALESCE(v_base_rate, 0),
        'country_additional_rate', COALESCE(v_country_rate, 0),
        'product_specific_rate', COALESCE(v_product_rate, 0),
        'total_rate', v_total_rate,
        'breakdown', v_breakdown,
        'calculated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SEED DATA: Country Tariff Rules (2025 Rates)
-- ============================================================================

INSERT INTO country_tariff_rules (country_code, country_name, base_additional_rate, ieepa_rate, reciprocal_rate, is_usmca_country, non_usmca_rate, notes) VALUES
    -- USMCA Countries
    ('CA', 'Canada', 35, 35, 0, true, 35, '35% IEEPA on non-USMCA goods; 0% on USMCA-qualifying goods'),
    ('MX', 'Mexico', 25, 25, 0, true, 25, '25% IEEPA on non-USMCA goods; 0% on USMCA-qualifying goods'),

    -- High Reciprocal Tariffs
    ('CN', 'China', 30, 20, 10, false, 0, '20% IEEPA + 10% base reciprocal = 30% (before Section 301)'),
    ('IN', 'India', 50, 0, 50, false, 0, '50% reciprocal tariff'),
    ('BR', 'Brazil', 50, 0, 50, false, 0, '50% reciprocal tariff'),
    ('VN', 'Vietnam', 46, 0, 46, false, 0, '46% reciprocal tariff'),
    ('BD', 'Bangladesh', 37, 0, 37, false, 0, '37% reciprocal tariff'),
    ('TW', 'Taiwan', 32, 0, 32, false, 0, '32% reciprocal tariff'),
    ('TH', 'Thailand', 36, 0, 36, false, 0, '36% reciprocal tariff'),
    ('ID', 'Indonesia', 32, 0, 32, false, 0, '32% reciprocal tariff'),

    -- Moderate Reciprocal Tariffs
    ('KR', 'South Korea', 25, 0, 25, false, 0, '25% reciprocal tariff'),
    ('JP', 'Japan', 24, 0, 24, false, 0, '24% reciprocal tariff'),
    ('MY', 'Malaysia', 24, 0, 24, false, 0, '24% reciprocal tariff'),
    ('PK', 'Pakistan', 23, 0, 23, false, 0, '23% reciprocal tariff'),
    ('TR', 'Turkey', 23, 0, 23, false, 0, '23% reciprocal tariff'),
    ('KH', 'Cambodia', 21, 0, 21, false, 0, '21% reciprocal tariff'),
    ('PH', 'Philippines', 19, 0, 19, false, 0, '19% reciprocal tariff'),
    ('CH', 'Switzerland', 16, 0, 16, false, 0, '16% reciprocal tariff'),

    -- European Union (15% for all EU members)
    ('DE', 'Germany', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('FR', 'France', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('IT', 'Italy', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('ES', 'Spain', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('NL', 'Netherlands', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('BE', 'Belgium', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('GB', 'United Kingdom', 15, 0, 15, false, 0, 'UK reciprocal tariff'),
    ('PL', 'Poland', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('AT', 'Austria', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('IE', 'Ireland', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('PT', 'Portugal', 15, 0, 15, false, 0, 'EU reciprocal tariff'),
    ('CZ', 'Czech Republic', 15, 0, 15, false, 0, 'EU reciprocal tariff'),

    -- Israel (FTA Available)
    ('IL', 'Israel', 12, 0, 12, false, 0, '12% reciprocal (FTA available for some products)'),

    -- Russia (Special Case)
    ('RU', 'Russia', 200, 0, 200, false, 0, '200% tariff on aluminum; high tariffs on other products'),

    -- Default for All Other Countries (use 'XX' as catch-all code)
    ('XX', 'All Other Countries', 10, 0, 10, false, 0, 'Universal baseline reciprocal tariff')
ON CONFLICT (country_code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Product-Specific Tariffs (Section 232, 301, etc.)
-- ============================================================================

INSERT INTO product_specific_tariffs (tariff_type, hts_chapter, additional_rate, applies_to_all_countries, description, legal_reference, effective_date) VALUES
    -- Section 232 Steel
    ('SECTION_232_STEEL', '72', 25, true, 'Section 232 Steel Products - 25%', 'Presidential Proclamation - March 12, 2025', '2025-03-12'),
    ('SECTION_232_STEEL', '73', 25, true, 'Section 232 Steel Articles - 25%', 'Presidential Proclamation - March 12, 2025', '2025-03-12'),

    -- Section 232 Aluminum
    ('SECTION_232_ALUMINUM', '76', 10, true, 'Section 232 Aluminum Products - 10%', 'Presidential Proclamation - March 12, 2025', '2025-03-12'),

    -- Section 232 Automobiles
    ('SECTION_232_AUTO', '87', 25, true, 'Section 232 Automobiles and Parts - 25%', 'Presidential Proclamation', '2025-03-01'),

    -- Section 232 Timber/Lumber
    ('SECTION_232_TIMBER', '44', 25, true, 'Section 232 Timber and Lumber - 25%', 'Presidential Proclamation - October 14, 2025', '2025-10-14')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE hts_codes IS 'Harmonized Tariff Schedule reference codes with rates and semantic search embeddings';
COMMENT ON TABLE country_tariff_rules IS '2025 country-specific tariff rates including IEEPA, reciprocal, and USMCA rules';
COMMENT ON TABLE product_specific_tariffs IS 'Section 232, Section 301, and other product-specific additional tariffs';
COMMENT ON TABLE section_301_exclusions IS 'China Section 301 tariff exclusions with expiration dates';
COMMENT ON FUNCTION calculate_total_tariff_rate IS 'Calculates total tariff rate using 2025 stacking rules (base + country + product-specific)';
COMMENT ON FUNCTION search_hts_codes_by_embedding IS 'Semantic search for HTS codes using vector embeddings';
COMMENT ON FUNCTION search_hts_codes_by_text IS 'Full-text and prefix search for HTS codes';
