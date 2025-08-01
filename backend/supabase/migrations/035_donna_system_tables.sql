-- Additional Donna AI System Tables

-- Query logs for tracking Donna interactions
CREATE TABLE donna_query_logs (
    id VARCHAR(255) PRIMARY KEY,
    query_type VARCHAR(100) NOT NULL,
    query_context JSONB NOT NULL,
    enterprise_id UUID REFERENCES enterprises(id),
    insights_count INTEGER DEFAULT 0,
    recommendations_count INTEGER DEFAULT 0,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    feedback_received BOOLEAN DEFAULT false,
    feedback_success BOOLEAN,
    feedback_metrics JSONB,
    user_satisfaction DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis logs for metrics
CREATE TABLE donna_analysis_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_type VARCHAR(100) NOT NULL,
    query_context JSONB NOT NULL,
    insights_generated INTEGER DEFAULT 0,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_donna_query_logs_enterprise ON donna_query_logs(enterprise_id);
CREATE INDEX idx_donna_query_logs_type ON donna_query_logs(query_type);
CREATE INDEX idx_donna_query_logs_feedback ON donna_query_logs(feedback_received) WHERE feedback_received = true;

CREATE INDEX idx_donna_analysis_logs_enterprise ON donna_analysis_logs(enterprise_id);
CREATE INDEX idx_donna_analysis_logs_type ON donna_analysis_logs(query_type);
CREATE INDEX idx_donna_analysis_logs_created ON donna_analysis_logs(created_at DESC);

-- RLS Policies
ALTER TABLE donna_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Policies for query logs (users can only see their enterprise's queries)
CREATE POLICY "Users can view their enterprise query logs" ON donna_query_logs
    FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can insert query logs for their enterprise" ON donna_query_logs
    FOR INSERT WITH CHECK (enterprise_id = auth.user_enterprise_id());

CREATE POLICY "Users can update query logs for their enterprise" ON donna_query_logs
    FOR UPDATE USING (enterprise_id = auth.user_enterprise_id());

-- Policies for analysis logs (users can only see their enterprise's analyses)
CREATE POLICY "Users can view their enterprise analysis logs" ON donna_analysis_logs
    FOR SELECT USING (enterprise_id = auth.user_enterprise_id());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON donna_query_logs TO authenticated;
GRANT SELECT, INSERT ON donna_analysis_logs TO authenticated;

-- Function to get Donna's learning progress
CREATE OR REPLACE FUNCTION get_donna_learning_progress()
RETURNS TABLE (
    total_patterns INTEGER,
    avg_confidence DECIMAL,
    total_best_practices INTEGER,
    avg_success_rate DECIMAL,
    total_queries INTEGER,
    feedback_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH pattern_stats AS (
        SELECT 
            COUNT(*)::INTEGER as pattern_count,
            AVG(confidence)::DECIMAL as avg_conf
        FROM donna_patterns
    ),
    practice_stats AS (
        SELECT 
            COUNT(*)::INTEGER as practice_count,
            AVG(success_rate)::DECIMAL as avg_success
        FROM donna_best_practices
    ),
    query_stats AS (
        SELECT 
            COUNT(*)::INTEGER as query_count,
            SUM(CASE WHEN feedback_received THEN 1 ELSE 0 END)::DECIMAL / 
                NULLIF(COUNT(*)::DECIMAL, 0) as feedback_rate
        FROM donna_query_logs
    )
    SELECT 
        COALESCE(ps.pattern_count, 0),
        COALESCE(ps.avg_conf, 0),
        COALESCE(pr.practice_count, 0),
        COALESCE(pr.avg_success, 0),
        COALESCE(qs.query_count, 0),
        COALESCE(qs.feedback_rate, 0)
    FROM pattern_stats ps
    CROSS JOIN practice_stats pr
    CROSS JOIN query_stats qs;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get enterprise-specific Donna insights
CREATE OR REPLACE FUNCTION get_enterprise_donna_insights(p_enterprise_id UUID)
RETURNS TABLE (
    insight_type VARCHAR,
    insight_data JSONB,
    confidence DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'query_pattern' as insight_type,
        jsonb_build_object(
            'most_common_queries', 
            (SELECT jsonb_agg(jsonb_build_object('type', query_type, 'count', query_count))
             FROM (
                SELECT query_type, COUNT(*) as query_count
                FROM donna_query_logs
                WHERE enterprise_id = p_enterprise_id
                GROUP BY query_type
                ORDER BY query_count DESC
                LIMIT 5
             ) top_queries),
            'avg_confidence', 
            (SELECT AVG(confidence) FROM donna_query_logs WHERE enterprise_id = p_enterprise_id),
            'feedback_rate',
            (SELECT SUM(CASE WHEN feedback_received THEN 1 ELSE 0 END)::DECIMAL / 
                    NULLIF(COUNT(*)::DECIMAL, 0)
             FROM donna_query_logs WHERE enterprise_id = p_enterprise_id)
        ) as insight_data,
        0.8 as confidence,
        NOW() as created_at
    UNION ALL
    SELECT 
        'applicable_best_practices' as insight_type,
        jsonb_build_object(
            'practices', 
            (SELECT jsonb_agg(jsonb_build_object(
                'title', title,
                'success_rate', success_rate,
                'usage_count', usage_count
            ))
             FROM donna_best_practices
             WHERE (industry = (SELECT industry FROM enterprises WHERE id = p_enterprise_id)
                    OR industry IS NULL)
             ORDER BY success_rate DESC
             LIMIT 3)
        ) as insight_data,
        0.9 as confidence,
        NOW() as created_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_donna_learning_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION get_enterprise_donna_insights(UUID) TO authenticated;