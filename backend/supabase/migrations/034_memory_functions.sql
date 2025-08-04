-- Memory search and management functions

-- Function to search short-term memory using vector similarity
CREATE OR REPLACE FUNCTION search_short_term_memory(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    p_user_id UUID DEFAULT NULL,
    p_enterprise_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    context JSONB,
    importance_score DECIMAL,
    access_count INTEGER,
    similarity_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- SECURITY FIX: Enforce mandatory enterprise isolation
    IF p_enterprise_id IS NULL THEN
        RAISE EXCEPTION 'Enterprise ID is required for memory access';
    END IF;
    
    RETURN QUERY
    SELECT 
        stm.id,
        stm.content,
        stm.context,
        stm.importance_score,
        stm.access_count,
        1 - (stm.embedding <=> query_embedding) AS similarity_score,
        stm.created_at
    FROM short_term_memory stm
    WHERE 
        stm.enterprise_id = p_enterprise_id
        AND (p_user_id IS NULL OR stm.user_id = p_user_id)
        AND stm.expires_at > NOW()
        AND 1 - (stm.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity_score DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search long-term memory using vector similarity
CREATE OR REPLACE FUNCTION search_long_term_memory(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    p_category VARCHAR DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_enterprise_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    summary TEXT,
    category VARCHAR,
    context JSONB,
    importance_score DECIMAL,
    access_count INTEGER,
    consolidation_count INTEGER,
    similarity_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- SECURITY FIX: Enforce mandatory enterprise isolation
    IF p_enterprise_id IS NULL THEN
        RAISE EXCEPTION 'Enterprise ID is required for memory access';
    END IF;
    
    RETURN QUERY
    SELECT 
        ltm.id,
        ltm.content,
        ltm.summary,
        ltm.category,
        ltm.context,
        ltm.importance_score,
        ltm.access_count,
        ltm.consolidation_count,
        1 - (ltm.embedding <=> query_embedding) AS similarity_score,
        ltm.created_at
    FROM long_term_memory ltm
    WHERE 
        ltm.enterprise_id = p_enterprise_id
        AND (p_user_id IS NULL OR ltm.user_id = p_user_id)
        AND (p_category IS NULL OR ltm.category = p_category)
        AND 1 - (ltm.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity_score DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to apply memory decay
CREATE OR REPLACE FUNCTION apply_memory_decay(
    decay_rate FLOAT DEFAULT 0.95,
    cutoff_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_enterprise_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $
DECLARE
    v_short_term_rows INTEGER;
    v_long_term_rows INTEGER;
    v_deleted_short_term_rows INTEGER;
    v_deleted_long_term_rows INTEGER;
    v_total_affected_rows INTEGER;
BEGIN
    -- SECURITY FIX: Enforce mandatory enterprise isolation
    IF p_enterprise_id IS NULL THEN
        RAISE EXCEPTION 'Enterprise ID is required for memory operations';
    END IF;

    -- Update short-term memory importance scores
    UPDATE short_term_memory
    SET importance_score = importance_score * decay_rate
    WHERE
        enterprise_id = p_enterprise_id
        AND accessed_at < cutoff_date
        AND importance_score > 0.1;

    GET DIAGNOSTICS v_short_term_rows = ROW_COUNT;

    -- Update long-term memory importance scores
    UPDATE long_term_memory
    SET importance_score = importance_score * decay_rate
    WHERE
        enterprise_id = p_enterprise_id
        AND (last_accessed_at < cutoff_date OR last_accessed_at IS NULL)
        AND importance_score > 0.1;

    GET DIAGNOSTICS v_long_term_rows = ROW_COUNT;

    -- Remove memories with very low importance
    DELETE FROM short_term_memory
    WHERE
        enterprise_id = p_enterprise_id
        AND importance_score < 0.1
        AND access_count < 2;

    GET DIAGNOSTICS v_deleted_short_term_rows = ROW_COUNT;

    DELETE FROM long_term_memory
    WHERE
        enterprise_id = p_enterprise_id
        AND importance_score < 0.1
        AND access_count < 2
        AND consolidation_count = 0;

    GET DIAGNOSTICS v_deleted_long_term_rows = ROW_COUNT;

    v_total_affected_rows = v_short_term_rows + v_long_term_rows + v_deleted_short_term_rows + v_deleted_long_term_rows;

    RETURN v_total_affected_rows;
END;
$ LANGUAGE plpgsql;

-- Function to consolidate short-term memories into long-term
CREATE OR REPLACE FUNCTION consolidate_user_memories(
    p_user_id UUID,
    p_enterprise_id UUID,
    consolidation_threshold INTEGER DEFAULT 5,
    importance_threshold DECIMAL DEFAULT 0.7
)
RETURNS INTEGER AS $$
DECLARE
    memory_record RECORD;
    consolidated_count INTEGER := 0;
    existing_ltm_id UUID;
    summary_text TEXT;
BEGIN
    -- Find memories that meet consolidation criteria
    FOR memory_record IN 
        SELECT * FROM short_term_memory
        WHERE 
            user_id = p_user_id 
            AND enterprise_id = p_enterprise_id
            AND (access_count >= consolidation_threshold OR importance_score >= importance_threshold)
            AND expires_at > NOW()
    LOOP
        -- Check if similar memory exists in long-term
        SELECT id INTO existing_ltm_id
        FROM long_term_memory
        WHERE 
            enterprise_id = p_enterprise_id
            AND memory_type = memory_record.memory_type
            AND embedding <=> memory_record.embedding < 0.1
        LIMIT 1;
        
        IF existing_ltm_id IS NOT NULL THEN
            -- Consolidate with existing memory
            UPDATE long_term_memory
            SET 
                content = content || E'\n\n---\n\n' || memory_record.content,
                consolidation_count = consolidation_count + 1,
                consolidated_at = NOW(),
                access_count = access_count + memory_record.access_count,
                importance_score = GREATEST(importance_score, memory_record.importance_score),
                context = jsonb_build_object(
                    'consolidation_history', 
                    COALESCE(context->'consolidation_history', '[]'::jsonb) || 
                    jsonb_build_object(
                        'timestamp', NOW(),
                        'added_content', memory_record.content,
                        'source', 'short_term_memory'
                    )
                )
            WHERE id = existing_ltm_id;
        ELSE
            -- Create new long-term memory
            summary_text := LEFT(memory_record.content, 200);
            IF LENGTH(memory_record.content) > 200 THEN
                summary_text := summary_text || '...';
            END IF;
            
            INSERT INTO long_term_memory (
                memory_type,
                category,
                content,
                summary,
                context,
                importance_score,
                access_count,
                embedding,
                user_id,
                enterprise_id
            ) VALUES (
                memory_record.memory_type,
                CASE 
                    WHEN memory_record.memory_type LIKE '%contract%' THEN 'contracts'
                    WHEN memory_record.memory_type LIKE '%vendor%' THEN 'vendors'
                    WHEN memory_record.memory_type LIKE '%budget%' THEN 'finance'
                    WHEN memory_record.memory_type LIKE '%compliance%' THEN 'compliance'
                    ELSE 'general'
                END,
                memory_record.content,
                summary_text,
                memory_record.context,
                memory_record.importance_score,
                memory_record.access_count,
                memory_record.embedding,
                memory_record.user_id,
                memory_record.enterprise_id
            );
        END IF;
        
        -- Remove from short-term memory
        DELETE FROM short_term_memory WHERE id = memory_record.id;
        
        consolidated_count := consolidated_count + 1;
    END LOOP;
    
    RETURN consolidated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get memory context for an agent
CREATE OR REPLACE FUNCTION get_agent_memory_context(
    p_agent_type VARCHAR,
    p_user_id UUID,
    p_enterprise_id UUID,
    p_context_window INTEGER DEFAULT 10
)
RETURNS TABLE (
    memory_type VARCHAR,
    content TEXT,
    importance_score DECIMAL,
    recency_score DECIMAL,
    relevance_score DECIMAL,
    source VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_short_term AS (
        SELECT 
            memory_type,
            content,
            importance_score,
            1.0 - EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS recency_score,
            CASE 
                WHEN memory_type LIKE '%' || p_agent_type || '%' THEN 1.0
                ELSE 0.5
            END AS relevance_score,
            'short_term' AS source,
            created_at
        FROM short_term_memory
        WHERE 
            user_id = p_user_id
            AND enterprise_id = p_enterprise_id
            AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT p_context_window
    ),
    relevant_long_term AS (
        SELECT 
            memory_type,
            COALESCE(summary, LEFT(content, 200)) AS content,
            importance_score,
            0.5 - EXTRACT(EPOCH FROM (NOW() - COALESCE(last_accessed_at, created_at))) / (86400 * 30) AS recency_score,
            CASE 
                WHEN memory_type LIKE '%' || p_agent_type || '%' THEN 0.9
                WHEN category = p_agent_type THEN 0.8
                ELSE 0.4
            END AS relevance_score,
            'long_term' AS source,
            COALESCE(last_accessed_at, created_at) AS last_access
        FROM long_term_memory
        WHERE 
            enterprise_id = p_enterprise_id
            AND user_id = p_user_id
            AND importance_score > 0.3
        ORDER BY 
            relevance_score DESC,
            importance_score DESC,
            last_access DESC
        LIMIT p_context_window
    )
    SELECT * FROM recent_short_term
    UNION ALL
    SELECT 
        memory_type,
        content,
        importance_score,
        recency_score,
        relevance_score,
        source
    FROM relevant_long_term
    ORDER BY 
        (importance_score * 0.4 + recency_score * 0.3 + relevance_score * 0.3) DESC
    LIMIT p_context_window;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to anonymize memory for Donna AI
CREATE OR REPLACE FUNCTION anonymize_memory_for_donna(
    p_memory_content TEXT,
    p_memory_context JSONB,
    p_memory_type VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    anonymized_content TEXT;
    anonymized_context JSONB;
    patterns JSONB := '[
        {"pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b", "replacement": "[EMAIL]"},
        {"pattern": "\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b", "replacement": "[PHONE]"},
        {"pattern": "\\b\\d{3}-\\d{2}-\\d{4}\\b", "replacement": "[SSN]"},
        {"pattern": "\\$\\d+\\.?\\d*", "replacement": "[AMOUNT]"},
        {"pattern": "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b", "replacement": "[IP]"}
    ]'::JSONB;
    pattern JSONB;
BEGIN
    anonymized_content := p_memory_content;
    
    -- Apply regex patterns for common PII
    FOR pattern IN SELECT * FROM jsonb_array_elements(patterns)
    LOOP
        anonymized_content := regexp_replace(
            anonymized_content,
            pattern->>'pattern',
            pattern->>'replacement',
            'g'
        );
    END LOOP;
    
    -- Remove specific entity names from context
    anonymized_context := p_memory_context;
    IF anonymized_context ? 'company_name' THEN
        anonymized_context := anonymized_context - 'company_name' || 
            jsonb_build_object('company_type', COALESCE(anonymized_context->>'industry', 'general'));
    END IF;
    
    IF anonymized_context ? 'user_name' THEN
        anonymized_context := anonymized_context - 'user_name' - 'user_email' ||
            jsonb_build_object('user_role', COALESCE(anonymized_context->>'user_role', 'user'));
    END IF;
    
    -- Generalize specific values
    IF anonymized_context ? 'contract_value' THEN
        anonymized_context := anonymized_context || 
            jsonb_build_object('value_range', 
                CASE 
                    WHEN (anonymized_context->>'contract_value')::NUMERIC < 10000 THEN 'small'
                    WHEN (anonymized_context->>'contract_value')::NUMERIC < 100000 THEN 'medium'
                    WHEN (anonymized_context->>'contract_value')::NUMERIC < 1000000 THEN 'large'
                    ELSE 'enterprise'
                END
            ) - 'contract_value';
    END IF;
    
    RETURN jsonb_build_object(
        'content', anonymized_content,
        'context', anonymized_context,
        'type', p_memory_type,
        'industry', anonymized_context->>'industry',
        'company_size', anonymized_context->>'company_size',
        'use_case', anonymized_context->>'use_case'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to increment access count (used in memory update)
CREATE OR REPLACE FUNCTION increment(value INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN value + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_short_term_memory TO authenticated;
GRANT EXECUTE ON FUNCTION search_long_term_memory TO authenticated;
GRANT EXECUTE ON FUNCTION apply_memory_decay TO authenticated;
GRANT EXECUTE ON FUNCTION consolidate_user_memories TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_memory_context TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_memory_for_donna TO authenticated;