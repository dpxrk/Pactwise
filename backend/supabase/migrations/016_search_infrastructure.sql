-- Search Infrastructure

-- Full-text search configuration
CREATE TEXT SEARCH CONFIGURATION pactwise_search (COPY = english);

-- Search indexes table for maintaining searchable content
CREATE TABLE search_indexes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- contract, vendor, user, document
    entity_id UUID NOT NULL,
    title TEXT,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    search_vector tsvector,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);

-- Search queries log for analytics and optimization
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_text TEXT NOT NULL,
    query_type VARCHAR(50), -- simple, advanced, filter
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    user_id UUID REFERENCES users(id),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved searches
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query_text TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    user_id UUID NOT NULL REFERENCES users(id),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search suggestions based on popular queries
CREATE TABLE search_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_text TEXT NOT NULL,
    suggestion_type VARCHAR(50), -- query, filter, correction
    usage_count INTEGER DEFAULT 0,
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(suggestion_text, enterprise_id)
);

-- Create search indexes
CREATE INDEX idx_search_indexes_vector ON search_indexes USING gin(search_vector);
CREATE INDEX idx_search_indexes_entity ON search_indexes(entity_type, entity_id);
CREATE INDEX idx_search_indexes_enterprise ON search_indexes(enterprise_id);
CREATE INDEX idx_search_indexes_tags ON search_indexes USING gin(tags);

CREATE INDEX idx_search_queries_user ON search_queries(user_id, created_at DESC);
CREATE INDEX idx_search_queries_popular ON search_queries(query_text, enterprise_id);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_public ON saved_searches(enterprise_id) WHERE is_public = true;

-- Full-text search functions

-- Update search index for an entity
CREATE OR REPLACE FUNCTION update_search_index(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_enterprise_id UUID
) RETURNS void AS $$
DECLARE
    v_title TEXT;
    v_content TEXT;
    v_metadata JSONB;
    v_tags TEXT[];
BEGIN
    -- Build search content based on entity type
    CASE p_entity_type
        WHEN 'contract' THEN
            SELECT 
                c.title,
                COALESCE(c.title, '') || ' ' ||
                COALESCE(c.notes, '') || ' ' ||
                COALESCE(v.name, '') || ' ' ||
                COALESCE(c.contract_type, '') || ' ' ||
                COALESCE(c.extracted_scope, '') || ' ' ||
                COALESCE(array_to_string(c.extracted_parties, ' '), ''),
                jsonb_build_object(
                    'status', c.status,
                    'vendor_name', v.name,
                    'value', c.value,
                    'start_date', c.start_date,
                    'end_date', c.end_date
                ),
                c.tags
            INTO v_title, v_content, v_metadata, v_tags
            FROM contracts c
            LEFT JOIN vendors v ON v.id = c.vendor_id
            WHERE c.id = p_entity_id;
            
        WHEN 'vendor' THEN
            SELECT 
                v.name,
                COALESCE(v.name, '') || ' ' ||
                COALESCE(v.contact_name, '') || ' ' ||
                COALESCE(v.address, '') || ' ' ||
                COALESCE(v.category::TEXT, ''),
                jsonb_build_object(
                    'category', v.category,
                    'status', v.status,
                    'performance_score', v.performance_score
                ),
                ARRAY[]::TEXT[]
            INTO v_title, v_content, v_metadata, v_tags
            FROM vendors v
            WHERE v.id = p_entity_id;
            
        WHEN 'document' THEN
            SELECT 
                cd.title,
                cd.content,
                jsonb_build_object(
                    'document_type', cd.document_type,
                    'version', cd.version
                ),
                ARRAY[]::TEXT[]
            INTO v_title, v_content, v_metadata, v_tags
            FROM collaborative_documents cd
            WHERE cd.id = p_entity_id;
    END CASE;
    
    -- Update or insert search index
    INSERT INTO search_indexes (
        entity_type,
        entity_id,
        title,
        content,
        metadata,
        tags,
        search_vector,
        enterprise_id
    ) VALUES (
        p_entity_type,
        p_entity_id,
        v_title,
        v_content,
        v_metadata,
        v_tags,
        to_tsvector('pactwise_search', COALESCE(v_title, '') || ' ' || COALESCE(v_content, '')),
        p_enterprise_id
    )
    ON CONFLICT (entity_type, entity_id) 
    DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        tags = EXCLUDED.tags,
        search_vector = EXCLUDED.search_vector,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Global search function
CREATE OR REPLACE FUNCTION search_entities(
    p_query TEXT,
    p_enterprise_id UUID,
    p_entity_types TEXT[] DEFAULT NULL,
    p_filters JSONB DEFAULT '{}',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    entity_type VARCHAR,
    entity_id UUID,
    title TEXT,
    snippet TEXT,
    metadata JSONB,
    tags TEXT[],
    rank REAL,
    highlights TEXT
) AS $$
DECLARE
    v_tsquery tsquery;
    v_start_time TIMESTAMP;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Parse search query
    v_tsquery := plainto_tsquery('pactwise_search', p_query);
    
    -- Log search query
    INSERT INTO search_queries (
        query_text,
        query_type,
        filters,
        user_id,
        enterprise_id
    ) VALUES (
        p_query,
        'simple',
        p_filters,
        auth.user_id(),
        p_enterprise_id
    );
    
    RETURN QUERY
    WITH search_results AS (
        SELECT 
            si.entity_type,
            si.entity_id,
            si.title,
            si.content,
            si.metadata,
            si.tags,
            ts_rank_cd(si.search_vector, v_tsquery) as rank,
            ts_headline(
                'pactwise_search',
                si.content,
                v_tsquery,
                'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20'
            ) as highlights
        FROM search_indexes si
        WHERE si.enterprise_id = p_enterprise_id
        AND si.search_vector @@ v_tsquery
        AND (p_entity_types IS NULL OR si.entity_type = ANY(p_entity_types))
    ),
    filtered_results AS (
        SELECT * FROM search_results sr
        WHERE 
            -- Apply JSON filters
            (p_filters->>'status' IS NULL OR sr.metadata->>'status' = p_filters->>'status')
            AND (p_filters->>'category' IS NULL OR sr.metadata->>'category' = p_filters->>'category')
            AND (p_filters->>'min_value' IS NULL OR (sr.metadata->>'value')::DECIMAL >= (p_filters->>'min_value')::DECIMAL)
            AND (p_filters->>'max_value' IS NULL OR (sr.metadata->>'value')::DECIMAL <= (p_filters->>'max_value')::DECIMAL)
    )
    SELECT 
        fr.entity_type,
        fr.entity_id,
        fr.title,
        SUBSTRING(fr.content, 1, 200) as snippet,
        fr.metadata,
        fr.tags,
        fr.rank,
        fr.highlights
    FROM filtered_results fr
    ORDER BY fr.rank DESC
    LIMIT p_limit
    OFFSET p_offset;
    
    -- Update search execution time
    UPDATE search_queries
    SET 
        execution_time_ms = EXTRACT(MILLISECOND FROM clock_timestamp() - v_start_time),
        results_count = (SELECT COUNT(*) FROM search_results)
    WHERE id = (SELECT id FROM search_queries WHERE user_id = auth.user_id() ORDER BY created_at DESC LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- Advanced search with multiple fields
CREATE OR REPLACE FUNCTION advanced_search(
    p_search_config JSONB,
    p_enterprise_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    entity_type VARCHAR,
    entity_id UUID,
    title TEXT,
    snippet TEXT,
    metadata JSONB,
    score REAL
) AS $$
DECLARE
    v_query TEXT;
    v_conditions TEXT[] := '{}';
    v_weights JSONB;
BEGIN
    -- Build weighted search query
    v_weights := COALESCE(p_search_config->'weights', '{"title": 1.0, "content": 0.5, "tags": 0.8}'::JSONB);
    
    -- Build conditions
    IF p_search_config->>'title' IS NOT NULL THEN
        v_conditions := array_append(v_conditions, 
            format('(si.title ILIKE %L)', '%' || (p_search_config->>'title') || '%')
        );
    END IF;
    
    IF p_search_config->>'content' IS NOT NULL THEN
        v_conditions := array_append(v_conditions,
            format('(si.search_vector @@ plainto_tsquery(%L, %L))',
                'pactwise_search', p_search_config->>'content')
        );
    END IF;
    
    IF p_search_config->'tags' IS NOT NULL THEN
        v_conditions := array_append(v_conditions,
            format('(si.tags && %L)', 
                ARRAY(SELECT jsonb_array_elements_text(p_search_config->'tags')))
        );
    END IF;
    
    -- Execute search
    v_query := format('
        SELECT 
            si.entity_type,
            si.entity_id,
            si.title,
            SUBSTRING(si.content, 1, 200) as snippet,
            si.metadata,
            (
                COALESCE(similarity(si.title, %L) * (%s->%L)::FLOAT, 0) +
                COALESCE(ts_rank_cd(si.search_vector, plainto_tsquery(%L, %L)) * (%s->%L)::FLOAT, 0)
            ) as score
        FROM search_indexes si
        WHERE si.enterprise_id = %L
        AND (%s)
        ORDER BY score DESC
        LIMIT %s OFFSET %s',
        COALESCE(p_search_config->>'title', ''),
        'v_weights', 'title',
        'pactwise_search', COALESCE(p_search_config->>'content', ''),
        'v_weights', 'content',
        p_enterprise_id,
        array_to_string(v_conditions, ' AND '),
        p_limit, p_offset
    );
    
    RETURN QUERY EXECUTE v_query USING v_weights;
END;
$$ LANGUAGE plpgsql;

-- Search suggestions generator
CREATE OR REPLACE FUNCTION generate_search_suggestions(
    p_partial_query TEXT,
    p_enterprise_id UUID,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    suggestion TEXT,
    type VARCHAR,
    score REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH query_suggestions AS (
        -- Suggest from recent searches
        SELECT DISTINCT
            sq.query_text as suggestion,
            'recent'::VARCHAR as type,
            COUNT(*) * 0.8 as score
        FROM search_queries sq
        WHERE sq.enterprise_id = p_enterprise_id
        AND sq.query_text ILIKE p_partial_query || '%'
        AND sq.created_at > NOW() - INTERVAL '30 days'
        GROUP BY sq.query_text
    ),
    entity_suggestions AS (
        -- Suggest from entity titles
        SELECT DISTINCT
            si.title as suggestion,
            'entity'::VARCHAR as type,
            similarity(si.title, p_partial_query) as score
        FROM search_indexes si
        WHERE si.enterprise_id = p_enterprise_id
        AND si.title ILIKE p_partial_query || '%'
    ),
    tag_suggestions AS (
        -- Suggest from tags
        SELECT DISTINCT
            unnest(si.tags) as suggestion,
            'tag'::VARCHAR as type,
            0.7 as score
        FROM search_indexes si
        WHERE si.enterprise_id = p_enterprise_id
        AND EXISTS (
            SELECT 1 FROM unnest(si.tags) t 
            WHERE t ILIKE p_partial_query || '%'
        )
    )
    SELECT * FROM (
        SELECT * FROM query_suggestions
        UNION ALL
        SELECT * FROM entity_suggestions
        UNION ALL
        SELECT * FROM tag_suggestions
    ) combined
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Triggers to maintain search indexes

CREATE OR REPLACE FUNCTION trigger_update_contract_search()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM search_indexes 
        WHERE entity_type = 'contract' AND entity_id = OLD.id;
    ELSE
        PERFORM update_search_index('contract', NEW.id, NEW.enterprise_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contract_search_index
AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW EXECUTE FUNCTION trigger_update_contract_search();

CREATE OR REPLACE FUNCTION trigger_update_vendor_search()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM search_indexes 
        WHERE entity_type = 'vendor' AND entity_id = OLD.id;
    ELSE
        PERFORM update_search_index('vendor', NEW.id, NEW.enterprise_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_search_index
AFTER INSERT OR UPDATE OR DELETE ON vendors
FOR EACH ROW EXECUTE FUNCTION trigger_update_vendor_search();

-- RLS Policies
ALTER TABLE search_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can search their enterprise data" ON search_indexes
    FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can view their search history" ON search_queries
    FOR SELECT USING (user_id = auth.user_id() OR enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can manage their saved searches" ON saved_searches
    FOR ALL USING (user_id = auth.user_id() OR (is_public = true AND enterprise_id = auth.user_enterprise_id()));

CREATE POLICY "Users can view suggestions" ON search_suggestions
    FOR SELECT USING (enterprise_id IS NULL OR enterprise_id = auth.user_enterprise_id());