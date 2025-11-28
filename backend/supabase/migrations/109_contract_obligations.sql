-- Migration 109: Contract Obligations
-- Part of CLM Implementation - Phase 1
-- Creates: contract_obligations, obligation_assignments, obligation_completions, obligation_reminders

-- ============================================
-- 1. CONTRACT OBLIGATIONS
-- ============================================

CREATE TABLE contract_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Identification
  title TEXT NOT NULL,
  description TEXT,

  -- Classification
  obligation_type TEXT NOT NULL CHECK (obligation_type IN (
    'delivery', 'payment', 'reporting', 'compliance',
    'renewal', 'notice', 'audit', 'insurance',
    'certification', 'milestone', 'sla', 'data_protection',
    'confidentiality', 'performance', 'other'
  )),
  party_responsible TEXT NOT NULL CHECK (party_responsible IN ('us', 'them', 'both')),

  -- Schedule
  frequency TEXT NOT NULL CHECK (frequency IN (
    'one_time', 'daily', 'weekly', 'bi_weekly',
    'monthly', 'quarterly', 'semi_annually', 'annually',
    'on_demand', 'as_needed', 'custom'
  )),

  -- Dates
  start_date DATE,
  end_date DATE,
  due_date DATE,
  next_due_date DATE,
  recurring_day INTEGER CHECK (recurring_day >= 1 AND recurring_day <= 31),
  recurring_config JSONB DEFAULT '{}'::JSONB,
  -- Example recurring_config: {
  --   "type": "monthly",
  --   "day_of_month": 15,
  --   "months": [1, 4, 7, 10],  -- For quarterly
  --   "business_days_only": true,
  --   "skip_weekends": true
  -- }

  -- Reminders
  reminder_days INTEGER[] DEFAULT '{7, 3, 1}',
  escalation_days INTEGER[] DEFAULT '{1, 3, 7}',

  -- Extraction metadata
  extracted_by TEXT CHECK (extracted_by IN ('ai', 'manual')),
  extraction_confidence INTEGER CHECK (extraction_confidence >= 0 AND extraction_confidence <= 100),
  source_text TEXT,
  source_page INTEGER,
  source_section TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'active', 'in_progress', 'completed',
    'overdue', 'waived', 'cancelled'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Risk
  risk_if_missed TEXT,
  financial_impact DECIMAL(15,2),
  risk_score INTEGER DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),

  -- Dependencies
  depends_on_obligation_id UUID REFERENCES contract_obligations(id) ON DELETE SET NULL,
  triggers_obligation_id UUID REFERENCES contract_obligations(id) ON DELETE SET NULL,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::JSONB,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contract_obligations IS 'Contract obligations extracted from contracts';
COMMENT ON COLUMN contract_obligations.obligation_type IS 'Type of obligation: delivery, payment, reporting, etc.';
COMMENT ON COLUMN contract_obligations.party_responsible IS 'Who is responsible: us, them, or both';
COMMENT ON COLUMN contract_obligations.frequency IS 'How often the obligation recurs';
COMMENT ON COLUMN contract_obligations.due_date IS 'For one-time obligations, the specific due date';
COMMENT ON COLUMN contract_obligations.next_due_date IS 'For recurring obligations, the next occurrence';
COMMENT ON COLUMN contract_obligations.recurring_day IS 'Day of month/week for recurring obligations';
COMMENT ON COLUMN contract_obligations.reminder_days IS 'Days before due date to send reminders';
COMMENT ON COLUMN contract_obligations.escalation_days IS 'Days after due date to escalate';
COMMENT ON COLUMN contract_obligations.extracted_by IS 'How obligation was captured: ai or manual';
COMMENT ON COLUMN contract_obligations.extraction_confidence IS 'AI confidence score 0-100';
COMMENT ON COLUMN contract_obligations.source_text IS 'Original text from contract';
COMMENT ON COLUMN contract_obligations.risk_score IS 'Risk score 0-100 if obligation is missed';

-- ============================================
-- 2. OBLIGATION ASSIGNMENTS
-- ============================================

CREATE TABLE obligation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,

  role TEXT NOT NULL CHECK (role IN ('primary', 'backup', 'reviewer', 'approver')),

  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  accepted BOOLEAN,
  accepted_at TIMESTAMPTZ,
  declined_reason TEXT,

  notifications_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(obligation_id, user_id, role)
);

COMMENT ON TABLE obligation_assignments IS 'Who is assigned to handle each obligation';
COMMENT ON COLUMN obligation_assignments.role IS 'Assignment role: primary, backup, reviewer, approver';
COMMENT ON COLUMN obligation_assignments.accepted IS 'Whether assignee accepted the assignment';
COMMENT ON COLUMN obligation_assignments.notifications_enabled IS 'Whether to send notifications to this assignee';

-- ============================================
-- 3. OBLIGATION COMPLETIONS
-- ============================================

CREATE TABLE obligation_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,

  -- When
  completion_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,

  -- Who
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Evidence
  evidence_type TEXT CHECK (evidence_type IN (
    'document', 'email', 'screenshot', 'attestation',
    'external_link', 'system_generated', 'report', 'other'
  )),
  evidence_url TEXT,
  evidence_file_id UUID,
  evidence_description TEXT,
  notes TEXT,

  -- Verification
  requires_verification BOOLEAN DEFAULT false,
  verified BOOLEAN,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  rejection_reason TEXT,

  -- Timing
  was_on_time BOOLEAN,
  days_early_late INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE obligation_completions IS 'Records of obligation completions with evidence';
COMMENT ON COLUMN obligation_completions.period_start IS 'For recurring: start of the period this covers';
COMMENT ON COLUMN obligation_completions.period_end IS 'For recurring: end of the period this covers';
COMMENT ON COLUMN obligation_completions.evidence_type IS 'Type of evidence provided';
COMMENT ON COLUMN obligation_completions.requires_verification IS 'Whether completion requires reviewer approval';
COMMENT ON COLUMN obligation_completions.was_on_time IS 'Whether completed by due date';
COMMENT ON COLUMN obligation_completions.days_early_late IS 'Negative = early, Positive = late';

-- ============================================
-- 4. OBLIGATION REMINDERS
-- ============================================

CREATE TABLE obligation_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,

  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('upcoming', 'due', 'overdue', 'escalation')),
  days_offset INTEGER NOT NULL,

  notification_channels TEXT[] DEFAULT '{email, in_app}',
  recipients JSONB DEFAULT '[]'::JSONB,

  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  sent_by TEXT,

  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE obligation_reminders IS 'Scheduled reminders for obligations';
COMMENT ON COLUMN obligation_reminders.reminder_type IS 'Type: upcoming (before), due (on date), overdue (after), escalation';
COMMENT ON COLUMN obligation_reminders.days_offset IS 'Days from due date (negative = before, positive = after)';
COMMENT ON COLUMN obligation_reminders.notification_channels IS 'How to notify: email, in_app, slack, etc.';
COMMENT ON COLUMN obligation_reminders.recipients IS 'Array of user_ids to notify';

-- ============================================
-- 5. INDEXES
-- ============================================

-- contract_obligations indexes
CREATE INDEX idx_obligations_enterprise ON contract_obligations(enterprise_id);
CREATE INDEX idx_obligations_contract ON contract_obligations(contract_id);
CREATE INDEX idx_obligations_status ON contract_obligations(status);
CREATE INDEX idx_obligations_type ON contract_obligations(obligation_type);
CREATE INDEX idx_obligations_party ON contract_obligations(party_responsible);
CREATE INDEX idx_obligations_due_date ON contract_obligations(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_obligations_next_due ON contract_obligations(next_due_date) WHERE next_due_date IS NOT NULL;
CREATE INDEX idx_obligations_priority ON contract_obligations(priority);
CREATE INDEX idx_obligations_overdue ON contract_obligations(enterprise_id, status, next_due_date)
  WHERE status IN ('active', 'overdue');
CREATE INDEX idx_obligations_tags ON contract_obligations USING GIN(tags);

-- obligation_assignments indexes
CREATE INDEX idx_obligation_assignments_obligation ON obligation_assignments(obligation_id);
CREATE INDEX idx_obligation_assignments_user ON obligation_assignments(user_id);
CREATE INDEX idx_obligation_assignments_role ON obligation_assignments(role);

-- obligation_completions indexes
CREATE INDEX idx_obligation_completions_obligation ON obligation_completions(obligation_id);
CREATE INDEX idx_obligation_completions_date ON obligation_completions(completion_date);
CREATE INDEX idx_obligation_completions_pending ON obligation_completions(obligation_id)
  WHERE requires_verification = true AND verified IS NULL;

-- obligation_reminders indexes
CREATE INDEX idx_obligation_reminders_obligation ON obligation_reminders(obligation_id);
CREATE INDEX idx_obligation_reminders_scheduled ON obligation_reminders(scheduled_for)
  WHERE sent_at IS NULL;
CREATE INDEX idx_obligation_reminders_pending ON obligation_reminders(scheduled_for, reminder_type)
  WHERE sent_at IS NULL;

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE contract_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligation_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligation_reminders ENABLE ROW LEVEL SECURITY;

-- contract_obligations RLS
CREATE POLICY "obligations_enterprise_isolation" ON contract_obligations
  FOR ALL USING (enterprise_id = get_user_enterprise_id());

-- obligation_assignments RLS (via obligation)
CREATE POLICY "obligation_assignments_via_obligation" ON obligation_assignments
  FOR ALL USING (
    obligation_id IN (
      SELECT id FROM contract_obligations
      WHERE enterprise_id = get_user_enterprise_id()
    )
  );

-- obligation_completions RLS (via obligation)
CREATE POLICY "obligation_completions_via_obligation" ON obligation_completions
  FOR ALL USING (
    obligation_id IN (
      SELECT id FROM contract_obligations
      WHERE enterprise_id = get_user_enterprise_id()
    )
  );

-- obligation_reminders RLS (via obligation)
CREATE POLICY "obligation_reminders_via_obligation" ON obligation_reminders
  FOR ALL USING (
    obligation_id IN (
      SELECT id FROM contract_obligations
      WHERE enterprise_id = get_user_enterprise_id()
    )
  );

-- ============================================
-- 7. TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update obligation timestamp
CREATE OR REPLACE FUNCTION update_obligation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
CREATE TRIGGER contract_obligations_update_timestamp
  BEFORE UPDATE ON contract_obligations
  FOR EACH ROW EXECUTE FUNCTION update_obligation_timestamp();

CREATE TRIGGER obligation_assignments_update_timestamp
  BEFORE UPDATE ON obligation_assignments
  FOR EACH ROW EXECUTE FUNCTION update_obligation_timestamp();

-- Function to calculate next due date for recurring obligations
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  p_frequency TEXT,
  p_current_due DATE,
  p_recurring_day INTEGER DEFAULT NULL,
  p_recurring_config JSONB DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
  next_date DATE;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      next_date := p_current_due + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_date := p_current_due + INTERVAL '1 week';
    WHEN 'bi_weekly' THEN
      next_date := p_current_due + INTERVAL '2 weeks';
    WHEN 'monthly' THEN
      IF p_recurring_day IS NOT NULL THEN
        next_date := (date_trunc('month', p_current_due) + INTERVAL '1 month')::DATE;
        next_date := (date_trunc('month', next_date) + (p_recurring_day - 1) * INTERVAL '1 day')::DATE;
      ELSE
        next_date := p_current_due + INTERVAL '1 month';
      END IF;
    WHEN 'quarterly' THEN
      next_date := p_current_due + INTERVAL '3 months';
    WHEN 'semi_annually' THEN
      next_date := p_current_due + INTERVAL '6 months';
    WHEN 'annually' THEN
      next_date := p_current_due + INTERVAL '1 year';
    ELSE
      next_date := NULL;
  END CASE;

  RETURN next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update obligation status based on due dates
CREATE OR REPLACE FUNCTION update_obligation_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if status is active and we're checking due dates
  IF NEW.status = 'active' THEN
    IF NEW.frequency = 'one_time' AND NEW.due_date < CURRENT_DATE THEN
      NEW.status := 'overdue';
    ELSIF NEW.frequency != 'one_time' AND NEW.next_due_date < CURRENT_DATE THEN
      NEW.status := 'overdue';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check overdue status
CREATE TRIGGER contract_obligations_check_overdue
  BEFORE INSERT OR UPDATE ON contract_obligations
  FOR EACH ROW EXECUTE FUNCTION update_obligation_overdue_status();

-- Function to handle obligation completion and advance recurring
CREATE OR REPLACE FUNCTION process_obligation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_obligation RECORD;
  v_next_due DATE;
BEGIN
  -- Get obligation details
  SELECT * INTO v_obligation
  FROM contract_obligations
  WHERE id = NEW.obligation_id;

  -- Calculate timing
  IF v_obligation.frequency = 'one_time' THEN
    NEW.was_on_time := NEW.completion_date <= v_obligation.due_date;
    NEW.days_early_late := NEW.completion_date - v_obligation.due_date;

    -- Mark one-time obligation as completed if verified or no verification needed
    IF NOT NEW.requires_verification OR NEW.verified = true THEN
      UPDATE contract_obligations
      SET status = 'completed', updated_at = NOW()
      WHERE id = NEW.obligation_id;
    END IF;
  ELSE
    -- Recurring obligation
    NEW.was_on_time := NEW.completion_date <= v_obligation.next_due_date;
    NEW.days_early_late := NEW.completion_date - v_obligation.next_due_date;

    -- Advance to next due date
    v_next_due := calculate_next_due_date(
      v_obligation.frequency,
      v_obligation.next_due_date,
      v_obligation.recurring_day,
      v_obligation.recurring_config
    );

    IF v_next_due IS NOT NULL AND (v_obligation.end_date IS NULL OR v_next_due <= v_obligation.end_date) THEN
      UPDATE contract_obligations
      SET
        next_due_date = v_next_due,
        status = 'active',
        updated_at = NOW()
      WHERE id = NEW.obligation_id;
    ELSE
      -- No more occurrences
      UPDATE contract_obligations
      SET status = 'completed', updated_at = NOW()
      WHERE id = NEW.obligation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for completion processing
CREATE TRIGGER obligation_completions_process
  BEFORE INSERT ON obligation_completions
  FOR EACH ROW EXECUTE FUNCTION process_obligation_completion();

-- Function to create reminders for an obligation
CREATE OR REPLACE FUNCTION create_obligation_reminders(p_obligation_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_obligation RECORD;
  v_due_date DATE;
  v_assignees UUID[];
  v_reminder_day INTEGER;
  v_reminder_count INTEGER := 0;
BEGIN
  -- Get obligation
  SELECT * INTO v_obligation
  FROM contract_obligations
  WHERE id = p_obligation_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Determine due date
  v_due_date := COALESCE(v_obligation.next_due_date, v_obligation.due_date);
  IF v_due_date IS NULL THEN
    RETURN 0;
  END IF;

  -- Get assignees
  SELECT ARRAY_AGG(user_id) INTO v_assignees
  FROM obligation_assignments
  WHERE obligation_id = p_obligation_id AND notifications_enabled = true;

  IF v_assignees IS NULL OR array_length(v_assignees, 1) = 0 THEN
    RETURN 0;
  END IF;

  -- Delete existing unsent reminders
  DELETE FROM obligation_reminders
  WHERE obligation_id = p_obligation_id AND sent_at IS NULL;

  -- Create upcoming reminders
  FOREACH v_reminder_day IN ARRAY v_obligation.reminder_days
  LOOP
    INSERT INTO obligation_reminders (
      obligation_id,
      reminder_type,
      days_offset,
      scheduled_for,
      recipients
    ) VALUES (
      p_obligation_id,
      'upcoming',
      -v_reminder_day,
      (v_due_date - v_reminder_day * INTERVAL '1 day')::TIMESTAMPTZ,
      to_jsonb(v_assignees)
    );
    v_reminder_count := v_reminder_count + 1;
  END LOOP;

  -- Create due date reminder
  INSERT INTO obligation_reminders (
    obligation_id,
    reminder_type,
    days_offset,
    scheduled_for,
    recipients
  ) VALUES (
    p_obligation_id,
    'due',
    0,
    v_due_date::TIMESTAMPTZ,
    to_jsonb(v_assignees)
  );
  v_reminder_count := v_reminder_count + 1;

  -- Create escalation reminders
  FOREACH v_reminder_day IN ARRAY v_obligation.escalation_days
  LOOP
    INSERT INTO obligation_reminders (
      obligation_id,
      reminder_type,
      days_offset,
      scheduled_for,
      recipients
    ) VALUES (
      p_obligation_id,
      CASE WHEN v_reminder_day <= 3 THEN 'overdue' ELSE 'escalation' END,
      v_reminder_day,
      (v_due_date + v_reminder_day * INTERVAL '1 day')::TIMESTAMPTZ,
      to_jsonb(v_assignees)
    );
    v_reminder_count := v_reminder_count + 1;
  END LOOP;

  RETURN v_reminder_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to get obligations calendar data
CREATE OR REPLACE FUNCTION get_obligations_calendar(
  p_enterprise_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_user_id UUID DEFAULT NULL,
  p_contract_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  obligation_type TEXT,
  party_responsible TEXT,
  due_date DATE,
  status TEXT,
  priority TEXT,
  contract_id UUID,
  contract_name TEXT,
  vendor_name TEXT,
  assignees JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    co.id,
    co.title,
    co.obligation_type,
    co.party_responsible,
    COALESCE(co.next_due_date, co.due_date) AS due_date,
    co.status,
    co.priority,
    co.contract_id,
    c.name AS contract_name,
    v.name AS vendor_name,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', oa.user_id,
        'role', oa.role,
        'user_email', u.email
      )), '[]'::JSONB)
      FROM obligation_assignments oa
      LEFT JOIN auth.users u ON oa.user_id = u.id
      WHERE oa.obligation_id = co.id
    ) AS assignees
  FROM contract_obligations co
  JOIN contracts c ON co.contract_id = c.id
  LEFT JOIN vendors v ON c.vendor_id = v.id
  WHERE co.enterprise_id = p_enterprise_id
    AND COALESCE(co.next_due_date, co.due_date) BETWEEN p_start_date AND p_end_date
    AND co.status IN ('pending', 'active', 'overdue', 'in_progress')
    AND (p_user_id IS NULL OR EXISTS (
      SELECT 1 FROM obligation_assignments oa
      WHERE oa.obligation_id = co.id AND oa.user_id = p_user_id
    ))
    AND (p_contract_id IS NULL OR co.contract_id = p_contract_id)
  ORDER BY due_date, co.priority DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get overdue obligations
CREATE OR REPLACE FUNCTION get_overdue_obligations(
  p_enterprise_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  obligation_type TEXT,
  due_date DATE,
  days_overdue INTEGER,
  status TEXT,
  priority TEXT,
  contract_id UUID,
  contract_name TEXT,
  vendor_name TEXT,
  risk_score INTEGER,
  financial_impact DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    co.id,
    co.title,
    co.obligation_type,
    COALESCE(co.next_due_date, co.due_date) AS due_date,
    (CURRENT_DATE - COALESCE(co.next_due_date, co.due_date))::INTEGER AS days_overdue,
    co.status,
    co.priority,
    co.contract_id,
    c.name AS contract_name,
    v.name AS vendor_name,
    co.risk_score,
    co.financial_impact
  FROM contract_obligations co
  JOIN contracts c ON co.contract_id = c.id
  LEFT JOIN vendors v ON c.vendor_id = v.id
  WHERE co.enterprise_id = p_enterprise_id
    AND co.status = 'overdue'
    AND (p_user_id IS NULL OR EXISTS (
      SELECT 1 FROM obligation_assignments oa
      WHERE oa.obligation_id = co.id AND oa.user_id = p_user_id
    ))
  ORDER BY days_overdue DESC, co.priority DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get obligation summary stats
CREATE OR REPLACE FUNCTION get_obligation_stats(
  p_enterprise_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH obligation_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'active') AS active_count,
      COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
      COUNT(*) FILTER (WHERE COALESCE(next_due_date, due_date) BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) AS due_this_week,
      COUNT(*) FILTER (WHERE COALESCE(next_due_date, due_date) BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS due_this_month,
      COUNT(*) FILTER (WHERE priority = 'critical' AND status IN ('active', 'overdue')) AS critical_pending
    FROM contract_obligations co
    WHERE co.enterprise_id = p_enterprise_id
      AND (p_user_id IS NULL OR EXISTS (
        SELECT 1 FROM obligation_assignments oa
        WHERE oa.obligation_id = co.id AND oa.user_id = p_user_id
      ))
  )
  SELECT jsonb_build_object(
    'active', active_count,
    'overdue', overdue_count,
    'pending', pending_count,
    'completed', completed_count,
    'due_this_week', due_this_week,
    'due_this_month', due_this_month,
    'critical_pending', critical_pending
  ) INTO result
  FROM obligation_counts;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_next_due_date TO authenticated;
GRANT EXECUTE ON FUNCTION create_obligation_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION get_obligations_calendar TO authenticated;
GRANT EXECUTE ON FUNCTION get_overdue_obligations TO authenticated;
GRANT EXECUTE ON FUNCTION get_obligation_stats TO authenticated;
