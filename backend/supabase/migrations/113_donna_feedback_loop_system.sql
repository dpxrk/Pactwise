-- ============================================================================
-- Migration: 113_donna_feedback_loop_system.sql
-- Description: Donna AI Feedback Loop System
--
-- Creates tables and functions for tracking recommendation effectiveness and
-- improving Donna's learning quality through outcome validation.
--
-- Features:
-- - Complete recommendation lifecycle tracking
-- - Success metrics per recommendation type
-- - Event sourcing for audit trail
-- - Learning update tracking
-- - Quality metrics aggregation
-- ============================================================================

-- ============================================================================
-- 1. RECOMMENDATION TRACKING TABLE
-- ============================================================================

-- Track complete recommendation lifecycle from shown → response → implementation → outcome
CREATE TABLE IF NOT EXISTS donna_recommendation_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core recommendation data
  recommendation_id uuid NOT NULL,
  recommendation_type text NOT NULL CHECK (recommendation_type IN (
    'pattern', 'best_practice', 'q_learning', 'bandit', 'insight', 'market_intelligence'
  )),
  source_pattern_id uuid, -- Reference to donna_patterns if from pattern
  source_best_practice_id uuid, -- Reference to donna_best_practices if from best practice

  -- Context (anonymized for cross-enterprise learning)
  context_category text, -- e.g., 'contract_review', 'vendor_selection', 'budget_planning'
  context_industry text, -- Anonymized industry category
  context_size_category text CHECK (context_size_category IN ('small', 'medium', 'large', 'enterprise')),

  -- Recommendation content (anonymized)
  recommendation_content jsonb NOT NULL, -- The actual recommendation shown
  confidence_score numeric(5,4), -- Donna's confidence (0-1)
  predicted_outcome text, -- What Donna predicted would happen

  -- Lifecycle timestamps
  shown_at timestamptz DEFAULT NOW(),
  response_at timestamptz,
  implementation_started_at timestamptz,
  implementation_completed_at timestamptz,
  outcome_recorded_at timestamptz,

  -- User response
  user_response text CHECK (user_response IN ('accepted', 'rejected', 'modified', 'ignored', 'deferred')),
  user_modification_notes text, -- If modified, what was changed

  -- Implementation status
  implementation_status text CHECK (implementation_status IN (
    'not_started', 'in_progress', 'completed', 'abandoned', 'partial'
  )) DEFAULT 'not_started',

  -- Outcome data
  outcome_status text CHECK (outcome_status IN (
    'success', 'partial_success', 'failure', 'neutral', 'unknown'
  )),
  outcome_value numeric, -- Quantified outcome (e.g., savings %, time saved hours)
  outcome_value_unit text, -- e.g., 'percentage', 'hours', 'currency'
  outcome_notes text,

  -- Feedback scoring
  feedback_score numeric(5,4), -- Calculated feedback score (0-1)
  time_to_response_seconds integer, -- How long user took to respond
  time_to_implementation_hours numeric, -- How long to implement

  -- Metadata
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_donna_rec_tracking_type ON donna_recommendation_tracking(recommendation_type);
CREATE INDEX idx_donna_rec_tracking_category ON donna_recommendation_tracking(context_category);
CREATE INDEX idx_donna_rec_tracking_outcome ON donna_recommendation_tracking(outcome_status);
CREATE INDEX idx_donna_rec_tracking_shown_at ON donna_recommendation_tracking(shown_at DESC);
CREATE INDEX idx_donna_rec_tracking_pattern ON donna_recommendation_tracking(source_pattern_id) WHERE source_pattern_id IS NOT NULL;
CREATE INDEX idx_donna_rec_tracking_lifecycle ON donna_recommendation_tracking(recommendation_type, user_response, outcome_status);

COMMENT ON TABLE donna_recommendation_tracking IS
  'Tracks complete recommendation lifecycle for Donna AI feedback loop learning';

-- ============================================================================
-- 2. OUTCOME DEFINITIONS TABLE
-- ============================================================================

-- Define success metrics per recommendation type
CREATE TABLE IF NOT EXISTS donna_outcome_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  recommendation_type text NOT NULL,
  context_category text, -- NULL means applies to all contexts

  -- Success criteria
  success_metric_name text NOT NULL,
  success_metric_description text,

  -- Thresholds for automated scoring
  success_threshold numeric, -- Value >= this = success
  partial_success_threshold numeric, -- Value >= this but < success = partial
  failure_threshold numeric, -- Value < this = failure

  -- Weighting for aggregate scores
  weight numeric(3,2) DEFAULT 1.0, -- How much this metric matters

  -- Measurement
  measurement_method text NOT NULL CHECK (measurement_method IN (
    'automatic', 'user_reported', 'hybrid', 'calculated'
  )),
  measurement_window_hours integer DEFAULT 168, -- How long to wait for outcome (default 7 days)

  -- Metadata
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),

  -- Unique per type/context combination
  CONSTRAINT unique_outcome_def UNIQUE (recommendation_type, context_category, success_metric_name)
);

-- Insert default outcome definitions
INSERT INTO donna_outcome_definitions (recommendation_type, context_category, success_metric_name, success_metric_description, success_threshold, partial_success_threshold, measurement_method, weight)
VALUES
  -- Pattern recommendations
  ('pattern', 'contract_review', 'time_saved_percentage', 'Percentage of time saved vs baseline', 20, 10, 'calculated', 1.0),
  ('pattern', 'contract_review', 'user_satisfaction', 'User rating of recommendation helpfulness', 4, 3, 'user_reported', 0.8),
  ('pattern', 'vendor_selection', 'selection_quality', 'Quality of vendor selection outcome', 0.8, 0.6, 'calculated', 1.0),

  -- Best practice recommendations
  ('best_practice', NULL, 'adoption_rate', 'Rate of successful implementation', 0.7, 0.4, 'automatic', 1.0),
  ('best_practice', NULL, 'outcome_improvement', 'Improvement in target metric', 0.15, 0.05, 'calculated', 1.2),

  -- Q-learning recommendations
  ('q_learning', NULL, 'action_success', 'Whether recommended action led to positive outcome', 1, 0.5, 'automatic', 1.0),
  ('q_learning', NULL, 'reward_accuracy', 'How accurate was the predicted reward', 0.8, 0.5, 'calculated', 0.9),

  -- Bandit recommendations
  ('bandit', NULL, 'arm_performance', 'How well the selected arm performed', 0.7, 0.4, 'automatic', 1.0),

  -- Insight recommendations
  ('insight', NULL, 'actionability', 'Whether insight led to action', 1, 0, 'user_reported', 0.8),
  ('insight', NULL, 'accuracy', 'Whether insight was accurate', 1, 0.5, 'user_reported', 1.0),

  -- Market intelligence
  ('market_intelligence', NULL, 'decision_impact', 'Impact on business decision', 0.8, 0.4, 'user_reported', 1.0),
  ('market_intelligence', NULL, 'data_accuracy', 'Accuracy of market data provided', 0.9, 0.7, 'calculated', 1.2)
ON CONFLICT (recommendation_type, context_category, success_metric_name) DO NOTHING;

COMMENT ON TABLE donna_outcome_definitions IS
  'Defines success metrics and thresholds for each recommendation type';

-- ============================================================================
-- 3. FEEDBACK EVENTS TABLE (Event Sourcing)
-- ============================================================================

-- Event sourcing for complete audit trail
CREATE TABLE IF NOT EXISTS donna_feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_tracking_id uuid NOT NULL REFERENCES donna_recommendation_tracking(id) ON DELETE CASCADE,

  event_type text NOT NULL CHECK (event_type IN (
    'recommendation_shown',
    'user_responded',
    'implementation_started',
    'implementation_progress',
    'implementation_completed',
    'implementation_abandoned',
    'outcome_measured',
    'outcome_updated',
    'feedback_score_calculated',
    'learning_update_triggered'
  )),

  event_data jsonb NOT NULL DEFAULT '{}',
  event_timestamp timestamptz DEFAULT NOW(),

  -- For ordering events
  sequence_number serial
);

-- Index for efficient event retrieval
CREATE INDEX idx_donna_feedback_events_tracking ON donna_feedback_events(recommendation_tracking_id, sequence_number);
CREATE INDEX idx_donna_feedback_events_type ON donna_feedback_events(event_type, event_timestamp DESC);

COMMENT ON TABLE donna_feedback_events IS
  'Event sourcing table for complete audit trail of recommendation lifecycle';

-- ============================================================================
-- 4. LEARNING UPDATES TABLE
-- ============================================================================

-- Track all model updates for transparency
CREATE TABLE IF NOT EXISTS donna_learning_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was updated
  update_type text NOT NULL CHECK (update_type IN (
    'q_value_update',
    'pattern_confidence_update',
    'best_practice_rate_update',
    'bandit_arm_update',
    'pattern_promoted',
    'pattern_deprecated',
    'best_practice_promoted',
    'best_practice_deprecated'
  )),

  -- Reference to source
  source_recommendation_id uuid REFERENCES donna_recommendation_tracking(id),
  target_pattern_id uuid, -- Pattern that was updated
  target_best_practice_id uuid, -- Best practice that was updated

  -- Before/after values
  previous_value jsonb,
  new_value jsonb,

  -- Update reasoning
  update_reason text,
  sample_count integer, -- How many samples contributed

  -- Metadata
  created_at timestamptz DEFAULT NOW()
);

-- Index for querying updates
CREATE INDEX idx_donna_learning_updates_type ON donna_learning_updates(update_type, created_at DESC);
CREATE INDEX idx_donna_learning_updates_pattern ON donna_learning_updates(target_pattern_id) WHERE target_pattern_id IS NOT NULL;

COMMENT ON TABLE donna_learning_updates IS
  'Tracks all learning model updates for transparency and debugging';

-- ============================================================================
-- 5. QUALITY METRICS TABLE (Aggregated)
-- ============================================================================

-- Aggregated metrics for dashboard and monitoring
CREATE TABLE IF NOT EXISTS donna_feedback_quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time bucket
  time_bucket timestamptz NOT NULL,
  bucket_type text NOT NULL CHECK (bucket_type IN ('hourly', 'daily', 'weekly')),

  -- Dimensions
  recommendation_type text NOT NULL,
  context_category text,

  -- Core metrics
  total_recommendations integer DEFAULT 0,
  recommendations_accepted integer DEFAULT 0,
  recommendations_rejected integer DEFAULT 0,
  recommendations_modified integer DEFAULT 0,
  recommendations_ignored integer DEFAULT 0,

  -- Implementation metrics
  implementations_started integer DEFAULT 0,
  implementations_completed integer DEFAULT 0,
  implementations_abandoned integer DEFAULT 0,

  -- Outcome metrics
  outcomes_success integer DEFAULT 0,
  outcomes_partial_success integer DEFAULT 0,
  outcomes_failure integer DEFAULT 0,
  outcomes_neutral integer DEFAULT 0,
  outcomes_unknown integer DEFAULT 0,

  -- Calculated rates
  acceptance_rate numeric(5,4), -- accepted / total
  implementation_rate numeric(5,4), -- completed / started
  success_rate numeric(5,4), -- success / (success + partial + failure)
  average_feedback_score numeric(5,4),

  -- Response time metrics
  avg_response_time_seconds numeric,
  avg_implementation_time_hours numeric,

  -- Learning impact
  q_value_updates integer DEFAULT 0,
  pattern_confidence_changes integer DEFAULT 0,

  -- Metadata
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT unique_quality_metrics_bucket UNIQUE (time_bucket, bucket_type, recommendation_type, context_category)
);

-- Indexes for dashboard queries
CREATE INDEX idx_donna_quality_metrics_bucket ON donna_feedback_quality_metrics(time_bucket DESC, bucket_type);
CREATE INDEX idx_donna_quality_metrics_type ON donna_feedback_quality_metrics(recommendation_type, bucket_type);

COMMENT ON TABLE donna_feedback_quality_metrics IS
  'Aggregated quality metrics for Donna feedback loop monitoring';

-- ============================================================================
-- 6. FEEDBACK SCORING FUNCTION
-- ============================================================================

-- Calculate feedback score based on user response and outcome
CREATE OR REPLACE FUNCTION calculate_feedback_score(
  p_user_response text,
  p_outcome_status text,
  p_confidence_score numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_response_score numeric;
  v_outcome_score numeric;
  v_prediction_bonus numeric;
BEGIN
  -- User response scoring (0-0.4 weight)
  v_response_score := CASE p_user_response
    WHEN 'accepted' THEN 0.4
    WHEN 'modified' THEN 0.3 -- Modified means partially useful
    WHEN 'deferred' THEN 0.2 -- Deferred might still be used
    WHEN 'rejected' THEN 0.0
    WHEN 'ignored' THEN 0.1 -- Ignored is slightly better than rejected
    ELSE 0.2
  END;

  -- Outcome scoring (0-0.5 weight)
  v_outcome_score := CASE p_outcome_status
    WHEN 'success' THEN 0.5
    WHEN 'partial_success' THEN 0.35
    WHEN 'neutral' THEN 0.2
    WHEN 'failure' THEN 0.0
    WHEN 'unknown' THEN 0.2 -- Neutral assumption for unknown
    ELSE 0.2
  END;

  -- Prediction accuracy bonus (0-0.1 weight)
  -- If high confidence and success, or low confidence and failure, Donna was well-calibrated
  IF p_confidence_score IS NOT NULL THEN
    IF (p_confidence_score > 0.7 AND p_outcome_status = 'success') OR
       (p_confidence_score < 0.3 AND p_outcome_status IN ('failure', 'rejected')) THEN
      v_prediction_bonus := 0.1;
    ELSIF (p_confidence_score > 0.7 AND p_outcome_status = 'failure') OR
          (p_confidence_score < 0.3 AND p_outcome_status = 'success') THEN
      v_prediction_bonus := -0.1; -- Penalty for miscalibration
    ELSE
      v_prediction_bonus := 0;
    END IF;
  ELSE
    v_prediction_bonus := 0;
  END IF;

  RETURN GREATEST(0, LEAST(1, v_response_score + v_outcome_score + v_prediction_bonus));
END;
$$;

COMMENT ON FUNCTION calculate_feedback_score IS
  'Calculates a feedback score (0-1) based on user response, outcome, and prediction accuracy';

-- ============================================================================
-- 7. UPDATE TRIGGER FOR TRACKING TABLE
-- ============================================================================

-- Auto-update updated_at and calculate feedback_score
CREATE OR REPLACE FUNCTION update_recommendation_tracking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();

  -- Calculate feedback score when we have both response and outcome
  IF NEW.user_response IS NOT NULL AND NEW.outcome_status IS NOT NULL THEN
    NEW.feedback_score := calculate_feedback_score(
      NEW.user_response,
      NEW.outcome_status,
      NEW.confidence_score
    );
  END IF;

  -- Calculate time metrics
  IF NEW.response_at IS NOT NULL AND OLD.response_at IS NULL THEN
    NEW.time_to_response_seconds := EXTRACT(EPOCH FROM (NEW.response_at - NEW.shown_at))::integer;
  END IF;

  IF NEW.implementation_completed_at IS NOT NULL AND NEW.implementation_started_at IS NOT NULL THEN
    NEW.time_to_implementation_hours := EXTRACT(EPOCH FROM (NEW.implementation_completed_at - NEW.implementation_started_at)) / 3600;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_recommendation_tracking ON donna_recommendation_tracking;
CREATE TRIGGER tr_update_recommendation_tracking
  BEFORE UPDATE ON donna_recommendation_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendation_tracking();

-- ============================================================================
-- 8. AGGREGATE METRICS FUNCTION
-- ============================================================================

-- Function to aggregate metrics into hourly/daily/weekly buckets
CREATE OR REPLACE FUNCTION aggregate_donna_feedback_metrics(
  p_bucket_type text DEFAULT 'hourly',
  p_start_time timestamptz DEFAULT NOW() - INTERVAL '24 hours',
  p_end_time timestamptz DEFAULT NOW()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket_interval interval;
  v_inserted_count integer := 0;
BEGIN
  -- Determine bucket interval
  v_bucket_interval := CASE p_bucket_type
    WHEN 'hourly' THEN INTERVAL '1 hour'
    WHEN 'daily' THEN INTERVAL '1 day'
    WHEN 'weekly' THEN INTERVAL '1 week'
    ELSE INTERVAL '1 hour'
  END;

  -- Insert or update aggregated metrics
  INSERT INTO donna_feedback_quality_metrics (
    time_bucket,
    bucket_type,
    recommendation_type,
    context_category,
    total_recommendations,
    recommendations_accepted,
    recommendations_rejected,
    recommendations_modified,
    recommendations_ignored,
    implementations_started,
    implementations_completed,
    implementations_abandoned,
    outcomes_success,
    outcomes_partial_success,
    outcomes_failure,
    outcomes_neutral,
    outcomes_unknown,
    acceptance_rate,
    implementation_rate,
    success_rate,
    average_feedback_score,
    avg_response_time_seconds,
    avg_implementation_time_hours
  )
  SELECT
    date_trunc(p_bucket_type, shown_at) as time_bucket,
    p_bucket_type,
    recommendation_type,
    context_category,
    COUNT(*) as total_recommendations,
    COUNT(*) FILTER (WHERE user_response = 'accepted') as recommendations_accepted,
    COUNT(*) FILTER (WHERE user_response = 'rejected') as recommendations_rejected,
    COUNT(*) FILTER (WHERE user_response = 'modified') as recommendations_modified,
    COUNT(*) FILTER (WHERE user_response = 'ignored') as recommendations_ignored,
    COUNT(*) FILTER (WHERE implementation_status != 'not_started') as implementations_started,
    COUNT(*) FILTER (WHERE implementation_status = 'completed') as implementations_completed,
    COUNT(*) FILTER (WHERE implementation_status = 'abandoned') as implementations_abandoned,
    COUNT(*) FILTER (WHERE outcome_status = 'success') as outcomes_success,
    COUNT(*) FILTER (WHERE outcome_status = 'partial_success') as outcomes_partial_success,
    COUNT(*) FILTER (WHERE outcome_status = 'failure') as outcomes_failure,
    COUNT(*) FILTER (WHERE outcome_status = 'neutral') as outcomes_neutral,
    COUNT(*) FILTER (WHERE outcome_status = 'unknown' OR outcome_status IS NULL) as outcomes_unknown,
    -- Rates
    CASE WHEN COUNT(*) > 0
      THEN COUNT(*) FILTER (WHERE user_response = 'accepted')::numeric / COUNT(*)
      ELSE 0 END,
    CASE WHEN COUNT(*) FILTER (WHERE implementation_status != 'not_started') > 0
      THEN COUNT(*) FILTER (WHERE implementation_status = 'completed')::numeric /
           COUNT(*) FILTER (WHERE implementation_status != 'not_started')
      ELSE 0 END,
    CASE WHEN COUNT(*) FILTER (WHERE outcome_status IN ('success', 'partial_success', 'failure')) > 0
      THEN COUNT(*) FILTER (WHERE outcome_status = 'success')::numeric /
           COUNT(*) FILTER (WHERE outcome_status IN ('success', 'partial_success', 'failure'))
      ELSE 0 END,
    AVG(feedback_score),
    AVG(time_to_response_seconds),
    AVG(time_to_implementation_hours)
  FROM donna_recommendation_tracking
  WHERE shown_at >= p_start_time AND shown_at < p_end_time
  GROUP BY date_trunc(p_bucket_type, shown_at), recommendation_type, context_category
  ON CONFLICT (time_bucket, bucket_type, recommendation_type, context_category)
  DO UPDATE SET
    total_recommendations = EXCLUDED.total_recommendations,
    recommendations_accepted = EXCLUDED.recommendations_accepted,
    recommendations_rejected = EXCLUDED.recommendations_rejected,
    recommendations_modified = EXCLUDED.recommendations_modified,
    recommendations_ignored = EXCLUDED.recommendations_ignored,
    implementations_started = EXCLUDED.implementations_started,
    implementations_completed = EXCLUDED.implementations_completed,
    implementations_abandoned = EXCLUDED.implementations_abandoned,
    outcomes_success = EXCLUDED.outcomes_success,
    outcomes_partial_success = EXCLUDED.outcomes_partial_success,
    outcomes_failure = EXCLUDED.outcomes_failure,
    outcomes_neutral = EXCLUDED.outcomes_neutral,
    outcomes_unknown = EXCLUDED.outcomes_unknown,
    acceptance_rate = EXCLUDED.acceptance_rate,
    implementation_rate = EXCLUDED.implementation_rate,
    success_rate = EXCLUDED.success_rate,
    average_feedback_score = EXCLUDED.average_feedback_score,
    avg_response_time_seconds = EXCLUDED.avg_response_time_seconds,
    avg_implementation_time_hours = EXCLUDED.avg_implementation_time_hours,
    updated_at = NOW();

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  RETURN v_inserted_count;
END;
$$;

COMMENT ON FUNCTION aggregate_donna_feedback_metrics IS
  'Aggregates Donna feedback metrics into hourly/daily/weekly buckets for dashboard';

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE donna_recommendation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_outcome_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_learning_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE donna_feedback_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Recommendation tracking - service role only (anonymized data)
CREATE POLICY "Service role can manage recommendation tracking"
  ON donna_recommendation_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Outcome definitions - read by all, write by service role
CREATE POLICY "Anyone can read outcome definitions"
  ON donna_outcome_definitions FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage outcome definitions"
  ON donna_outcome_definitions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Feedback events - service role only
CREATE POLICY "Service role can manage feedback events"
  ON donna_feedback_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Learning updates - service role only
CREATE POLICY "Service role can manage learning updates"
  ON donna_learning_updates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Quality metrics - read by all, write by service role
CREATE POLICY "Anyone can read quality metrics"
  ON donna_feedback_quality_metrics FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage quality metrics"
  ON donna_feedback_quality_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users (read) and service_role (full)
GRANT SELECT ON donna_recommendation_tracking TO authenticated;
GRANT SELECT ON donna_outcome_definitions TO authenticated;
GRANT SELECT ON donna_feedback_events TO authenticated;
GRANT SELECT ON donna_learning_updates TO authenticated;
GRANT SELECT ON donna_feedback_quality_metrics TO authenticated;

GRANT ALL ON donna_recommendation_tracking TO service_role;
GRANT ALL ON donna_outcome_definitions TO service_role;
GRANT ALL ON donna_feedback_events TO service_role;
GRANT ALL ON donna_learning_updates TO service_role;
GRANT ALL ON donna_feedback_quality_metrics TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION calculate_feedback_score TO authenticated;
GRANT EXECUTE ON FUNCTION aggregate_donna_feedback_metrics TO service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================
