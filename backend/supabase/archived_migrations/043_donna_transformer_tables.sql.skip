-- Create API usage tracking table for monitoring provider usage
CREATE TABLE IF NOT EXISTS api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  enterprise_id UUID REFERENCES enterprises(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Create index for usage queries
CREATE INDEX IF NOT EXISTS idx_api_usage_provider_date 
ON api_usage_tracking(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_enterprise 
ON api_usage_tracking(enterprise_id, created_at DESC);

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for vector storage
CREATE TABLE IF NOT EXISTS donna_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding vector(1536), -- Standard OpenAI dimension, will work with any size
  content TEXT NOT NULL,
  metadata JSONB,
  enterprise_id UUID REFERENCES enterprises(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_params jsonb DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.content,
    1 - (de.embedding <=> query_embedding) as similarity,
    de.metadata
  FROM donna_embeddings de
  WHERE 
    -- Similarity threshold
    1 - (de.embedding <=> query_embedding) > match_threshold
    -- Optional metadata filtering
    AND (filter_params IS NULL OR de.metadata @> filter_params)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create HNSW index for faster similarity search
-- Using ivfflat for better performance with large datasets
CREATE INDEX IF NOT EXISTS idx_donna_embeddings_vector 
ON donna_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index on metadata for filtering
CREATE INDEX IF NOT EXISTS idx_donna_embeddings_metadata 
ON donna_embeddings USING GIN (metadata);

-- Create index on enterprise_id for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_donna_embeddings_enterprise 
ON donna_embeddings(enterprise_id);

-- Add RLS policies for embeddings
ALTER TABLE donna_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy for reading embeddings (users can read their enterprise's embeddings)
CREATE POLICY "Users can read their enterprise embeddings"
ON donna_embeddings FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE enterprise_id = donna_embeddings.enterprise_id
  )
);

-- Policy for inserting embeddings (users can create embeddings for their enterprise)
CREATE POLICY "Users can create embeddings for their enterprise"
ON donna_embeddings FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE enterprise_id = donna_embeddings.enterprise_id
  )
);

-- Add RLS for API usage tracking
ALTER TABLE api_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policy for reading API usage (users can read their enterprise's usage)
CREATE POLICY "Users can read their enterprise API usage"
ON api_usage_tracking FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE enterprise_id = api_usage_tracking.enterprise_id
  )
);

-- Policy for service role to insert usage tracking
CREATE POLICY "Service role can insert API usage"
ON api_usage_tracking FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS anyway

-- Create function to get monthly API usage by provider
CREATE OR REPLACE FUNCTION get_monthly_api_usage(
  p_enterprise_id UUID DEFAULT NULL,
  p_month_offset INT DEFAULT 0
)
RETURNS TABLE (
  provider TEXT,
  call_count BIGINT,
  usage_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aut.provider,
    COUNT(*)::BIGINT as call_count,
    DATE_TRUNC('day', aut.created_at)::DATE as usage_date
  FROM api_usage_tracking aut
  WHERE 
    (p_enterprise_id IS NULL OR aut.enterprise_id = p_enterprise_id)
    AND aut.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * p_month_offset)
    AND aut.created_at < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * (p_month_offset - 1))
  GROUP BY aut.provider, DATE_TRUNC('day', aut.created_at)
  ORDER BY usage_date DESC, aut.provider;
END;
$$;

-- Create function to check Cohere monthly usage (for free tier limit)
CREATE OR REPLACE FUNCTION get_cohere_monthly_usage(
  p_enterprise_id UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  usage_count BIGINT;
BEGIN
  SELECT COUNT(*)::BIGINT INTO usage_count
  FROM api_usage_tracking
  WHERE 
    provider = 'cohere'
    AND (p_enterprise_id IS NULL OR enterprise_id = p_enterprise_id)
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);
  
  RETURN COALESCE(usage_count, 0);
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE api_usage_tracking IS 'Tracks API usage across different providers for cost monitoring and rate limiting';
COMMENT ON TABLE donna_embeddings IS 'Stores vector embeddings for semantic search and similarity matching';
COMMENT ON FUNCTION search_embeddings IS 'Performs vector similarity search on embeddings with optional metadata filtering';
COMMENT ON FUNCTION get_monthly_api_usage IS 'Returns API usage statistics by provider for a given month';
COMMENT ON FUNCTION get_cohere_monthly_usage IS 'Returns current month Cohere API usage for free tier monitoring';