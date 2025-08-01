-- Create tables for the causal reasoning system

-- Causal graphs storage
CREATE TABLE IF NOT EXISTS causal_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  graph_name VARCHAR(100) NOT NULL,
  graph_data JSONB NOT NULL, -- Serialized CausalGraph
  domain VARCHAR(50),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_type, enterprise_id, graph_name, version)
);

-- Structural causal models
CREATE TABLE IF NOT EXISTS structural_causal_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  model_name VARCHAR(100) NOT NULL,
  graph_id UUID REFERENCES causal_graphs(id),
  equations JSONB NOT NULL, -- Serialized equations
  noise_distributions JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Causal effects history
CREATE TABLE IF NOT EXISTS causal_effects_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  query_type VARCHAR(20) NOT NULL CHECK (query_type IN ('observational', 'interventional', 'counterfactual')),
  query_data JSONB NOT NULL,
  effect_result JSONB NOT NULL,
  confidence DECIMAL(3, 2),
  identifiable BOOLEAN,
  method_used VARCHAR(50),
  computation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Causal insights log
CREATE TABLE IF NOT EXISTS causal_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,
  source_variable VARCHAR(100),
  target_variable VARCHAR(100),
  strength DECIMAL(3, 2),
  confidence DECIMAL(3, 2),
  description TEXT,
  implications JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intervention results
CREATE TABLE IF NOT EXISTS intervention_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  intervention_variables JSONB NOT NULL,
  target_outcomes JSONB NOT NULL,
  causal_effects JSONB NOT NULL,
  side_effects JSONB,
  confidence DECIMAL(3, 2),
  recommendation TEXT,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Counterfactual results
CREATE TABLE IF NOT EXISTS counterfactual_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  factual_state JSONB NOT NULL,
  counterfactual_state JSONB NOT NULL,
  intervention JSONB NOT NULL,
  difference JSONB NOT NULL,
  probability DECIMAL(3, 2),
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Causal discovery results
CREATE TABLE IF NOT EXISTS causal_discovery_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  data_source VARCHAR(100),
  discovered_graph_id UUID REFERENCES causal_graphs(id),
  discovery_method VARCHAR(50),
  score DECIMAL(10, 6),
  confidence DECIMAL(3, 2),
  assumptions JSONB,
  alternative_graphs JSONB, -- Top alternative graph structures
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mediation analysis results
CREATE TABLE IF NOT EXISTS mediation_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  treatment_variable VARCHAR(100) NOT NULL,
  mediator_variable VARCHAR(100) NOT NULL,
  outcome_variable VARCHAR(100) NOT NULL,
  direct_effect DECIMAL(10, 6),
  indirect_effect DECIMAL(10, 6),
  total_effect DECIMAL(10, 6),
  proportion_mediated DECIMAL(3, 2),
  confidence_intervals JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Causal bounds (for non-identifiable effects)
CREATE TABLE IF NOT EXISTS causal_bounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  query_data JSONB NOT NULL,
  lower_bound DECIMAL(10, 6),
  upper_bound DECIMAL(10, 6),
  tight_bounds BOOLEAN,
  method VARCHAR(50),
  assumptions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_causal_graphs_lookup ON causal_graphs(agent_type, enterprise_id, graph_name, is_active);
CREATE INDEX idx_causal_graphs_domain ON causal_graphs(domain);

CREATE INDEX idx_causal_effects_agent ON causal_effects_history(agent_type, enterprise_id);
CREATE INDEX idx_causal_effects_created ON causal_effects_history(created_at);
CREATE INDEX idx_causal_effects_query_type ON causal_effects_history(query_type);

CREATE INDEX idx_causal_insights_agent ON causal_insights(agent_type, enterprise_id);
CREATE INDEX idx_causal_insights_variables ON causal_insights(source_variable, target_variable);
CREATE INDEX idx_causal_insights_type ON causal_insights(insight_type);

CREATE INDEX idx_intervention_results_agent ON intervention_results(agent_type, enterprise_id);
CREATE INDEX idx_intervention_results_applied ON intervention_results(applied);

CREATE INDEX idx_counterfactual_results_agent ON counterfactual_results(agent_type, enterprise_id);

-- RLS policies
ALTER TABLE causal_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE structural_causal_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_effects_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterfactual_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_discovery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediation_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_bounds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Causal graphs isolated by enterprise" ON causal_graphs
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "SCMs isolated by enterprise" ON structural_causal_models
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Causal effects isolated by enterprise" ON causal_effects_history
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Causal insights isolated by enterprise" ON causal_insights
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Intervention results isolated by enterprise" ON intervention_results
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Counterfactual results isolated by enterprise" ON counterfactual_results
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Discovery results isolated by enterprise" ON causal_discovery_results
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Mediation results isolated by enterprise" ON mediation_analysis_results
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Causal bounds isolated by enterprise" ON causal_bounds
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

-- Functions for causal analysis

-- Get causal effect summary
CREATE OR REPLACE FUNCTION get_causal_effect_summary(
  p_agent_type VARCHAR,
  p_enterprise_id UUID,
  p_time_window INTERVAL DEFAULT '30 days'
)
RETURNS TABLE (
  query_type VARCHAR,
  total_queries INTEGER,
  avg_confidence DECIMAL,
  identifiable_rate DECIMAL,
  avg_computation_time_ms INTEGER,
  most_common_method VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH effect_stats AS (
    SELECT 
      query_type,
      COUNT(*) as query_count,
      AVG(confidence) as avg_conf,
      AVG(CASE WHEN identifiable THEN 1.0 ELSE 0.0 END) as id_rate,
      AVG(computation_time_ms) as avg_time,
      MODE() WITHIN GROUP (ORDER BY method_used) as common_method
    FROM causal_effects_history
    WHERE agent_type = p_agent_type
      AND enterprise_id = p_enterprise_id
      AND created_at >= NOW() - p_time_window
    GROUP BY query_type
  )
  SELECT 
    query_type,
    query_count::INTEGER as total_queries,
    ROUND(avg_conf, 2) as avg_confidence,
    ROUND(id_rate, 2) as identifiable_rate,
    ROUND(avg_time)::INTEGER as avg_computation_time_ms,
    common_method as most_common_method
  FROM effect_stats
  ORDER BY query_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Get top causal insights
CREATE OR REPLACE FUNCTION get_top_causal_insights(
  p_agent_type VARCHAR,
  p_enterprise_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  insight_type VARCHAR,
  source_variable VARCHAR,
  target_variable VARCHAR,
  avg_strength DECIMAL,
  avg_confidence DECIMAL,
  occurrence_count INTEGER,
  top_implication TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH insight_groups AS (
    SELECT 
      insight_type,
      source_variable,
      target_variable,
      AVG(strength) as avg_str,
      AVG(confidence) as avg_conf,
      COUNT(*) as count,
      ARRAY_AGG(implications ORDER BY created_at DESC) as all_implications
    FROM causal_insights
    WHERE agent_type = p_agent_type
      AND enterprise_id = p_enterprise_id
    GROUP BY insight_type, source_variable, target_variable
  )
  SELECT 
    insight_type,
    source_variable,
    target_variable,
    ROUND(avg_str, 2) as avg_strength,
    ROUND(avg_conf, 2) as avg_confidence,
    count::INTEGER as occurrence_count,
    (all_implications[1]->0)::TEXT as top_implication
  FROM insight_groups
  ORDER BY avg_str * avg_conf * count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get intervention recommendations
CREATE OR REPLACE FUNCTION get_intervention_recommendations(
  p_agent_type VARCHAR,
  p_enterprise_id UUID,
  p_target_variable VARCHAR,
  p_applied_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  intervention_id UUID,
  intervention_variables JSONB,
  expected_effect DECIMAL,
  confidence DECIMAL,
  recommendation TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as intervention_id,
    intervention_variables,
    (causal_effects->>p_target_variable)::DECIMAL as expected_effect,
    confidence,
    recommendation,
    created_at
  FROM intervention_results
  WHERE agent_type = p_agent_type
    AND enterprise_id = p_enterprise_id
    AND causal_effects ? p_target_variable
    AND (NOT p_applied_only OR applied = TRUE)
  ORDER BY ABS((causal_effects->>p_target_variable)::DECIMAL) * confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- Analyze counterfactual patterns
CREATE OR REPLACE FUNCTION analyze_counterfactual_patterns(
  p_agent_type VARCHAR,
  p_enterprise_id UUID,
  p_min_occurrences INTEGER DEFAULT 5
)
RETURNS TABLE (
  intervention_pattern JSONB,
  avg_effect_size DECIMAL,
  success_rate DECIMAL,
  pattern_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH pattern_analysis AS (
    SELECT 
      intervention,
      AVG(
        (SELECT AVG((value::DECIMAL)) 
         FROM jsonb_each_text(difference) 
         WHERE key NOT LIKE '%_id')
      ) as avg_effect,
      AVG(CASE WHEN probability > 0.7 THEN 1.0 ELSE 0.0 END) as success,
      COUNT(*) as count
    FROM counterfactual_results
    WHERE agent_type = p_agent_type
      AND enterprise_id = p_enterprise_id
    GROUP BY intervention
  )
  SELECT 
    intervention as intervention_pattern,
    ROUND(avg_effect, 3) as avg_effect_size,
    ROUND(success, 2) as success_rate,
    count::INTEGER as pattern_count
  FROM pattern_analysis
  WHERE count >= p_min_occurrences
  ORDER BY success DESC, avg_effect DESC;
END;
$$ LANGUAGE plpgsql;

-- Get causal graph evolution
CREATE OR REPLACE FUNCTION get_causal_graph_evolution(
  p_agent_type VARCHAR,
  p_enterprise_id UUID,
  p_graph_name VARCHAR
)
RETURNS TABLE (
  version INTEGER,
  node_count INTEGER,
  edge_count INTEGER,
  created_at TIMESTAMPTZ,
  changes_from_previous JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH graph_versions AS (
    SELECT 
      version,
      (SELECT COUNT(*) FROM jsonb_object_keys(graph_data->'nodes')) as node_count,
      (SELECT COUNT(*) FROM jsonb_object_keys(graph_data->'edges')) as edge_count,
      created_at,
      graph_data,
      LAG(graph_data) OVER (ORDER BY version) as prev_graph_data
    FROM causal_graphs
    WHERE agent_type = p_agent_type
      AND enterprise_id = p_enterprise_id
      AND graph_name = p_graph_name
    ORDER BY version
  )
  SELECT 
    version,
    node_count::INTEGER,
    edge_count::INTEGER,
    created_at,
    CASE 
      WHEN prev_graph_data IS NULL THEN NULL
      ELSE jsonb_build_object(
        'nodes_added', (SELECT COUNT(*) FROM jsonb_object_keys(graph_data->'nodes') 
                       WHERE NOT (prev_graph_data->'nodes' ? jsonb_object_keys(graph_data->'nodes'))),
        'nodes_removed', (SELECT COUNT(*) FROM jsonb_object_keys(prev_graph_data->'nodes') 
                         WHERE NOT (graph_data->'nodes' ? jsonb_object_keys(prev_graph_data->'nodes'))),
        'edges_changed', ABS(edge_count - (SELECT COUNT(*) FROM jsonb_object_keys(prev_graph_data->'edges')))
      )
    END as changes_from_previous
  FROM graph_versions;
END;
$$ LANGUAGE plpgsql;