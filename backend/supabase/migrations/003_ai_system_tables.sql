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
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();