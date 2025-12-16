-- ============================================================================
-- Migration: 115_obligation_tracking_enhancements.sql
-- Description: Enhanced Obligation Tracking System
--
-- Adds advanced tracking capabilities:
-- - Performance tracking (actual vs expected)
-- - Dependency management with cascade analysis
-- - Risk assessments with remediation tracking
-- - Escalation workflow with multi-tier support
-- - Complete audit trail
-- ============================================================================

-- ============================================================================
-- 1. OBLIGATION PERFORMANCE TRACKING
-- ============================================================================

-- Track actual vs expected performance for each obligation occurrence
CREATE TABLE IF NOT EXISTS obligation_performance_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  obligation_id uuid NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,
  completion_id uuid REFERENCES obligation_completions(id) ON DELETE SET NULL,

  -- Period being tracked
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,

  -- Expected performance
  expected_completion_date timestamptz NOT NULL,
  expected_quality_score numeric(5,2) DEFAULT 100,
  expected_value numeric,

  -- Actual performance
  actual_completion_date timestamptz,
  actual_quality_score numeric(5,2),
  actual_value numeric,

  -- Variance analysis
  days_variance integer GENERATED ALWAYS AS (
    CASE WHEN actual_completion_date IS NOT NULL
    THEN EXTRACT(DAY FROM (actual_completion_date - expected_completion_date))::integer
    ELSE NULL END
  ) STORED,
  quality_variance numeric(5,2) GENERATED ALWAYS AS (
    actual_quality_score - expected_quality_score
  ) STORED,
  value_variance numeric GENERATED ALWAYS AS (
    actual_value - expected_value
  ) STORED,

  -- Performance indicators
  on_time_delivery boolean,
  quality_met boolean,
  value_met boolean,
  overall_performance_score numeric(5,2), -- 0-100

  -- Root cause analysis (if performance issue)
  performance_issue_type text CHECK (performance_issue_type IN (
    'late_delivery', 'quality_issue', 'incomplete', 'resource_constraint',
    'dependency_delay', 'external_factor', 'communication_gap', 'other'
  )),
  root_cause_notes text,
  corrective_actions jsonb DEFAULT '[]',

  -- Impact assessment
  business_impact text CHECK (business_impact IN ('none', 'low', 'medium', 'high', 'critical')),
  financial_impact_amount numeric,
  relationship_impact text,

  -- Metadata
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_perf_tracking_enterprise ON obligation_performance_tracking(enterprise_id);
CREATE INDEX idx_perf_tracking_obligation ON obligation_performance_tracking(obligation_id);
CREATE INDEX idx_perf_tracking_period ON obligation_performance_tracking(period_start, period_end);
CREATE INDEX idx_perf_tracking_score ON obligation_performance_tracking(overall_performance_score);

-- RLS
ALTER TABLE obligation_performance_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_tracking_enterprise_isolation" ON obligation_performance_tracking
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

COMMENT ON TABLE obligation_performance_tracking IS
  'Tracks actual vs expected performance for each obligation occurrence';

-- ============================================================================
-- 2. OBLIGATION DEPENDENCIES
-- ============================================================================

-- Track dependency relationships between obligations
CREATE TABLE IF NOT EXISTS obligation_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Relationship
  parent_obligation_id uuid NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,
  child_obligation_id uuid NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,

  -- Dependency type
  dependency_type text NOT NULL CHECK (dependency_type IN (
    'blocks', -- Child cannot start until parent completes
    'starts_with', -- Child starts when parent starts
    'ends_with', -- Child ends when parent ends
    'triggered_by', -- Child is triggered by parent completion
    'informs', -- Parent outcome informs child (soft dependency)
    'resource_shared' -- Same resource, cannot run concurrently
  )),

  -- Timing constraints
  lag_days integer DEFAULT 0, -- Days between parent completion and child start
  lead_days integer DEFAULT 0, -- Days child can start before parent completes

  -- Dependency strength
  is_critical boolean DEFAULT true, -- If true, child cannot proceed without parent
  failure_action text DEFAULT 'block' CHECK (failure_action IN (
    'block', 'warn', 'notify', 'escalate', 'skip'
  )),

  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'satisfied', 'blocked', 'overridden')),
  satisfied_at timestamptz,
  blocked_at timestamptz,
  override_reason text,
  overridden_by uuid REFERENCES auth.users(id),

  -- Metadata
  notes text,
  created_at timestamptz DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id),

  -- Prevent circular dependencies and self-references
  CONSTRAINT no_self_dependency CHECK (parent_obligation_id != child_obligation_id),
  CONSTRAINT unique_dependency UNIQUE (parent_obligation_id, child_obligation_id)
);

-- Indexes
CREATE INDEX idx_obligation_deps_parent ON obligation_dependencies(parent_obligation_id);
CREATE INDEX idx_obligation_deps_child ON obligation_dependencies(child_obligation_id);
CREATE INDEX idx_obligation_deps_status ON obligation_dependencies(status);

-- RLS
ALTER TABLE obligation_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obligation_deps_enterprise_isolation" ON obligation_dependencies
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

COMMENT ON TABLE obligation_dependencies IS
  'Tracks dependency relationships between obligations for cascade analysis';

-- ============================================================================
-- 3. OBLIGATION RISK ASSESSMENTS
-- ============================================================================

-- Risk scoring and remediation tracking for obligations
CREATE TABLE IF NOT EXISTS obligation_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  obligation_id uuid NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,

  -- Assessment metadata
  assessment_date timestamptz DEFAULT NOW(),
  assessment_type text NOT NULL CHECK (assessment_type IN (
    'initial', 'periodic', 'triggered', 'remediation_review', 'audit'
  )),
  assessed_by uuid REFERENCES auth.users(id),
  assessed_by_agent text, -- If assessed by AI agent

  -- Risk scoring
  likelihood_score integer NOT NULL CHECK (likelihood_score >= 1 AND likelihood_score <= 5),
  impact_score integer NOT NULL CHECK (impact_score >= 1 AND impact_score <= 5),
  overall_risk_score integer GENERATED ALWAYS AS (likelihood_score * impact_score) STORED,
  risk_level text GENERATED ALWAYS AS (
    CASE
      WHEN likelihood_score * impact_score >= 20 THEN 'critical'
      WHEN likelihood_score * impact_score >= 12 THEN 'high'
      WHEN likelihood_score * impact_score >= 6 THEN 'medium'
      ELSE 'low'
    END
  ) STORED,

  -- Risk factors
  risk_factors jsonb DEFAULT '[]',
  -- Expected structure:
  -- [
  --   { "factor": "vendor_reliability", "score": 3, "weight": 0.2, "notes": "..." },
  --   { "factor": "complexity", "score": 4, "weight": 0.15, "notes": "..." }
  -- ]

  -- Potential consequences
  potential_consequences jsonb DEFAULT '[]',
  financial_exposure numeric,
  regulatory_implications text,
  reputational_risk text,

  -- Mitigation strategy
  mitigation_status text DEFAULT 'pending' CHECK (mitigation_status IN (
    'pending', 'in_progress', 'implemented', 'verified', 'not_required'
  )),
  mitigation_actions jsonb DEFAULT '[]',
  -- Expected structure:
  -- [
  --   { "action": "...", "owner": "user_id", "due_date": "...", "status": "pending" }
  -- ]
  mitigation_deadline timestamptz,
  mitigation_owner_id uuid REFERENCES auth.users(id),

  -- Residual risk (after mitigation)
  residual_likelihood integer CHECK (residual_likelihood >= 1 AND residual_likelihood <= 5),
  residual_impact integer CHECK (residual_impact >= 1 AND residual_impact <= 5),
  residual_risk_score integer GENERATED ALWAYS AS (
    COALESCE(residual_likelihood * residual_impact, likelihood_score * impact_score)
  ) STORED,

  -- Review schedule
  next_review_date timestamptz,
  review_frequency text CHECK (review_frequency IN (
    'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'on_trigger'
  )),

  -- Status
  is_current boolean DEFAULT true,
  superseded_by uuid REFERENCES obligation_risk_assessments(id),

  -- Metadata
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_risk_assessments_obligation ON obligation_risk_assessments(obligation_id, is_current);
CREATE INDEX idx_risk_assessments_level ON obligation_risk_assessments(risk_level, is_current);
CREATE INDEX idx_risk_assessments_review ON obligation_risk_assessments(next_review_date)
  WHERE is_current = true AND next_review_date IS NOT NULL;

-- RLS
ALTER TABLE obligation_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_assessments_enterprise_isolation" ON obligation_risk_assessments
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

COMMENT ON TABLE obligation_risk_assessments IS
  'Risk assessments and remediation tracking for obligations';

-- ============================================================================
-- 4. OBLIGATION ESCALATIONS
-- ============================================================================

-- Multi-tier escalation workflow tracking
CREATE TABLE IF NOT EXISTS obligation_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  obligation_id uuid NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,

  -- Escalation details
  escalation_level integer NOT NULL DEFAULT 1, -- 1, 2, 3, etc.
  escalation_type text NOT NULL CHECK (escalation_type IN (
    'overdue', 'risk_threshold', 'dependency_blocked', 'quality_issue',
    'compliance_violation', 'stakeholder_request', 'automated', 'manual'
  )),

  -- Trigger info
  triggered_at timestamptz DEFAULT NOW(),
  trigger_reason text NOT NULL,
  trigger_threshold jsonb, -- e.g., { "days_overdue": 5 } or { "risk_score": 15 }
  triggered_by text CHECK (triggered_by IN ('system', 'agent', 'user')),
  triggered_by_user_id uuid REFERENCES auth.users(id),

  -- Escalation target
  escalated_to_user_id uuid REFERENCES auth.users(id),
  escalated_to_role text,
  escalated_to_team text,

  -- Notification
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  notification_channels text[] DEFAULT '{email, in_app}',
  notification_message text,

  -- Response
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id),
  response_deadline timestamptz,

  -- Resolution
  status text DEFAULT 'active' CHECK (status IN (
    'active', 'acknowledged', 'in_progress', 'resolved', 'escalated_further', 'expired'
  )),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_action text,
  resolution_notes text,

  -- Auto-escalation config
  auto_escalate_after_hours integer,
  next_escalation_level integer,
  auto_escalation_scheduled_at timestamptz,

  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_escalations_obligation ON obligation_escalations(obligation_id, escalation_level);
CREATE INDEX idx_escalations_status ON obligation_escalations(status, triggered_at DESC);
CREATE INDEX idx_escalations_user ON obligation_escalations(escalated_to_user_id, status);
CREATE INDEX idx_escalations_auto ON obligation_escalations(auto_escalation_scheduled_at)
  WHERE status = 'active' AND auto_escalation_scheduled_at IS NOT NULL;

-- RLS
ALTER TABLE obligation_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escalations_enterprise_isolation" ON obligation_escalations
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

COMMENT ON TABLE obligation_escalations IS
  'Multi-tier escalation workflow tracking for obligations';

-- ============================================================================
-- 5. OBLIGATION AUDIT LOG
-- ============================================================================

-- Complete audit trail for obligation changes
CREATE TABLE IF NOT EXISTS obligation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  obligation_id uuid NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,

  -- Action details
  action text NOT NULL CHECK (action IN (
    'created', 'updated', 'deleted', 'status_changed', 'assigned',
    'unassigned', 'completed', 'completion_verified', 'completion_rejected',
    'reminder_sent', 'escalated', 'escalation_resolved', 'risk_assessed',
    'dependency_added', 'dependency_removed', 'dependency_satisfied',
    'performance_recorded', 'comment_added', 'attachment_added'
  )),
  action_category text GENERATED ALWAYS AS (
    CASE
      WHEN action IN ('created', 'updated', 'deleted') THEN 'lifecycle'
      WHEN action IN ('status_changed') THEN 'status'
      WHEN action IN ('assigned', 'unassigned') THEN 'assignment'
      WHEN action IN ('completed', 'completion_verified', 'completion_rejected') THEN 'completion'
      WHEN action IN ('reminder_sent', 'escalated', 'escalation_resolved') THEN 'notification'
      WHEN action IN ('risk_assessed') THEN 'risk'
      WHEN action IN ('dependency_added', 'dependency_removed', 'dependency_satisfied') THEN 'dependency'
      WHEN action IN ('performance_recorded') THEN 'performance'
      ELSE 'other'
    END
  ) STORED,

  -- Actor
  performed_by_user_id uuid REFERENCES auth.users(id),
  performed_by_agent text,
  performed_by_system boolean DEFAULT false,

  -- Changes
  previous_state jsonb,
  new_state jsonb,
  changed_fields text[],

  -- Context
  reason text,
  ip_address inet,
  user_agent text,

  -- Related entities
  related_completion_id uuid,
  related_escalation_id uuid,
  related_risk_assessment_id uuid,
  related_dependency_id uuid,

  -- Timestamp
  created_at timestamptz DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_log_obligation ON obligation_audit_log(obligation_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON obligation_audit_log(action, created_at DESC);
CREATE INDEX idx_audit_log_category ON obligation_audit_log(action_category, created_at DESC);
CREATE INDEX idx_audit_log_user ON obligation_audit_log(performed_by_user_id, created_at DESC);

-- RLS
ALTER TABLE obligation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_enterprise_isolation" ON obligation_audit_log
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid);

COMMENT ON TABLE obligation_audit_log IS
  'Complete audit trail for all obligation-related actions';

-- ============================================================================
-- 6. CASCADE IMPACT CALCULATION FUNCTION
-- ============================================================================

-- Calculate cascading impact when an obligation is delayed or fails
CREATE OR REPLACE FUNCTION calculate_obligation_cascade_impact(
  p_obligation_id uuid,
  p_delay_days integer DEFAULT 0
)
RETURNS TABLE (
  affected_obligation_id uuid,
  affected_obligation_title text,
  dependency_path text[],
  cascade_level integer,
  original_due_date timestamptz,
  new_projected_due_date timestamptz,
  delay_days integer,
  is_critical boolean,
  impact_severity text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE cascade AS (
    -- Base case: direct dependencies
    SELECT
      od.child_obligation_id,
      ARRAY[p_obligation_id::text, od.child_obligation_id::text] AS path,
      1 AS level,
      od.is_critical,
      od.lag_days
    FROM obligation_dependencies od
    WHERE od.parent_obligation_id = p_obligation_id
      AND od.status = 'active'

    UNION ALL

    -- Recursive case: transitive dependencies
    SELECT
      od.child_obligation_id,
      c.path || od.child_obligation_id::text,
      c.level + 1,
      od.is_critical AND c.is_critical,
      c.lag_days + od.lag_days
    FROM cascade c
    JOIN obligation_dependencies od ON od.parent_obligation_id = c.child_obligation_id
    WHERE NOT od.child_obligation_id = ANY(c.path::uuid[])
      AND od.status = 'active'
      AND c.level < 10 -- Prevent infinite loops
  )
  SELECT
    co.id,
    co.title,
    c.path,
    c.level,
    COALESCE(co.next_due_date, co.due_date)::timestamptz,
    (COALESCE(co.next_due_date, co.due_date) + (p_delay_days + c.lag_days) * INTERVAL '1 day')::timestamptz,
    p_delay_days + c.lag_days,
    c.is_critical,
    CASE
      WHEN c.is_critical AND c.level <= 2 THEN 'critical'
      WHEN c.is_critical THEN 'high'
      WHEN c.level <= 2 THEN 'medium'
      ELSE 'low'
    END
  FROM cascade c
  JOIN contract_obligations co ON co.id = c.child_obligation_id
  ORDER BY c.level, c.is_critical DESC;
END;
$$;

COMMENT ON FUNCTION calculate_obligation_cascade_impact IS
  'Calculates cascading impact on dependent obligations when an obligation is delayed';

-- ============================================================================
-- 7. OBLIGATION HEALTH SCORE FUNCTION
-- ============================================================================

-- Calculate overall health score for an obligation (0-100)
CREATE OR REPLACE FUNCTION get_obligation_health_score(p_obligation_id uuid)
RETURNS TABLE (
  health_score numeric,
  health_status text,
  components jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_obligation record;
  v_on_time_rate numeric;
  v_completion_rate numeric;
  v_risk_score numeric;
  v_dependency_health numeric;
  v_escalation_count integer;
  v_components jsonb;
  v_health numeric;
  v_status text;
BEGIN
  -- Get obligation
  SELECT * INTO v_obligation
  FROM contract_obligations
  WHERE id = p_obligation_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::numeric, 'unknown'::text, '{}'::jsonb;
    RETURN;
  END IF;

  -- Calculate on-time delivery rate (from performance tracking)
  SELECT COALESCE(AVG(CASE WHEN on_time_delivery THEN 100 ELSE 0 END), 100)
  INTO v_on_time_rate
  FROM obligation_performance_tracking
  WHERE obligation_id = p_obligation_id;

  -- Calculate completion rate
  SELECT COALESCE(
    (SELECT COUNT(*) FILTER (WHERE was_on_time = true)::numeric /
     NULLIF(COUNT(*), 0) * 100
     FROM obligation_completions
     WHERE obligation_id = p_obligation_id),
    100
  ) INTO v_completion_rate;

  -- Get current risk score (inverted: high risk = low health)
  SELECT COALESCE(100 - (overall_risk_score * 4), 80)
  INTO v_risk_score
  FROM obligation_risk_assessments
  WHERE obligation_id = p_obligation_id AND is_current = true
  LIMIT 1;

  IF v_risk_score IS NULL THEN v_risk_score := 80; END IF;

  -- Calculate dependency health
  SELECT COALESCE(
    100 - (COUNT(*) FILTER (WHERE status = 'blocked') * 20),
    100
  )
  INTO v_dependency_health
  FROM obligation_dependencies
  WHERE child_obligation_id = p_obligation_id;

  -- Count active escalations (penalty)
  SELECT COUNT(*) INTO v_escalation_count
  FROM obligation_escalations
  WHERE obligation_id = p_obligation_id AND status = 'active';

  -- Calculate weighted health score
  v_health := (
    v_on_time_rate * 0.30 +
    v_completion_rate * 0.25 +
    v_risk_score * 0.25 +
    v_dependency_health * 0.20
  ) - (v_escalation_count * 5);

  v_health := GREATEST(0, LEAST(100, v_health));

  -- Determine status
  v_status := CASE
    WHEN v_health >= 80 THEN 'healthy'
    WHEN v_health >= 60 THEN 'at_risk'
    WHEN v_health >= 40 THEN 'degraded'
    ELSE 'critical'
  END;

  -- Build components object
  v_components := jsonb_build_object(
    'on_time_rate', ROUND(v_on_time_rate, 2),
    'completion_rate', ROUND(v_completion_rate, 2),
    'risk_adjusted_score', ROUND(v_risk_score, 2),
    'dependency_health', ROUND(v_dependency_health, 2),
    'active_escalations', v_escalation_count
  );

  RETURN QUERY SELECT ROUND(v_health, 2), v_status, v_components;
END;
$$;

COMMENT ON FUNCTION get_obligation_health_score IS
  'Calculates composite health score (0-100) for an obligation based on multiple factors';

-- ============================================================================
-- 8. DAILY MONITORING FUNCTION
-- ============================================================================

-- Process daily obligation monitoring
CREATE OR REPLACE FUNCTION process_daily_obligation_monitoring(p_enterprise_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_overdue_count integer := 0;
  v_escalated_count integer := 0;
  v_risk_reviewed_count integer := 0;
  v_reminders_sent integer := 0;
BEGIN
  -- Update overdue status for obligations past due
  UPDATE contract_obligations
  SET status = 'overdue', updated_at = NOW()
  WHERE enterprise_id = p_enterprise_id
    AND status = 'active'
    AND (
      (frequency = 'one_time' AND due_date < CURRENT_DATE) OR
      (frequency != 'one_time' AND next_due_date < CURRENT_DATE)
    );

  GET DIAGNOSTICS v_overdue_count = ROW_COUNT;

  -- Auto-escalate obligations overdue > 3 days at level 1, > 7 days at level 2
  INSERT INTO obligation_escalations (
    enterprise_id, obligation_id, escalation_level, escalation_type,
    trigger_reason, trigger_threshold, triggered_by
  )
  SELECT
    co.enterprise_id,
    co.id,
    CASE
      WHEN CURRENT_DATE - COALESCE(co.next_due_date, co.due_date) > 7 THEN 2
      ELSE 1
    END,
    'overdue',
    'Auto-escalated due to overdue status',
    jsonb_build_object('days_overdue', CURRENT_DATE - COALESCE(co.next_due_date, co.due_date)),
    'system'
  FROM contract_obligations co
  WHERE co.enterprise_id = p_enterprise_id
    AND co.status = 'overdue'
    AND NOT EXISTS (
      SELECT 1 FROM obligation_escalations oe
      WHERE oe.obligation_id = co.id
        AND oe.status = 'active'
        AND oe.escalation_level >= CASE
          WHEN CURRENT_DATE - COALESCE(co.next_due_date, co.due_date) > 7 THEN 2
          ELSE 1
        END
    );

  GET DIAGNOSTICS v_escalated_count = ROW_COUNT;

  -- Mark risk assessments as needing review
  UPDATE obligation_risk_assessments
  SET next_review_date = CURRENT_DATE
  WHERE enterprise_id = p_enterprise_id
    AND is_current = true
    AND next_review_date <= CURRENT_DATE
    AND mitigation_status NOT IN ('implemented', 'verified');

  GET DIAGNOSTICS v_risk_reviewed_count = ROW_COUNT;

  -- Build result
  v_result := jsonb_build_object(
    'date', CURRENT_DATE,
    'enterprise_id', p_enterprise_id,
    'obligations_marked_overdue', v_overdue_count,
    'escalations_created', v_escalated_count,
    'risk_reviews_triggered', v_risk_reviewed_count,
    'reminders_sent', v_reminders_sent
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION process_daily_obligation_monitoring IS
  'Runs daily obligation monitoring: marks overdue, creates escalations, triggers reviews';

-- ============================================================================
-- 9. AUDIT TRIGGER FUNCTION
-- ============================================================================

-- Trigger to automatically log obligation changes
CREATE OR REPLACE FUNCTION log_obligation_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action text;
  v_changed_fields text[];
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      v_action := 'status_changed';
    ELSE
      v_action := 'updated';
    END IF;

    -- Track changed fields
    SELECT ARRAY_AGG(key)
    INTO v_changed_fields
    FROM jsonb_each(to_jsonb(NEW)) n
    WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
  END IF;

  -- Insert audit log
  INSERT INTO obligation_audit_log (
    enterprise_id,
    obligation_id,
    action,
    previous_state,
    new_state,
    changed_fields,
    performed_by_system
  ) VALUES (
    COALESCE(NEW.enterprise_id, OLD.enterprise_id),
    COALESCE(NEW.id, OLD.id),
    v_action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    v_changed_fields,
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit trigger
DROP TRIGGER IF EXISTS tr_obligation_audit ON contract_obligations;
CREATE TRIGGER tr_obligation_audit
  AFTER INSERT OR UPDATE OR DELETE ON contract_obligations
  FOR EACH ROW
  EXECUTE FUNCTION log_obligation_audit();

-- ============================================================================
-- 10. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON obligation_performance_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON obligation_dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON obligation_risk_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON obligation_escalations TO authenticated;
GRANT SELECT ON obligation_audit_log TO authenticated;

GRANT ALL ON obligation_performance_tracking TO service_role;
GRANT ALL ON obligation_dependencies TO service_role;
GRANT ALL ON obligation_risk_assessments TO service_role;
GRANT ALL ON obligation_escalations TO service_role;
GRANT ALL ON obligation_audit_log TO service_role;

GRANT EXECUTE ON FUNCTION calculate_obligation_cascade_impact TO authenticated;
GRANT EXECUTE ON FUNCTION get_obligation_health_score TO authenticated;
GRANT EXECUTE ON FUNCTION process_daily_obligation_monitoring TO service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================
