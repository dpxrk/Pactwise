-- Migration 101: Product/Service Taxonomy System
-- Purpose: Create standardized UNSPSC-like taxonomy for goods/services classification
-- This enables market price comparison across enterprises by standardizing item categorization

-- ============================================================================
-- TAXONOMY TABLES
-- ============================================================================

-- Global standardized taxonomy (UNSPSC-inspired hierarchical structure)
-- Levels: Segment (2) → Family (4) → Class (6) → Commodity (8) → Business Function (10)
CREATE TABLE IF NOT EXISTS product_service_taxonomy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Hierarchical code structure (UNSPSC format: XX.XX.XX.XX.XX)
    code VARCHAR(20) NOT NULL UNIQUE,
    segment_code VARCHAR(2) NOT NULL,     -- Level 1: "43" (IT)
    family_code VARCHAR(5) NOT NULL,      -- Level 2: "43.21" (Software)
    class_code VARCHAR(8) NOT NULL,       -- Level 3: "43.21.15" (Business Software)
    commodity_code VARCHAR(11) NOT NULL,  -- Level 4: "43.21.15.01" (ERP)
    -- Descriptive fields
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_code VARCHAR(20) REFERENCES product_service_taxonomy(code) ON DELETE SET NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    -- AI matching support
    synonyms TEXT[] DEFAULT '{}',         -- Alternative names for AI matching
    keywords TEXT[] DEFAULT '{}',         -- Keywords for search
    industry_relevance TEXT[] DEFAULT '{}', -- Industries where this applies
    -- Pricing metadata
    typical_unit VARCHAR(50),             -- "each", "hour", "month", "license"
    typical_price_range JSONB DEFAULT '{}', -- {"min": 0, "max": 1000, "currency": "USD"}
    -- AI/ML support
    embedding vector(1536),               -- For semantic similarity matching
    ai_confidence DECIMAL(3,2) DEFAULT 0.00 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    source VARCHAR(50) DEFAULT 'pactwise', -- 'unspsc', 'naics', 'pactwise', 'custom'
    version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for taxonomy
CREATE INDEX IF NOT EXISTS idx_taxonomy_code ON product_service_taxonomy(code);
CREATE INDEX IF NOT EXISTS idx_taxonomy_segment ON product_service_taxonomy(segment_code);
CREATE INDEX IF NOT EXISTS idx_taxonomy_family ON product_service_taxonomy(family_code);
CREATE INDEX IF NOT EXISTS idx_taxonomy_class ON product_service_taxonomy(class_code);
CREATE INDEX IF NOT EXISTS idx_taxonomy_commodity ON product_service_taxonomy(commodity_code);
CREATE INDEX IF NOT EXISTS idx_taxonomy_level ON product_service_taxonomy(level);
CREATE INDEX IF NOT EXISTS idx_taxonomy_parent ON product_service_taxonomy(parent_code);
CREATE INDEX IF NOT EXISTS idx_taxonomy_active ON product_service_taxonomy(is_active) WHERE is_active = true;

-- Full-text search on taxonomy
CREATE INDEX IF NOT EXISTS idx_taxonomy_name_trgm ON product_service_taxonomy USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_taxonomy_fts ON product_service_taxonomy
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || array_to_string(COALESCE(synonyms, '{}'), ' ')));

-- Vector similarity index for AI matching (using IVFFlat for large datasets)
CREATE INDEX IF NOT EXISTS idx_taxonomy_embedding ON product_service_taxonomy
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enterprise-specific taxonomy aliases
-- Allows enterprises to map their internal naming to standard taxonomy
CREATE TABLE IF NOT EXISTS taxonomy_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    taxonomy_code VARCHAR(20) NOT NULL REFERENCES product_service_taxonomy(code) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    alias_description TEXT,
    confidence DECIMAL(3,2) DEFAULT 1.00 CHECK (confidence >= 0 AND confidence <= 1),
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'ai_suggested', 'imported'
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(enterprise_id, taxonomy_code, alias_name)
);

CREATE INDEX IF NOT EXISTS idx_alias_enterprise ON taxonomy_aliases(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_alias_taxonomy ON taxonomy_aliases(taxonomy_code);
CREATE INDEX IF NOT EXISTS idx_alias_name_trgm ON taxonomy_aliases USING gin(alias_name gin_trgm_ops);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Taxonomy is global (read-only for all authenticated users)
ALTER TABLE product_service_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taxonomy read access for authenticated users"
    ON product_service_taxonomy
    FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can modify taxonomy (seeded by admin/migration)
CREATE POLICY "Taxonomy write access for service role"
    ON product_service_taxonomy
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Aliases are enterprise-isolated
ALTER TABLE taxonomy_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enterprise isolation for taxonomy aliases"
    ON taxonomy_aliases
    FOR ALL
    TO authenticated
    USING (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID)
    WITH CHECK (enterprise_id = (auth.jwt() ->> 'enterprise_id')::UUID);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get full taxonomy path
CREATE OR REPLACE FUNCTION get_taxonomy_path(p_code VARCHAR(20))
RETURNS TABLE (
    level INTEGER,
    code VARCHAR(20),
    name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE taxonomy_path AS (
        SELECT t.level, t.code, t.name, t.parent_code
        FROM product_service_taxonomy t
        WHERE t.code = p_code

        UNION ALL

        SELECT t.level, t.code, t.name, t.parent_code
        FROM product_service_taxonomy t
        INNER JOIN taxonomy_path tp ON t.code = tp.parent_code
    )
    SELECT tp.level, tp.code, tp.name
    FROM taxonomy_path tp
    ORDER BY tp.level;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search taxonomy by text (combines FTS and trigram)
CREATE OR REPLACE FUNCTION search_taxonomy(
    p_query TEXT,
    p_level INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    code VARCHAR(20),
    name VARCHAR(255),
    description TEXT,
    level INTEGER,
    parent_code VARCHAR(20),
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.code,
        t.name,
        t.description,
        t.level,
        t.parent_code,
        (
            ts_rank(to_tsvector('english', t.name || ' ' || COALESCE(t.description, '')), plainto_tsquery('english', p_query)) +
            COALESCE(similarity(t.name, p_query), 0) +
            CASE WHEN t.name ILIKE '%' || p_query || '%' THEN 0.5 ELSE 0 END +
            CASE WHEN p_query = ANY(t.synonyms) THEN 1.0 ELSE 0 END
        )::REAL as relevance
    FROM product_service_taxonomy t
    WHERE t.is_active = true
    AND (p_level IS NULL OR t.level = p_level)
    AND (
        to_tsvector('english', t.name || ' ' || COALESCE(t.description, '')) @@ plainto_tsquery('english', p_query)
        OR t.name ILIKE '%' || p_query || '%'
        OR p_query = ANY(t.synonyms)
        OR similarity(t.name, p_query) > 0.3
    )
    ORDER BY relevance DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find taxonomy by vector similarity
CREATE OR REPLACE FUNCTION find_similar_taxonomy(
    p_embedding vector(1536),
    p_threshold DECIMAL DEFAULT 0.5,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    code VARCHAR(20),
    name VARCHAR(255),
    level INTEGER,
    similarity DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.code,
        t.name,
        t.level,
        (1 - (t.embedding <=> p_embedding))::DECIMAL as similarity
    FROM product_service_taxonomy t
    WHERE t.is_active = true
    AND t.embedding IS NOT NULL
    AND (1 - (t.embedding <=> p_embedding)) >= p_threshold
    ORDER BY t.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update alias usage statistics
CREATE OR REPLACE FUNCTION update_alias_usage(
    p_alias_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE taxonomy_aliases
    SET usage_count = usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_alias_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_taxonomy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_taxonomy_updated_at
    BEFORE UPDATE ON product_service_taxonomy
    FOR EACH ROW
    EXECUTE FUNCTION update_taxonomy_timestamp();

CREATE TRIGGER trg_alias_updated_at
    BEFORE UPDATE ON taxonomy_aliases
    FOR EACH ROW
    EXECUTE FUNCTION update_taxonomy_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE product_service_taxonomy IS 'Global standardized taxonomy for goods/services classification (UNSPSC-inspired). Used for market price comparison across enterprises.';
COMMENT ON COLUMN product_service_taxonomy.code IS 'Hierarchical code in format XX.XX.XX.XX.XX (Segment.Family.Class.Commodity.Function)';
COMMENT ON COLUMN product_service_taxonomy.embedding IS 'Vector embedding for semantic similarity matching (1536 dimensions for OpenAI compatibility)';
COMMENT ON COLUMN product_service_taxonomy.synonyms IS 'Alternative names for AI matching (e.g., ["ERP", "enterprise resource planning", "business management system"])';

COMMENT ON TABLE taxonomy_aliases IS 'Enterprise-specific aliases mapping internal naming conventions to standard taxonomy codes';
COMMENT ON COLUMN taxonomy_aliases.confidence IS 'Confidence score (0-1) for AI-suggested aliases';
