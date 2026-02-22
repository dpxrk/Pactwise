-- Migration: 136_ai_embeddings_rag.sql
-- Description: Add pgvector support for RAG (Retrieval Augmented Generation)
-- This migration enables semantic search over documents using vector embeddings

-- ==================== Enable pgvector extension ====================
CREATE EXTENSION IF NOT EXISTS vector;

-- ==================== Document Chunks Table ====================
-- Stores chunked documents for RAG retrieval
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID, -- Generic document reference (no FK constraint - flexible)
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

    -- Chunk content and metadata
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    total_chunks INTEGER NOT NULL,

    -- Token counts
    token_count INTEGER NOT NULL,

    -- Vector embedding (1536 dimensions for text-embedding-3-small)
    embedding vector(1536),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chunk_has_source CHECK (document_id IS NOT NULL OR contract_id IS NOT NULL)
);

-- ==================== AI Usage Logs Table ====================
-- Tracks AI API usage and costs per enterprise
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Request details
    model VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'anthropic',
    agent_type VARCHAR(100),
    operation_type VARCHAR(100) NOT NULL,

    -- Token counts
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,

    -- Cost in USD (6 decimal precision for micro-transactions)
    cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

    -- Additional context
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== Indexes for document_chunks ====================
-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_document
    ON document_chunks(document_id)
    WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_contract
    ON document_chunks(contract_id)
    WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_enterprise
    ON document_chunks(enterprise_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_created
    ON document_chunks(created_at DESC);

-- ==================== Indexes for ai_usage_logs ====================
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_enterprise
    ON ai_usage_logs(enterprise_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user
    ON ai_usage_logs(user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created
    ON ai_usage_logs(created_at DESC);

-- Separate index for enterprise and created_at (can't use DATE_TRUNC in index expression)
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_enterprise_created
    ON ai_usage_logs(enterprise_id, created_at DESC);

-- ==================== Add AI budget config to enterprises ====================
ALTER TABLE enterprises
    ADD COLUMN IF NOT EXISTS ai_budget_config JSONB DEFAULT '{
        "monthlySoftLimit": 400,
        "monthlyHardLimit": 500,
        "dailyLimit": 50,
        "alertThresholds": [50, 75, 90, 100]
    }';

-- ==================== RLS Policies ====================

-- Document chunks - enterprises can only see their own
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enterprise isolation for document_chunks"
    ON document_chunks
    FOR ALL
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE id = auth.uid()
        )
    );

-- AI usage logs - enterprises can only see their own
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enterprise isolation for ai_usage_logs"
    ON ai_usage_logs
    FOR ALL
    USING (
        enterprise_id IN (
            SELECT enterprise_id FROM users WHERE id = auth.uid()
        )
    );

-- ==================== Functions ====================

-- Semantic search function with hybrid scoring
CREATE OR REPLACE FUNCTION search_document_chunks(
    p_enterprise_id UUID,
    p_query_embedding vector(1536),
    p_match_threshold FLOAT DEFAULT 0.7,
    p_match_count INT DEFAULT 10,
    p_contract_id UUID DEFAULT NULL,
    p_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    contract_id UUID,
    content TEXT,
    chunk_index INT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.contract_id,
        dc.content,
        dc.chunk_index,
        dc.metadata,
        1 - (dc.embedding <=> p_query_embedding) AS similarity
    FROM document_chunks dc
    WHERE
        dc.enterprise_id = p_enterprise_id
        AND dc.embedding IS NOT NULL
        AND (p_contract_id IS NULL OR dc.contract_id = p_contract_id)
        AND (p_document_id IS NULL OR dc.document_id = p_document_id)
        AND 1 - (dc.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

-- Get AI usage summary for an enterprise
CREATE OR REPLACE FUNCTION get_ai_usage_summary(
    p_enterprise_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()),
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_cost DECIMAL,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    request_count BIGINT,
    cost_by_model JSONB,
    cost_by_agent JSONB,
    cost_by_operation JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(cost), 0) AS total_cost,
        COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
        COUNT(*) AS request_count,
        (
            SELECT JSONB_OBJECT_AGG(model, model_cost)
            FROM (
                SELECT model, SUM(cost) AS model_cost
                FROM ai_usage_logs
                WHERE enterprise_id = p_enterprise_id
                    AND created_at >= p_start_date
                    AND created_at <= p_end_date
                GROUP BY model
            ) model_agg
        ) AS cost_by_model,
        (
            SELECT JSONB_OBJECT_AGG(COALESCE(agent_type, 'direct'), agent_cost)
            FROM (
                SELECT agent_type, SUM(cost) AS agent_cost
                FROM ai_usage_logs
                WHERE enterprise_id = p_enterprise_id
                    AND created_at >= p_start_date
                    AND created_at <= p_end_date
                GROUP BY agent_type
            ) agent_agg
        ) AS cost_by_agent,
        (
            SELECT JSONB_OBJECT_AGG(operation_type, operation_cost)
            FROM (
                SELECT operation_type, SUM(cost) AS operation_cost
                FROM ai_usage_logs
                WHERE enterprise_id = p_enterprise_id
                    AND created_at >= p_start_date
                    AND created_at <= p_end_date
                GROUP BY operation_type
            ) operation_agg
        ) AS cost_by_operation
    FROM ai_usage_logs
    WHERE enterprise_id = p_enterprise_id
        AND created_at >= p_start_date
        AND created_at <= p_end_date;
END;
$$;

-- Check if enterprise is within AI budget
CREATE OR REPLACE FUNCTION check_ai_budget(
    p_enterprise_id UUID,
    p_estimated_cost DECIMAL DEFAULT 0
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_month_cost DECIMAL,
    monthly_limit DECIMAL,
    remaining DECIMAL,
    percent_used DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_budget_config JSONB;
    v_hard_limit DECIMAL;
    v_current_cost DECIMAL;
BEGIN
    -- Get budget config
    SELECT ai_budget_config INTO v_budget_config
    FROM enterprises
    WHERE id = p_enterprise_id;

    v_hard_limit := COALESCE((v_budget_config->>'monthlyHardLimit')::DECIMAL, 500);

    -- Get current month cost
    SELECT COALESCE(SUM(cost), 0) INTO v_current_cost
    FROM ai_usage_logs
    WHERE enterprise_id = p_enterprise_id
        AND created_at >= DATE_TRUNC('month', NOW());

    RETURN QUERY
    SELECT
        (v_current_cost + p_estimated_cost) <= v_hard_limit AS allowed,
        v_current_cost AS current_month_cost,
        v_hard_limit AS monthly_limit,
        GREATEST(v_hard_limit - v_current_cost, 0) AS remaining,
        LEAST((v_current_cost / v_hard_limit) * 100, 100) AS percent_used;
END;
$$;

-- ==================== Updated At Trigger ====================
CREATE TRIGGER set_document_chunks_updated_at
    BEFORE UPDATE ON document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================== Comments ====================
COMMENT ON TABLE document_chunks IS 'Stores chunked document content with vector embeddings for RAG';
COMMENT ON TABLE ai_usage_logs IS 'Tracks AI API usage and costs per enterprise';
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding from text-embedding-3-small (1536 dimensions)';
COMMENT ON FUNCTION search_document_chunks IS 'Semantic search using cosine similarity on vector embeddings';
COMMENT ON FUNCTION get_ai_usage_summary IS 'Get AI usage statistics for billing and monitoring';
COMMENT ON FUNCTION check_ai_budget IS 'Verify enterprise is within AI budget limits';
