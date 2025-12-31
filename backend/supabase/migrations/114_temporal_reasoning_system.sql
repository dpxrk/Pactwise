-- ============================================================================
-- Migration: 114_temporal_reasoning_system.sql
-- Description: Temporal Reasoning System for Contract Lifecycle Management
--
-- Adds time-series analysis capabilities for:
-- - Contract lifecycle event tracking
-- - Temporal metrics aggregation (hourly/daily/weekly/monthly)
-- - Seasonal/cyclical/trend pattern detection
-- - Renewal prediction with confidence scoring
-- - Proactive temporal alerts
-- ============================================================================

-- ============================================================================
-- 1. CONTRACT LIFECYCLE EVENTS TABLE
-- ============================================================================

-- Track contract state changes over time
CREATE TABLE IF NOT EXISTS contract_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Event details
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'draft_updated', 'submitted_for_approval', 'approved',
    'rejected', 'activated', 'renewed', 'amended', 'suspended',
    'terminated', 'expired', 'archived', 'deleted',
    'value_changed', 'vendor_changed', 'dates_changed', 'terms_changed',
    'milestone_reached', 'obligation_due', 'obligation_completed'
  )),

  -- State transition
  previous_status text,
  new_status text,

  -- Value changes
  previous_value numeric,
  new_value numeric,
  value_delta numeric GENERATED ALWAYS AS (new_value - COALESCE(previous_value, 0)) STORED,

  -- Event metadata
  event_source text CHECK (event_source IN ('user', 'system', 'automation', 'agent', 'integration')),
  triggered_by_user_id uuid REFERENCES auth.users(id),
  triggered_by_agent text,

  -- Additional context
  metadata jsonb DEFAULT '{}',
  notes text,

  -- Timestamps
  event_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_lifecycle_events_enterprise ON contract_lifecycle_events(enterprise_id, event_at DESC);
CREATE INDEX idx_lifecycle_events_contract ON contract_lifecycle_events(contract_id, event_at DESC);
CREATE INDEX idx_lifecycle_events_type ON contract_lifecycle_events(event_type, event_at DESC);
CREATE INDEX idx_lifecycle_events_time ON contract_lifecycle_events(event_at DESC);

-- RLS
ALTER TABLE contract_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lifecycle events for their enterprise"
  ON contract_lifecycle_events FOR SELECT
  USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

CREATE POLICY "Service role can manage lifecycle events"
  ON contract_lifecycle_events FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE contract_lifecycle_events IS
  'Tracks all contract state changes and significant events for temporal analysis';

-- ============================================================================
-- 2. TEMPORAL METRICS TABLE
-- ============================================================================

-- Time-bucketed aggregations for trend analysis
CREATE TABLE IF NOT EXISTS temporal_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Time bucket
  time_bucket timestamptz NOT NULL,
  bucket_type text NOT NULL CHECK (bucket_type IN ('hourly', 'daily', 'weekly', 'monthly')),

  -- Metric identification
  metric_category text NOT NULL CHECK (metric_category IN (
    'contracts', 'vendors', 'budgets', 'compliance', 'approvals', 'agents'
  )),
  metric_name text NOT NULL,

  -- Metric values
  value numeric NOT NULL,
  count integer DEFAULT 1,
  min_value numeric,
  max_value numeric,
  avg_value numeric,
  sum_value numeric,
  stddev_value numeric,

  -- Comparative metrics
  previous_period_value numeric,
  period_over_period_change numeric,
  year_over_year_change numeric,

  -- Trend indicators
  trend_direction text CHECK (trend_direction IN ('up', 'down', 'stable', 'volatile')),
  trend_strength numeric CHECK (trend_strength >= 0 AND trend_strength <= 1),

  -- Seasonality
  is_seasonal_peak boolean DEFAULT false,
  seasonal_index numeric,

  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT unique_temporal_metric UNIQUE (enterprise_id, time_bucket, bucket_type, metric_category, metric_name)
);

-- Indexes
CREATE INDEX idx_temporal_metrics_enterprise_time ON temporal_metrics(enterprise_id, time_bucket DESC);
CREATE INDEX idx_temporal_metrics_category ON temporal_metrics(metric_category, metric_name, time_bucket DESC);
CREATE INDEX idx_temporal_metrics_bucket_type ON temporal_metrics(bucket_type, time_bucket DESC);

-- RLS
ALTER TABLE temporal_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view temporal metrics for their enterprise"
  ON temporal_metrics FOR SELECT
  USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

CREATE POLICY "Service role can manage temporal metrics"
  ON temporal_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE temporal_metrics IS
  'Time-bucketed aggregations for trend analysis and forecasting';

-- ============================================================================
-- 3. TEMPORAL PATTERNS TABLE
-- ============================================================================

-- Detected seasonal/cyclical/trend patterns
CREATE TABLE IF NOT EXISTS temporal_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Pattern identification
  pattern_type text NOT NULL CHECK (pattern_type IN (
    'seasonal', 'cyclical', 'trend', 'anomaly', 'correlation'
  )),
  pattern_name text NOT NULL,
  pattern_description text,

  -- Pattern details
  metric_category text NOT NULL,
  metric_name text NOT NULL,

  -- Pattern characteristics
  period_length interval, -- For seasonal/cyclical patterns
  period_unit text CHECK (period_unit IN ('hours', 'days', 'weeks', 'months', 'quarters', 'years')),

  -- Statistical properties
  amplitude numeric, -- Magnitude of the pattern
  phase_shift numeric, -- Offset in the cycle
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  r_squared numeric CHECK (r_squared >= 0 AND r_squared <= 1),
  sample_count integer,

  -- Trend specifics
  trend_slope numeric, -- For trend patterns
  trend_intercept numeric,
  trend_direction text CHECK (trend_direction IN ('increasing', 'decreasing', 'stable')),

  -- Anomaly specifics
  anomaly_type text CHECK (anomaly_type IN ('spike', 'drop', 'shift', 'outlier')),
  anomaly_severity numeric CHECK (anomaly_severity >= 0 AND anomaly_severity <= 1),
  anomaly_z_score numeric,

  -- Correlation specifics
  correlated_metric_category text,
  correlated_metric_name text,
  correlation_coefficient numeric,
  correlation_lag interval,

  -- Temporal bounds
  detected_at timestamptz DEFAULT NOW(),
  valid_from timestamptz,
  valid_until timestamptz,
  last_observed timestamptz,

  -- Status
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  verified_by_user_id uuid REFERENCES auth.users(id),

  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_temporal_patterns_enterprise ON temporal_patterns(enterprise_id, is_active);
CREATE INDEX idx_temporal_patterns_type ON temporal_patterns(pattern_type, is_active);
CREATE INDEX idx_temporal_patterns_metric ON temporal_patterns(metric_category, metric_name);

-- RLS
ALTER TABLE temporal_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view temporal patterns for their enterprise"
  ON temporal_patterns FOR SELECT
  USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

CREATE POLICY "Service role can manage temporal patterns"
  ON temporal_patterns FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE temporal_patterns IS
  'Detected temporal patterns (seasonal, cyclical, trends, anomalies) for predictive analytics';

-- ============================================================================
-- 4. RENEWAL PREDICTIONS TABLE
-- ============================================================================

-- AI-powered renewal probability scores
CREATE TABLE IF NOT EXISTS renewal_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Prediction details
  prediction_date timestamptz DEFAULT NOW(),
  contract_end_date timestamptz NOT NULL,
  days_until_expiration integer,

  -- Renewal probability
  renewal_probability numeric NOT NULL CHECK (renewal_probability >= 0 AND renewal_probability <= 1),
  probability_tier text GENERATED ALWAYS AS (
    CASE
      WHEN renewal_probability >= 0.8 THEN 'high'
      WHEN renewal_probability >= 0.5 THEN 'medium'
      WHEN renewal_probability >= 0.2 THEN 'low'
      ELSE 'unlikely'
    END
  ) STORED,

  -- Contributing factors
  factors jsonb NOT NULL DEFAULT '{}',
  -- Expected structure:
  -- {
  --   "vendor_relationship_score": 0.85,
  --   "contract_performance_score": 0.78,
  --   "budget_availability_score": 0.92,
  --   "historical_renewal_rate": 0.75,
  --   "market_conditions_score": 0.60,
  --   "compliance_status_score": 0.95
  -- }

  -- Confidence
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  model_version text,

  -- Recommended actions
  recommended_actions jsonb DEFAULT '[]',
  -- Expected structure: ["schedule_vendor_review", "prepare_renewal_terms", "negotiate_price"]

  -- Predicted outcomes
  predicted_renewal_value numeric,
  predicted_renewal_date timestamptz,
  predicted_negotiation_complexity text CHECK (predicted_negotiation_complexity IN ('low', 'medium', 'high')),

  -- Status tracking
  actual_outcome text CHECK (actual_outcome IN ('renewed', 'not_renewed', 'renegotiated', 'terminated', 'pending')),
  actual_renewal_date timestamptz,
  actual_renewal_value numeric,
  prediction_accuracy numeric, -- Calculated after outcome

  -- Metadata
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_renewal_predictions_enterprise ON renewal_predictions(enterprise_id, prediction_date DESC);
CREATE INDEX idx_renewal_predictions_contract ON renewal_predictions(contract_id, prediction_date DESC);
CREATE INDEX idx_renewal_predictions_probability ON renewal_predictions(renewal_probability DESC);
CREATE INDEX idx_renewal_predictions_expiration ON renewal_predictions(days_until_expiration);

-- RLS
ALTER TABLE renewal_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view renewal predictions for their enterprise"
  ON renewal_predictions FOR SELECT
  USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

CREATE POLICY "Service role can manage renewal predictions"
  ON renewal_predictions FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE renewal_predictions IS
  'AI-powered renewal probability predictions with contributing factors and outcomes';

-- ============================================================================
-- 5. TEMPORAL ALERTS TABLE
-- ============================================================================

-- Proactive alerts based on temporal predictions
CREATE TABLE IF NOT EXISTS temporal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Alert type
  alert_type text NOT NULL CHECK (alert_type IN (
    'renewal_approaching', 'trend_change', 'anomaly_detected',
    'seasonal_peak', 'budget_projection', 'vendor_performance_trend',
    'compliance_risk_trend', 'workload_forecast', 'deadline_clustering'
  )),

  -- Alert details
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),

  -- Related entities
  related_contract_id uuid REFERENCES contracts(id),
  related_vendor_id uuid REFERENCES vendors(id),
  related_budget_id uuid REFERENCES budgets(id),
  related_pattern_id uuid REFERENCES temporal_patterns(id),
  related_prediction_id uuid REFERENCES renewal_predictions(id),

  -- Temporal context
  alert_trigger_time timestamptz DEFAULT NOW(),
  predicted_impact_date timestamptz,
  time_to_impact interval,

  -- Quantified impact
  impact_probability numeric CHECK (impact_probability >= 0 AND impact_probability <= 1),
  estimated_value_impact numeric,
  estimated_time_impact interval,

  -- Recommended actions
  recommended_actions jsonb DEFAULT '[]',
  action_deadline timestamptz,

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'acknowledged', 'in_progress', 'resolved', 'dismissed', 'expired'
  )),
  acknowledged_at timestamptz,
  acknowledged_by_user_id uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES auth.users(id),
  resolution_notes text,

  -- Auto-dismiss rules
  auto_dismiss_at timestamptz,
  auto_dismiss_reason text,

  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_temporal_alerts_enterprise_status ON temporal_alerts(enterprise_id, status, created_at DESC);
CREATE INDEX idx_temporal_alerts_type ON temporal_alerts(alert_type, status);
CREATE INDEX idx_temporal_alerts_severity ON temporal_alerts(severity, status);
CREATE INDEX idx_temporal_alerts_impact ON temporal_alerts(predicted_impact_date) WHERE status = 'active';

-- RLS
ALTER TABLE temporal_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view temporal alerts for their enterprise"
  ON temporal_alerts FOR SELECT
  USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

CREATE POLICY "Users can update temporal alerts for their enterprise"
  ON temporal_alerts FOR UPDATE
  USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

CREATE POLICY "Service role can manage temporal alerts"
  ON temporal_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE temporal_alerts IS
  'Proactive alerts based on temporal predictions and pattern detection';

-- ============================================================================
-- 6. LIFECYCLE EVENT TRIGGER
-- ============================================================================

-- Automatically record lifecycle events on contract changes
CREATE OR REPLACE FUNCTION record_contract_lifecycle_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type text;
  v_previous_status text;
  v_new_status text;
  v_previous_value numeric;
  v_new_value numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'created';
    v_new_status := NEW.status;
    v_new_value := NEW.value;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Determine event type based on what changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_event_type := CASE NEW.status
        WHEN 'draft' THEN 'draft_updated'
        WHEN 'pending_approval' THEN 'submitted_for_approval'
        WHEN 'pending_review' THEN 'submitted_for_approval'
        WHEN 'active' THEN 'activated'
        WHEN 'expired' THEN 'expired'
        WHEN 'terminated' THEN 'terminated'
        WHEN 'suspended' THEN 'suspended'
        WHEN 'archived' THEN 'archived'
        ELSE 'draft_updated'
      END;
      v_previous_status := OLD.status;
      v_new_status := NEW.status;
    ELSIF OLD.value IS DISTINCT FROM NEW.value THEN
      v_event_type := 'value_changed';
      v_previous_value := OLD.value;
      v_new_value := NEW.value;
    ELSIF OLD.vendor_id IS DISTINCT FROM NEW.vendor_id THEN
      v_event_type := 'vendor_changed';
    ELSIF OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.end_date IS DISTINCT FROM NEW.end_date THEN
      v_event_type := 'dates_changed';
    ELSE
      v_event_type := 'draft_updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'deleted';
    v_previous_status := OLD.status;
  END IF;

  -- Insert the lifecycle event
  INSERT INTO contract_lifecycle_events (
    enterprise_id,
    contract_id,
    event_type,
    previous_status,
    new_status,
    previous_value,
    new_value,
    event_source,
    metadata
  ) VALUES (
    COALESCE(NEW.enterprise_id, OLD.enterprise_id),
    COALESCE(NEW.id, OLD.id),
    v_event_type,
    v_previous_status,
    v_new_status,
    v_previous_value,
    v_new_value,
    'system',
    jsonb_build_object(
      'trigger_operation', TG_OP,
      'trigger_table', TG_TABLE_NAME
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_contract_lifecycle_events ON contracts;
CREATE TRIGGER tr_contract_lifecycle_events
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION record_contract_lifecycle_event();

-- ============================================================================
-- 7. TEMPORAL METRICS AGGREGATION FUNCTION
-- ============================================================================

-- Aggregate metrics into time buckets
CREATE OR REPLACE FUNCTION aggregate_temporal_metrics(
  p_enterprise_id uuid,
  p_bucket_type text DEFAULT 'daily',
  p_start_date timestamptz DEFAULT NOW() - INTERVAL '30 days',
  p_end_date timestamptz DEFAULT NOW()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket_interval interval;
  v_inserted_count integer := 0;
  v_rows_affected integer;
BEGIN
  -- Determine bucket interval
  v_bucket_interval := CASE p_bucket_type
    WHEN 'hourly' THEN INTERVAL '1 hour'
    WHEN 'daily' THEN INTERVAL '1 day'
    WHEN 'weekly' THEN INTERVAL '1 week'
    WHEN 'monthly' THEN INTERVAL '1 month'
    ELSE INTERVAL '1 day'
  END;

  -- Aggregate contract metrics
  INSERT INTO temporal_metrics (
    enterprise_id, time_bucket, bucket_type, metric_category, metric_name,
    value, count, min_value, max_value, avg_value, sum_value
  )
  SELECT
    p_enterprise_id,
    date_trunc(p_bucket_type, created_at) as time_bucket,
    p_bucket_type,
    'contracts',
    'new_contracts',
    COUNT(*)::numeric as value,
    COUNT(*)::integer as count,
    MIN(value),
    MAX(value),
    AVG(value),
    SUM(value)
  FROM contracts
  WHERE enterprise_id = p_enterprise_id
    AND created_at >= p_start_date
    AND created_at < p_end_date
    AND deleted_at IS NULL
  GROUP BY date_trunc(p_bucket_type, created_at)
  ON CONFLICT (enterprise_id, time_bucket, bucket_type, metric_category, metric_name)
  DO UPDATE SET
    value = EXCLUDED.value,
    count = EXCLUDED.count,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    avg_value = EXCLUDED.avg_value,
    sum_value = EXCLUDED.sum_value;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  -- Aggregate contract value by status
  INSERT INTO temporal_metrics (
    enterprise_id, time_bucket, bucket_type, metric_category, metric_name,
    value, count, sum_value
  )
  SELECT
    p_enterprise_id,
    date_trunc(p_bucket_type, updated_at) as time_bucket,
    p_bucket_type,
    'contracts',
    'active_contract_value',
    SUM(value) as value,
    COUNT(*) as count,
    SUM(value)
  FROM contracts
  WHERE enterprise_id = p_enterprise_id
    AND status = 'active'
    AND updated_at >= p_start_date
    AND updated_at < p_end_date
    AND deleted_at IS NULL
  GROUP BY date_trunc(p_bucket_type, updated_at)
  ON CONFLICT (enterprise_id, time_bucket, bucket_type, metric_category, metric_name)
  DO UPDATE SET
    value = EXCLUDED.value,
    count = EXCLUDED.count,
    sum_value = EXCLUDED.sum_value;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  v_inserted_count := v_inserted_count + v_rows_affected;

  RETURN v_inserted_count;
END;
$$;

COMMENT ON FUNCTION aggregate_temporal_metrics IS
  'Aggregates contract and business metrics into time buckets for temporal analysis';

-- ============================================================================
-- 8. RENEWAL PROBABILITY CALCULATION FUNCTION
-- ============================================================================

-- Calculate renewal probability for a contract
CREATE OR REPLACE FUNCTION calculate_renewal_probability(p_contract_id uuid)
RETURNS TABLE (
  renewal_probability numeric,
  factors jsonb,
  confidence_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract record;
  v_vendor record;
  v_vendor_score numeric := 0.5;
  v_contract_perf_score numeric := 0.5;
  v_budget_score numeric := 0.5;
  v_historical_rate numeric := 0.5;
  v_compliance_score numeric := 0.5;
  v_factors jsonb;
  v_probability numeric;
  v_confidence numeric := 0.7;
BEGIN
  -- Get contract details
  SELECT c.*, v.performance_score, v.risk_level
  INTO v_contract
  FROM contracts c
  LEFT JOIN vendors v ON c.vendor_id = v.id
  WHERE c.id = p_contract_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0.0::numeric, '{}'::jsonb, 0.0::numeric;
    RETURN;
  END IF;

  -- Vendor relationship score (from vendor performance)
  IF v_contract.performance_score IS NOT NULL THEN
    v_vendor_score := v_contract.performance_score / 100.0;
  END IF;

  -- Contract performance score (based on status and history)
  v_contract_perf_score := CASE v_contract.status
    WHEN 'active' THEN 0.8
    WHEN 'pending_renewal' THEN 0.7
    WHEN 'suspended' THEN 0.3
    ELSE 0.5
  END;

  -- Risk adjustment
  IF v_contract.risk_level = 'high' THEN
    v_contract_perf_score := v_contract_perf_score * 0.7;
  ELSIF v_contract.risk_level = 'low' THEN
    v_contract_perf_score := v_contract_perf_score * 1.1;
  END IF;

  -- Historical renewal rate (simplified)
  SELECT COALESCE(AVG(CASE WHEN status = 'active' AND is_auto_renew THEN 1.0 ELSE 0.5 END), 0.5)
  INTO v_historical_rate
  FROM contracts
  WHERE enterprise_id = v_contract.enterprise_id
    AND vendor_id = v_contract.vendor_id
    AND deleted_at IS NULL;

  -- Build factors object
  v_factors := jsonb_build_object(
    'vendor_relationship_score', ROUND(v_vendor_score, 3),
    'contract_performance_score', ROUND(v_contract_perf_score, 3),
    'budget_availability_score', ROUND(v_budget_score, 3),
    'historical_renewal_rate', ROUND(v_historical_rate, 3),
    'compliance_status_score', ROUND(v_compliance_score, 3)
  );

  -- Calculate weighted probability
  v_probability := (
    v_vendor_score * 0.25 +
    v_contract_perf_score * 0.25 +
    v_budget_score * 0.15 +
    v_historical_rate * 0.20 +
    v_compliance_score * 0.15
  );

  -- Bound probability
  v_probability := GREATEST(0, LEAST(1, v_probability));

  RETURN QUERY SELECT v_probability, v_factors, v_confidence;
END;
$$;

COMMENT ON FUNCTION calculate_renewal_probability IS
  'Calculates renewal probability for a contract based on multiple weighted factors';

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON contract_lifecycle_events TO authenticated;
GRANT SELECT ON temporal_metrics TO authenticated;
GRANT SELECT ON temporal_patterns TO authenticated;
GRANT SELECT ON renewal_predictions TO authenticated;
GRANT SELECT, UPDATE ON temporal_alerts TO authenticated;

GRANT ALL ON contract_lifecycle_events TO service_role;
GRANT ALL ON temporal_metrics TO service_role;
GRANT ALL ON temporal_patterns TO service_role;
GRANT ALL ON renewal_predictions TO service_role;
GRANT ALL ON temporal_alerts TO service_role;

GRANT EXECUTE ON FUNCTION aggregate_temporal_metrics TO service_role;
GRANT EXECUTE ON FUNCTION calculate_renewal_probability TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
