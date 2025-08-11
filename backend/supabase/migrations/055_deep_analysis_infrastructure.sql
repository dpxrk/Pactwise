-- Migration: 055_deep_analysis_infrastructure.sql
-- Description: Deep analysis infrastructure for AI-powered contract intelligence and ML services
-- Created: 2025-01-11

-- ================================================================
-- CONTRACT ANALYSIS RESULTS STORAGE
-- ================================================================

-- Store comprehensive contract analysis results from AI processing
CREATE TABLE IF NOT EXISTS contract_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    contract_text TEXT NOT NULL,
    analysis_type VARCHAR(50) DEFAULT 'full' CHECK (analysis_type IN ('risk', 'compliance', 'full', 'quick', 'deep', 'summary', 'clause', 'financial')),
    analysis_results JSONB NOT NULL DEFAULT '{}',
    risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
    compliance_score DECIMAL(5,2) CHECK (compliance_score >= 0 AND compliance_score <= 100),
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
    model_version VARCHAR(100),
    model_provider VARCHAR(50) CHECK (model_provider IN ('openai', 'anthropic', 'google', 'local', 'mixed')),
    regulations_checked TEXT[],
    key_findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ================================================================
-- ML SERVICE PREDICTIONS AND RESULTS
-- ================================================================

-- Store ML service predictions and analysis results
CREATE TABLE IF NOT EXISTS ml_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL CHECK (service_name IN (
        'contract-intelligence', 'vendor-risk', 'compliance-orchestrator',
        'negotiation-intelligence', 'document-understanding', 'financial-analysis',
        'anomaly-detection', 'trend-prediction', 'sentiment-analysis'
    )),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('contract', 'vendor', 'document', 'transaction', 'user', 'process')),
    entity_id UUID NOT NULL,
    prediction_type VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL DEFAULT '{}',
    prediction_results JSONB NOT NULL DEFAULT '{}',
    confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    model_version VARCHAR(100),
    model_metrics JSONB DEFAULT '{}', -- accuracy, precision, recall, f1_score
    processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
    is_cached BOOLEAN DEFAULT FALSE,
    cache_key VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- ADVANCED VECTOR EMBEDDINGS FOR ANALYSIS
-- ================================================================

-- Enhanced embeddings table for ML analysis and semantic search
CREATE TABLE IF NOT EXISTS analysis_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN (
        'contract_clause', 'risk_factor', 'compliance_rule', 'vendor_profile',
        'negotiation_point', 'legal_term', 'financial_metric', 'document_section'
    )),
    content_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    embedding_model VARCHAR(100) NOT NULL,
    embedding vector(1536), -- Adjustable based on model
    embedding_dimension INTEGER DEFAULT 1536,
    content_hash VARCHAR(64) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    metadata JSONB DEFAULT '{}',
    similarity_threshold DECIMAL(5,4) DEFAULT 0.8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- DOCUMENT INTELLIGENCE RESULTS
-- ================================================================

-- For document understanding and processing results
CREATE TABLE IF NOT EXISTS document_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    document_id VARCHAR(255) NOT NULL,
    document_name VARCHAR(500),
    document_type VARCHAR(100) CHECK (document_type IN (
        'contract', 'invoice', 'proposal', 'report', 'memo',
        'email', 'presentation', 'spreadsheet', 'policy', 'other'
    )),
    document_source VARCHAR(100), -- 'upload', 'email', 'api', 'scan'
    file_size_bytes BIGINT,
    page_count INTEGER,
    extracted_entities JSONB DEFAULT '{}',
    key_information JSONB DEFAULT '{}',
    classification_results JSONB DEFAULT '{}',
    sentiment_analysis JSONB DEFAULT '{}',
    language_detected VARCHAR(10),
    confidence_scores JSONB DEFAULT '{}',
    processing_metadata JSONB DEFAULT '{}',
    ocr_applied BOOLEAN DEFAULT FALSE,
    ocr_confidence DECIMAL(5,4),
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ================================================================
-- NEGOTIATION INTELLIGENCE SESSION DATA
-- ================================================================

-- For negotiation AI sessions and strategies
CREATE TABLE IF NOT EXISTS negotiation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    session_name VARCHAR(255) NOT NULL,
    session_type VARCHAR(50) CHECK (session_type IN ('new_contract', 'renewal', 'amendment', 'termination')),
    negotiation_strategy JSONB DEFAULT '{}',
    initial_position JSONB DEFAULT '{}',
    target_outcomes JSONB DEFAULT '{}',
    moves_history JSONB DEFAULT '[]',
    current_state JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    outcome_prediction JSONB DEFAULT '{}',
    actual_outcome JSONB,
    success_metrics JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ================================================================
-- ADVANCED COMPLIANCE MONITORING
-- ================================================================

-- Enhanced compliance tracking with AI analysis
CREATE TABLE IF NOT EXISTS compliance_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('contract', 'vendor', 'process', 'system', 'data')),
    entity_id UUID NOT NULL,
    entity_name VARCHAR(500),
    regulation_framework VARCHAR(100) CHECK (regulation_framework IN (
        'GDPR', 'CCPA', 'SOX', 'HIPAA', 'PCI-DSS', 'ISO-27001',
        'SOC2', 'FERPA', 'GLBA', 'FCPA', 'AML', 'KYC', 'Other'
    )),
    compliance_status VARCHAR(50) CHECK (compliance_status IN (
        'compliant', 'non_compliant', 'partial', 'pending_review', 'requires_action', 'expired'
    )),
    risk_level VARCHAR(20) CHECK (risk_level IN ('critical', 'high', 'medium', 'low', 'negligible')),
    risk_factors JSONB DEFAULT '[]',
    gaps_identified JSONB DEFAULT '[]',
    remediation_suggestions JSONB DEFAULT '[]',
    evidence_documents JSONB DEFAULT '[]',
    ai_confidence_score DECIMAL(5,4) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
    human_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    last_assessment TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_review_due TIMESTAMP WITH TIME ZONE,
    auto_remediation_enabled BOOLEAN DEFAULT FALSE,
    notifications_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- ANALYSIS AUDIT TRAIL
-- ================================================================

-- Track all AI analysis operations for audit and improvement
CREATE TABLE IF NOT EXISTS analysis_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    analysis_type VARCHAR(100) NOT NULL,
    target_entity_type VARCHAR(50),
    target_entity_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    input_parameters JSONB DEFAULT '{}',
    output_summary JSONB DEFAULT '{}',
    model_used VARCHAR(100),
    tokens_consumed INTEGER,
    cost_estimate DECIMAL(10,4),
    duration_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- MODEL PERFORMANCE TRACKING
-- ================================================================

-- Track ML model performance over time
CREATE TABLE IF NOT EXISTS model_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    service_name VARCHAR(100),
    metric_type VARCHAR(50) CHECK (metric_type IN ('accuracy', 'precision', 'recall', 'f1_score', 'auc_roc', 'mse', 'mae')),
    metric_value DECIMAL(10,6),
    evaluation_dataset VARCHAR(255),
    sample_size INTEGER,
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Contract analyses indexes
CREATE INDEX idx_contract_analyses_enterprise_type ON contract_analyses(enterprise_id, analysis_type);
CREATE INDEX idx_contract_analyses_created ON contract_analyses(created_at DESC);
CREATE INDEX idx_contract_analyses_risk_score ON contract_analyses(risk_score DESC) WHERE risk_score IS NOT NULL;
CREATE INDEX idx_contract_analyses_compliance_score ON contract_analyses(compliance_score DESC) WHERE compliance_score IS NOT NULL;
CREATE INDEX idx_contract_analyses_contract ON contract_analyses(contract_id) WHERE contract_id IS NOT NULL;

-- ML predictions indexes
CREATE INDEX idx_ml_predictions_service_entity ON ml_predictions(service_name, entity_type, entity_id);
CREATE INDEX idx_ml_predictions_enterprise_created ON ml_predictions(enterprise_id, created_at DESC);
CREATE INDEX idx_ml_predictions_cache ON ml_predictions(cache_key) WHERE is_cached = TRUE;
CREATE INDEX idx_ml_predictions_expires ON ml_predictions(expires_at) WHERE expires_at IS NOT NULL;

-- Analysis embeddings indexes
CREATE INDEX idx_analysis_embeddings_content ON analysis_embeddings(content_type, content_id);
CREATE INDEX idx_analysis_embeddings_model ON analysis_embeddings(embedding_model);
CREATE INDEX idx_analysis_embeddings_hash ON analysis_embeddings(content_hash);
CREATE INDEX idx_analysis_embeddings_enterprise ON analysis_embeddings(enterprise_id);

-- Document intelligence indexes
CREATE INDEX idx_document_intelligence_enterprise_type ON document_intelligence(enterprise_id, document_type);
CREATE INDEX idx_document_intelligence_document ON document_intelligence(document_id);
CREATE INDEX idx_document_intelligence_validation ON document_intelligence(validation_status);
CREATE INDEX idx_document_intelligence_created ON document_intelligence(created_at DESC);

-- Negotiation sessions indexes
CREATE INDEX idx_negotiation_sessions_enterprise_status ON negotiation_sessions(enterprise_id, status);
CREATE INDEX idx_negotiation_sessions_contract ON negotiation_sessions(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX idx_negotiation_sessions_vendor ON negotiation_sessions(vendor_id) WHERE vendor_id IS NOT NULL;

-- Compliance intelligence indexes
CREATE INDEX idx_compliance_intelligence_entity ON compliance_intelligence(entity_type, entity_id);
CREATE INDEX idx_compliance_intelligence_regulation ON compliance_intelligence(regulation_framework, compliance_status);
CREATE INDEX idx_compliance_intelligence_risk ON compliance_intelligence(risk_level);
CREATE INDEX idx_compliance_intelligence_review_due ON compliance_intelligence(next_review_due) WHERE next_review_due IS NOT NULL;
CREATE INDEX idx_compliance_intelligence_enterprise_status ON compliance_intelligence(enterprise_id, compliance_status);

-- Audit log indexes
CREATE INDEX idx_analysis_audit_log_enterprise ON analysis_audit_log(enterprise_id, created_at DESC);
CREATE INDEX idx_analysis_audit_log_user ON analysis_audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analysis_audit_log_type ON analysis_audit_log(analysis_type);
CREATE INDEX idx_analysis_audit_log_success ON analysis_audit_log(success);

-- Model performance indexes
CREATE INDEX idx_model_performance_model ON model_performance_metrics(model_name, model_version);
CREATE INDEX idx_model_performance_service ON model_performance_metrics(service_name) WHERE service_name IS NOT NULL;
CREATE INDEX idx_model_performance_recorded ON model_performance_metrics(recorded_at DESC);

-- ================================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================================

-- Contract analyses RLS
ALTER TABLE contract_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract analyses isolated by enterprise" ON contract_analyses
    FOR ALL USING (
        enterprise_id = COALESCE(
            (SELECT auth.jwt()->>'enterprise_id')::uuid,
            (SELECT enterprise_id FROM users WHERE id = auth.uid())
        )
    );

-- ML predictions RLS
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ML predictions isolated by enterprise" ON ml_predictions
    FOR ALL USING (
        enterprise_id = COALESCE(
            (SELECT auth.jwt()->>'enterprise_id')::uuid,
            (SELECT enterprise_id FROM users WHERE id = auth.uid())
        )
    );

-- Analysis embeddings RLS
ALTER TABLE analysis_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analysis embeddings isolated by enterprise" ON analysis_embeddings
    FOR ALL USING (
        enterprise_id = COALESCE(
            (SELECT auth.jwt()->>'enterprise_id')::uuid,
            (SELECT enterprise_id FROM users WHERE id = auth.uid())
        )
    );

-- Document intelligence RLS
ALTER TABLE document_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Document intelligence isolated by enterprise" ON document_intelligence
    FOR ALL USING (
        enterprise_id = COALESCE(
            (SELECT auth.jwt()->>'enterprise_id')::uuid,
            (SELECT enterprise_id FROM users WHERE id = auth.uid())
        )
    );

-- Negotiation sessions RLS
ALTER TABLE negotiation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Negotiation sessions isolated by enterprise" ON negotiation_sessions
    FOR ALL USING (
        enterprise_id = COALESCE(
            (SELECT auth.jwt()->>'enterprise_id')::uuid,
            (SELECT enterprise_id FROM users WHERE id = auth.uid())
        )
    );

-- Compliance intelligence RLS
ALTER TABLE compliance_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Compliance intelligence isolated by enterprise" ON compliance_intelligence
    FOR ALL USING (
        enterprise_id = COALESCE(
            (SELECT auth.jwt()->>'enterprise_id')::uuid,
            (SELECT enterprise_id FROM users WHERE id = auth.uid())
        )
    );

-- Analysis audit log RLS
ALTER TABLE analysis_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analysis audit log isolated by enterprise" ON analysis_audit_log
    FOR ALL USING (
        enterprise_id = COALESCE(
            (SELECT auth.jwt()->>'enterprise_id')::uuid,
            (SELECT enterprise_id FROM users WHERE id = auth.uid())
        )
    );

-- Model performance metrics RLS (allow read for all, write for admins only)
ALTER TABLE model_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Model performance read access" ON model_performance_metrics
    FOR SELECT USING (TRUE);

CREATE POLICY "Model performance write for system" ON model_performance_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- ================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables with updated_at columns
CREATE TRIGGER update_contract_analyses_updated_at 
    BEFORE UPDATE ON contract_analyses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_embeddings_updated_at 
    BEFORE UPDATE ON analysis_embeddings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_negotiation_sessions_updated_at 
    BEFORE UPDATE ON negotiation_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_intelligence_updated_at 
    BEFORE UPDATE ON compliance_intelligence 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Function to clean up expired ML predictions cache
CREATE OR REPLACE FUNCTION cleanup_expired_ml_predictions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ml_predictions 
    WHERE is_cached = TRUE 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get compliance summary for an enterprise
CREATE OR REPLACE FUNCTION get_compliance_summary(p_enterprise_id UUID)
RETURNS TABLE(
    total_entities INTEGER,
    compliant_count INTEGER,
    non_compliant_count INTEGER,
    pending_review_count INTEGER,
    critical_risks INTEGER,
    high_risks INTEGER,
    compliance_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_entities,
        COUNT(*) FILTER (WHERE compliance_status = 'compliant')::INTEGER as compliant_count,
        COUNT(*) FILTER (WHERE compliance_status = 'non_compliant')::INTEGER as non_compliant_count,
        COUNT(*) FILTER (WHERE compliance_status = 'pending_review')::INTEGER as pending_review_count,
        COUNT(*) FILTER (WHERE risk_level = 'critical')::INTEGER as critical_risks,
        COUNT(*) FILTER (WHERE risk_level = 'high')::INTEGER as high_risks,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE compliance_status = 'compliant')::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0
        END as compliance_percentage
    FROM compliance_intelligence
    WHERE enterprise_id = p_enterprise_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate analysis cost estimate
CREATE OR REPLACE FUNCTION calculate_analysis_cost(
    p_model_name VARCHAR,
    p_tokens INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    cost_per_1k_tokens DECIMAL;
BEGIN
    -- Example pricing (adjust based on actual provider rates)
    cost_per_1k_tokens := CASE
        WHEN p_model_name LIKE '%gpt-4%' THEN 0.03
        WHEN p_model_name LIKE '%gpt-3.5%' THEN 0.002
        WHEN p_model_name LIKE '%claude%' THEN 0.025
        WHEN p_model_name LIKE '%gemini%' THEN 0.02
        ELSE 0.001
    END;
    
    RETURN ROUND((p_tokens::DECIMAL / 1000) * cost_per_1k_tokens, 4);
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- GRANTS FOR SUPABASE SERVICE ROLE
-- ================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON contract_analyses TO authenticated;
GRANT INSERT, UPDATE ON ml_predictions TO authenticated;
GRANT INSERT, UPDATE ON analysis_embeddings TO authenticated;
GRANT INSERT, UPDATE ON document_intelligence TO authenticated;
GRANT INSERT, UPDATE ON negotiation_sessions TO authenticated;
GRANT INSERT, UPDATE ON compliance_intelligence TO authenticated;
GRANT INSERT ON analysis_audit_log TO authenticated;
GRANT SELECT ON model_performance_metrics TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_expired_ml_predictions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_compliance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_analysis_cost(VARCHAR, INTEGER) TO authenticated;

-- ================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON TABLE contract_analyses IS 'Stores comprehensive AI-powered contract analysis results including risk and compliance scoring';
COMMENT ON TABLE ml_predictions IS 'Stores predictions and results from various ML services for contracts, vendors, and documents';
COMMENT ON TABLE analysis_embeddings IS 'Vector embeddings for semantic search and similarity matching across various content types';
COMMENT ON TABLE document_intelligence IS 'Results from document understanding pipeline including entity extraction and classification';
COMMENT ON TABLE negotiation_sessions IS 'Tracks AI-assisted negotiation sessions with strategies and recommendations';
COMMENT ON TABLE compliance_intelligence IS 'AI-powered compliance monitoring and risk assessment across various regulatory frameworks';
COMMENT ON TABLE analysis_audit_log IS 'Audit trail for all AI analysis operations for compliance and improvement tracking';
COMMENT ON TABLE model_performance_metrics IS 'Tracks ML model performance metrics over time for monitoring and optimization';

COMMENT ON FUNCTION cleanup_expired_ml_predictions() IS 'Removes expired cached ML predictions to maintain database performance';
COMMENT ON FUNCTION get_compliance_summary(UUID) IS 'Returns compliance statistics summary for a given enterprise';
COMMENT ON FUNCTION calculate_analysis_cost(VARCHAR, INTEGER) IS 'Estimates the cost of AI analysis based on model and token usage';