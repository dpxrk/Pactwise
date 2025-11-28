-- Migration 108: Negotiation Playbooks
-- Part of CLM Implementation - Phase 1
-- Creates: negotiation_playbooks, playbook_rules, playbook_usage

-- ============================================
-- 1. NEGOTIATION PLAYBOOKS
-- ============================================

CREATE TABLE negotiation_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Applicability
  contract_types TEXT[] NOT NULL DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'active', 'deprecated')),
  version INTEGER DEFAULT 1,

  -- Ownership
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, name)
);

COMMENT ON TABLE negotiation_playbooks IS 'Negotiation strategy guides for contract types';
COMMENT ON COLUMN negotiation_playbooks.contract_types IS 'Array of contract types this playbook applies to (SaaS, MSA, NDA, etc.)';
COMMENT ON COLUMN negotiation_playbooks.status IS 'Playbook lifecycle: draft, pending_approval, active, deprecated';
COMMENT ON COLUMN negotiation_playbooks.version IS 'Playbook version for tracking changes';

-- ============================================
-- 2. PLAYBOOK RULES
-- ============================================

CREATE TABLE playbook_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES negotiation_playbooks(id) ON DELETE CASCADE,

  -- Which clause this rule applies to
  clause_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

  -- Positions
  standard_clause_id UUID REFERENCES clause_library(id) ON DELETE SET NULL,
  standard_position_text TEXT,

  -- Fallback positions (ordered array)
  fallback_positions JSONB DEFAULT '[]'::JSONB,
  -- Example: [
  --   {"order": 1, "text": "...", "clause_id": "uuid", "description": "First fallback"},
  --   {"order": 2, "text": "...", "clause_id": null, "description": "Second fallback"},
  --   {"order": 3, "text": "...", "clause_id": null, "description": "Walk away position"}
  -- ]

  -- Red lines (non-negotiable terms)
  red_lines JSONB DEFAULT '[]'::JSONB,
  -- Example: [
  --   {"term": "No unlimited liability", "description": "Must have liability cap", "consequence": "Walk away from deal"},
  --   {"term": "Mutual indemnification", "description": "Cannot accept one-sided indemnity", "consequence": "Escalate to GC"}
  -- ]

  -- Guidance
  guidance_notes TEXT,
  talking_points JSONB DEFAULT '[]'::JSONB,
  common_pushback JSONB DEFAULT '[]'::JSONB,
  -- Example common_pushback: [
  --   {"pushback": "We need unlimited liability", "response": "We can offer 2x annual contract value"},
  --   {"pushback": "Our standard terms don't allow this", "response": "We can provide references from similar clients"}
  -- ]

  -- Escalation
  escalation_triggers JSONB DEFAULT '[]'::JSONB,
  -- Example: [
  --   {"trigger": "Vendor rejects all fallback positions", "action": "Escalate to Legal Manager"},
  --   {"trigger": "Liability cap requested > 3x ACV", "action": "Escalate to CFO"}
  -- ]
  authority_level TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(playbook_id, clause_type)
);

COMMENT ON TABLE playbook_rules IS 'Individual negotiation rules within a playbook';
COMMENT ON COLUMN playbook_rules.priority IS '1-10 where 1 is highest priority (most important clause)';
COMMENT ON COLUMN playbook_rules.standard_clause_id IS 'Link to preferred clause from clause library';
COMMENT ON COLUMN playbook_rules.standard_position_text IS 'Fallback if no clause library entry - raw text';
COMMENT ON COLUMN playbook_rules.fallback_positions IS 'Ordered array of fallback positions if standard rejected';
COMMENT ON COLUMN playbook_rules.red_lines IS 'Non-negotiable terms that cannot be compromised';
COMMENT ON COLUMN playbook_rules.guidance_notes IS 'Free-form guidance for negotiators';
COMMENT ON COLUMN playbook_rules.talking_points IS 'Key points to make during negotiation';
COMMENT ON COLUMN playbook_rules.common_pushback IS 'Expected vendor objections and suggested responses';
COMMENT ON COLUMN playbook_rules.escalation_triggers IS 'Conditions that require escalation';
COMMENT ON COLUMN playbook_rules.authority_level IS 'Role that can approve deviations from this rule';

-- ============================================
-- 3. PLAYBOOK USAGE (Track Usage in Negotiations)
-- ============================================

CREATE TABLE playbook_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  playbook_id UUID NOT NULL REFERENCES negotiation_playbooks(id) ON DELETE RESTRICT,

  -- What happened during negotiation
  deviations JSONB DEFAULT '[]'::JSONB,
  -- Example: [
  --   {"clause_type": "liability", "rule_id": "uuid", "deviation_type": "used_fallback", "position_used": 2, "reason": "Vendor insisted"},
  --   {"clause_type": "indemnification", "rule_id": "uuid", "deviation_type": "custom", "custom_text": "...", "reason": "Hybrid position"}
  -- ]

  escalations JSONB DEFAULT '[]'::JSONB,
  -- Example: [
  --   {"clause_type": "liability", "escalated_to": "Legal Manager", "escalated_at": "2024-01-15T10:00:00Z", "outcome": "approved", "notes": "..."}
  -- ]

  -- Outcomes per clause type
  outcomes JSONB DEFAULT '{}'::JSONB,
  -- Example: {
  --   "liability": "won",           -- Got our standard or better
  --   "indemnification": "compromised", -- Used fallback position
  --   "termination": "lost",        -- Had to accept their terms
  --   "payment": "won"
  -- }

  -- Summary
  overall_outcome TEXT CHECK (overall_outcome IN ('favorable', 'neutral', 'unfavorable')),
  lessons_learned TEXT,

  -- Stats
  total_clauses_negotiated INTEGER DEFAULT 0,
  clauses_won INTEGER DEFAULT 0,
  clauses_compromised INTEGER DEFAULT 0,
  clauses_lost INTEGER DEFAULT 0,
  red_lines_triggered INTEGER DEFAULT 0,
  escalations_count INTEGER DEFAULT 0,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE playbook_usage IS 'Tracks how playbooks are used in actual negotiations';
COMMENT ON COLUMN playbook_usage.deviations IS 'Records when negotiator deviated from playbook rules';
COMMENT ON COLUMN playbook_usage.escalations IS 'Records escalations during negotiation';
COMMENT ON COLUMN playbook_usage.outcomes IS 'Per-clause outcome: won, compromised, or lost';
COMMENT ON COLUMN playbook_usage.overall_outcome IS 'Summary assessment of negotiation outcome';
COMMENT ON COLUMN playbook_usage.lessons_learned IS 'Notes for improving future negotiations';

-- ============================================
-- 4. INDEXES
-- ============================================

-- negotiation_playbooks indexes
CREATE INDEX idx_playbooks_enterprise ON negotiation_playbooks(enterprise_id);
CREATE INDEX idx_playbooks_status ON negotiation_playbooks(status);
CREATE INDEX idx_playbooks_contract_types ON negotiation_playbooks USING GIN(contract_types);
CREATE INDEX idx_playbooks_active ON negotiation_playbooks(enterprise_id, status) WHERE status = 'active';

-- playbook_rules indexes
CREATE INDEX idx_playbook_rules_playbook ON playbook_rules(playbook_id);
CREATE INDEX idx_playbook_rules_clause_type ON playbook_rules(clause_type);
CREATE INDEX idx_playbook_rules_priority ON playbook_rules(playbook_id, priority);

-- playbook_usage indexes
CREATE INDEX idx_playbook_usage_contract ON playbook_usage(contract_id);
CREATE INDEX idx_playbook_usage_playbook ON playbook_usage(playbook_id);
CREATE INDEX idx_playbook_usage_outcome ON playbook_usage(overall_outcome);
CREATE INDEX idx_playbook_usage_dates ON playbook_usage(started_at, completed_at);

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE negotiation_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_usage ENABLE ROW LEVEL SECURITY;

-- negotiation_playbooks RLS
CREATE POLICY "playbooks_enterprise_isolation" ON negotiation_playbooks
  FOR ALL USING (enterprise_id = get_user_enterprise_id());

-- playbook_rules RLS (via playbook)
CREATE POLICY "playbook_rules_via_playbook" ON playbook_rules
  FOR ALL USING (
    playbook_id IN (
      SELECT id FROM negotiation_playbooks
      WHERE enterprise_id = get_user_enterprise_id()
    )
  );

-- playbook_usage RLS (via contract)
CREATE POLICY "playbook_usage_via_contract" ON playbook_usage
  FOR ALL USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE enterprise_id = get_user_enterprise_id()
    )
  );

-- ============================================
-- 6. TRIGGERS & FUNCTIONS
-- ============================================

-- Function to update playbook timestamp
CREATE OR REPLACE FUNCTION update_playbook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for playbook timestamp
CREATE TRIGGER negotiation_playbooks_update_timestamp
  BEFORE UPDATE ON negotiation_playbooks
  FOR EACH ROW EXECUTE FUNCTION update_playbook_timestamp();

-- Trigger for playbook rules timestamp
CREATE TRIGGER playbook_rules_update_timestamp
  BEFORE UPDATE ON playbook_rules
  FOR EACH ROW EXECUTE FUNCTION update_playbook_timestamp();

-- Trigger for playbook usage timestamp
CREATE TRIGGER playbook_usage_update_timestamp
  BEFORE UPDATE ON playbook_usage
  FOR EACH ROW EXECUTE FUNCTION update_playbook_timestamp();

-- Function to calculate usage stats
CREATE OR REPLACE FUNCTION update_playbook_usage_stats()
RETURNS TRIGGER AS $$
DECLARE
  outcome_record RECORD;
  won_count INTEGER := 0;
  compromised_count INTEGER := 0;
  lost_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  -- Count outcomes from JSONB
  FOR outcome_record IN SELECT key, value FROM jsonb_each_text(NEW.outcomes)
  LOOP
    total_count := total_count + 1;
    CASE outcome_record.value
      WHEN 'won' THEN won_count := won_count + 1;
      WHEN 'compromised' THEN compromised_count := compromised_count + 1;
      WHEN 'lost' THEN lost_count := lost_count + 1;
      ELSE NULL;
    END CASE;
  END LOOP;

  NEW.total_clauses_negotiated := total_count;
  NEW.clauses_won := won_count;
  NEW.clauses_compromised := compromised_count;
  NEW.clauses_lost := lost_count;
  NEW.escalations_count := jsonb_array_length(COALESCE(NEW.escalations, '[]'::JSONB));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update usage stats
CREATE TRIGGER playbook_usage_calculate_stats
  BEFORE INSERT OR UPDATE ON playbook_usage
  FOR EACH ROW EXECUTE FUNCTION update_playbook_usage_stats();

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to suggest playbook for contract type
CREATE OR REPLACE FUNCTION suggest_playbook_for_contract(
  p_enterprise_id UUID,
  p_contract_type TEXT
)
RETURNS TABLE (
  playbook_id UUID,
  playbook_name TEXT,
  match_score INTEGER,
  usage_count BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    np.id AS playbook_id,
    np.name AS playbook_name,
    CASE
      WHEN p_contract_type = ANY(np.contract_types) THEN 100
      ELSE 50
    END AS match_score,
    COUNT(pu.id) AS usage_count,
    CASE
      WHEN COUNT(pu.id) > 0 THEN
        ROUND(
          (COUNT(CASE WHEN pu.overall_outcome = 'favorable' THEN 1 END)::NUMERIC /
           COUNT(pu.id)::NUMERIC) * 100,
          2
        )
      ELSE 0
    END AS success_rate
  FROM negotiation_playbooks np
  LEFT JOIN playbook_usage pu ON np.id = pu.playbook_id
  WHERE np.enterprise_id = p_enterprise_id
    AND np.status = 'active'
    AND (
      p_contract_type = ANY(np.contract_types)
      OR array_length(np.contract_types, 1) IS NULL
    )
  GROUP BY np.id, np.name, np.contract_types
  ORDER BY match_score DESC, usage_count DESC, success_rate DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get playbook with all rules
CREATE OR REPLACE FUNCTION get_playbook_with_rules(
  p_playbook_id UUID
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'playbook', jsonb_build_object(
      'id', np.id,
      'name', np.name,
      'description', np.description,
      'contract_types', np.contract_types,
      'status', np.status,
      'version', np.version,
      'created_at', np.created_at,
      'updated_at', np.updated_at
    ),
    'rules', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'clause_type', pr.clause_type,
          'priority', pr.priority,
          'standard_clause_id', pr.standard_clause_id,
          'standard_clause', CASE
            WHEN cl.id IS NOT NULL THEN jsonb_build_object(
              'id', cl.id,
              'title', cl.title,
              'content', cl.content
            )
            ELSE NULL
          END,
          'standard_position_text', pr.standard_position_text,
          'fallback_positions', pr.fallback_positions,
          'red_lines', pr.red_lines,
          'guidance_notes', pr.guidance_notes,
          'talking_points', pr.talking_points,
          'common_pushback', pr.common_pushback,
          'escalation_triggers', pr.escalation_triggers,
          'authority_level', pr.authority_level
        ) ORDER BY pr.priority
      )
      FROM playbook_rules pr
      LEFT JOIN clause_library cl ON pr.standard_clause_id = cl.id
      WHERE pr.playbook_id = np.id
    ), '[]'::JSONB),
    'stats', jsonb_build_object(
      'total_uses', (SELECT COUNT(*) FROM playbook_usage WHERE playbook_id = np.id),
      'favorable_outcomes', (SELECT COUNT(*) FROM playbook_usage WHERE playbook_id = np.id AND overall_outcome = 'favorable'),
      'neutral_outcomes', (SELECT COUNT(*) FROM playbook_usage WHERE playbook_id = np.id AND overall_outcome = 'neutral'),
      'unfavorable_outcomes', (SELECT COUNT(*) FROM playbook_usage WHERE playbook_id = np.id AND overall_outcome = 'unfavorable')
    )
  ) INTO result
  FROM negotiation_playbooks np
  WHERE np.id = p_playbook_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get playbook effectiveness report
CREATE OR REPLACE FUNCTION get_playbook_effectiveness(
  p_playbook_id UUID
)
RETURNS TABLE (
  clause_type TEXT,
  total_negotiations INTEGER,
  won_count INTEGER,
  compromised_count INTEGER,
  lost_count INTEGER,
  win_rate NUMERIC,
  avg_position_used NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH clause_outcomes AS (
    SELECT
      co.key AS clause_type,
      co.value::TEXT AS outcome,
      pu.id AS usage_id
    FROM playbook_usage pu,
    LATERAL jsonb_each(pu.outcomes) AS co
    WHERE pu.playbook_id = p_playbook_id
  )
  SELECT
    co.clause_type,
    COUNT(*)::INTEGER AS total_negotiations,
    COUNT(CASE WHEN co.outcome = 'won' THEN 1 END)::INTEGER AS won_count,
    COUNT(CASE WHEN co.outcome = 'compromised' THEN 1 END)::INTEGER AS compromised_count,
    COUNT(CASE WHEN co.outcome = 'lost' THEN 1 END)::INTEGER AS lost_count,
    ROUND(
      (COUNT(CASE WHEN co.outcome = 'won' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS win_rate,
    0::NUMERIC AS avg_position_used -- Would need deviation tracking to calculate
  FROM clause_outcomes co
  GROUP BY co.clause_type
  ORDER BY total_negotiations DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION suggest_playbook_for_contract TO authenticated;
GRANT EXECUTE ON FUNCTION get_playbook_with_rules TO authenticated;
GRANT EXECUTE ON FUNCTION get_playbook_effectiveness TO authenticated;
