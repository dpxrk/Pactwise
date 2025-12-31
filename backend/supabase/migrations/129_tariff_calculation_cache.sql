-- Migration 129: Tariff Calculation Cache
-- Purpose: Cache tariff calculations per enterprise for performance optimization

-- ============================================================================
-- ENTERPRISE TARIFF CACHE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS enterprise_tariff_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

    -- Cache Key
    hts_code VARCHAR(15) NOT NULL,
    origin_country VARCHAR(3) NOT NULL,
    is_usmca_qualifying BOOLEAN DEFAULT false,

    -- Cached Values
    base_rate DECIMAL(6,2),
    country_additional_rate DECIMAL(6,2),
    product_specific_rate DECIMAL(6,2),
    total_rate DECIMAL(6,2) NOT NULL,
    calculation_breakdown JSONB,

    -- Cache Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',

    -- Unique constraint for cache key
    UNIQUE(enterprise_id, hts_code, origin_country, is_usmca_qualifying)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tariff_cache_lookup ON enterprise_tariff_cache(
    enterprise_id, hts_code, origin_country, is_usmca_qualifying
);

-- Note: Cannot use NOW() in partial index (not IMMUTABLE), using plain index instead
CREATE INDEX IF NOT EXISTS idx_tariff_cache_expires ON enterprise_tariff_cache(expires_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE enterprise_tariff_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enterprise isolation for tariff cache"
    ON enterprise_tariff_cache
    FOR ALL
    TO authenticated
    USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID)
    WITH CHECK (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID);

CREATE POLICY "Service role can manage tariff cache"
    ON enterprise_tariff_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- CACHE MANAGEMENT FUNCTIONS
-- ============================================================================

-- Get cached tariff or calculate new one
CREATE OR REPLACE FUNCTION get_or_calculate_tariff(
    p_enterprise_id UUID,
    p_hts_code TEXT,
    p_origin_country TEXT,
    p_is_usmca_qualifying BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_cached RECORD;
    v_result JSONB;
BEGIN
    -- Try to get from cache (not expired)
    SELECT * INTO v_cached
    FROM enterprise_tariff_cache
    WHERE enterprise_id = p_enterprise_id
    AND hts_code = p_hts_code
    AND origin_country = p_origin_country
    AND is_usmca_qualifying = p_is_usmca_qualifying
    AND expires_at > NOW();

    IF v_cached IS NOT NULL THEN
        -- Return cached value
        RETURN jsonb_build_object(
            'hts_code', v_cached.hts_code,
            'origin_country', v_cached.origin_country,
            'is_usmca_qualifying', v_cached.is_usmca_qualifying,
            'base_rate', v_cached.base_rate,
            'country_additional_rate', v_cached.country_additional_rate,
            'product_specific_rate', v_cached.product_specific_rate,
            'total_rate', v_cached.total_rate,
            'breakdown', v_cached.calculation_breakdown,
            'cached', true,
            'calculated_at', v_cached.calculated_at,
            'expires_at', v_cached.expires_at
        );
    END IF;

    -- Calculate fresh value
    v_result := calculate_total_tariff_rate(p_hts_code, p_origin_country, p_is_usmca_qualifying);

    -- Store in cache
    INSERT INTO enterprise_tariff_cache (
        enterprise_id,
        hts_code,
        origin_country,
        is_usmca_qualifying,
        base_rate,
        country_additional_rate,
        product_specific_rate,
        total_rate,
        calculation_breakdown,
        calculated_at,
        expires_at
    ) VALUES (
        p_enterprise_id,
        p_hts_code,
        p_origin_country,
        p_is_usmca_qualifying,
        (v_result->>'base_rate')::DECIMAL,
        (v_result->>'country_additional_rate')::DECIMAL,
        (v_result->>'product_specific_rate')::DECIMAL,
        (v_result->>'total_rate')::DECIMAL,
        v_result->'breakdown',
        NOW(),
        NOW() + INTERVAL '24 hours'
    )
    ON CONFLICT (enterprise_id, hts_code, origin_country, is_usmca_qualifying)
    DO UPDATE SET
        base_rate = EXCLUDED.base_rate,
        country_additional_rate = EXCLUDED.country_additional_rate,
        product_specific_rate = EXCLUDED.product_specific_rate,
        total_rate = EXCLUDED.total_rate,
        calculation_breakdown = EXCLUDED.calculation_breakdown,
        calculated_at = EXCLUDED.calculated_at,
        expires_at = EXCLUDED.expires_at;

    -- Return fresh value with cached = false
    RETURN v_result || jsonb_build_object('cached', false);
END;
$$ LANGUAGE plpgsql;

-- Invalidate cache for a specific country (when rates change)
CREATE OR REPLACE FUNCTION invalidate_tariff_cache_by_country(
    p_origin_country TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM enterprise_tariff_cache
    WHERE origin_country = p_origin_country;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Invalidate cache for a specific HTS code (when base rates change)
CREATE OR REPLACE FUNCTION invalidate_tariff_cache_by_hts(
    p_hts_code TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM enterprise_tariff_cache
    WHERE hts_code = p_hts_code;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_tariff_cache()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM enterprise_tariff_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Invalidate all cache for an enterprise
CREATE OR REPLACE FUNCTION invalidate_enterprise_tariff_cache(
    p_enterprise_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM enterprise_tariff_cache
    WHERE enterprise_id = p_enterprise_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS TO INVALIDATE CACHE ON RATE CHANGES
-- ============================================================================

-- Invalidate cache when country tariff rules change
CREATE OR REPLACE FUNCTION invalidate_cache_on_country_rule_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM invalidate_tariff_cache_by_country(OLD.country_code);
    ELSE
        PERFORM invalidate_tariff_cache_by_country(NEW.country_code);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_cache_country_rules
    AFTER INSERT OR UPDATE OR DELETE ON country_tariff_rules
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_cache_on_country_rule_change();

-- Invalidate cache when HTS codes change
CREATE OR REPLACE FUNCTION invalidate_cache_on_hts_code_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM invalidate_tariff_cache_by_hts(OLD.code);
    ELSE
        PERFORM invalidate_tariff_cache_by_hts(NEW.code);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invalidate_cache_hts_codes
    AFTER UPDATE OF general_rate_numeric ON hts_codes
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_cache_on_hts_code_change();

-- ============================================================================
-- TARIFF RATE CHANGE NOTIFICATION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS tariff_rate_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    change_type VARCHAR(50) NOT NULL,  -- 'country_rule', 'hts_rate', 'product_specific', 'section_301'
    affected_entity TEXT NOT NULL,      -- Country code or HTS code
    old_rate DECIMAL(6,2),
    new_rate DECIMAL(6,2),
    change_description TEXT,
    effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tariff_rate_changes_date ON tariff_rate_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tariff_rate_changes_type ON tariff_rate_changes(change_type, affected_entity);

-- Track country tariff rule changes
CREATE OR REPLACE FUNCTION track_country_rule_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.base_additional_rate IS DISTINCT FROM NEW.base_additional_rate THEN
        INSERT INTO tariff_rate_changes (
            change_type,
            affected_entity,
            old_rate,
            new_rate,
            change_description,
            effective_date
        ) VALUES (
            'country_rule',
            NEW.country_code,
            OLD.base_additional_rate,
            NEW.base_additional_rate,
            'Country tariff rate changed for ' || NEW.country_name,
            COALESCE(NEW.effective_date, CURRENT_DATE)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_track_country_rule_changes
    AFTER UPDATE ON country_tariff_rules
    FOR EACH ROW
    EXECUTE FUNCTION track_country_rule_change();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE enterprise_tariff_cache IS 'Per-enterprise cache of tariff calculations for performance';
COMMENT ON TABLE tariff_rate_changes IS 'Audit log of tariff rate changes for notification purposes';

COMMENT ON FUNCTION get_or_calculate_tariff IS 'Get tariff from cache or calculate and cache new value';
COMMENT ON FUNCTION invalidate_tariff_cache_by_country IS 'Invalidate all cached tariffs for a specific country';
COMMENT ON FUNCTION invalidate_tariff_cache_by_hts IS 'Invalidate all cached tariffs for a specific HTS code';
COMMENT ON FUNCTION cleanup_expired_tariff_cache IS 'Remove expired cache entries';
