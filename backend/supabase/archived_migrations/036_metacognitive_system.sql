-- Create tables for the metacognitive system

-- Metacognitive calibration history
CREATE TABLE IF NOT EXISTS metacognitive_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  calibration_result JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metacognitive optimizations log
CREATE TABLE IF NOT EXISTS metacognitive_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  optimizations JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent learning adjustments
CREATE TABLE IF NOT EXISTS agent_learning_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  adjustment_factor DECIMAL(3, 2) NOT NULL,
  new_learning_rate DECIMAL(4, 3) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent cognitive states log
CREATE TABLE IF NOT EXISTS agent_cognitive_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  process_id VARCHAR(100) NOT NULL,
  cognitive_state JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategy performance tracking
CREATE TABLE IF NOT EXISTS strategy_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  strategy_name VARCHAR(100) NOT NULL,
  successes INTEGER DEFAULT 0,
  failures INTEGER DEFAULT 0,
  total_confidence DECIMAL(10, 8) DEFAULT 0,
  avg_processing_time INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metacognitive insights log
CREATE TABLE IF NOT EXISTS metacognitive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  impact DECIMAL(3, 2) NOT NULL,
  recommendation TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Process monitoring checkpoints
CREATE TABLE IF NOT EXISTS process_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id VARCHAR(100) NOT NULL,
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  stage VARCHAR(100) NOT NULL,
  score DECIMAL(3, 2) NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL,
  strategy VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning history for meta-learning
CREATE TABLE IF NOT EXISTS agent_learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  task_id VARCHAR(100),
  strategy_used VARCHAR(100) NOT NULL,
  performance DECIMAL(3, 2) NOT NULL,
  cognitive_load DECIMAL(3, 2),
  processing_time INTEGER,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_metacognitive_calibration_agent ON metacognitive_calibration(agent_type, enterprise_id);
CREATE INDEX idx_metacognitive_calibration_timestamp ON metacognitive_calibration(timestamp);

CREATE INDEX idx_strategy_performance_lookup ON strategy_performance(agent_type, enterprise_id, strategy_name);
CREATE INDEX idx_strategy_performance_updated ON strategy_performance(updated_at);

CREATE INDEX idx_process_checkpoints_process ON process_checkpoints(process_id);
CREATE INDEX idx_process_checkpoints_agent ON process_checkpoints(agent_type, enterprise_id);

CREATE INDEX idx_learning_history_agent ON agent_learning_history(agent_type, enterprise_id);
CREATE INDEX idx_learning_history_created ON agent_learning_history(created_at);

-- RLS policies
ALTER TABLE metacognitive_calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE metacognitive_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_cognitive_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE metacognitive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Metacognitive data isolated by enterprise" ON metacognitive_calibration
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Optimization data isolated by enterprise" ON metacognitive_optimizations
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Learning adjustments isolated by enterprise" ON agent_learning_adjustments
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Cognitive states isolated by enterprise" ON agent_cognitive_states
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Strategy performance isolated by enterprise" ON strategy_performance
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Insights isolated by enterprise" ON metacognitive_insights
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Checkpoints isolated by enterprise" ON process_checkpoints
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

CREATE POLICY "Learning history isolated by enterprise" ON agent_learning_history
  FOR ALL USING (enterprise_id = (SELECT auth.jwt()->>'enterprise_id')::uuid);

-- Functions for metacognitive analysis

-- Get strategy performance statistics
CREATE OR REPLACE FUNCTION get_strategy_performance_stats(
  p_agent_type VARCHAR,
  p_enterprise_id UUID,
  p_time_window INTERVAL DEFAULT '7 days'
)
RETURNS TABLE (
  strategy_name VARCHAR,
  success_rate DECIMAL,
  avg_confidence DECIMAL,
  usage_count INTEGER,
  avg_processing_time INTEGER,
  trend DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_performance AS (
    SELECT 
      sp.strategy_name,
      sp.successes,
      sp.failures,
      sp.total_confidence,
      sp.avg_processing_time,
      sp.last_used,
      COALESCE(
        (sp.successes::DECIMAL / NULLIF(sp.successes + sp.failures, 0)),
        0
      ) as success_rate
    FROM strategy_performance sp
    WHERE sp.agent_type = p_agent_type
      AND sp.enterprise_id = p_enterprise_id
      AND sp.last_used >= NOW() - p_time_window
  ),
  historical_performance AS (
    SELECT 
      strategy_used as strategy_name,
      AVG(performance) as historical_avg
    FROM agent_learning_history
    WHERE agent_type = p_agent_type
      AND enterprise_id = p_enterprise_id
      AND created_at >= NOW() - (p_time_window * 2)
      AND created_at < NOW() - p_time_window
    GROUP BY strategy_used
  )
  SELECT 
    rp.strategy_name,
    rp.success_rate,
    CASE 
      WHEN rp.successes + rp.failures > 0 
      THEN rp.total_confidence / (rp.successes + rp.failures)
      ELSE 0.5
    END as avg_confidence,
    rp.successes + rp.failures as usage_count,
    rp.avg_processing_time,
    COALESCE(rp.success_rate - hp.historical_avg, 0) as trend
  FROM recent_performance rp
  LEFT JOIN historical_performance hp ON rp.strategy_name = hp.strategy_name
  ORDER BY rp.success_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Get metacognitive insights summary
CREATE OR REPLACE FUNCTION get_metacognitive_insights_summary(
  p_agent_type VARCHAR,
  p_enterprise_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  insight_type VARCHAR,
  occurrence_count INTEGER,
  avg_impact DECIMAL,
  top_recommendation TEXT,
  last_occurred TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH insight_stats AS (
    SELECT 
      insight_type,
      COUNT(*) as occurrence_count,
      AVG(impact) as avg_impact,
      MAX(created_at) as last_occurred
    FROM metacognitive_insights
    WHERE agent_type = p_agent_type
      AND enterprise_id = p_enterprise_id
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY insight_type
  ),
  top_recommendations AS (
    SELECT DISTINCT ON (insight_type)
      insight_type,
      recommendation
    FROM metacognitive_insights
    WHERE agent_type = p_agent_type
      AND enterprise_id = p_enterprise_id
      AND recommendation IS NOT NULL
    ORDER BY insight_type, impact DESC, created_at DESC
  )
  SELECT 
    i.insight_type,
    i.occurrence_count::INTEGER,
    i.avg_impact,
    tr.recommendation as top_recommendation,
    i.last_occurred
  FROM insight_stats i
  LEFT JOIN top_recommendations tr ON i.insight_type = tr.insight_type
  ORDER BY i.avg_impact DESC, i.occurrence_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get confidence calibration accuracy
CREATE OR REPLACE FUNCTION get_confidence_calibration_accuracy(
  p_agent_type VARCHAR,
  p_enterprise_id UUID,
  p_window_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  calibration_accuracy DECIMAL,
  avg_calibration_error DECIMAL,
  overconfidence_rate DECIMAL,
  underconfidence_rate DECIMAL,
  well_calibrated_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_calibrations AS (
    SELECT 
      (calibration_result->>'calibrationError')::DECIMAL as calibration_error,
      (calibration_result->>'isWellCalibrated')::BOOLEAN as is_well_calibrated,
      (calibration_result->>'adjustmentNeeded')::DECIMAL as adjustment_needed
    FROM metacognitive_calibration
    WHERE agent_type = p_agent_type
      AND enterprise_id = p_enterprise_id
    ORDER BY timestamp DESC
    LIMIT p_window_size
  )
  SELECT 
    1 - AVG(calibration_error) as calibration_accuracy,
    AVG(calibration_error) as avg_calibration_error,
    COUNT(*) FILTER (WHERE adjustment_needed < 0)::DECIMAL / NULLIF(COUNT(*), 0) as overconfidence_rate,
    COUNT(*) FILTER (WHERE adjustment_needed > 0)::DECIMAL / NULLIF(COUNT(*), 0) as underconfidence_rate,
    COUNT(*) FILTER (WHERE is_well_calibrated)::DECIMAL / NULLIF(COUNT(*), 0) as well_calibrated_rate
  FROM recent_calibrations;
END;
$$ LANGUAGE plpgsql;

-- Track process performance over time
CREATE OR REPLACE FUNCTION track_process_performance(
  p_process_id VARCHAR,
  p_checkpoints JSONB[]
)
RETURNS JSONB AS $$
DECLARE
  v_trajectory JSONB;
  v_efficiency DECIMAL;
  v_momentum DECIMAL;
  v_consistency DECIMAL;
BEGIN
  -- Calculate performance metrics from checkpoints
  WITH checkpoint_analysis AS (
    SELECT 
      AVG((checkpoint->>'score')::DECIMAL) as avg_score,
      STDDEV((checkpoint->>'score')::DECIMAL) as score_variance,
      MAX((checkpoint->>'timestamp')::BIGINT) - MIN((checkpoint->>'timestamp')::BIGINT) as total_time
    FROM unnest(p_checkpoints) as checkpoint
  )
  SELECT jsonb_build_object(
    'avgScore', avg_score,
    'variance', COALESCE(score_variance, 0),
    'totalTime', total_time,
    'efficiency', CASE 
      WHEN total_time > 0 THEN avg_score / (total_time / 1000.0)
      ELSE 0
    END,
    'checkpointCount', array_length(p_checkpoints, 1)
  ) INTO v_trajectory
  FROM checkpoint_analysis;
  
  RETURN v_trajectory;
END;
$$ LANGUAGE plpgsql;

-- Update strategy performance
CREATE OR REPLACE FUNCTION update_strategy_performance(
  p_agent_type VARCHAR,
  p_enterprise_id UUID,
  p_strategy_name VARCHAR,
  p_success BOOLEAN,
  p_confidence DECIMAL,
  p_processing_time INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO strategy_performance (
    agent_type,
    enterprise_id,
    strategy_name,
    successes,
    failures,
    total_confidence,
    avg_processing_time,
    last_used
  ) VALUES (
    p_agent_type,
    p_enterprise_id,
    p_strategy_name,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    p_confidence,
    p_processing_time,
    NOW()
  )
  ON CONFLICT (agent_type, enterprise_id, strategy_name)
  DO UPDATE SET
    successes = strategy_performance.successes + CASE WHEN p_success THEN 1 ELSE 0 END,
    failures = strategy_performance.failures + CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    total_confidence = strategy_performance.total_confidence + p_confidence,
    avg_processing_time = (
      (strategy_performance.avg_processing_time * (strategy_performance.successes + strategy_performance.failures) + p_processing_time) /
      (strategy_performance.successes + strategy_performance.failures + 1)
    )::INTEGER,
    last_used = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;