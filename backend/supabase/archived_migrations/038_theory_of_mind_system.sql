-- Create tables for the Theory of Mind system

-- Mental states storage
CREATE TABLE IF NOT EXISTS mental_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(100) NOT NULL,
  agent_type VARCHAR(20) NOT NULL CHECK (agent_type IN ('human', 'ai', 'system')),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  beliefs JSONB NOT NULL DEFAULT '{}',
  desires JSONB NOT NULL DEFAULT '{}',
  intentions JSONB NOT NULL DEFAULT '{}',
  emotional_state JSONB,
  personality_traits JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Observed behaviors log
CREATE TABLE IF NOT EXISTS observed_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_agent_id VARCHAR(100) NOT NULL,
  observed_agent_id VARCHAR(100) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  actions JSONB NOT NULL,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intention recognition results
CREATE TABLE IF NOT EXISTS intention_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(100) NOT NULL,
  observer_id VARCHAR(100) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  intention_hypotheses JSONB NOT NULL,
  confidence DECIMAL(3, 2),
  supporting_evidence JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared beliefs tracking
CREATE TABLE IF NOT EXISTS shared_beliefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  belief_id VARCHAR(100) NOT NULL,
  belief_content TEXT NOT NULL,
  known_by_agents JSONB NOT NULL, -- Array of agent IDs
  certainty DECIMAL(3, 2),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  established_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationships between agents
CREATE TABLE IF NOT EXISTS agent_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a VARCHAR(100) NOT NULL,
  agent_b VARCHAR(100) NOT NULL,
  relationship_type VARCHAR(50) NOT NULL,
  trust_level DECIMAL(3, 2) DEFAULT 0.5,
  affinity DECIMAL(3, 2) DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_a, agent_b, enterprise_id)
);

-- Trust evidence tracking
CREATE TABLE IF NOT EXISTS trust_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID REFERENCES agent_relationships(id) ON DELETE CASCADE,
  evidence_type VARCHAR(50) NOT NULL,
  content TEXT,
  impact DECIMAL(3, 2),
  decay_rate DECIMAL(3, 2) DEFAULT 0.95,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Empathy models
CREATE TABLE IF NOT EXISTS empathy_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_agent VARCHAR(100) NOT NULL,
  target_agent VARCHAR(100) NOT NULL,
  emotional_simulation JSONB NOT NULL,
  situational_context JSONB,
  affective_forecast JSONB,
  empathic_concern DECIMAL(3, 2),
  personal_distress DECIMAL(3, 2),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perspective taking results
CREATE TABLE IF NOT EXISTS perspective_taking_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_agent VARCHAR(100) NOT NULL,
  target_agent VARCHAR(100) NOT NULL,
  situation JSONB NOT NULL,
  simulated_mental_state JSONB NOT NULL,
  assumptions JSONB NOT NULL,
  confidence DECIMAL(3, 2),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coordination plans
CREATE TABLE IF NOT EXISTS coordination_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal TEXT NOT NULL,
  participants JSONB NOT NULL, -- Map of agent IDs to roles
  shared_plan JSONB NOT NULL,
  contingencies JSONB,
  success_criteria JSONB,
  status VARCHAR(50) DEFAULT 'planning',
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication interpretations
CREATE TABLE IF NOT EXISTS communication_interpretations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(100),
  sender VARCHAR(100) NOT NULL,
  interpreter VARCHAR(100) NOT NULL,
  original_content TEXT NOT NULL,
  interpreted_intent JSONB NOT NULL,
  interpretation JSONB NOT NULL,
  confidence DECIMAL(3, 2),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recursive beliefs (I think that you think that I think...)
CREATE TABLE IF NOT EXISTS recursive_beliefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recursion_level INTEGER NOT NULL CHECK (recursion_level >= 0 AND recursion_level <= 3),
  holder_agent VARCHAR(100) NOT NULL,
  about_agent VARCHAR(100),
  belief_content JSONB NOT NULL,
  confidence DECIMAL(3, 2),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Theory of Mind insights log
CREATE TABLE IF NOT EXISTS tom_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(50) NOT NULL,
  agent_id VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  confidence DECIMAL(3, 2),
  implications JSONB,
  metadata JSONB,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_mental_states_agent ON mental_states(agent_id, enterprise_id);
CREATE INDEX idx_mental_states_updated ON mental_states(last_updated);

CREATE INDEX idx_observed_behaviors_observer ON observed_behaviors(observer_agent_id, enterprise_id);
CREATE INDEX idx_observed_behaviors_observed ON observed_behaviors(observed_agent_id, enterprise_id);
CREATE INDEX idx_observed_behaviors_timestamp ON observed_behaviors(timestamp);

CREATE INDEX idx_intention_recognitions_agent ON intention_recognitions(agent_id, enterprise_id);
CREATE INDEX idx_intention_recognitions_observer ON intention_recognitions(observer_id, enterprise_id);

CREATE INDEX idx_shared_beliefs_belief ON shared_beliefs(belief_id, enterprise_id);

CREATE INDEX idx_agent_relationships_agents ON agent_relationships(agent_a, agent_b, enterprise_id);
CREATE INDEX idx_agent_relationships_trust ON agent_relationships(trust_level);

CREATE INDEX idx_empathy_models_agents ON empathy_models(observer_agent, target_agent, enterprise_id);

CREATE INDEX idx_coordination_plans_status ON coordination_plans(status, enterprise_id);

CREATE INDEX idx_tom_insights_agent ON tom_insights(agent_id, enterprise_id);
CREATE INDEX idx_tom_insights_type ON tom_insights(insight_type);

-- RLS policies
ALTER TABLE mental_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE observed_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE intention_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_beliefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE empathy_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE perspective_taking_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordination_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursive_beliefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tom_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Mental states isolated by enterprise" ON mental_states
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Behaviors isolated by enterprise" ON observed_behaviors
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Intentions isolated by enterprise" ON intention_recognitions
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Shared beliefs isolated by enterprise" ON shared_beliefs
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Relationships isolated by enterprise" ON agent_relationships
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Trust evidence isolated by enterprise" ON trust_evidence
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Empathy models isolated by enterprise" ON empathy_models
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Perspective taking isolated by enterprise" ON perspective_taking_results
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Coordination plans isolated by enterprise" ON coordination_plans
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Interpretations isolated by enterprise" ON communication_interpretations
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Recursive beliefs isolated by enterprise" ON recursive_beliefs
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "ToM insights isolated by enterprise" ON tom_insights
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

-- Functions for Theory of Mind analysis

-- Get agent interaction summary
CREATE OR REPLACE FUNCTION get_agent_interaction_summary(
  p_agent_id VARCHAR,
  p_enterprise_id UUID,
  p_time_window INTERVAL DEFAULT '7 days'
)
RETURNS TABLE (
  other_agent VARCHAR,
  interaction_count INTEGER,
  trust_level DECIMAL,
  last_interaction TIMESTAMPTZ,
  dominant_intention VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH interactions AS (
    SELECT 
      CASE 
        WHEN agent_a = p_agent_id THEN agent_b 
        ELSE agent_a 
      END as other_agent,
      trust_level,
      interaction_count,
      updated_at
    FROM agent_relationships
    WHERE (agent_a = p_agent_id OR agent_b = p_agent_id)
      AND enterprise_id = p_enterprise_id
      AND updated_at >= NOW() - p_time_window
  ),
  intentions AS (
    SELECT 
      agent_id,
      (intention_hypotheses->0->>'intention'->>'action')::VARCHAR as top_intention
    FROM intention_recognitions
    WHERE observer_id = p_agent_id
      AND enterprise_id = p_enterprise_id
      AND created_at >= NOW() - p_time_window
  )
  SELECT 
    i.other_agent,
    i.interaction_count::INTEGER,
    i.trust_level,
    i.updated_at as last_interaction,
    COALESCE(int.top_intention, 'unknown') as dominant_intention
  FROM interactions i
  LEFT JOIN intentions int ON i.other_agent = int.agent_id
  ORDER BY i.interaction_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Analyze belief convergence in team
CREATE OR REPLACE FUNCTION analyze_belief_convergence(
  p_enterprise_id UUID,
  p_agent_group VARCHAR[] DEFAULT NULL
)
RETURNS TABLE (
  convergence_score DECIMAL,
  shared_belief_count INTEGER,
  total_unique_beliefs INTEGER,
  top_shared_beliefs JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH agent_beliefs AS (
    SELECT 
      jsonb_object_keys(beliefs) as belief_key,
      COUNT(DISTINCT agent_id) as agent_count
    FROM mental_states
    WHERE enterprise_id = p_enterprise_id
      AND (p_agent_group IS NULL OR agent_id = ANY(p_agent_group))
    GROUP BY belief_key
  ),
  shared AS (
    SELECT 
      belief_key,
      agent_count
    FROM agent_beliefs
    WHERE agent_count > 1
  )
  SELECT 
    CASE 
      WHEN COUNT(DISTINCT belief_key) > 0 
      THEN COUNT(*)::DECIMAL / COUNT(DISTINCT belief_key)
      ELSE 0 
    END as convergence_score,
    COUNT(*)::INTEGER as shared_belief_count,
    (SELECT COUNT(DISTINCT belief_key) FROM agent_beliefs)::INTEGER as total_unique_beliefs,
    jsonb_agg(
      jsonb_build_object(
        'belief', belief_key,
        'shared_by_count', agent_count
      ) ORDER BY agent_count DESC
    ) FILTER (WHERE agent_count > 1) as top_shared_beliefs
  FROM agent_beliefs;
END;
$$ LANGUAGE plpgsql;

-- Get empathy network for an agent
CREATE OR REPLACE FUNCTION get_empathy_network(
  p_agent_id VARCHAR,
  p_enterprise_id UUID,
  p_min_concern DECIMAL DEFAULT 0.5
)
RETURNS TABLE (
  target_agent VARCHAR,
  empathic_concern DECIMAL,
  personal_distress DECIMAL,
  emotional_valence DECIMAL,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    target_agent,
    empathic_concern,
    personal_distress,
    (emotional_simulation->>'valence')::DECIMAL as emotional_valence,
    created_at as last_updated
  FROM empathy_models
  WHERE observer_agent = p_agent_id
    AND enterprise_id = p_enterprise_id
    AND empathic_concern >= p_min_concern
  ORDER BY empathic_concern DESC;
END;
$$ LANGUAGE plpgsql;

-- Analyze coordination effectiveness
CREATE OR REPLACE FUNCTION analyze_coordination_effectiveness(
  p_enterprise_id UUID,
  p_time_window INTERVAL DEFAULT '30 days'
)
RETURNS TABLE (
  total_plans INTEGER,
  success_rate DECIMAL,
  avg_participants DECIMAL,
  common_failure_reasons JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH plan_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      AVG(jsonb_array_length(participants)) as avg_participants
    FROM coordination_plans
    WHERE enterprise_id = p_enterprise_id
      AND created_at >= NOW() - p_time_window
  ),
  failure_analysis AS (
    SELECT 
      jsonb_array_elements_text(contingencies->'triggered') as failure_reason,
      COUNT(*) as occurrence_count
    FROM coordination_plans
    WHERE enterprise_id = p_enterprise_id
      AND status = 'failed'
      AND created_at >= NOW() - p_time_window
      AND contingencies IS NOT NULL
    GROUP BY failure_reason
  )
  SELECT 
    total::INTEGER as total_plans,
    CASE 
      WHEN total > 0 THEN completed::DECIMAL / total
      ELSE 0 
    END as success_rate,
    avg_participants,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'reason', failure_reason,
          'count', occurrence_count
        ) ORDER BY occurrence_count DESC
      )
      FROM failure_analysis
    ) as common_failure_reasons
  FROM plan_stats;
END;
$$ LANGUAGE plpgsql;

-- Get trust dynamics over time
CREATE OR REPLACE FUNCTION get_trust_dynamics(
  p_agent_a VARCHAR,
  p_agent_b VARCHAR,
  p_enterprise_id UUID,
  p_time_buckets INTEGER DEFAULT 10
)
RETURNS TABLE (
  time_bucket TIMESTAMPTZ,
  trust_level DECIMAL,
  interaction_count INTEGER,
  significant_events JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH trust_history AS (
    SELECT 
      te.created_at,
      te.impact,
      te.content,
      ar.trust_level,
      ar.interaction_count
    FROM trust_evidence te
    JOIN agent_relationships ar ON te.relationship_id = ar.id
    WHERE ar.enterprise_id = p_enterprise_id
      AND ((ar.agent_a = p_agent_a AND ar.agent_b = p_agent_b) OR 
           (ar.agent_a = p_agent_b AND ar.agent_b = p_agent_a))
    ORDER BY te.created_at
  ),
  time_series AS (
    SELECT 
      time_bucket_gapfill(
        p_time_buckets, 
        created_at, 
        MIN(created_at), 
        MAX(created_at)
      ) as bucket,
      AVG(trust_level) as avg_trust,
      MAX(interaction_count) as max_interactions,
      jsonb_agg(
        CASE 
          WHEN ABS(impact) > 0.1 
          THEN jsonb_build_object(
            'time', created_at,
            'impact', impact,
            'content', content
          )
          ELSE NULL
        END
      ) FILTER (WHERE ABS(impact) > 0.1) as events
    FROM trust_history
    GROUP BY bucket
  )
  SELECT 
    bucket as time_bucket,
    COALESCE(avg_trust, 0.5) as trust_level,
    COALESCE(max_interactions, 0) as interaction_count,
    events as significant_events
  FROM time_series
  ORDER BY bucket;
END;
$$ LANGUAGE plpgsql;

-- Detect belief propagation patterns
CREATE OR REPLACE FUNCTION detect_belief_propagation(
  p_belief_content TEXT,
  p_enterprise_id UUID,
  p_time_window INTERVAL DEFAULT '1 day'
)
RETURNS TABLE (
  propagation_path JSONB,
  propagation_speed DECIMAL,
  influence_nodes VARCHAR[]
) AS $$
BEGIN
  RETURN QUERY
  WITH belief_timeline AS (
    SELECT 
      agent_id,
      created_at,
      (beliefs->>p_belief_content)::JSONB as belief_data
    FROM mental_states
    WHERE enterprise_id = p_enterprise_id
      AND beliefs ? p_belief_content
      AND created_at >= NOW() - p_time_window
    ORDER BY created_at
  ),
  propagation AS (
    SELECT 
      agent_id,
      created_at,
      LAG(agent_id) OVER (ORDER BY created_at) as from_agent,
      LAG(created_at) OVER (ORDER BY created_at) as from_time,
      created_at - LAG(created_at) OVER (ORDER BY created_at) as time_diff
    FROM belief_timeline
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'agent', agent_id,
        'time', created_at,
        'from_agent', from_agent,
        'propagation_time', time_diff
      ) ORDER BY created_at
    ) as propagation_path,
    CASE 
      WHEN COUNT(*) > 1 
      THEN COUNT(*)::DECIMAL / EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) * 3600
      ELSE 0 
    END as propagation_speed,
    ARRAY_AGG(DISTINCT agent_id ORDER BY created_at) as influence_nodes
  FROM propagation;
END;
$$ LANGUAGE plpgsql;