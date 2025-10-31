-- Agent Memory System for Context Awareness and Learning

-- Agent Memory Table
CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

    -- Memory content
    content TEXT NOT NULL,
    memory_type VARCHAR(50) DEFAULT 'long_term' CHECK (memory_type IN ('short_term', 'long_term', 'episodic', 'semantic', 'procedural')),

    -- Metadata
    importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,

    -- Associations
    related_task_id UUID REFERENCES agent_tasks(id),
    related_contract_id UUID REFERENCES contracts(id),
    related_vendor_id UUID REFERENCES vendors(id),

    -- Organization
    tags TEXT[] DEFAULT '{}',
    embedding VECTOR(1536), -- For semantic search with OpenAI embeddings

    -- Lifecycle
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE agent_memory IS 'Memory system for agents to maintain context and learn from experiences';
COMMENT ON COLUMN agent_memory.memory_type IS 'short_term: Recent context (24h), long_term: Important knowledge, episodic: Specific events, semantic: General knowledge, procedural: How-to knowledge';
COMMENT ON COLUMN agent_memory.importance_score IS 'Memory importance for retention decisions (higher = more important)';
COMMENT ON COLUMN agent_memory.embedding IS 'Vector embedding for semantic memory retrieval';

-- Agent Learning Table
CREATE TABLE IF NOT EXISTS agent_learning (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

    -- Learning data
    learning_type VARCHAR(50) NOT NULL CHECK (learning_type IN ('pattern', 'optimization', 'correction', 'best_practice', 'failure_analysis')),
    context JSONB NOT NULL,
    lesson TEXT NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),

    -- Application tracking
    times_applied INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2),

    -- Associations
    learned_from_task_id UUID REFERENCES agent_tasks(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE agent_learning IS 'Tracks lessons learned by agents for continuous improvement';

-- Agent Reasoning Traces
CREATE TABLE IF NOT EXISTS agent_reasoning_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Reasoning chain
    step_number INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL CHECK (step_type IN ('thought', 'action', 'observation', 'reflection', 'decision')),
    content TEXT NOT NULL,

    -- Tool usage
    tool_used VARCHAR(100),
    tool_input JSONB,
    tool_output JSONB,

    -- Evaluation
    confidence_score DECIMAL(3,2),
    success BOOLEAN,
    error_message TEXT,

    -- Timing
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE agent_reasoning_traces IS 'Detailed traces of agent reasoning process for debugging and improvement';

-- Agent Knowledge Graph
CREATE TABLE IF NOT EXISTS agent_knowledge_graph (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

    -- Entity information
    entity_type VARCHAR(100) NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,

    -- Relationships
    related_to_type VARCHAR(100),
    related_to_id TEXT,
    relationship_type VARCHAR(100),

    -- Properties
    properties JSONB DEFAULT '{}',

    -- Confidence and validation
    confidence_score DECIMAL(3,2) DEFAULT 0.8,
    validated BOOLEAN DEFAULT false,
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(entity_type, entity_id, related_to_type, related_to_id, relationship_type)
);

COMMENT ON TABLE agent_knowledge_graph IS 'Knowledge graph for agents to understand relationships between entities';

-- Create Indexes
CREATE INDEX idx_agent_memory_agent ON agent_memory(agent_id, memory_type);
CREATE INDEX idx_agent_memory_enterprise ON agent_memory(enterprise_id);
CREATE INDEX idx_agent_memory_importance ON agent_memory(importance_score DESC) WHERE importance_score > 0.7;
CREATE INDEX idx_agent_memory_tags ON agent_memory USING GIN(tags);
CREATE INDEX idx_agent_memory_expires ON agent_memory(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_agent_memory_task ON agent_memory(related_task_id) WHERE related_task_id IS NOT NULL;
CREATE INDEX idx_agent_memory_contract ON agent_memory(related_contract_id) WHERE related_contract_id IS NOT NULL;

CREATE INDEX idx_agent_learning_agent ON agent_learning(agent_id, learning_type);
CREATE INDEX idx_agent_learning_enterprise ON agent_learning(enterprise_id);
CREATE INDEX idx_agent_learning_confidence ON agent_learning(confidence_score DESC);
CREATE INDEX idx_agent_learning_success_rate ON agent_learning(success_rate DESC NULLS LAST);

CREATE INDEX idx_reasoning_traces_task ON agent_reasoning_traces(task_id, step_number);
CREATE INDEX idx_reasoning_traces_agent ON agent_reasoning_traces(agent_id);
CREATE INDEX idx_reasoning_traces_tool ON agent_reasoning_traces(tool_used) WHERE tool_used IS NOT NULL;
CREATE INDEX idx_reasoning_traces_created ON agent_reasoning_traces(created_at DESC);

CREATE INDEX idx_knowledge_graph_entity ON agent_knowledge_graph(entity_type, entity_id);
CREATE INDEX idx_knowledge_graph_relationship ON agent_knowledge_graph(relationship_type);
CREATE INDEX idx_knowledge_graph_enterprise ON agent_knowledge_graph(enterprise_id);
CREATE INDEX idx_knowledge_graph_validated ON agent_knowledge_graph(validated) WHERE validated = true;

-- Triggers
CREATE TRIGGER update_agent_memory_updated_at
    BEFORE UPDATE ON agent_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_learning_updated_at
    BEFORE UPDATE ON agent_learning
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_graph_updated_at
    BEFORE UPDATE ON agent_knowledge_graph
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Memory Consolidation Function
CREATE OR REPLACE FUNCTION consolidate_agent_memory(agent_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Expire old short-term memories (>24 hours)
    UPDATE agent_memory
    SET expires_at = NOW()
    WHERE agent_id = agent_uuid
    AND memory_type = 'short_term'
    AND created_at < NOW() - INTERVAL '24 hours'
    AND expires_at IS NULL;

    -- Promote important short-term memories to long-term
    UPDATE agent_memory
    SET memory_type = 'long_term',
        expires_at = NULL
    WHERE agent_id = agent_uuid
    AND memory_type = 'short_term'
    AND importance_score > 0.8
    AND access_count > 2;

    -- Archive rarely accessed long-term memories (>90 days, low importance, low access)
    UPDATE agent_memory
    SET expires_at = NOW() + INTERVAL '30 days'
    WHERE agent_id = agent_uuid
    AND memory_type = 'long_term'
    AND created_at < NOW() - INTERVAL '90 days'
    AND importance_score < 0.3
    AND access_count < 2;
END;
$$ LANGUAGE plpgsql;

-- Memory Retrieval Function with Access Tracking
CREATE OR REPLACE FUNCTION get_agent_memories(
    agent_uuid UUID,
    query_text TEXT,
    mem_type VARCHAR DEFAULT NULL,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    memory_type VARCHAR,
    importance_score DECIMAL,
    access_count INTEGER,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Update access counts
    UPDATE agent_memory
    SET access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE agent_id = agent_uuid
    AND (mem_type IS NULL OR memory_type = mem_type)
    AND (
        content ILIKE '%' || query_text || '%'
        OR query_text = ANY(tags)
    );

    -- Return memories
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.memory_type,
        m.importance_score,
        m.access_count,
        m.tags,
        m.created_at
    FROM agent_memory m
    WHERE m.agent_id = agent_uuid
    AND (mem_type IS NULL OR m.memory_type = mem_type)
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
    AND (
        m.content ILIKE '%' || query_text || '%'
        OR query_text = ANY(m.tags)
    )
    ORDER BY
        m.importance_score DESC,
        m.access_count DESC,
        m.created_at DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Knowledge Graph Query Function
CREATE OR REPLACE FUNCTION get_related_entities(
    ent_type VARCHAR,
    ent_id TEXT,
    max_depth INTEGER DEFAULT 2
)
RETURNS TABLE (
    entity_type VARCHAR,
    entity_id TEXT,
    entity_name TEXT,
    relationship_type VARCHAR,
    depth INTEGER
) AS $$
WITH RECURSIVE related AS (
    -- Base case: direct relationships
    SELECT
        k.related_to_type as entity_type,
        k.related_to_id as entity_id,
        '' as entity_name,
        k.relationship_type,
        1 as depth
    FROM agent_knowledge_graph k
    WHERE k.entity_type = ent_type
    AND k.entity_id = ent_id
    AND k.related_to_type IS NOT NULL

    UNION ALL

    -- Recursive case: relationships of relationships
    SELECT
        k.related_to_type,
        k.related_to_id,
        '',
        k.relationship_type,
        r.depth + 1
    FROM agent_knowledge_graph k
    INNER JOIN related r ON
        k.entity_type = r.entity_type
        AND k.entity_id = r.entity_id
    WHERE r.depth < max_depth
    AND k.related_to_type IS NOT NULL
)
SELECT DISTINCT * FROM related;
$$ LANGUAGE SQL;

-- RLS Policies
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reasoning_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_graph ENABLE ROW LEVEL SECURITY;

-- Agent Memory Policies
CREATE POLICY "Agents can access own enterprise memory"
    ON agent_memory FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Agents can create memory"
    ON agent_memory FOR INSERT
    WITH CHECK (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Agents can update own memory"
    ON agent_memory FOR UPDATE
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

-- Agent Learning Policies
CREATE POLICY "Users can view own enterprise learning"
    ON agent_learning FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Agents can create learning"
    ON agent_learning FOR INSERT
    WITH CHECK (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

-- Reasoning Traces Policies (Admin only for debugging)
CREATE POLICY "Admins can view reasoning traces"
    ON agent_reasoning_traces FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_id = auth.uid()
            AND users.role IN ('admin', 'owner')
        )
    );

-- Knowledge Graph Policies
CREATE POLICY "Users can view own enterprise knowledge graph"
    ON agent_knowledge_graph FOR SELECT
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "System can manage knowledge graph"
    ON agent_knowledge_graph FOR ALL
    USING (enterprise_id IN (SELECT enterprise_id FROM users WHERE auth_id = auth.uid()));

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE ON agent_memory TO authenticated;
GRANT SELECT, INSERT, UPDATE ON agent_learning TO authenticated;
GRANT SELECT, INSERT ON agent_reasoning_traces TO authenticated;
GRANT SELECT, INSERT, UPDATE ON agent_knowledge_graph TO authenticated;

-- Cleanup Job (scheduled via pg_cron if available)
COMMENT ON FUNCTION consolidate_agent_memory IS 'Run periodically (daily) to consolidate and manage agent memories';
