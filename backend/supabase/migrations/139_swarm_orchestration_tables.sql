-- Swarm Orchestration Tables
--
-- Creates tables for swarm intelligence integration:
-- - agent_performance_history: Tracks agent performance for fitness evaluation
-- - agent_pheromones: Stores pheromone trails for ACO workflow learning
-- - agent_swarm_patterns: Stores learned collaboration patterns
--
-- Phase 2: agent_performance_history (PSO agent selection)
-- Phase 3: agent_pheromones (ACO workflow optimization)
-- Phase 5: agent_swarm_patterns (Pattern learning)

-- ==================================================
-- PHASE 2: Agent Performance History
-- ==================================================

CREATE TABLE IF NOT EXISTS agent_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  request_type TEXT NOT NULL,

  -- Execution metrics
  success BOOLEAN NOT NULL,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  duration_ms INTEGER NOT NULL,

  -- Request signature for pattern matching
  request_signature JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Multi-tenant isolation
  CONSTRAINT fk_enterprise
    FOREIGN KEY (enterprise_id)
    REFERENCES enterprises(id)
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_agent_performance_lookup
  ON agent_performance_history(enterprise_id, agent_type, request_type);

CREATE INDEX idx_agent_performance_time
  ON agent_performance_history(executed_at DESC);

CREATE INDEX idx_agent_performance_signature
  ON agent_performance_history USING gin(request_signature);

-- RLS policies
ALTER TABLE agent_performance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_performance_enterprise_isolation
  ON agent_performance_history
  FOR ALL
  USING (
    enterprise_id IN (
      SELECT enterprise_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE agent_performance_history IS
  'Tracks agent execution performance for PSO fitness evaluation';

COMMENT ON COLUMN agent_performance_history.request_signature IS
  'JSONB signature for pattern matching (type, complexity, entities)';

COMMENT ON COLUMN agent_performance_history.confidence IS
  'Agent confidence score (0-1)';


-- ==================================================
-- PHASE 3: Pheromone Trails
-- ==================================================

CREATE TABLE IF NOT EXISTS agent_pheromones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Pheromone location
  field_id TEXT NOT NULL,
  position JSONB NOT NULL,

  -- Pheromone properties
  pheromone_type TEXT NOT NULL CHECK (
    pheromone_type IN (
      'trail', 'quality', 'convergence', 'food',
      'attraction', 'repulsion', 'alarm', 'boundary'
    )
  ),
  strength DECIMAL(4,2) NOT NULL CHECK (strength >= 0 AND strength <= 10),
  evaporation_rate DECIMAL(3,2) NOT NULL DEFAULT 0.10 CHECK (
    evaporation_rate >= 0 AND evaporation_rate <= 1
  ),

  -- Tracking
  deposited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reinforced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reinforcement_count INTEGER NOT NULL DEFAULT 1,

  -- Metadata
  depositor_id TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Multi-tenant isolation
  CONSTRAINT fk_enterprise_pheromone
    FOREIGN KEY (enterprise_id)
    REFERENCES enterprises(id)
    ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_pheromone_lookup
  ON agent_pheromones(enterprise_id, field_id, pheromone_type);

CREATE INDEX idx_pheromone_strength
  ON agent_pheromones(strength DESC);

CREATE INDEX idx_pheromone_deposited
  ON agent_pheromones(deposited_at DESC);

CREATE INDEX idx_pheromone_position
  ON agent_pheromones USING gin(position);

-- RLS policies
ALTER TABLE agent_pheromones ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_pheromones_enterprise_isolation
  ON agent_pheromones
  FOR ALL
  USING (
    enterprise_id IN (
      SELECT enterprise_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_pheromone_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pheromone_timestamp
  BEFORE UPDATE ON agent_pheromones
  FOR EACH ROW
  EXECUTE FUNCTION update_pheromone_timestamp();

-- Comments
COMMENT ON TABLE agent_pheromones IS
  'Stores pheromone trails for ACO-based workflow optimization';

COMMENT ON COLUMN agent_pheromones.strength IS
  'Pheromone strength (0-10), decays via evaporation_rate';

COMMENT ON COLUMN agent_pheromones.reinforcement_count IS
  'Number of times pheromone has been reinforced (5+ promoted to DB)';


-- ==================================================
-- PHASE 5: Swarm Patterns (Placeholder for now)
-- ==================================================

CREATE TABLE IF NOT EXISTS agent_swarm_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Pattern identification
  pattern_type TEXT NOT NULL CHECK (
    pattern_type IN ('sequential', 'parallel', 'conditional', 'escalation')
  ),
  name TEXT NOT NULL,
  description TEXT,

  -- Pattern definition
  request_signature JSONB NOT NULL,
  agent_sequence TEXT[] NOT NULL,

  -- Performance metrics
  success_rate DECIMAL(3,2) CHECK (success_rate >= 0 AND success_rate <= 1),
  avg_confidence DECIMAL(3,2) CHECK (avg_confidence >= 0 AND avg_confidence <= 1),
  avg_duration_ms INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,

  -- Pattern quality
  emergence_score DECIMAL(3,2) CHECK (emergence_score >= 0 AND emergence_score <= 1),

  -- Tracking
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Multi-tenant isolation
  CONSTRAINT fk_enterprise_pattern
    FOREIGN KEY (enterprise_id)
    REFERENCES enterprises(id)
    ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_pattern_lookup
  ON agent_swarm_patterns(enterprise_id, pattern_type);

CREATE INDEX idx_pattern_performance
  ON agent_swarm_patterns(success_rate DESC, usage_count DESC);

CREATE INDEX idx_pattern_signature
  ON agent_swarm_patterns USING gin(request_signature);

-- RLS policies
ALTER TABLE agent_swarm_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_swarm_patterns_enterprise_isolation
  ON agent_swarm_patterns
  FOR ALL
  USING (
    enterprise_id IN (
      SELECT enterprise_id
      FROM users
      WHERE id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE agent_swarm_patterns IS
  'Stores learned collaboration patterns with 80%+ success rates';

COMMENT ON COLUMN agent_swarm_patterns.emergence_score IS
  'Indicates organic discovery (1.0) vs manual design (0.0)';

COMMENT ON COLUMN agent_swarm_patterns.request_signature IS
  'JSONB pattern for matching similar requests';


-- ==================================================
-- Helper Functions
-- ==================================================

-- Function to evaporate pheromones (called by cron)
CREATE OR REPLACE FUNCTION evaporate_pheromones()
RETURNS INTEGER AS $$
DECLARE
  evaporated_count INTEGER;
BEGIN
  -- Reduce strength by evaporation_rate
  UPDATE agent_pheromones
  SET
    strength = GREATEST(0, strength * (1 - evaporation_rate)),
    updated_at = NOW()
  WHERE strength > 0.01; -- Only evaporate non-negligible pheromones

  GET DIAGNOSTICS evaporated_count = ROW_COUNT;

  -- Delete pheromones that have evaporated to negligible strength
  DELETE FROM agent_pheromones
  WHERE strength < 0.01;

  -- Delete pheromones older than 90 days (retention limit)
  DELETE FROM agent_pheromones
  WHERE deposited_at < NOW() - INTERVAL '90 days';

  RETURN evaporated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION evaporate_pheromones IS
  'Daily evaporation of pheromone trails (10% decay)';


-- Function to record agent performance
CREATE OR REPLACE FUNCTION record_agent_performance(
  p_enterprise_id UUID,
  p_agent_type TEXT,
  p_request_type TEXT,
  p_success BOOLEAN,
  p_confidence DECIMAL,
  p_duration_ms INTEGER,
  p_request_signature JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO agent_performance_history (
    enterprise_id,
    agent_type,
    request_type,
    success,
    confidence,
    duration_ms,
    request_signature
  ) VALUES (
    p_enterprise_id,
    p_agent_type,
    p_request_type,
    p_success,
    p_confidence,
    p_duration_ms,
    p_request_signature
  )
  RETURNING id INTO v_record_id;

  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_agent_performance IS
  'Helper function to record agent execution performance';


-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON agent_performance_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_pheromones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON agent_swarm_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION record_agent_performance TO authenticated;
GRANT EXECUTE ON FUNCTION evaporate_pheromones TO service_role;
