-- ========================================
-- PACTWISE AI & AGENT SYSTEM (Part 4 of 6)
-- Run this AFTER Part 3 in Supabase SQL Editor
-- ========================================

-- AI Agent System Tables

-- Agent System Configuration
CREATE TABLE agent_system (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    capabilities JSONB DEFAULT '[]',
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- manager, secretary, financial, legal, analytics, vendor, notifications
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    capabilities JSONB DEFAULT '[]',
    system_id UUID REFERENCES agent_system(id),
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Tasks Queue
CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    task_type VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(50) DEFAULT 'pending',
    payload JSONB NOT NULL,
    result JSONB,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    contract_id UUID REFERENCES contracts(id),
    vendor_id UUID REFERENCES vendors(id),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Insights
CREATE TABLE agent_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    insight_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- critical, high, medium, low, info
    confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    data JSONB DEFAULT '{}',
    contract_id UUID REFERENCES contracts(id),
    vendor_id UUID REFERENCES vendors(id),
    budget_id UUID REFERENCES budgets(id),
    is_actionable BOOLEAN DEFAULT false,
    action_taken BOOLEAN DEFAULT false,
    action_details JSONB,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id)
);

-- Contract Clauses (AI Extracted)
CREATE TABLE contract_clauses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    clause_type VARCHAR(100) NOT NULL,
    clause_text TEXT NOT NULL,
    risk_level VARCHAR(20) DEFAULT 'low', -- critical, high, medium, low
    risk_reason TEXT,
    location_start INTEGER,
    location_end INTEGER,
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    metadata JSONB DEFAULT '{}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255),
    context_type VARCHAR(50), -- general, contract, vendor, budget
    context_id UUID, -- Reference to specific entity
    is_active BOOLEAN DEFAULT true,
    model VARCHAR(50) DEFAULT 'gpt-4-turbo-preview',
    total_tokens INTEGER DEFAULT 0,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id),
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory System Tables
CREATE TABLE short_term_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    importance_score DECIMAL(3,2) DEFAULT 0.5,
    access_count INTEGER DEFAULT 1,
    embedding vector(1536), -- OpenAI embedding dimension
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE TABLE long_term_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    content TEXT NOT NULL,
    summary TEXT,
    context JSONB DEFAULT '{}',
    importance_score DECIMAL(3,2) DEFAULT 0.5,
    consolidation_count INTEGER DEFAULT 0,
    access_count INTEGER DEFAULT 0,
    embedding vector(1536),
    user_id UUID REFERENCES users(id),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    consolidated_at TIMESTAMP WITH TIME ZONE
);

-- Embeddings for semantic search
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- contract, vendor, clause, insight
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}',
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for AI tables
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status, scheduled_at) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_agent_tasks_enterprise ON agent_tasks(enterprise_id, created_at DESC);
CREATE INDEX idx_agent_tasks_contract ON agent_tasks(contract_id) WHERE contract_id IS NOT NULL;

CREATE INDEX idx_agent_insights_enterprise ON agent_insights(enterprise_id, created_at DESC);
CREATE INDEX idx_agent_insights_severity ON agent_insights(severity, is_actionable) WHERE action_taken = false;
CREATE INDEX idx_agent_insights_contract ON agent_insights(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX idx_agent_insights_vendor ON agent_insights(vendor_id) WHERE vendor_id IS NOT NULL;

CREATE INDEX idx_contract_clauses_contract ON contract_clauses(contract_id);
CREATE INDEX idx_contract_clauses_type ON contract_clauses(clause_type, risk_level);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_chat_sessions_active ON chat_sessions(enterprise_id) WHERE is_active = true;

CREATE INDEX idx_short_term_memory_user ON short_term_memory(user_id, expires_at);
CREATE INDEX idx_short_term_memory_embedding ON short_term_memory USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX idx_long_term_memory_enterprise ON long_term_memory(enterprise_id);
CREATE INDEX idx_long_term_memory_embedding ON long_term_memory USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX idx_embeddings_entity ON embeddings(entity_type, entity_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Add triggers
CREATE TRIGGER update_agent_system_updated_at BEFORE UPDATE ON agent_system
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();-- Advanced AI System Tables (Donna AI)

-- Donna AI Core System
CREATE TABLE donna_system (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    capabilities JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Graph Nodes
CREATE TABLE donna_knowledge_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_type VARCHAR(100) NOT NULL, -- concept, entity, rule, pattern
    name VARCHAR(255) NOT NULL,
    description TEXT,
    properties JSONB DEFAULT '{}',
    embedding vector(1536),
    importance_score DECIMAL(3,2) DEFAULT 0.5,
    access_frequency INTEGER DEFAULT 0,
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Graph Edges
CREATE TABLE donna_knowledge_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_node_id UUID NOT NULL REFERENCES donna_knowledge_nodes(id),
    target_node_id UUID NOT NULL REFERENCES donna_knowledge_nodes(id),
    edge_type VARCHAR(100) NOT NULL, -- relates_to, causes, prevents, requires
    weight DECIMAL(3,2) DEFAULT 0.5,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    evidence_count INTEGER DEFAULT 0,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_node_id, target_node_id, edge_type)
);

-- Learning History
CREATE TABLE donna_learning_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_type VARCHAR(100) NOT NULL, -- reinforcement, supervised, pattern
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    feedback_score DECIMAL(3,2),
    reward DECIMAL(5,2),
    model_version VARCHAR(50),
    enterprise_id UUID REFERENCES enterprises(id),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Q-Learning Values
CREATE TABLE donna_q_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_hash VARCHAR(64) NOT NULL,
    action VARCHAR(255) NOT NULL,
    q_value DECIMAL(10,6) NOT NULL,
    visits INTEGER DEFAULT 1,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context_type VARCHAR(100),
    enterprise_id UUID REFERENCES enterprises(id),
    UNIQUE(state_hash, action, context_type, enterprise_id)
);

-- Policy Parameters
CREATE TABLE donna_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(100) NOT NULL, -- decision, optimization, recommendation
    parameters JSONB NOT NULL,
    performance_score DECIMAL(3,2) DEFAULT 0.5,
    active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Best Practices Repository
CREATE TABLE donna_best_practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB DEFAULT '[]',
    actions JSONB DEFAULT '[]',
    success_rate DECIMAL(3,2) DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pattern Recognition
CREATE TABLE donna_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_type VARCHAR(100) NOT NULL,
    pattern_signature VARCHAR(255) NOT NULL,
    pattern_data JSONB NOT NULL,
    frequency INTEGER DEFAULT 1,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context JSONB DEFAULT '{}',
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions
CREATE TABLE donna_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    prediction JSONB NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    timeframe_days INTEGER,
    actual_outcome JSONB,
    accuracy_score DECIMAL(3,2),
    model_version VARCHAR(50),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    outcome_recorded_at TIMESTAMP WITH TIME ZONE
);

-- A/B Testing
CREATE TABLE donna_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_name VARCHAR(255) NOT NULL,
    hypothesis TEXT,
    variant_a JSONB NOT NULL,
    variant_b JSONB NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'running', -- running, completed, aborted
    sample_size_required INTEGER,
    current_sample_size INTEGER DEFAULT 0,
    variant_a_conversions INTEGER DEFAULT 0,
    variant_b_conversions INTEGER DEFAULT 0,
    statistical_significance DECIMAL(3,2),
    winner VARCHAR(1),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Personalization Profiles
CREATE TABLE donna_user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    preferences JSONB DEFAULT '{}',
    behavior_patterns JSONB DEFAULT '[]',
    interaction_style VARCHAR(50), -- detailed, concise, visual, analytical
    expertise_level VARCHAR(50), -- beginner, intermediate, advanced, expert
    feature_usage JSONB DEFAULT '{}',
    recommendation_feedback JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Optimization Models
CREATE TABLE donna_optimization_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(100) NOT NULL, -- linear, constraint, genetic
    objective_function TEXT NOT NULL,
    constraints JSONB DEFAULT '[]',
    parameters JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    enterprise_id UUID REFERENCES enterprises(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature Importance
CREATE TABLE donna_feature_importance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_type VARCHAR(100) NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    importance_score DECIMAL(5,4) NOT NULL,
    correlation_score DECIMAL(5,4),
    usage_count INTEGER DEFAULT 0,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    enterprise_id UUID REFERENCES enterprises(id),
    UNIQUE(model_type, feature_name, enterprise_id)
);

-- Create indexes for AI tables
CREATE INDEX idx_donna_knowledge_nodes_type ON donna_knowledge_nodes(node_type);
CREATE INDEX idx_donna_knowledge_nodes_embedding ON donna_knowledge_nodes USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_donna_knowledge_nodes_enterprise ON donna_knowledge_nodes(enterprise_id) WHERE enterprise_id IS NOT NULL;

CREATE INDEX idx_donna_knowledge_edges_source ON donna_knowledge_edges(source_node_id);
CREATE INDEX idx_donna_knowledge_edges_target ON donna_knowledge_edges(target_node_id);
CREATE INDEX idx_donna_knowledge_edges_type ON donna_knowledge_edges(edge_type);

CREATE INDEX idx_donna_learning_history_type ON donna_learning_history(learning_type);
CREATE INDEX idx_donna_learning_history_enterprise ON donna_learning_history(enterprise_id) WHERE enterprise_id IS NOT NULL;

CREATE INDEX idx_donna_q_values_state ON donna_q_values(state_hash, context_type);
CREATE INDEX idx_donna_q_values_enterprise ON donna_q_values(enterprise_id) WHERE enterprise_id IS NOT NULL;

CREATE INDEX idx_donna_policies_active ON donna_policies(policy_type) WHERE active = true;
CREATE INDEX idx_donna_policies_enterprise ON donna_policies(enterprise_id) WHERE enterprise_id IS NOT NULL;

CREATE INDEX idx_donna_best_practices_type ON donna_best_practices(practice_type);
CREATE INDEX idx_donna_best_practices_tags ON donna_best_practices USING gin(tags);

CREATE INDEX idx_donna_patterns_type ON donna_patterns(pattern_type, enterprise_id);
CREATE INDEX idx_donna_patterns_signature ON donna_patterns(pattern_signature);

CREATE INDEX idx_donna_predictions_type ON donna_predictions(prediction_type, enterprise_id);
CREATE INDEX idx_donna_predictions_entity ON donna_predictions(entity_type, entity_id);
CREATE INDEX idx_donna_predictions_outcome ON donna_predictions(outcome_recorded_at) WHERE outcome_recorded_at IS NULL;

CREATE INDEX idx_donna_experiments_status ON donna_experiments(status, enterprise_id);

CREATE INDEX idx_donna_user_profiles_user ON donna_user_profiles(user_id);

CREATE INDEX idx_donna_optimization_models_active ON donna_optimization_models(model_type, enterprise_id) WHERE is_active = true;

-- Add triggers
CREATE TRIGGER update_donna_system_updated_at BEFORE UPDATE ON donna_system
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donna_knowledge_nodes_updated_at BEFORE UPDATE ON donna_knowledge_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donna_policies_updated_at BEFORE UPDATE ON donna_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donna_best_practices_updated_at BEFORE UPDATE ON donna_best_practices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donna_optimization_models_updated_at BEFORE UPDATE ON donna_optimization_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE donna_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_knowledge_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_learning_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_q_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_best_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_optimization_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_feature_importance ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS (needed for policies below)
CREATE OR REPLACE FUNCTION get_current_user_id() 
RETURNS UUID AS $$
  SELECT auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_enterprise_id() 
RETURNS UUID AS $$
  SELECT enterprise_id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role() 
RETURNS user_role AS $$
  SELECT role FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_user_role(required_role user_role) 
RETURNS BOOLEAN AS $$
DECLARE
  user_role_level INTEGER;
  required_role_level INTEGER;
  user_current_role user_role;
BEGIN
  -- Get current user role
  user_current_role := get_current_user_role();
  
  -- Define role levels
  CASE user_current_role
    WHEN 'owner' THEN user_role_level := 5;
    WHEN 'admin' THEN user_role_level := 4;
    WHEN 'manager' THEN user_role_level := 3;
    WHEN 'user' THEN user_role_level := 2;
    WHEN 'viewer' THEN user_role_level := 1;
    ELSE user_role_level := 0;
  END CASE;
  
  CASE required_role
    WHEN 'owner' THEN required_role_level := 5;
    WHEN 'admin' THEN required_role_level := 4;
    WHEN 'manager' THEN required_role_level := 3;
    WHEN 'user' THEN required_role_level := 2;
    WHEN 'viewer' THEN required_role_level := 1;
    ELSE required_role_level := 0;
  END CASE;
  
  RETURN user_role_level >= required_role_level;
END;
$$ LANGUAGE plpgsql STABLE;

-- Policies for Donna AI tables
CREATE POLICY "System can access donna_system" ON donna_system
    FOR ALL USING (true);

CREATE POLICY "Users can view relevant knowledge nodes" ON donna_knowledge_nodes
    FOR SELECT USING (enterprise_id IS NULL OR enterprise_id = get_current_user_enterprise_id());

CREATE POLICY "Users can view relevant patterns" ON donna_patterns
    FOR SELECT USING (enterprise_id IS NULL OR enterprise_id = get_current_user_enterprise_id());

CREATE POLICY "Users can view their predictions" ON donna_predictions
    FOR SELECT USING (enterprise_id = get_current_user_enterprise_id());

CREATE POLICY "Users can manage their profile" ON donna_user_profiles
    FOR ALL USING (user_id = get_current_user_id());-- Agent Logs Table for tracking agent execution

CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    task_id UUID REFERENCES agent_tasks(id),
    log_type VARCHAR(50) NOT NULL, -- request, response, error, info, debug
    log_level VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error, critical
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    execution_time_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_id, created_at DESC);
CREATE INDEX idx_agent_logs_task ON agent_logs(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_agent_logs_type ON agent_logs(log_type, created_at DESC);
CREATE INDEX idx_agent_logs_level ON agent_logs(log_level) WHERE log_level IN ('warning', 'error', 'critical');

-- RLS
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view agent logs" ON agent_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.auth_id = auth.uid() 
            AND users.role IN ('admin', 'owner')
        )
    );