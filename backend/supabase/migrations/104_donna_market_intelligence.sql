-- Migration 104: Donna Market Intelligence System
-- Purpose: Create tables for price anomaly detection, market trends, and human review queue
-- This extends Donna AI with market intelligence capabilities

-- ============================================================================
-- PRICE ANOMALIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS donna_price_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

    -- Source references
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    line_item_id UUID REFERENCES contract_line_items(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    taxonomy_code VARCHAR(20) REFERENCES product_service_taxonomy(code) ON DELETE SET NULL,

    -- Anomaly classification
    anomaly_type VARCHAR(50) NOT NULL,
        -- 'price_spike', 'price_drop', 'above_market', 'below_market', 'unusual_pattern', 'outlier'
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- Price comparison data
    detected_price DECIMAL(15,4) NOT NULL,
    expected_price DECIMAL(15,4),
    market_avg_price DECIMAL(15,4),
    market_median_price DECIMAL(15,4),
    deviation_pct DECIMAL(6,2),           -- Percentage deviation from expected
    percentile_rank DECIMAL(5,2),         -- Where this falls in market distribution (0-100)

    -- Analysis details
    description TEXT NOT NULL,
    recommendation TEXT,
    potential_savings DECIMAL(15,2),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),

    -- Context
    comparison_basis VARCHAR(50),         -- 'market_median', 'market_avg', 'historical', 'enterprise_avg'
    comparison_sample_size INTEGER,
    comparison_period VARCHAR(50),        -- 'last_30_days', 'last_90_days', 'last_year'

    -- Status tracking
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'investigating', 'resolved', 'dismissed')),
    resolution_notes TEXT,
    resolution_action VARCHAR(50),        -- 'renegotiated', 'accepted', 'vendor_changed', 'no_action'
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MARKET TRENDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS donna_market_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Trend scope
    taxonomy_code VARCHAR(20) REFERENCES product_service_taxonomy(code) ON DELETE SET NULL,
    industry VARCHAR(100),
    region VARCHAR(100),

    -- Time period
    trend_period VARCHAR(20) NOT NULL CHECK (trend_period IN ('weekly', 'monthly', 'quarterly', 'annual')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Trend classification
    trend_type VARCHAR(50) NOT NULL,
        -- 'price_increase', 'price_decrease', 'demand_surge', 'supply_shortage', 'market_consolidation', 'new_entrants'
    trend_strength VARCHAR(20) NOT NULL CHECK (trend_strength IN ('weak', 'moderate', 'strong', 'very_strong')),
    change_pct DECIMAL(6,2),

    -- Trend details
    description TEXT NOT NULL,
    drivers TEXT[] DEFAULT '{}',          -- Factors driving the trend
    affected_segments TEXT[] DEFAULT '{}', -- Affected market segments
    prediction_next_period JSONB DEFAULT '{}',
        -- { "direction": "increasing", "confidence": 0.7, "expected_change_pct": 5 }

    -- Supporting data
    sample_size INTEGER,
    data_quality DECIMAL(3,2) CHECK (data_quality >= 0 AND data_quality <= 1),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),

    -- Pattern matching
    similar_historical_trends JSONB DEFAULT '[]',
        -- [{ "period": "2023-Q2", "similarity": 0.85, "outcome": "prices stabilized after 2 months" }]

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,               -- When this trend analysis is stale
    is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- MARKET PATTERNS TABLE (Extends Donna Patterns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS donna_market_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Pattern identification
    pattern_type VARCHAR(50) NOT NULL,
        -- 'pricing', 'negotiation', 'vendor_behavior', 'seasonal', 'economic', 'regulatory'
    pattern_signature VARCHAR(255) NOT NULL UNIQUE,

    -- Scope
    taxonomy_codes TEXT[] DEFAULT '{}',
    industries TEXT[] DEFAULT '{}',
    regions TEXT[] DEFAULT '{}',

    -- Pattern data
    pattern_data JSONB NOT NULL,
        -- Flexible structure based on pattern_type
    description TEXT,

    -- Statistics
    observation_count INTEGER DEFAULT 1,
    confidence DECIMAL(3,2) DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),
    first_observed TIMESTAMPTZ DEFAULT NOW(),
    last_observed TIMESTAMPTZ DEFAULT NOW(),

    -- Recommendations
    recommendations JSONB DEFAULT '{}',
        -- { "action": "negotiate_early", "expected_savings": 0.15, "conditions": ["Q4", "annual_renewal"] }
    predicted_outcomes JSONB DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TAXONOMY REVIEW QUEUE (Human-in-the-loop for low-confidence matches)
-- ============================================================================

CREATE TABLE IF NOT EXISTS taxonomy_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

    -- Source references
    line_item_id UUID REFERENCES contract_line_items(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,

    -- Original item data
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    raw_text TEXT,
    unit_price DECIMAL(15,4),
    unit VARCHAR(50),
    vendor_name VARCHAR(255),

    -- AI suggestions (top 3)
    suggested_taxonomy_codes JSONB NOT NULL DEFAULT '[]',
        -- [{ "code": "43.21.15.01", "name": "ERP Software", "confidence": 0.45, "reason": "embedding_match" }]
    best_confidence DECIMAL(3,2),

    -- Review status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'new_code_requested', 'auto_resolved')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    selected_taxonomy_code VARCHAR(20) REFERENCES product_service_taxonomy(code) ON DELETE SET NULL,
    reviewer_notes TEXT,

    -- For new code requests
    requested_new_code_name VARCHAR(255),
    requested_new_code_description TEXT,
    new_code_request_status VARCHAR(20)
        CHECK (new_code_request_status IN ('pending', 'approved', 'rejected')),

    -- Queue management
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
        -- 1 = highest (high-value contracts), 10 = lowest
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PRICE INTELLIGENCE CACHE
-- ============================================================================

CREATE TABLE IF NOT EXISTS donna_price_intelligence_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cache key components
    taxonomy_code VARCHAR(20) NOT NULL REFERENCES product_service_taxonomy(code) ON DELETE CASCADE,
    industry VARCHAR(100),
    region VARCHAR(100),
    cache_key VARCHAR(255) NOT NULL UNIQUE,

    -- Cached intelligence data
    intelligence_data JSONB NOT NULL,
        -- {
        --   "current_market_price": { "avg": 100, "median": 95, "p25": 80, "p75": 120 },
        --   "trend": { "direction": "increasing", "change_pct": 5.2 },
        --   "anomaly_threshold": { "low": 5, "medium": 15, "high": 30 },
        --   "recommendations": [...]
        -- }

    -- Cache management
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Price anomalies indexes
CREATE INDEX IF NOT EXISTS idx_anomalies_enterprise ON donna_price_anomalies(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON donna_price_anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON donna_price_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_taxonomy ON donna_price_anomalies(taxonomy_code) WHERE taxonomy_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anomalies_date ON donna_price_anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_contract ON donna_price_anomalies(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anomalies_vendor ON donna_price_anomalies(vendor_id) WHERE vendor_id IS NOT NULL;

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_anomalies_dashboard ON donna_price_anomalies(enterprise_id, status, severity, detected_at DESC);

-- Market trends indexes
CREATE INDEX IF NOT EXISTS idx_trends_taxonomy ON donna_market_trends(taxonomy_code) WHERE taxonomy_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trends_industry ON donna_market_trends(industry) WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trends_period ON donna_market_trends(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trends_type ON donna_market_trends(trend_type);
CREATE INDEX IF NOT EXISTS idx_trends_active ON donna_market_trends(is_active, end_date) WHERE is_active = true;

-- Market patterns indexes
CREATE INDEX IF NOT EXISTS idx_patterns_type ON donna_market_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_taxonomy ON donna_market_patterns USING gin(taxonomy_codes);
CREATE INDEX IF NOT EXISTS idx_patterns_industries ON donna_market_patterns USING gin(industries);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON donna_market_patterns(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_active ON donna_market_patterns(is_active) WHERE is_active = true;

-- Review queue indexes
CREATE INDEX IF NOT EXISTS idx_review_queue_enterprise ON taxonomy_review_queue(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON taxonomy_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_review_queue_priority ON taxonomy_review_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_review_queue_assigned ON taxonomy_review_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_queue_pending ON taxonomy_review_queue(enterprise_id, status, priority)
    WHERE status = 'pending';

-- Cache indexes
CREATE INDEX IF NOT EXISTS idx_price_cache_key ON donna_price_intelligence_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_price_cache_expires ON donna_price_intelligence_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_price_cache_taxonomy ON donna_price_intelligence_cache(taxonomy_code);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Price anomalies are enterprise-isolated
ALTER TABLE donna_price_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enterprise isolation for price anomalies"
    ON donna_price_anomalies
    FOR ALL
    TO authenticated
    USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID)
    WITH CHECK (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID);

-- Market trends are global (read-only for authenticated)
ALTER TABLE donna_market_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market trends read access"
    ON donna_market_trends
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Market trends write access"
    ON donna_market_trends
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Market patterns are global (read-only for authenticated)
ALTER TABLE donna_market_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market patterns read access"
    ON donna_market_patterns
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Market patterns write access"
    ON donna_market_patterns
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Review queue is enterprise-isolated
ALTER TABLE taxonomy_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enterprise isolation for review queue"
    ON taxonomy_review_queue
    FOR ALL
    TO authenticated
    USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID)
    WITH CHECK (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID);

-- Cache is global (read-only)
ALTER TABLE donna_price_intelligence_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price cache read access"
    ON donna_price_intelligence_cache
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Price cache write access"
    ON donna_price_intelligence_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get anomaly summary for enterprise
CREATE OR REPLACE FUNCTION get_price_anomaly_summary(p_enterprise_id UUID)
RETURNS TABLE (
    total_anomalies INTEGER,
    open_anomalies INTEGER,
    critical_count INTEGER,
    high_count INTEGER,
    medium_count INTEGER,
    low_count INTEGER,
    total_potential_savings DECIMAL(15,2),
    avg_deviation_pct DECIMAL(6,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_anomalies,
        COUNT(*) FILTER (WHERE status = 'open')::INTEGER as open_anomalies,
        COUNT(*) FILTER (WHERE severity = 'critical')::INTEGER as critical_count,
        COUNT(*) FILTER (WHERE severity = 'high')::INTEGER as high_count,
        COUNT(*) FILTER (WHERE severity = 'medium')::INTEGER as medium_count,
        COUNT(*) FILTER (WHERE severity = 'low')::INTEGER as low_count,
        COALESCE(SUM(potential_savings) FILTER (WHERE status = 'open'), 0)::DECIMAL(15,2) as total_potential_savings,
        AVG(ABS(deviation_pct))::DECIMAL(6,2) as avg_deviation_pct
    FROM donna_price_anomalies
    WHERE enterprise_id = p_enterprise_id
    AND detected_at >= NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get review queue summary
CREATE OR REPLACE FUNCTION get_review_queue_summary(p_enterprise_id UUID)
RETURNS TABLE (
    total_pending INTEGER,
    high_priority INTEGER,
    medium_priority INTEGER,
    low_priority INTEGER,
    avg_confidence DECIMAL(3,2),
    oldest_pending_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_pending,
        COUNT(*) FILTER (WHERE priority <= 3)::INTEGER as high_priority,
        COUNT(*) FILTER (WHERE priority BETWEEN 4 AND 6)::INTEGER as medium_priority,
        COUNT(*) FILTER (WHERE priority >= 7)::INTEGER as low_priority,
        AVG(best_confidence)::DECIMAL(3,2) as avg_confidence,
        EXTRACT(DAY FROM NOW() - MIN(created_at))::INTEGER as oldest_pending_days
    FROM taxonomy_review_queue
    WHERE enterprise_id = p_enterprise_id
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to queue item for review
CREATE OR REPLACE FUNCTION queue_for_taxonomy_review(
    p_line_item_id UUID,
    p_suggestions JSONB,
    p_best_confidence DECIMAL(3,2)
)
RETURNS UUID AS $$
DECLARE
    v_line_item RECORD;
    v_contract RECORD;
    v_vendor_name VARCHAR(255);
    v_priority INTEGER;
    v_queue_id UUID;
BEGIN
    -- Get line item details
    SELECT * INTO v_line_item
    FROM contract_line_items
    WHERE id = p_line_item_id;

    IF v_line_item IS NULL THEN
        RAISE EXCEPTION 'Line item not found: %', p_line_item_id;
    END IF;

    -- Get contract and vendor details
    SELECT c.*, v.name as vendor_name
    INTO v_contract
    FROM contracts c
    LEFT JOIN vendors v ON v.id = c.vendor_id
    WHERE c.id = v_line_item.contract_id;

    v_vendor_name := v_contract.vendor_name;

    -- Calculate priority based on contract value
    IF v_contract.value >= 100000 THEN
        v_priority := 1;
    ELSIF v_contract.value >= 50000 THEN
        v_priority := 3;
    ELSIF v_contract.value >= 10000 THEN
        v_priority := 5;
    ELSE
        v_priority := 7;
    END IF;

    -- Insert into review queue
    INSERT INTO taxonomy_review_queue (
        enterprise_id, line_item_id, contract_id,
        item_name, item_description, raw_text,
        unit_price, unit, vendor_name,
        suggested_taxonomy_codes, best_confidence, priority
    ) VALUES (
        v_line_item.enterprise_id, p_line_item_id, v_line_item.contract_id,
        v_line_item.item_name, v_line_item.item_description, v_line_item.raw_text,
        v_line_item.unit_price, v_line_item.unit, v_vendor_name,
        p_suggestions, p_best_confidence, v_priority
    )
    RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve taxonomy review
CREATE OR REPLACE FUNCTION approve_taxonomy_review(
    p_review_id UUID,
    p_selected_code VARCHAR(20),
    p_reviewer_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_review RECORD;
BEGIN
    -- Get review
    SELECT * INTO v_review
    FROM taxonomy_review_queue
    WHERE id = p_review_id;

    IF v_review IS NULL THEN
        RETURN false;
    END IF;

    -- Update line item with approved taxonomy
    UPDATE contract_line_items
    SET taxonomy_code = p_selected_code,
        taxonomy_confidence = 1.0,
        taxonomy_match_method = 'manual',
        updated_at = NOW()
    WHERE id = v_review.line_item_id;

    -- Update review record
    UPDATE taxonomy_review_queue
    SET status = 'approved',
        selected_taxonomy_code = p_selected_code,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        reviewer_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_review_id;

    -- Update alias usage if it matches an enterprise alias
    UPDATE taxonomy_aliases
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE enterprise_id = v_review.enterprise_id
    AND taxonomy_code = p_selected_code
    AND alias_name ILIKE v_review.item_name;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_market_intelligence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_anomalies_updated_at
    BEFORE UPDATE ON donna_price_anomalies
    FOR EACH ROW
    EXECUTE FUNCTION update_market_intelligence_timestamp();

CREATE TRIGGER trg_patterns_updated_at
    BEFORE UPDATE ON donna_market_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_market_intelligence_timestamp();

CREATE TRIGGER trg_review_queue_updated_at
    BEFORE UPDATE ON taxonomy_review_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_market_intelligence_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE donna_price_anomalies IS 'Price anomalies detected by Donna AI market intelligence. Enterprise-isolated for privacy.';
COMMENT ON COLUMN donna_price_anomalies.severity IS 'Anomaly severity: critical (>50% deviation), high (>30%), medium (>15%), low (>5%)';
COMMENT ON COLUMN donna_price_anomalies.percentile_rank IS 'Where this price falls in market distribution (0=cheapest, 100=most expensive)';

COMMENT ON TABLE donna_market_trends IS 'Market trends identified from cross-enterprise price data. Global visibility.';
COMMENT ON COLUMN donna_market_trends.drivers IS 'Array of factors driving the trend (e.g., supply chain issues, new regulations)';

COMMENT ON TABLE donna_market_patterns IS 'Recurring market patterns learned by Donna (e.g., Q4 price increases, vendor negotiation patterns)';
COMMENT ON COLUMN donna_market_patterns.pattern_signature IS 'Unique signature for pattern deduplication';

COMMENT ON TABLE taxonomy_review_queue IS 'Human review queue for low-confidence taxonomy matches (<50% confidence)';
COMMENT ON COLUMN taxonomy_review_queue.priority IS 'Priority 1-10, where 1=highest (high-value contracts), 10=lowest';
COMMENT ON COLUMN taxonomy_review_queue.suggested_taxonomy_codes IS 'Top 3 AI suggestions: [{code, name, confidence, reason}]';

COMMENT ON TABLE donna_price_intelligence_cache IS 'Cached price intelligence for fast queries. Auto-expires.';
