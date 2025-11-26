-- Migration 103: Market Price Intelligence System
-- Purpose: Create cross-enterprise anonymized price history and market indices
-- This enables market benchmarking without revealing enterprise-specific data

-- ============================================================================
-- MARKET PRICE HISTORY (Anonymized Cross-Enterprise Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Taxonomy linkage (required for comparison)
    taxonomy_code VARCHAR(20) NOT NULL REFERENCES product_service_taxonomy(code) ON DELETE CASCADE,

    -- Anonymized enterprise context (NO direct enterprise_id link for privacy)
    industry VARCHAR(100),
    company_size VARCHAR(50),             -- 'micro', 'small', 'medium', 'large', 'enterprise'
    region VARCHAR(100),                  -- Geographic region (country/state level only)

    -- Price data
    unit_price DECIMAL(15,4) NOT NULL CHECK (unit_price >= 0),
    quantity_range VARCHAR(50),           -- 'single', '2-10', '11-50', '51-100', '100+'
    currency VARCHAR(3) DEFAULT 'USD',
    pricing_model VARCHAR(50),            -- 'fixed', 'subscription', 'tiered', etc.
    pricing_frequency VARCHAR(50),        -- 'one_time', 'monthly', 'annual', etc.

    -- Contract context (anonymized)
    contract_duration_months INTEGER,
    vendor_tier VARCHAR(50),              -- 'tier1', 'tier2', 'tier3', 'unknown'
    contract_type VARCHAR(50),            -- 'new', 'renewal', 'amendment'
    negotiation_indicator VARCHAR(50),    -- 'list_price', 'negotiated', 'competitive_bid'

    -- Timestamps
    effective_date DATE NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Source tracking (hash-based for deduplication without revealing source)
    source_hash VARCHAR(64) NOT NULL,     -- SHA-256 hash of enterprise_id + salt for dedup
    line_item_hash VARCHAR(64),           -- Hash of original line item for updates

    -- Quality indicators
    data_quality_score DECIMAL(3,2) DEFAULT 0.80 CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
    is_outlier BOOLEAN DEFAULT false,
    outlier_reason VARCHAR(100)
);

-- ============================================================================
-- MARKET PRICE INDICES (Aggregated Benchmarks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_price_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Index identification
    taxonomy_code VARCHAR(20) NOT NULL REFERENCES product_service_taxonomy(code) ON DELETE CASCADE,
    index_date DATE NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'quarterly'

    -- Statistical measures
    sample_count INTEGER NOT NULL CHECK (sample_count > 0),
    avg_unit_price DECIMAL(15,4) NOT NULL,
    median_unit_price DECIMAL(15,4) NOT NULL,
    std_dev DECIMAL(15,4),
    p10_price DECIMAL(15,4),
    p25_price DECIMAL(15,4),
    p75_price DECIMAL(15,4),
    p90_price DECIMAL(15,4),
    p95_price DECIMAL(15,4),
    min_price DECIMAL(15,4),
    max_price DECIMAL(15,4),

    -- Trend indicators
    price_change_pct DECIMAL(6,2),        -- vs previous period
    price_change_yoy_pct DECIMAL(6,2),    -- year-over-year
    trend_direction VARCHAR(20),          -- 'increasing', 'decreasing', 'stable', 'volatile'
    volatility_score DECIMAL(3,2) CHECK (volatility_score >= 0 AND volatility_score <= 1),

    -- Segmentation (optional filters)
    industry VARCHAR(100),
    region VARCHAR(100),
    company_size VARCHAR(50),

    -- Quality metrics
    confidence_score DECIMAL(3,2) DEFAULT 0.80 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    data_freshness_days INTEGER,
    last_calculated TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint per segment
    UNIQUE(taxonomy_code, index_date, period, COALESCE(industry, ''), COALESCE(region, ''), COALESCE(company_size, ''))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Market price history indexes
CREATE INDEX IF NOT EXISTS idx_price_history_taxonomy ON market_price_history(taxonomy_code);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON market_price_history(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_industry ON market_price_history(industry) WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_history_region ON market_price_history(region) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_history_pricing ON market_price_history(pricing_model, pricing_frequency);
CREATE INDEX IF NOT EXISTS idx_price_history_source ON market_price_history(source_hash);
CREATE INDEX IF NOT EXISTS idx_price_history_quality ON market_price_history(is_outlier, data_quality_score);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_price_history_lookup ON market_price_history(
    taxonomy_code, effective_date DESC, industry, region
);

-- Market price indices indexes
CREATE INDEX IF NOT EXISTS idx_price_indices_taxonomy ON market_price_indices(taxonomy_code);
CREATE INDEX IF NOT EXISTS idx_price_indices_date ON market_price_indices(index_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_indices_period ON market_price_indices(period);
CREATE INDEX IF NOT EXISTS idx_price_indices_lookup ON market_price_indices(
    taxonomy_code, index_date DESC, period
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Market price history is global (read-only for authenticated users)
ALTER TABLE market_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market price history read access"
    ON market_price_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can write (via Donna contribution functions)
CREATE POLICY "Market price history write access"
    ON market_price_history
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Market indices are global (read-only)
ALTER TABLE market_price_indices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market indices read access"
    ON market_price_indices
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Market indices write access"
    ON market_price_indices
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current market benchmark for a taxonomy code
CREATE OR REPLACE FUNCTION get_market_benchmark(
    p_taxonomy_code VARCHAR(20),
    p_industry VARCHAR(100) DEFAULT NULL,
    p_region VARCHAR(100) DEFAULT NULL,
    p_company_size VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    taxonomy_code VARCHAR(20),
    taxonomy_name VARCHAR(255),
    avg_price DECIMAL(15,4),
    median_price DECIMAL(15,4),
    p25_price DECIMAL(15,4),
    p75_price DECIMAL(15,4),
    p90_price DECIMAL(15,4),
    sample_count INTEGER,
    trend_direction VARCHAR(20),
    price_change_pct DECIMAL(6,2),
    confidence DECIMAL(3,2),
    as_of_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mpi.taxonomy_code,
        pst.name as taxonomy_name,
        mpi.avg_unit_price,
        mpi.median_unit_price,
        mpi.p25_price,
        mpi.p75_price,
        mpi.p90_price,
        mpi.sample_count,
        mpi.trend_direction,
        mpi.price_change_pct,
        mpi.confidence_score,
        mpi.index_date
    FROM market_price_indices mpi
    INNER JOIN product_service_taxonomy pst ON pst.code = mpi.taxonomy_code
    WHERE mpi.taxonomy_code = p_taxonomy_code
    AND mpi.period = 'monthly'
    AND (p_industry IS NULL OR mpi.industry = p_industry OR mpi.industry IS NULL)
    AND (p_region IS NULL OR mpi.region = p_region OR mpi.region IS NULL)
    AND (p_company_size IS NULL OR mpi.company_size = p_company_size OR mpi.company_size IS NULL)
    ORDER BY
        mpi.index_date DESC,
        mpi.confidence_score DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to compare a price against market benchmark
CREATE OR REPLACE FUNCTION compare_price_to_market(
    p_taxonomy_code VARCHAR(20),
    p_unit_price DECIMAL(15,4),
    p_industry VARCHAR(100) DEFAULT NULL,
    p_region VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    comparison VARCHAR(20),
    percentile_rank DECIMAL(5,2),
    deviation_from_median DECIMAL(6,2),
    deviation_from_avg DECIMAL(6,2),
    market_median DECIMAL(15,4),
    market_avg DECIMAL(15,4),
    potential_savings DECIMAL(15,4),
    confidence DECIMAL(3,2)
) AS $$
DECLARE
    v_benchmark RECORD;
    v_percentile DECIMAL(5,2);
    v_comparison VARCHAR(20);
    v_deviation_median DECIMAL(6,2);
    v_deviation_avg DECIMAL(6,2);
    v_savings DECIMAL(15,4);
BEGIN
    -- Get benchmark
    SELECT * INTO v_benchmark
    FROM get_market_benchmark(p_taxonomy_code, p_industry, p_region);

    IF v_benchmark IS NULL OR v_benchmark.median_price IS NULL THEN
        RETURN;
    END IF;

    -- Calculate percentile rank (approximate)
    IF p_unit_price <= v_benchmark.p25_price THEN
        v_percentile := 25.0 * (p_unit_price / NULLIF(v_benchmark.p25_price, 0));
    ELSIF p_unit_price <= v_benchmark.median_price THEN
        v_percentile := 25.0 + 25.0 * ((p_unit_price - v_benchmark.p25_price) / NULLIF(v_benchmark.median_price - v_benchmark.p25_price, 0));
    ELSIF p_unit_price <= v_benchmark.p75_price THEN
        v_percentile := 50.0 + 25.0 * ((p_unit_price - v_benchmark.median_price) / NULLIF(v_benchmark.p75_price - v_benchmark.median_price, 0));
    ELSIF p_unit_price <= v_benchmark.p90_price THEN
        v_percentile := 75.0 + 15.0 * ((p_unit_price - v_benchmark.p75_price) / NULLIF(v_benchmark.p90_price - v_benchmark.p75_price, 0));
    ELSE
        v_percentile := LEAST(99.0, 90.0 + 10.0 * ((p_unit_price - v_benchmark.p90_price) / NULLIF(v_benchmark.p90_price, 0)));
    END IF;

    -- Determine comparison category
    IF v_percentile < 25 THEN
        v_comparison := 'below_market';
    ELSIF v_percentile > 75 THEN
        v_comparison := 'above_market';
    ELSE
        v_comparison := 'at_market';
    END IF;

    -- Calculate deviations
    v_deviation_median := ((p_unit_price - v_benchmark.median_price) / NULLIF(v_benchmark.median_price, 0)) * 100;
    v_deviation_avg := ((p_unit_price - v_benchmark.avg_price) / NULLIF(v_benchmark.avg_price, 0)) * 100;

    -- Calculate potential savings (if above median)
    IF p_unit_price > v_benchmark.median_price THEN
        v_savings := p_unit_price - v_benchmark.median_price;
    ELSE
        v_savings := 0;
    END IF;

    RETURN QUERY SELECT
        v_comparison,
        v_percentile,
        v_deviation_median,
        v_deviation_avg,
        v_benchmark.median_price,
        v_benchmark.avg_price,
        v_savings,
        v_benchmark.confidence;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to contribute anonymized price data
CREATE OR REPLACE FUNCTION contribute_price_data(
    p_taxonomy_code VARCHAR(20),
    p_unit_price DECIMAL(15,4),
    p_enterprise_id UUID,
    p_industry VARCHAR(100),
    p_company_size VARCHAR(50),
    p_region VARCHAR(100) DEFAULT NULL,
    p_quantity_range VARCHAR(50) DEFAULT 'single',
    p_currency VARCHAR(3) DEFAULT 'USD',
    p_pricing_model VARCHAR(50) DEFAULT 'fixed',
    p_pricing_frequency VARCHAR(50) DEFAULT NULL,
    p_contract_duration_months INTEGER DEFAULT NULL,
    p_negotiation_indicator VARCHAR(50) DEFAULT 'unknown',
    p_line_item_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_source_hash VARCHAR(64);
    v_line_item_hash VARCHAR(64);
    v_new_id UUID;
BEGIN
    -- Generate source hash (anonymize enterprise)
    v_source_hash := encode(sha256(convert_to(p_enterprise_id::TEXT || 'pactwise_market_salt_2024', 'UTF8')), 'hex');

    -- Generate line item hash if provided (for update deduplication)
    IF p_line_item_id IS NOT NULL THEN
        v_line_item_hash := encode(sha256(convert_to(p_line_item_id::TEXT || 'pactwise_item_salt_2024', 'UTF8')), 'hex');

        -- Check for existing record from same line item
        DELETE FROM market_price_history WHERE line_item_hash = v_line_item_hash;
    END IF;

    -- Insert anonymized record
    INSERT INTO market_price_history (
        taxonomy_code, industry, company_size, region,
        unit_price, quantity_range, currency,
        pricing_model, pricing_frequency,
        contract_duration_months, negotiation_indicator,
        effective_date, source_hash, line_item_hash
    ) VALUES (
        p_taxonomy_code, p_industry, p_company_size, p_region,
        p_unit_price, p_quantity_range, p_currency,
        p_pricing_model, p_pricing_frequency,
        p_contract_duration_months, p_negotiation_indicator,
        CURRENT_DATE, v_source_hash, v_line_item_hash
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and update market indices (scheduled job)
CREATE OR REPLACE FUNCTION calculate_market_indices(
    p_taxonomy_code VARCHAR(20) DEFAULT NULL,
    p_period VARCHAR(20) DEFAULT 'monthly'
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_taxonomy RECORD;
    v_date_from DATE;
    v_date_to DATE;
    v_prev_date DATE;
    v_stats RECORD;
    v_prev_stats RECORD;
BEGIN
    -- Determine date range based on period
    v_date_to := CURRENT_DATE;
    CASE p_period
        WHEN 'daily' THEN v_date_from := v_date_to - INTERVAL '1 day';
        WHEN 'weekly' THEN v_date_from := v_date_to - INTERVAL '7 days';
        WHEN 'monthly' THEN v_date_from := v_date_to - INTERVAL '30 days';
        WHEN 'quarterly' THEN v_date_from := v_date_to - INTERVAL '90 days';
        ELSE v_date_from := v_date_to - INTERVAL '30 days';
    END CASE;

    v_prev_date := v_date_from - (v_date_to - v_date_from);

    -- Process each taxonomy code
    FOR v_taxonomy IN
        SELECT DISTINCT mph.taxonomy_code
        FROM market_price_history mph
        WHERE mph.is_outlier = false
        AND mph.effective_date >= v_date_from
        AND (p_taxonomy_code IS NULL OR mph.taxonomy_code = p_taxonomy_code)
    LOOP
        -- Calculate current period statistics
        SELECT
            COUNT(*)::INTEGER as sample_count,
            AVG(unit_price)::DECIMAL(15,4) as avg_price,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY unit_price)::DECIMAL(15,4) as median_price,
            STDDEV(unit_price)::DECIMAL(15,4) as std_dev,
            PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY unit_price)::DECIMAL(15,4) as p10,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY unit_price)::DECIMAL(15,4) as p25,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY unit_price)::DECIMAL(15,4) as p75,
            PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY unit_price)::DECIMAL(15,4) as p90,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY unit_price)::DECIMAL(15,4) as p95,
            MIN(unit_price)::DECIMAL(15,4) as min_price,
            MAX(unit_price)::DECIMAL(15,4) as max_price
        INTO v_stats
        FROM market_price_history
        WHERE taxonomy_code = v_taxonomy.taxonomy_code
        AND effective_date >= v_date_from
        AND effective_date <= v_date_to
        AND is_outlier = false;

        -- Skip if insufficient data
        IF v_stats.sample_count < 3 THEN
            CONTINUE;
        END IF;

        -- Get previous period for trend calculation
        SELECT AVG(unit_price)::DECIMAL(15,4) as avg_price
        INTO v_prev_stats
        FROM market_price_history
        WHERE taxonomy_code = v_taxonomy.taxonomy_code
        AND effective_date >= v_prev_date
        AND effective_date < v_date_from
        AND is_outlier = false;

        -- Insert or update index
        INSERT INTO market_price_indices (
            taxonomy_code, index_date, period,
            sample_count, avg_unit_price, median_unit_price, std_dev,
            p10_price, p25_price, p75_price, p90_price, p95_price,
            min_price, max_price,
            price_change_pct,
            trend_direction,
            volatility_score,
            confidence_score,
            last_calculated
        ) VALUES (
            v_taxonomy.taxonomy_code, v_date_to, p_period,
            v_stats.sample_count, v_stats.avg_price, v_stats.median_price, v_stats.std_dev,
            v_stats.p10, v_stats.p25, v_stats.p75, v_stats.p90, v_stats.p95,
            v_stats.min_price, v_stats.max_price,
            CASE WHEN v_prev_stats.avg_price IS NOT NULL AND v_prev_stats.avg_price > 0
                THEN ((v_stats.avg_price - v_prev_stats.avg_price) / v_prev_stats.avg_price * 100)::DECIMAL(6,2)
                ELSE NULL END,
            CASE
                WHEN v_prev_stats.avg_price IS NULL THEN 'stable'
                WHEN ((v_stats.avg_price - v_prev_stats.avg_price) / NULLIF(v_prev_stats.avg_price, 0) * 100) > 5 THEN 'increasing'
                WHEN ((v_stats.avg_price - v_prev_stats.avg_price) / NULLIF(v_prev_stats.avg_price, 0) * 100) < -5 THEN 'decreasing'
                ELSE 'stable'
            END,
            CASE WHEN v_stats.avg_price > 0
                THEN LEAST(1.0, (v_stats.std_dev / v_stats.avg_price))::DECIMAL(3,2)
                ELSE 0 END,
            LEAST(1.0, (v_stats.sample_count::DECIMAL / 50))::DECIMAL(3,2),
            NOW()
        )
        ON CONFLICT (taxonomy_code, index_date, period, COALESCE(industry, ''), COALESCE(region, ''), COALESCE(company_size, ''))
        DO UPDATE SET
            sample_count = EXCLUDED.sample_count,
            avg_unit_price = EXCLUDED.avg_unit_price,
            median_unit_price = EXCLUDED.median_unit_price,
            std_dev = EXCLUDED.std_dev,
            p10_price = EXCLUDED.p10_price,
            p25_price = EXCLUDED.p25_price,
            p75_price = EXCLUDED.p75_price,
            p90_price = EXCLUDED.p90_price,
            p95_price = EXCLUDED.p95_price,
            min_price = EXCLUDED.min_price,
            max_price = EXCLUDED.max_price,
            price_change_pct = EXCLUDED.price_change_pct,
            trend_direction = EXCLUDED.trend_direction,
            volatility_score = EXCLUDED.volatility_score,
            confidence_score = EXCLUDED.confidence_score,
            last_calculated = NOW();

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect outliers in price history
CREATE OR REPLACE FUNCTION detect_price_outliers()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_taxonomy RECORD;
    v_stats RECORD;
BEGIN
    FOR v_taxonomy IN
        SELECT DISTINCT taxonomy_code
        FROM market_price_history
        WHERE is_outlier = false
    LOOP
        -- Calculate statistics
        SELECT
            AVG(unit_price) as avg_price,
            STDDEV(unit_price) as std_dev
        INTO v_stats
        FROM market_price_history
        WHERE taxonomy_code = v_taxonomy.taxonomy_code
        AND is_outlier = false;

        -- Mark outliers (> 3 standard deviations from mean)
        IF v_stats.std_dev IS NOT NULL AND v_stats.std_dev > 0 THEN
            UPDATE market_price_history
            SET is_outlier = true,
                outlier_reason = 'statistical_outlier_3sd'
            WHERE taxonomy_code = v_taxonomy.taxonomy_code
            AND is_outlier = false
            AND ABS(unit_price - v_stats.avg_price) > (3 * v_stats.std_dev);

            GET DIAGNOSTICS v_count = v_count + ROW_COUNT;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE market_price_history IS 'Anonymized cross-enterprise price history for market benchmarking. NO enterprise_id stored - only hashed for deduplication.';
COMMENT ON COLUMN market_price_history.source_hash IS 'SHA-256 hash of enterprise_id + salt - prevents duplicate contributions without revealing source';
COMMENT ON COLUMN market_price_history.company_size IS 'Anonymized size bucket: micro (<10), small (10-49), medium (50-249), large (250-999), enterprise (1000+)';

COMMENT ON TABLE market_price_indices IS 'Aggregated market benchmarks calculated from anonymized price history. Updated periodically.';
COMMENT ON COLUMN market_price_indices.confidence_score IS 'Higher with more samples (capped at 50 samples = 1.0)';
COMMENT ON COLUMN market_price_indices.trend_direction IS 'Based on period-over-period change: >5% = increasing, <-5% = decreasing, else stable';
