-- Migration: Continual Learning System
-- Description: Tables and functions for agent continual learning with EWC and memory consolidation

-- Create continual learning state table
CREATE TABLE IF NOT EXISTS continual_learning_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  state_data JSONB NOT NULL DEFAULT '{}',
  last_consolidation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint per enterprise and agent type
  CONSTRAINT unique_cl_state_per_agent UNIQUE (enterprise_id, agent_type),
  
  -- Indexes
  INDEX idx_cl_state_enterprise (enterprise_id),
  INDEX idx_cl_state_agent_type (agent_type),
  INDEX idx_cl_state_last_consolidation (last_consolidation)
);

-- Create continual learning tasks table
CREATE TABLE IF NOT EXISTS continual_learning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  task_id TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_cl_tasks_enterprise (enterprise_id),
  INDEX idx_cl_tasks_agent_type (agent_type),
  INDEX idx_cl_tasks_task_id (task_id),
  INDEX idx_cl_tasks_status (status),
  INDEX idx_cl_tasks_started_at (started_at)
);

-- Create continual learning experiences table
CREATE TABLE IF NOT EXISTS continual_learning_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  task_id TEXT NOT NULL,
  experience_data JSONB NOT NULL,
  importance FLOAT NOT NULL DEFAULT 0.5,
  replay_count INTEGER NOT NULL DEFAULT 0,
  compressed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_cl_exp_enterprise (enterprise_id),
  INDEX idx_cl_exp_agent_type (agent_type),
  INDEX idx_cl_exp_task_id (task_id),
  INDEX idx_cl_exp_importance (importance DESC),
  INDEX idx_cl_exp_created_at (created_at)
);

-- Create continual learning consolidations table
CREATE TABLE IF NOT EXISTS continual_learning_consolidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  consolidation_metrics JSONB NOT NULL,
  knowledge_retention FLOAT,
  compression_ratio FLOAT,
  semantic_preservation FLOAT,
  emergent_patterns INTEGER,
  consolidation_efficiency FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_cl_consol_enterprise (enterprise_id),
  INDEX idx_cl_consol_agent_type (agent_type),
  INDEX idx_cl_consol_created_at (created_at DESC)
);

-- Create knowledge graph nodes table
CREATE TABLE IF NOT EXISTS cl_knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  node_id TEXT NOT NULL,
  content JSONB NOT NULL,
  node_type TEXT NOT NULL,
  embedding vector(128),
  activation_level FLOAT NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT unique_knowledge_node UNIQUE (enterprise_id, agent_type, node_id),
  
  -- Indexes
  INDEX idx_cl_nodes_enterprise (enterprise_id),
  INDEX idx_cl_nodes_agent_type (agent_type),
  INDEX idx_cl_nodes_type (node_type),
  INDEX idx_cl_nodes_activation (activation_level DESC)
);

-- Create knowledge graph edges table
CREATE TABLE IF NOT EXISTS cl_knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  strength FLOAT NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_cl_edges_enterprise (enterprise_id),
  INDEX idx_cl_edges_agent_type (agent_type),
  INDEX idx_cl_edges_source (source_node_id),
  INDEX idx_cl_edges_target (target_node_id),
  INDEX idx_cl_edges_strength (strength DESC)
);

-- Create cross-task patterns table
CREATE TABLE IF NOT EXISTS cl_cross_task_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  source_tasks TEXT[] NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.0,
  applicability TEXT[] DEFAULT '{}',
  emergent_behavior TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT unique_cross_task_pattern UNIQUE (enterprise_id, agent_type, pattern_id),
  
  -- Indexes
  INDEX idx_cl_patterns_enterprise (enterprise_id),
  INDEX idx_cl_patterns_agent_type (agent_type),
  INDEX idx_cl_patterns_confidence (confidence DESC)
);

-- Enable Row Level Security
ALTER TABLE continual_learning_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE continual_learning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE continual_learning_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE continual_learning_consolidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cl_knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cl_knowledge_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE cl_cross_task_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their enterprise's continual learning data"
  ON continual_learning_state FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM enterprise_users 
    WHERE enterprise_id = continual_learning_state.enterprise_id
  ));

CREATE POLICY "Service role has full access to continual learning"
  ON continual_learning_state FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Apply same policies to other tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'continual_learning_tasks',
    'continual_learning_experiences', 
    'continual_learning_consolidations',
    'cl_knowledge_nodes',
    'cl_knowledge_edges',
    'cl_cross_task_patterns'
  ])
  LOOP
    EXECUTE format('
      CREATE POLICY "Users can view their enterprise data"
        ON %I FOR SELECT
        USING (auth.uid() IN (
          SELECT user_id FROM enterprise_users 
          WHERE enterprise_id = %I.enterprise_id
        ))', tbl, tbl);
    
    EXECUTE format('
      CREATE POLICY "Service role has full access"
        ON %I FOR ALL
        USING (auth.jwt()->>''role'' = ''service_role'')', tbl);
  END LOOP;
END $$;

-- Function to get continual learning statistics
CREATE OR REPLACE FUNCTION get_continual_learning_stats(
  p_enterprise_id UUID,
  p_agent_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  agent_type TEXT,
  total_tasks BIGINT,
  completed_tasks BIGINT,
  average_retention FLOAT,
  total_experiences BIGINT,
  knowledge_nodes BIGINT,
  knowledge_edges BIGINT,
  cross_task_patterns BIGINT,
  last_consolidation TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cls.agent_type,
    COUNT(DISTINCT clt.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN clt.status = 'completed' THEN clt.id END) AS completed_tasks,
    AVG((clt.performance_metrics->>'knowledgeRetention')::FLOAT) AS average_retention,
    COUNT(DISTINCT cle.id) AS total_experiences,
    COUNT(DISTINCT cln.id) AS knowledge_nodes,
    COUNT(DISTINCT clg.id) AS knowledge_edges,
    COUNT(DISTINCT ctp.id) AS cross_task_patterns,
    MAX(cls.last_consolidation) AS last_consolidation
  FROM continual_learning_state cls
  LEFT JOIN continual_learning_tasks clt ON cls.enterprise_id = clt.enterprise_id 
    AND cls.agent_type = clt.agent_type
  LEFT JOIN continual_learning_experiences cle ON cls.enterprise_id = cle.enterprise_id 
    AND cls.agent_type = cle.agent_type
  LEFT JOIN cl_knowledge_nodes cln ON cls.enterprise_id = cln.enterprise_id 
    AND cls.agent_type = cln.agent_type
  LEFT JOIN cl_knowledge_edges clg ON cls.enterprise_id = clg.enterprise_id 
    AND cls.agent_type = clg.agent_type
  LEFT JOIN cl_cross_task_patterns ctp ON cls.enterprise_id = ctp.enterprise_id 
    AND cls.agent_type = ctp.agent_type
  WHERE cls.enterprise_id = p_enterprise_id
    AND (p_agent_type IS NULL OR cls.agent_type = p_agent_type)
  GROUP BY cls.agent_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old experiences (memory management)
CREATE OR REPLACE FUNCTION cleanup_old_experiences(
  p_enterprise_id UUID,
  p_agent_type TEXT,
  p_retention_days INTEGER DEFAULT 30,
  p_keep_important BOOLEAN DEFAULT TRUE
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete old, low-importance experiences
  WITH deleted AS (
    DELETE FROM continual_learning_experiences
    WHERE enterprise_id = p_enterprise_id
      AND agent_type = p_agent_type
      AND created_at < NOW() - INTERVAL '1 day' * p_retention_days
      AND (NOT p_keep_important OR importance < 0.7)
      AND replay_count < 5
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get knowledge graph for visualization
CREATE OR REPLACE FUNCTION get_knowledge_graph(
  p_enterprise_id UUID,
  p_agent_type TEXT,
  p_min_activation FLOAT DEFAULT 0.3,
  p_min_strength FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  nodes JSONB,
  edges JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_nodes AS (
    SELECT 
      node_id,
      content,
      node_type,
      activation_level
    FROM cl_knowledge_nodes
    WHERE enterprise_id = p_enterprise_id
      AND agent_type = p_agent_type
      AND activation_level >= p_min_activation
  ),
  filtered_edges AS (
    SELECT 
      source_node_id,
      target_node_id,
      relationship,
      strength
    FROM cl_knowledge_edges
    WHERE enterprise_id = p_enterprise_id
      AND agent_type = p_agent_type
      AND strength >= p_min_strength
      AND source_node_id IN (SELECT node_id FROM filtered_nodes)
      AND target_node_id IN (SELECT node_id FROM filtered_nodes)
  )
  SELECT 
    (SELECT jsonb_agg(row_to_json(n.*)) FROM filtered_nodes n) AS nodes,
    (SELECT jsonb_agg(row_to_json(e.*)) FROM filtered_edges e) AS edges;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar knowledge across agents
CREATE OR REPLACE FUNCTION find_similar_knowledge(
  p_enterprise_id UUID,
  p_query_embedding vector(128),
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  agent_type TEXT,
  node_id TEXT,
  content JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cln.agent_type,
    cln.node_id,
    cln.content,
    1 - (cln.embedding <=> p_query_embedding) AS similarity
  FROM cl_knowledge_nodes cln
  WHERE cln.enterprise_id = p_enterprise_id
    AND cln.embedding IS NOT NULL
    AND 1 - (cln.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_continual_learning_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cl_state_timestamp
  BEFORE UPDATE ON continual_learning_state
  FOR EACH ROW
  EXECUTE FUNCTION update_continual_learning_timestamp();

CREATE TRIGGER update_cl_nodes_timestamp
  BEFORE UPDATE ON cl_knowledge_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_continual_learning_timestamp();

CREATE TRIGGER update_cl_edges_timestamp
  BEFORE UPDATE ON cl_knowledge_edges
  FOR EACH ROW
  EXECUTE FUNCTION update_continual_learning_timestamp();

CREATE TRIGGER update_cl_patterns_timestamp
  BEFORE UPDATE ON cl_cross_task_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_continual_learning_timestamp();

-- Create indexes for vector similarity search
CREATE INDEX idx_cl_nodes_embedding ON cl_knowledge_nodes 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Add comments
COMMENT ON TABLE continual_learning_state IS 'Stores the complete continual learning state for each agent type per enterprise';
COMMENT ON TABLE continual_learning_tasks IS 'Tracks individual learning tasks and their performance metrics';
COMMENT ON TABLE continual_learning_experiences IS 'Stores experiences for replay and consolidation';
COMMENT ON TABLE continual_learning_consolidations IS 'Logs consolidation events and their effectiveness metrics';
COMMENT ON TABLE cl_knowledge_nodes IS 'Knowledge graph nodes representing learned concepts and patterns';
COMMENT ON TABLE cl_knowledge_edges IS 'Relationships between knowledge nodes in the graph';
COMMENT ON TABLE cl_cross_task_patterns IS 'Patterns that emerge across multiple tasks, enabling transfer learning';