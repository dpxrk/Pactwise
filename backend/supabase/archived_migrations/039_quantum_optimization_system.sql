-- Create tables for the Quantum Optimization system

-- Quantum optimization problems storage
CREATE TABLE IF NOT EXISTS quantum_optimization_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('combinatorial', 'continuous', 'mixed', 'constraint-satisfaction')),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  variables JSONB NOT NULL,
  objectives JSONB NOT NULL,
  constraints JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  solved_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- Quantum optimization results
CREATE TABLE IF NOT EXISTS quantum_optimization_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES quantum_optimization_problems(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  optimal_parameters JSONB NOT NULL,
  optimal_value DECIMAL,
  iterations INTEGER,
  convergence BOOLEAN,
  solution_quality DECIMAL(3, 2),
  computation_time DECIMAL,
  quantum_advantage JSONB,
  history JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantum features configuration
CREATE TABLE IF NOT EXISTS quantum_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN ('superposition', 'entanglement', 'interference', 'tunneling')),
  strength DECIMAL(3, 2) CHECK (strength >= 0 AND strength <= 1),
  parameters JSONB,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  agent_id VARCHAR(100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantum benchmarks
CREATE TABLE IF NOT EXISTS quantum_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm VARCHAR(100) NOT NULL,
  problem_id UUID REFERENCES quantum_optimization_problems(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  classical_time DECIMAL,
  quantum_time DECIMAL,
  classical_accuracy DECIMAL,
  quantum_accuracy DECIMAL,
  speedup DECIMAL,
  accuracy_improvement DECIMAL,
  resource_reduction DECIMAL,
  problem_size INTEGER,
  confidence DECIMAL(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantum neural network models
CREATE TABLE IF NOT EXISTS quantum_neural_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  architecture JSONB NOT NULL,
  parameters JSONB NOT NULL,
  input_dim INTEGER NOT NULL,
  output_dim INTEGER NOT NULL,
  hidden_layers JSONB,
  training_history JSONB,
  best_accuracy DECIMAL(3, 2),
  quantum_speedup DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantum portfolio optimizations
CREATE TABLE IF NOT EXISTS quantum_portfolio_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_id UUID REFERENCES quantum_optimization_results(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  assets JSONB NOT NULL,
  optimal_weights JSONB NOT NULL,
  expected_return DECIMAL,
  risk_level DECIMAL,
  sharpe_ratio DECIMAL,
  correlation_matrix JSONB,
  risk_tolerance DECIMAL,
  constraints JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantum circuit executions
CREATE TABLE IF NOT EXISTS quantum_circuit_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id VARCHAR(100) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  circuit_depth INTEGER,
  num_qubits INTEGER,
  gates JSONB,
  measurements JSONB,
  execution_time DECIMAL,
  fidelity DECIMAL(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantum state snapshots
CREATE TABLE IF NOT EXISTS quantum_state_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES quantum_circuit_executions(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  amplitudes JSONB NOT NULL,
  entanglements JSONB,
  measurement_probabilities JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hybrid optimization decompositions
CREATE TABLE IF NOT EXISTS hybrid_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES quantum_optimization_problems(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  classical_variables JSONB,
  quantum_variables JSONB,
  coupling_strength DECIMAL,
  classical_results JSONB,
  quantum_results JSONB,
  combined_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantum algorithm library
CREATE TABLE IF NOT EXISTS quantum_algorithms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('optimization', 'search', 'simulation', 'ml')),
  description TEXT,
  required_qubits INTEGER,
  circuit_template JSONB,
  parameters JSONB,
  enterprise_id UUID REFERENCES enterprises(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quantum optimization insights
CREATE TABLE IF NOT EXISTS quantum_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_id UUID REFERENCES quantum_optimization_results(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,
  description TEXT,
  quantum_advantage DECIMAL,
  classical_comparison TEXT,
  recommendations JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_quantum_problems_enterprise ON quantum_optimization_problems(enterprise_id);
CREATE INDEX idx_quantum_problems_status ON quantum_optimization_problems(status);
CREATE INDEX idx_quantum_problems_type ON quantum_optimization_problems(problem_type);

CREATE INDEX idx_quantum_results_problem ON quantum_optimization_results(problem_id);
CREATE INDEX idx_quantum_results_enterprise ON quantum_optimization_results(enterprise_id);
CREATE INDEX idx_quantum_results_quality ON quantum_optimization_results(solution_quality);

CREATE INDEX idx_quantum_features_enterprise ON quantum_features(enterprise_id);
CREATE INDEX idx_quantum_features_agent ON quantum_features(agent_id);
CREATE INDEX idx_quantum_features_type ON quantum_features(feature_type);

CREATE INDEX idx_quantum_benchmarks_enterprise ON quantum_benchmarks(enterprise_id);
CREATE INDEX idx_quantum_benchmarks_speedup ON quantum_benchmarks(speedup);

CREATE INDEX idx_quantum_nn_enterprise ON quantum_neural_networks(enterprise_id);
CREATE INDEX idx_quantum_nn_name ON quantum_neural_networks(model_name);

CREATE INDEX idx_quantum_portfolio_enterprise ON quantum_portfolio_optimizations(enterprise_id);
CREATE INDEX idx_quantum_portfolio_sharpe ON quantum_portfolio_optimizations(sharpe_ratio);

CREATE INDEX idx_quantum_insights_optimization ON quantum_insights(optimization_id);
CREATE INDEX idx_quantum_insights_type ON quantum_insights(insight_type);

-- RLS policies
ALTER TABLE quantum_optimization_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_neural_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_portfolio_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_circuit_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_state_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE hybrid_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_algorithms ENABLE ROW LEVEL SECURITY;
ALTER TABLE quantum_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Quantum problems isolated by enterprise" ON quantum_optimization_problems
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Quantum results isolated by enterprise" ON quantum_optimization_results
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Quantum features isolated by enterprise" ON quantum_features
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Quantum benchmarks isolated by enterprise" ON quantum_benchmarks
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Quantum NNs isolated by enterprise" ON quantum_neural_networks
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Quantum portfolios isolated by enterprise" ON quantum_portfolio_optimizations
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Quantum circuits isolated by enterprise" ON quantum_circuit_executions
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Quantum states isolated by enterprise" ON quantum_state_snapshots
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Hybrid optimizations isolated by enterprise" ON hybrid_optimizations
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Quantum algorithms access" ON quantum_algorithms
  FOR ALL USING (
    is_public = true OR 
    enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid
  );

CREATE POLICY "Quantum insights isolated by enterprise" ON quantum_insights
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

-- Functions for quantum optimization analysis

-- Get quantum advantage summary
CREATE OR REPLACE FUNCTION get_quantum_advantage_summary(
  p_enterprise_id UUID,
  p_time_window INTERVAL DEFAULT '30 days'
)
RETURNS TABLE (
  avg_speedup DECIMAL,
  max_speedup DECIMAL,
  total_optimizations INTEGER,
  success_rate DECIMAL,
  avg_solution_quality DECIMAL,
  quantum_features_used JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH benchmark_stats AS (
    SELECT 
      AVG(speedup) as avg_speedup,
      MAX(speedup) as max_speedup,
      COUNT(*) as total_benchmarks
    FROM quantum_benchmarks
    WHERE enterprise_id = p_enterprise_id
      AND created_at >= NOW() - p_time_window
  ),
  optimization_stats AS (
    SELECT 
      COUNT(*) as total_optimizations,
      COUNT(*) FILTER (WHERE convergence = true) as successful,
      AVG(solution_quality) as avg_quality
    FROM quantum_optimization_results
    WHERE enterprise_id = p_enterprise_id
      AND created_at >= NOW() - p_time_window
  ),
  features_used AS (
    SELECT 
      jsonb_agg(DISTINCT feature_type) as features
    FROM quantum_features
    WHERE enterprise_id = p_enterprise_id
      AND active = true
  )
  SELECT 
    b.avg_speedup,
    b.max_speedup,
    o.total_optimizations::INTEGER,
    CASE 
      WHEN o.total_optimizations > 0 
      THEN o.successful::DECIMAL / o.total_optimizations
      ELSE 0 
    END as success_rate,
    o.avg_quality,
    f.features as quantum_features_used
  FROM benchmark_stats b
  CROSS JOIN optimization_stats o
  CROSS JOIN features_used f;
END;
$$ LANGUAGE plpgsql;

-- Analyze quantum portfolio performance
CREATE OR REPLACE FUNCTION analyze_quantum_portfolio_performance(
  p_enterprise_id UUID,
  p_time_window INTERVAL DEFAULT '90 days'
)
RETURNS TABLE (
  portfolios_optimized INTEGER,
  avg_sharpe_ratio DECIMAL,
  avg_expected_return DECIMAL,
  risk_reduction DECIMAL,
  top_performing_assets JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH portfolio_stats AS (
    SELECT 
      COUNT(*) as count,
      AVG(sharpe_ratio) as avg_sharpe,
      AVG(expected_return) as avg_return,
      AVG(risk_level) as avg_risk
    FROM quantum_portfolio_optimizations
    WHERE enterprise_id = p_enterprise_id
      AND created_at >= NOW() - p_time_window
  ),
  top_assets AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'asset', asset_data->>'symbol',
          'avg_weight', avg_weight
        ) ORDER BY avg_weight DESC
      ) FILTER (WHERE rank <= 5) as top_5
    FROM (
      SELECT 
        jsonb_array_elements(assets) as asset_data,
        AVG((jsonb_array_elements(optimal_weights))::decimal) as avg_weight,
        ROW_NUMBER() OVER (ORDER BY AVG((jsonb_array_elements(optimal_weights))::decimal) DESC) as rank
      FROM quantum_portfolio_optimizations
      WHERE enterprise_id = p_enterprise_id
        AND created_at >= NOW() - p_time_window
      GROUP BY asset_data
    ) ranked_assets
  )
  SELECT 
    p.count::INTEGER as portfolios_optimized,
    p.avg_sharpe,
    p.avg_return,
    CASE 
      WHEN p.avg_risk > 0 
      THEN 1 - (p.avg_risk / 0.15) -- Assume 15% baseline risk
      ELSE 0 
    END as risk_reduction,
    t.top_5 as top_performing_assets
  FROM portfolio_stats p
  CROSS JOIN top_assets t;
END;
$$ LANGUAGE plpgsql;

-- Get quantum feature effectiveness
CREATE OR REPLACE FUNCTION get_quantum_feature_effectiveness(
  p_enterprise_id UUID
)
RETURNS TABLE (
  feature_type VARCHAR,
  avg_strength DECIMAL,
  problems_used INTEGER,
  avg_speedup DECIMAL,
  effectiveness_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH feature_usage AS (
    SELECT 
      f.feature_type,
      AVG(f.strength) as avg_strength,
      COUNT(DISTINCT r.problem_id) as problems_used
    FROM quantum_features f
    JOIN quantum_optimization_results r ON r.enterprise_id = f.enterprise_id
    WHERE f.enterprise_id = p_enterprise_id
      AND f.active = true
    GROUP BY f.feature_type
  ),
  feature_performance AS (
    SELECT 
      jsonb_object_keys(quantum_advantage->'features') as feature,
      AVG((quantum_advantage->>'speedup')::decimal) as avg_speedup
    FROM quantum_optimization_results
    WHERE enterprise_id = p_enterprise_id
      AND quantum_advantage IS NOT NULL
    GROUP BY feature
  )
  SELECT 
    u.feature_type,
    u.avg_strength,
    u.problems_used::INTEGER,
    COALESCE(p.avg_speedup, 1) as avg_speedup,
    (u.avg_strength * COALESCE(p.avg_speedup, 1) * LEAST(u.problems_used / 10.0, 1))::DECIMAL(3,2) as effectiveness_score
  FROM feature_usage u
  LEFT JOIN feature_performance p ON u.feature_type = p.feature
  ORDER BY effectiveness_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Track quantum optimization patterns
CREATE OR REPLACE FUNCTION track_quantum_patterns(
  p_enterprise_id UUID,
  p_problem_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  pattern_type VARCHAR,
  occurrence_count INTEGER,
  avg_performance DECIMAL,
  recommended_config JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH problem_patterns AS (
    SELECT 
      p.problem_type,
      p.category,
      COUNT(*) as count,
      AVG(r.solution_quality) as avg_quality,
      AVG(CASE WHEN r.convergence THEN 1 ELSE 0 END) as convergence_rate
    FROM quantum_optimization_problems p
    JOIN quantum_optimization_results r ON p.id = r.problem_id
    WHERE p.enterprise_id = p_enterprise_id
      AND (p_problem_type IS NULL OR p.problem_type = p_problem_type)
    GROUP BY p.problem_type, p.category
  ),
  feature_patterns AS (
    SELECT 
      p.problem_type,
      jsonb_agg(
        jsonb_build_object(
          'feature', f.feature_type,
          'strength', f.strength
        ) ORDER BY f.strength DESC
      ) as optimal_features
    FROM quantum_optimization_problems p
    JOIN quantum_optimization_results r ON p.id = r.problem_id
    JOIN quantum_features f ON f.enterprise_id = p.enterprise_id
    WHERE p.enterprise_id = p_enterprise_id
      AND r.solution_quality > 0.8
      AND f.active = true
    GROUP BY p.problem_type
  )
  SELECT 
    pp.problem_type as pattern_type,
    pp.count::INTEGER as occurrence_count,
    (pp.avg_quality * pp.convergence_rate)::DECIMAL(3,2) as avg_performance,
    jsonb_build_object(
      'category', pp.category,
      'recommended_features', fp.optimal_features,
      'success_rate', pp.convergence_rate
    ) as recommended_config
  FROM problem_patterns pp
  LEFT JOIN feature_patterns fp ON pp.problem_type = fp.problem_type
  ORDER BY avg_performance DESC;
END;
$$ LANGUAGE plpgsql;

-- Get quantum neural network performance
CREATE OR REPLACE FUNCTION get_quantum_nn_performance(
  p_enterprise_id UUID,
  p_model_name VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  model_name VARCHAR,
  accuracy DECIMAL,
  quantum_speedup DECIMAL,
  parameter_count INTEGER,
  training_time DECIMAL,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    model_name,
    best_accuracy as accuracy,
    quantum_speedup,
    (jsonb_array_length(parameters))::INTEGER as parameter_count,
    (training_history->'total_time')::decimal as training_time,
    updated_at as last_updated
  FROM quantum_neural_networks
  WHERE enterprise_id = p_enterprise_id
    AND (p_model_name IS NULL OR model_name = p_model_name)
  ORDER BY best_accuracy DESC;
END;
$$ LANGUAGE plpgsql;