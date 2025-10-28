-- Advanced AI System Tables (Donna AI)

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

-- Policies for Donna AI tables
CREATE POLICY "System can access donna_system" ON donna_system
    FOR ALL USING (true);

CREATE POLICY "Users can view relevant knowledge nodes" ON donna_knowledge_nodes
    FOR SELECT USING (enterprise_id IS NULL OR enterprise_id = public.current_user_enterprise_id());

CREATE POLICY "Users can view relevant patterns" ON donna_patterns
    FOR SELECT USING (enterprise_id IS NULL OR enterprise_id = public.current_user_enterprise_id());

CREATE POLICY "Users can view their predictions" ON donna_predictions
    FOR SELECT USING (enterprise_id = public.current_user_enterprise_id());

CREATE POLICY "Users can manage their profile" ON donna_user_profiles
    FOR ALL USING (user_id = public.current_user_id());