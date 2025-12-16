-- Migration 123: Clause Conflict Detection and Risk Automation
-- Implements clause compatibility checking, conflict detection, and automated risk scoring

-- =====================================================
-- CLAUSE CONFLICT DETECTION
-- =====================================================

-- Clause Categories for conflict grouping
CREATE TABLE clause_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES clause_categories(id),

  -- Classification
  category_type TEXT NOT NULL CHECK (category_type IN (
    'liability', 'indemnification', 'termination', 'payment',
    'confidentiality', 'ip_rights', 'compliance', 'warranties',
    'dispute_resolution', 'force_majeure', 'data_protection',
    'non_compete', 'assignment', 'insurance', 'audit_rights',
    'service_levels', 'custom'
  )),

  -- Risk weighting
  default_risk_weight NUMERIC(3,2) DEFAULT 1.0 CHECK (default_risk_weight BETWEEN 0 AND 5),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, name)
);

-- Clause Definitions (canonical clauses for conflict checking)
CREATE TABLE clause_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES clause_categories(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Clause content patterns
  canonical_text TEXT,  -- Standard version of clause
  detection_patterns TEXT[],  -- Regex patterns to detect this clause
  keywords TEXT[],  -- Keywords for fuzzy matching

  -- Classification
  clause_type TEXT NOT NULL CHECK (clause_type IN (
    'standard', 'favorable', 'unfavorable', 'neutral', 'prohibited'
  )),

  -- Negotiation guidance
  negotiation_notes TEXT,
  fallback_positions TEXT[],
  must_have BOOLEAN DEFAULT false,

  -- Risk parameters
  base_risk_score INTEGER DEFAULT 0 CHECK (base_risk_score BETWEEN -100 AND 100),

  -- Versioning
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clause Conflict Rules (pairwise conflicts)
CREATE TABLE clause_conflict_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  -- Conflicting clauses (can be specific clauses or categories)
  clause_a_id UUID REFERENCES clause_definitions(id) ON DELETE CASCADE,
  clause_b_id UUID REFERENCES clause_definitions(id) ON DELETE CASCADE,
  category_a_id UUID REFERENCES clause_categories(id) ON DELETE CASCADE,
  category_b_id UUID REFERENCES clause_categories(id) ON DELETE CASCADE,

  -- At least one pair must be specified
  CONSTRAINT conflict_pair_required CHECK (
    (clause_a_id IS NOT NULL AND clause_b_id IS NOT NULL) OR
    (category_a_id IS NOT NULL AND category_b_id IS NOT NULL) OR
    (clause_a_id IS NOT NULL AND category_b_id IS NOT NULL) OR
    (category_a_id IS NOT NULL AND clause_b_id IS NOT NULL)
  ),

  -- Conflict details
  conflict_type TEXT NOT NULL CHECK (conflict_type IN (
    'direct_conflict',      -- Clauses directly contradict
    'partial_conflict',     -- Some provisions conflict
    'tension',              -- Creates legal/business tension
    'dependency',           -- One requires the other
    'supersedes',           -- One overrides the other
    'mutually_exclusive'    -- Cannot coexist
  )),

  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),

  -- Resolution guidance
  description TEXT NOT NULL,
  resolution_guidance TEXT,
  precedence TEXT CHECK (precedence IN ('clause_a', 'clause_b', 'neither', 'negotiable')),

  -- Risk impact
  risk_impact INTEGER DEFAULT 0 CHECK (risk_impact BETWEEN 0 AND 100),

  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clause Compatibility Matrix (allowed combinations)
CREATE TABLE clause_compatibility_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  clause_id UUID NOT NULL REFERENCES clause_definitions(id) ON DELETE CASCADE,
  compatible_with_clause_id UUID NOT NULL REFERENCES clause_definitions(id) ON DELETE CASCADE,

  -- Compatibility level
  compatibility_score NUMERIC(3,2) NOT NULL CHECK (compatibility_score BETWEEN 0 AND 1),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, clause_id, compatible_with_clause_id)
);

-- =====================================================
-- DETECTED CONFLICTS
-- =====================================================

-- Detected Clause Conflicts (per contract)
CREATE TABLE detected_clause_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  document_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,

  -- Conflict rule that was triggered
  conflict_rule_id UUID REFERENCES clause_conflict_rules(id) ON DELETE SET NULL,

  -- Detected clauses
  clause_a_text TEXT NOT NULL,
  clause_a_location JSONB,  -- {page, paragraph, start_offset, end_offset}
  clause_b_text TEXT NOT NULL,
  clause_b_location JSONB,

  -- Detection details
  detection_method TEXT NOT NULL CHECK (detection_method IN (
    'ai_analysis', 'pattern_matching', 'manual_review', 'rule_engine'
  )),
  confidence_score NUMERIC(3,2) CHECK (confidence_score BETWEEN 0 AND 1),

  -- Conflict classification
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  conflict_type TEXT NOT NULL,

  -- Resolution
  status TEXT DEFAULT 'detected' CHECK (status IN (
    'detected', 'under_review', 'resolved', 'accepted', 'dismissed', 'escalated'
  )),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  -- Risk impact
  risk_impact INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conflict Resolution History
CREATE TABLE conflict_resolution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL REFERENCES detected_clause_conflicts(id) ON DELETE CASCADE,

  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,

  action_taken TEXT,
  notes TEXT,

  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RISK AUTOMATION
-- =====================================================

-- Risk Factor Definitions
CREATE TABLE risk_factor_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Factor category
  category TEXT NOT NULL CHECK (category IN (
    'financial', 'legal', 'operational', 'compliance',
    'reputational', 'strategic', 'security', 'vendor'
  )),

  -- Scoring parameters
  weight NUMERIC(3,2) DEFAULT 1.0 CHECK (weight BETWEEN 0 AND 5),
  max_score INTEGER DEFAULT 100 CHECK (max_score > 0),

  -- Evaluation rules (JSONB for flexibility)
  evaluation_rules JSONB NOT NULL DEFAULT '[]',
  -- Example: [
  --   {"condition": "contract_value > 1000000", "score": 80},
  --   {"condition": "vendor_rating < 3", "score": 60},
  --   {"condition": "missing_insurance", "score": 90}
  -- ]

  -- Thresholds for severity
  thresholds JSONB DEFAULT '{
    "low": {"min": 0, "max": 25},
    "medium": {"min": 26, "max": 50},
    "high": {"min": 51, "max": 75},
    "critical": {"min": 76, "max": 100}
  }',

  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, name)
);

-- Contract Risk Assessments
CREATE TABLE contract_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Assessment metadata
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    'initial', 'periodic', 'triggered', 'manual', 'ai_generated'
  )),
  assessment_version INTEGER DEFAULT 1,

  -- Overall scores
  overall_risk_score NUMERIC(5,2) NOT NULL CHECK (overall_risk_score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('critical', 'high', 'medium', 'low', 'minimal')),

  -- Component scores
  financial_risk_score NUMERIC(5,2) DEFAULT 0,
  legal_risk_score NUMERIC(5,2) DEFAULT 0,
  operational_risk_score NUMERIC(5,2) DEFAULT 0,
  compliance_risk_score NUMERIC(5,2) DEFAULT 0,
  vendor_risk_score NUMERIC(5,2) DEFAULT 0,

  -- Detailed breakdown
  factor_scores JSONB DEFAULT '[]',
  -- Example: [
  --   {"factor_id": "uuid", "factor_name": "Contract Value", "raw_score": 75, "weighted_score": 82.5}
  -- ]

  -- Conflict impact
  conflict_count INTEGER DEFAULT 0,
  conflict_risk_contribution NUMERIC(5,2) DEFAULT 0,

  -- AI analysis
  ai_summary TEXT,
  ai_recommendations JSONB DEFAULT '[]',

  -- Status
  status TEXT DEFAULT 'current' CHECK (status IN (
    'current', 'superseded', 'archived'
  )),

  -- Approval
  requires_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Assessment Factor Details (individual factor evaluations)
CREATE TABLE risk_assessment_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES contract_risk_assessments(id) ON DELETE CASCADE,
  factor_id UUID NOT NULL REFERENCES risk_factor_definitions(id) ON DELETE CASCADE,

  -- Scores
  raw_score NUMERIC(5,2) NOT NULL,
  weighted_score NUMERIC(5,2) NOT NULL,

  -- Evaluation details
  triggered_rules JSONB DEFAULT '[]',
  evaluation_data JSONB DEFAULT '{}',

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Mitigation Actions
CREATE TABLE risk_mitigation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES contract_risk_assessments(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Action details
  title TEXT NOT NULL,
  description TEXT,

  -- Categorization
  category TEXT NOT NULL CHECK (category IN (
    'clause_modification', 'insurance_requirement', 'approval_escalation',
    'vendor_due_diligence', 'legal_review', 'compliance_check',
    'financial_review', 'security_audit', 'other'
  )),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Expected impact
  expected_risk_reduction NUMERIC(5,2),

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'deferred', 'cancelled'
  )),
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,

  -- Actual impact (post-completion)
  actual_risk_reduction NUMERIC(5,2),

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Score History (audit trail)
CREATE TABLE risk_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES contract_risk_assessments(id) ON DELETE CASCADE,

  previous_score NUMERIC(5,2),
  new_score NUMERIC(5,2) NOT NULL,
  previous_level TEXT,
  new_level TEXT NOT NULL,

  change_reason TEXT,
  change_trigger TEXT CHECK (change_trigger IN (
    'contract_update', 'clause_change', 'conflict_detected',
    'conflict_resolved', 'mitigation_completed', 'vendor_rating_change',
    'periodic_review', 'manual_adjustment', 'ai_reassessment'
  )),

  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- RISK THRESHOLDS AND ALERTS
-- =====================================================

-- Risk Threshold Configurations
CREATE TABLE risk_threshold_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Threshold type
  threshold_type TEXT NOT NULL CHECK (threshold_type IN (
    'overall_score', 'category_score', 'factor_score',
    'conflict_count', 'score_change'
  )),

  -- Threshold values
  warning_threshold NUMERIC(5,2),
  critical_threshold NUMERIC(5,2),

  -- Associated category/factor (if applicable)
  category TEXT,
  factor_id UUID REFERENCES risk_factor_definitions(id),

  -- Actions on breach
  actions_on_warning JSONB DEFAULT '[]',
  actions_on_critical JSONB DEFAULT '[]',
  -- Example: [
  --   {"action": "notify", "targets": ["role:legal_admin"]},
  --   {"action": "block_signing", "reason": "Risk threshold exceeded"},
  --   {"action": "require_approval", "approver_role": "admin"}
  -- ]

  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(enterprise_id, name)
);

-- Risk Alert Log
CREATE TABLE risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES contract_risk_assessments(id) ON DELETE SET NULL,
  threshold_config_id UUID REFERENCES risk_threshold_configs(id) ON DELETE SET NULL,

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'critical')),
  alert_reason TEXT NOT NULL,

  -- Current values
  current_value NUMERIC(5,2),
  threshold_value NUMERIC(5,2),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'acknowledged', 'resolved', 'dismissed'
  )),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Actions taken
  actions_triggered JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Clause detection indexes
CREATE INDEX idx_clause_categories_enterprise ON clause_categories(enterprise_id);
CREATE INDEX idx_clause_definitions_enterprise ON clause_definitions(enterprise_id);
CREATE INDEX idx_clause_definitions_category ON clause_definitions(category_id);
CREATE INDEX idx_clause_definitions_keywords ON clause_definitions USING gin(keywords);
CREATE INDEX idx_clause_conflict_rules_enterprise ON clause_conflict_rules(enterprise_id);
CREATE INDEX idx_clause_conflict_rules_clauses ON clause_conflict_rules(clause_a_id, clause_b_id);

-- Detected conflicts indexes
CREATE INDEX idx_detected_conflicts_contract ON detected_clause_conflicts(contract_id);
CREATE INDEX idx_detected_conflicts_status ON detected_clause_conflicts(status);
CREATE INDEX idx_detected_conflicts_severity ON detected_clause_conflicts(severity);

-- Risk assessment indexes
CREATE INDEX idx_risk_factors_enterprise ON risk_factor_definitions(enterprise_id);
CREATE INDEX idx_risk_assessments_contract ON contract_risk_assessments(contract_id);
CREATE INDEX idx_risk_assessments_status ON contract_risk_assessments(status);
CREATE INDEX idx_risk_assessments_level ON contract_risk_assessments(risk_level);
CREATE INDEX idx_risk_assessment_factors_assessment ON risk_assessment_factors(assessment_id);
CREATE INDEX idx_risk_mitigation_contract ON risk_mitigation_actions(contract_id);
CREATE INDEX idx_risk_mitigation_status ON risk_mitigation_actions(status);
CREATE INDEX idx_risk_score_history_contract ON risk_score_history(contract_id);
CREATE INDEX idx_risk_alerts_contract ON risk_alerts(contract_id);
CREATE INDEX idx_risk_alerts_status ON risk_alerts(status);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE clause_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_conflict_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_compatibility_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_clause_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_resolution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_factor_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessment_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_mitigation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_threshold_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;

-- Enterprise isolation policies
CREATE POLICY clause_categories_enterprise_isolation ON clause_categories
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY clause_definitions_enterprise_isolation ON clause_definitions
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY clause_conflict_rules_enterprise_isolation ON clause_conflict_rules
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY clause_compatibility_enterprise_isolation ON clause_compatibility_matrix
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY detected_conflicts_enterprise_isolation ON detected_clause_conflicts
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY conflict_resolution_enterprise_isolation ON conflict_resolution_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM detected_clause_conflicts c
      WHERE c.id = conflict_resolution_history.conflict_id
      AND c.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY risk_factors_enterprise_isolation ON risk_factor_definitions
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY risk_assessments_enterprise_isolation ON contract_risk_assessments
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY risk_assessment_factors_enterprise_isolation ON risk_assessment_factors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contract_risk_assessments a
      WHERE a.id = risk_assessment_factors.assessment_id
      AND a.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY risk_mitigation_enterprise_isolation ON risk_mitigation_actions
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY risk_history_enterprise_isolation ON risk_score_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = risk_score_history.contract_id
      AND c.enterprise_id = current_setting('app.current_enterprise_id')::uuid
    )
  );

CREATE POLICY risk_thresholds_enterprise_isolation ON risk_threshold_configs
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY risk_alerts_enterprise_isolation ON risk_alerts
  FOR ALL USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Check for clause conflicts in a contract
CREATE OR REPLACE FUNCTION check_clause_conflicts(
  p_contract_id UUID,
  p_document_version_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_rule_id UUID,
  clause_a_text TEXT,
  clause_b_text TEXT,
  severity TEXT,
  conflict_type TEXT,
  resolution_guidance TEXT
) AS $$
DECLARE
  v_enterprise_id UUID;
BEGIN
  -- Get enterprise ID from contract
  SELECT enterprise_id INTO v_enterprise_id
  FROM contracts WHERE id = p_contract_id;

  -- This function returns rule-based conflicts
  -- AI-based conflict detection would be triggered separately
  RETURN QUERY
  SELECT
    cr.id as conflict_rule_id,
    cd_a.canonical_text as clause_a_text,
    cd_b.canonical_text as clause_b_text,
    cr.severity,
    cr.conflict_type,
    cr.resolution_guidance
  FROM clause_conflict_rules cr
  JOIN clause_definitions cd_a ON cr.clause_a_id = cd_a.id
  JOIN clause_definitions cd_b ON cr.clause_b_id = cd_b.id
  WHERE cr.enterprise_id = v_enterprise_id
    AND cr.is_active = true
    AND cd_a.is_active = true
    AND cd_b.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record a detected conflict
CREATE OR REPLACE FUNCTION record_detected_conflict(
  p_contract_id UUID,
  p_document_version_id UUID,
  p_conflict_rule_id UUID,
  p_clause_a_text TEXT,
  p_clause_a_location JSONB,
  p_clause_b_text TEXT,
  p_clause_b_location JSONB,
  p_detection_method TEXT,
  p_confidence_score NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_enterprise_id UUID;
  v_conflict_id UUID;
  v_severity TEXT;
  v_conflict_type TEXT;
  v_risk_impact INTEGER;
BEGIN
  -- Get enterprise ID
  SELECT enterprise_id INTO v_enterprise_id
  FROM contracts WHERE id = p_contract_id;

  -- Get conflict details from rule
  SELECT severity, conflict_type, risk_impact
  INTO v_severity, v_conflict_type, v_risk_impact
  FROM clause_conflict_rules
  WHERE id = p_conflict_rule_id;

  -- Default values if no rule
  v_severity := COALESCE(v_severity, 'medium');
  v_conflict_type := COALESCE(v_conflict_type, 'partial_conflict');
  v_risk_impact := COALESCE(v_risk_impact, 25);

  -- Insert conflict
  INSERT INTO detected_clause_conflicts (
    enterprise_id, contract_id, document_version_id,
    conflict_rule_id, clause_a_text, clause_a_location,
    clause_b_text, clause_b_location, detection_method,
    confidence_score, severity, conflict_type, risk_impact
  ) VALUES (
    v_enterprise_id, p_contract_id, p_document_version_id,
    p_conflict_rule_id, p_clause_a_text, p_clause_a_location,
    p_clause_b_text, p_clause_b_location, p_detection_method,
    p_confidence_score, v_severity, v_conflict_type, v_risk_impact
  )
  RETURNING id INTO v_conflict_id;

  RETURN v_conflict_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve a conflict
CREATE OR REPLACE FUNCTION resolve_conflict(
  p_conflict_id UUID,
  p_resolution_status TEXT,
  p_resolution_notes TEXT,
  p_resolved_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_previous_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_previous_status
  FROM detected_clause_conflicts
  WHERE id = p_conflict_id;

  -- Update conflict
  UPDATE detected_clause_conflicts
  SET
    status = p_resolution_status,
    resolution_notes = p_resolution_notes,
    resolved_by = p_resolved_by,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_conflict_id;

  -- Record history
  INSERT INTO conflict_resolution_history (
    conflict_id, previous_status, new_status,
    action_taken, notes, performed_by
  ) VALUES (
    p_conflict_id, v_previous_status, p_resolution_status,
    'status_change', p_resolution_notes, p_resolved_by
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate contract risk score
CREATE OR REPLACE FUNCTION calculate_contract_risk(
  p_contract_id UUID,
  p_assessment_type TEXT DEFAULT 'triggered'
)
RETURNS UUID AS $$
DECLARE
  v_enterprise_id UUID;
  v_assessment_id UUID;
  v_contract RECORD;
  v_factor RECORD;
  v_overall_score NUMERIC := 0;
  v_financial_score NUMERIC := 0;
  v_legal_score NUMERIC := 0;
  v_operational_score NUMERIC := 0;
  v_compliance_score NUMERIC := 0;
  v_vendor_score NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_conflict_count INTEGER;
  v_conflict_risk NUMERIC := 0;
  v_risk_level TEXT;
  v_factor_scores JSONB := '[]'::jsonb;
BEGIN
  -- Get contract and enterprise
  SELECT c.*, c.enterprise_id, v.overall_rating as vendor_rating
  INTO v_contract
  FROM contracts c
  LEFT JOIN vendors v ON c.vendor_id = v.id
  WHERE c.id = p_contract_id;

  v_enterprise_id := v_contract.enterprise_id;

  -- Mark previous assessment as superseded
  UPDATE contract_risk_assessments
  SET status = 'superseded', updated_at = NOW()
  WHERE contract_id = p_contract_id AND status = 'current';

  -- Count unresolved conflicts
  SELECT COUNT(*), COALESCE(SUM(risk_impact), 0)
  INTO v_conflict_count, v_conflict_risk
  FROM detected_clause_conflicts
  WHERE contract_id = p_contract_id
    AND status NOT IN ('resolved', 'dismissed');

  -- Evaluate each active risk factor
  FOR v_factor IN
    SELECT * FROM risk_factor_definitions
    WHERE enterprise_id = v_enterprise_id AND is_active = true
  LOOP
    DECLARE
      v_raw_score NUMERIC := 0;
      v_weighted_score NUMERIC;
      v_rule JSONB;
      v_condition_result BOOLEAN;
    BEGIN
      -- Evaluate rules for this factor
      FOR v_rule IN SELECT * FROM jsonb_array_elements(v_factor.evaluation_rules)
      LOOP
        -- Simple rule evaluation (can be extended)
        v_condition_result := false;

        -- Check contract value rules
        IF v_rule->>'condition' LIKE 'contract_value%' THEN
          IF v_rule->>'condition' LIKE '%>%' THEN
            v_condition_result := v_contract.total_value >
              (regexp_replace(v_rule->>'condition', '[^0-9]', '', 'g'))::numeric;
          END IF;
        END IF;

        -- Check vendor rating rules
        IF v_rule->>'condition' LIKE 'vendor_rating%' THEN
          IF v_rule->>'condition' LIKE '%<%' THEN
            v_condition_result := COALESCE(v_contract.vendor_rating, 5) <
              (regexp_replace(v_rule->>'condition', '[^0-9]', '', 'g'))::numeric;
          END IF;
        END IF;

        IF v_condition_result THEN
          v_raw_score := GREATEST(v_raw_score, (v_rule->>'score')::numeric);
        END IF;
      END LOOP;

      -- Calculate weighted score
      v_weighted_score := v_raw_score * v_factor.weight;
      v_total_weight := v_total_weight + v_factor.weight;

      -- Accumulate by category
      CASE v_factor.category
        WHEN 'financial' THEN v_financial_score := v_financial_score + v_weighted_score;
        WHEN 'legal' THEN v_legal_score := v_legal_score + v_weighted_score;
        WHEN 'operational' THEN v_operational_score := v_operational_score + v_weighted_score;
        WHEN 'compliance' THEN v_compliance_score := v_compliance_score + v_weighted_score;
        WHEN 'vendor' THEN v_vendor_score := v_vendor_score + v_weighted_score;
        ELSE v_overall_score := v_overall_score + v_weighted_score;
      END CASE;

      -- Add to factor scores array
      v_factor_scores := v_factor_scores || jsonb_build_object(
        'factor_id', v_factor.id,
        'factor_name', v_factor.name,
        'category', v_factor.category,
        'raw_score', v_raw_score,
        'weighted_score', v_weighted_score
      );
    END;
  END LOOP;

  -- Calculate overall score (weighted average + conflict contribution)
  IF v_total_weight > 0 THEN
    v_overall_score := (
      v_financial_score + v_legal_score + v_operational_score +
      v_compliance_score + v_vendor_score + v_overall_score
    ) / v_total_weight;
  END IF;

  -- Add conflict risk
  v_overall_score := LEAST(100, v_overall_score + (v_conflict_risk / 10));

  -- Determine risk level
  v_risk_level := CASE
    WHEN v_overall_score >= 80 THEN 'critical'
    WHEN v_overall_score >= 60 THEN 'high'
    WHEN v_overall_score >= 40 THEN 'medium'
    WHEN v_overall_score >= 20 THEN 'low'
    ELSE 'minimal'
  END;

  -- Create assessment record
  INSERT INTO contract_risk_assessments (
    enterprise_id, contract_id, assessment_type,
    overall_risk_score, risk_level,
    financial_risk_score, legal_risk_score, operational_risk_score,
    compliance_risk_score, vendor_risk_score,
    factor_scores, conflict_count, conflict_risk_contribution,
    requires_review
  ) VALUES (
    v_enterprise_id, p_contract_id, p_assessment_type,
    v_overall_score, v_risk_level,
    v_financial_score / NULLIF(v_total_weight, 0),
    v_legal_score / NULLIF(v_total_weight, 0),
    v_operational_score / NULLIF(v_total_weight, 0),
    v_compliance_score / NULLIF(v_total_weight, 0),
    v_vendor_score / NULLIF(v_total_weight, 0),
    v_factor_scores, v_conflict_count, v_conflict_risk,
    v_risk_level IN ('critical', 'high')
  )
  RETURNING id INTO v_assessment_id;

  -- Record score history
  INSERT INTO risk_score_history (
    contract_id, assessment_id, new_score, new_level, change_trigger
  ) VALUES (
    p_contract_id, v_assessment_id, v_overall_score, v_risk_level, p_assessment_type
  );

  -- Check thresholds and create alerts
  PERFORM check_risk_thresholds(p_contract_id, v_assessment_id, v_overall_score, v_risk_level);

  RETURN v_assessment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check risk thresholds and create alerts
CREATE OR REPLACE FUNCTION check_risk_thresholds(
  p_contract_id UUID,
  p_assessment_id UUID,
  p_score NUMERIC,
  p_level TEXT
)
RETURNS VOID AS $$
DECLARE
  v_enterprise_id UUID;
  v_threshold RECORD;
BEGIN
  SELECT enterprise_id INTO v_enterprise_id
  FROM contracts WHERE id = p_contract_id;

  FOR v_threshold IN
    SELECT * FROM risk_threshold_configs
    WHERE enterprise_id = v_enterprise_id
      AND is_active = true
      AND threshold_type = 'overall_score'
  LOOP
    -- Check critical threshold
    IF p_score >= v_threshold.critical_threshold THEN
      INSERT INTO risk_alerts (
        enterprise_id, contract_id, assessment_id, threshold_config_id,
        alert_type, alert_reason, current_value, threshold_value,
        actions_triggered
      ) VALUES (
        v_enterprise_id, p_contract_id, p_assessment_id, v_threshold.id,
        'critical',
        'Risk score exceeded critical threshold: ' || v_threshold.name,
        p_score, v_threshold.critical_threshold,
        v_threshold.actions_on_critical
      );
    -- Check warning threshold
    ELSIF p_score >= v_threshold.warning_threshold THEN
      INSERT INTO risk_alerts (
        enterprise_id, contract_id, assessment_id, threshold_config_id,
        alert_type, alert_reason, current_value, threshold_value,
        actions_triggered
      ) VALUES (
        v_enterprise_id, p_contract_id, p_assessment_id, v_threshold.id,
        'warning',
        'Risk score exceeded warning threshold: ' || v_threshold.name,
        p_score, v_threshold.warning_threshold,
        v_threshold.actions_on_warning
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create mitigation action
CREATE OR REPLACE FUNCTION create_mitigation_action(
  p_assessment_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_priority TEXT,
  p_expected_reduction NUMERIC DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_due_date TIMESTAMPTZ DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_enterprise_id UUID;
  v_contract_id UUID;
  v_action_id UUID;
BEGIN
  -- Get IDs from assessment
  SELECT enterprise_id, contract_id INTO v_enterprise_id, v_contract_id
  FROM contract_risk_assessments WHERE id = p_assessment_id;

  INSERT INTO risk_mitigation_actions (
    enterprise_id, assessment_id, contract_id,
    title, description, category, priority,
    expected_risk_reduction, assigned_to,
    assigned_at, due_date, created_by
  ) VALUES (
    v_enterprise_id, p_assessment_id, v_contract_id,
    p_title, p_description, p_category, p_priority,
    p_expected_reduction, p_assigned_to,
    CASE WHEN p_assigned_to IS NOT NULL THEN NOW() END,
    p_due_date, p_created_by
  )
  RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete mitigation action
CREATE OR REPLACE FUNCTION complete_mitigation_action(
  p_action_id UUID,
  p_completion_notes TEXT,
  p_actual_reduction NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_contract_id UUID;
BEGIN
  -- Update action
  UPDATE risk_mitigation_actions
  SET
    status = 'completed',
    completed_at = NOW(),
    completion_notes = p_completion_notes,
    actual_risk_reduction = p_actual_reduction,
    updated_at = NOW()
  WHERE id = p_action_id
  RETURNING contract_id INTO v_contract_id;

  -- Trigger risk recalculation
  PERFORM calculate_contract_risk(v_contract_id, 'mitigation_completed');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get risk summary for a contract
CREATE OR REPLACE FUNCTION get_contract_risk_summary(p_contract_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'assessment', jsonb_build_object(
      'id', a.id,
      'overall_score', a.overall_risk_score,
      'risk_level', a.risk_level,
      'scores', jsonb_build_object(
        'financial', a.financial_risk_score,
        'legal', a.legal_risk_score,
        'operational', a.operational_risk_score,
        'compliance', a.compliance_risk_score,
        'vendor', a.vendor_risk_score
      ),
      'conflict_count', a.conflict_count,
      'requires_review', a.requires_review,
      'assessed_at', a.created_at
    ),
    'active_conflicts', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'severity', c.severity,
        'conflict_type', c.conflict_type,
        'status', c.status
      ))
      FROM detected_clause_conflicts c
      WHERE c.contract_id = p_contract_id
        AND c.status NOT IN ('resolved', 'dismissed')
    ),
    'pending_mitigations', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'title', m.title,
        'priority', m.priority,
        'status', m.status,
        'due_date', m.due_date
      ))
      FROM risk_mitigation_actions m
      WHERE m.contract_id = p_contract_id
        AND m.status IN ('pending', 'in_progress')
    ),
    'active_alerts', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', al.id,
        'alert_type', al.alert_type,
        'alert_reason', al.alert_reason,
        'status', al.status
      ))
      FROM risk_alerts al
      WHERE al.contract_id = p_contract_id
        AND al.status = 'active'
    )
  ) INTO v_result
  FROM contract_risk_assessments a
  WHERE a.contract_id = p_contract_id
    AND a.status = 'current'
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-recalculate risk when conflicts change
CREATE OR REPLACE FUNCTION trigger_risk_recalculation()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule risk recalculation
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM calculate_contract_risk(NEW.contract_id, 'conflict_detected');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_risk_on_conflict
  AFTER INSERT OR UPDATE OF status ON detected_clause_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_risk_recalculation();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_risk_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clause_categories_timestamp
  BEFORE UPDATE ON clause_categories
  FOR EACH ROW EXECUTE FUNCTION update_risk_updated_at();

CREATE TRIGGER update_clause_definitions_timestamp
  BEFORE UPDATE ON clause_definitions
  FOR EACH ROW EXECUTE FUNCTION update_risk_updated_at();

CREATE TRIGGER update_clause_conflict_rules_timestamp
  BEFORE UPDATE ON clause_conflict_rules
  FOR EACH ROW EXECUTE FUNCTION update_risk_updated_at();

CREATE TRIGGER update_detected_conflicts_timestamp
  BEFORE UPDATE ON detected_clause_conflicts
  FOR EACH ROW EXECUTE FUNCTION update_risk_updated_at();

CREATE TRIGGER update_risk_factors_timestamp
  BEFORE UPDATE ON risk_factor_definitions
  FOR EACH ROW EXECUTE FUNCTION update_risk_updated_at();

CREATE TRIGGER update_risk_assessments_timestamp
  BEFORE UPDATE ON contract_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION update_risk_updated_at();

CREATE TRIGGER update_risk_mitigations_timestamp
  BEFORE UPDATE ON risk_mitigation_actions
  FOR EACH ROW EXECUTE FUNCTION update_risk_updated_at();

CREATE TRIGGER update_risk_thresholds_timestamp
  BEFORE UPDATE ON risk_threshold_configs
  FOR EACH ROW EXECUTE FUNCTION update_risk_updated_at();

-- =====================================================
-- SEED DEFAULT RISK FACTORS
-- =====================================================

-- Note: These would be inserted per-enterprise during onboarding
-- Example insert for reference:
/*
INSERT INTO risk_factor_definitions (enterprise_id, name, description, category, weight, evaluation_rules)
VALUES
  (enterprise_uuid, 'Contract Value', 'Risk based on total contract value', 'financial', 1.5,
   '[{"condition": "contract_value > 1000000", "score": 80}, {"condition": "contract_value > 500000", "score": 50}, {"condition": "contract_value > 100000", "score": 30}]'::jsonb),
  (enterprise_uuid, 'Vendor Rating', 'Risk based on vendor performance', 'vendor', 1.2,
   '[{"condition": "vendor_rating < 2", "score": 90}, {"condition": "vendor_rating < 3", "score": 60}, {"condition": "vendor_rating < 4", "score": 30}]'::jsonb),
  (enterprise_uuid, 'Contract Duration', 'Risk based on contract length', 'operational', 1.0,
   '[{"condition": "duration > 36", "score": 50}, {"condition": "duration > 24", "score": 30}, {"condition": "duration > 12", "score": 15}]'::jsonb);
*/

COMMENT ON TABLE clause_categories IS 'Categorization of contract clauses for conflict detection';
COMMENT ON TABLE clause_definitions IS 'Canonical clause definitions with detection patterns';
COMMENT ON TABLE clause_conflict_rules IS 'Rules defining which clauses conflict with each other';
COMMENT ON TABLE detected_clause_conflicts IS 'Actual conflicts detected in contracts';
COMMENT ON TABLE risk_factor_definitions IS 'Configurable risk factors for contract assessment';
COMMENT ON TABLE contract_risk_assessments IS 'Computed risk assessments for contracts';
COMMENT ON TABLE risk_mitigation_actions IS 'Actions to reduce contract risk';
COMMENT ON TABLE risk_alerts IS 'Alerts triggered when risk thresholds are exceeded';
